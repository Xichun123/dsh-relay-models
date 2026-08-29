import { credentialRef, isCredentialRefName } from "@deepseek-ai/dsh-credentials";
import Schema from "@deepseek-ai/schemastery";
import { INVALID_CREDENTIAL_CODE, LlmError, RetryPolicySchema, assertUsableApiKey, attributionHeaders, normalizeApiKey, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { MAX_TIMER_DELAY_MS } from "@deepseek-ai/dsh-timeout";
import { getBuiltinModels, getBuiltinProviders } from "@earendil-works/pi-ai/providers/all";
import { createProvider } from "@earendil-works/pi-ai";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { openAIResponsesApi } from "@earendil-works/pi-ai/api/openai-responses.lazy";
import { openAICodexResponsesApi } from "@earendil-works/pi-ai/api/openai-codex-responses.lazy";

//#region src/bounded-response.ts
async function readBoundedText(response, url, maxBytes) {
	const declared = Number(response.headers.get("content-length") ?? NaN);
	if (Number.isFinite(declared) && declared > maxBytes) {
		await response.body?.cancel();
		throw new Error(`${url} answered with more than ${maxBytes} bytes`);
	}
	if (!response.body) return "";
	const reader = response.body.getReader();
	const chunks = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > maxBytes) throw new Error(`${url} answered with more than ${maxBytes} bytes`);
			chunks.push(value);
		}
	} finally {
		await reader.cancel().catch(() => {});
	}
	const body = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(body);
}

//#endregion
//#region src/catalog.ts
const CATALOG_URL = "https://pi.dev/api/models";
const MAX_CATALOG_BYTES = 4 * 1024 * 1024;
const CACHE_MS = 6e4;
/**
* Every model the installed `pi-ai` build ships. This is the offline catalog
* and the source of the api-specific model fields a matched relay model copies,
* so both read the same build that materialization hands to `PiAiAdapter`.
*/
const BUILTIN_MODELS = getBuiltinProviders().flatMap((provider) => getBuiltinModels(provider));
/**
* The metadata summary of one installed model.
* @param model - an installed `pi-ai` model.
* @returns the summary the matcher and the settings page read.
*/
function summarize(model) {
	return {
		provider: model.provider,
		id: model.id,
		name: model.name,
		api: model.api,
		contextWindow: model.contextWindow,
		maxTokens: model.maxTokens,
		reasoning: model.reasoning,
		input: model.input,
		...model.thinkingLevelMap ? { thinkingLevelMap: model.thinkingLevelMap } : {},
		...model.compat ? { compat: model.compat } : {},
		...model.cost ? { cost: model.cost } : {}
	};
}
/** The installed build's metadata, served whenever pi.dev is unreachable. */
const BUNDLED_MODELS = BUILTIN_MODELS.map(summarize);
function object(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function number(value) {
	return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function parseOfficialCatalog(payload) {
	const providers = object(payload);
	if (!providers) throw new Error("pi.dev model catalog must be an object");
	const models = [];
	for (const [providerKey, entriesValue] of Object.entries(providers)) {
		const entries = object(entriesValue);
		if (!entries) continue;
		for (const [idKey, value] of Object.entries(entries)) {
			const model = object(value);
			if (!model) continue;
			const cost = object(model.cost);
			const provider = typeof model?.provider === "string" ? model.provider : providerKey;
			const id = typeof model?.id === "string" ? model.id : idKey;
			const name$1 = typeof model?.name === "string" ? model.name : id;
			const api = typeof model?.api === "string" ? model.api : void 0;
			const contextWindow = number(model?.contextWindow);
			const maxTokens = number(model?.maxTokens);
			const reasoning = model?.reasoning;
			const input = Array.isArray(model?.input) ? model.input.filter((item) => typeof item === "string") : void 0;
			if (!provider || !id || !api || contextWindow === void 0 || maxTokens === void 0 || typeof reasoning !== "boolean" || !input) continue;
			const thinkingLevelMap = object(model.thinkingLevelMap);
			const compat = object(model.compat);
			const tiers = Array.isArray(cost?.tiers) ? cost.tiers.flatMap((value$1) => {
				const tier = object(value$1);
				const inputTokensAbove = number(tier?.inputTokensAbove);
				const inputCost = number(tier?.input);
				const output = number(tier?.output);
				const cacheRead = number(tier?.cacheRead);
				const cacheWrite = number(tier?.cacheWrite);
				return inputTokensAbove === void 0 || inputCost === void 0 || output === void 0 || cacheRead === void 0 || cacheWrite === void 0 ? [] : [{
					inputTokensAbove,
					input: inputCost,
					output,
					cacheRead,
					cacheWrite
				}];
			}) : [];
			models.push({
				provider,
				id,
				name: name$1,
				api,
				contextWindow,
				maxTokens,
				reasoning,
				input,
				...thinkingLevelMap ? { thinkingLevelMap } : {},
				...compat ? { compat } : {},
				cost: {
					input: number(cost?.input) ?? 0,
					output: number(cost?.output) ?? 0,
					cacheRead: number(cost?.cacheRead) ?? 0,
					cacheWrite: number(cost?.cacheWrite) ?? 0,
					...tiers.length > 0 ? { tiers } : {}
				}
			});
		}
	}
	if (models.length === 0) throw new Error("pi.dev model catalog contains no usable models");
	return models;
}
let snapshot = {
	models: BUNDLED_MODELS,
	source: "bundled"
};
let etag;
let expiresAt = 0;
let pending;
function currentOfficialCatalog() {
	return snapshot;
}
async function refreshOfficialCatalog(signal) {
	if (Date.now() < expiresAt) return snapshot;
	if (pending) return pending;
	pending = (async () => {
		const timeout = AbortSignal.timeout(1e4);
		const response = await fetch(CATALOG_URL, {
			headers: {
				accept: "application/json",
				...etag ? { "if-none-match": etag } : {}
			},
			signal: signal ? AbortSignal.any([signal, timeout]) : timeout
		});
		if (response.status === 304) {
			expiresAt = Date.now() + CACHE_MS;
			return snapshot;
		}
		if (!response.ok) throw new Error(`${CATALOG_URL} answered ${response.status}`);
		const models = parseOfficialCatalog(JSON.parse(await readBoundedText(response, CATALOG_URL, MAX_CATALOG_BYTES)));
		etag = response.headers.get("etag") ?? void 0;
		expiresAt = Date.now() + CACHE_MS;
		snapshot = {
			models,
			source: "remote",
			...response.headers.get("x-pi-model-catalog-revision") ? { revision: response.headers.get("x-pi-model-catalog-revision") } : {},
			...response.headers.get("x-pi-model-catalog-minimum-version") ? { minimumVersion: response.headers.get("x-pi-model-catalog-minimum-version") } : {}
		};
		return snapshot;
	})().finally(() => {
		pending = void 0;
	});
	return pending;
}

//#endregion
//#region src/shared/core.ts
const RELAY_PROTOCOLS = [
	"openai-completions",
	"openai-responses",
	"openai-codex-responses",
	"anthropic-messages"
];
const RELAY_TRANSPORTS = [
	"auto",
	"websocket",
	"websocket-cached",
	"sse"
];
/**
* The Codex speed tiers a session may choose, in the order the Speed menu
* lists them. `fast` is Codex Fast mode, `priority` its API-key equivalent,
* `flex` the cheaper slower lane. Choosing none keeps `service_tier` out of
* the body, which is what every DSH route does today.
*/
const RELAY_SERVICE_TIERS = [
	"fast",
	"priority",
	"flex"
];
function isRelayProtocol(value) {
	return RELAY_PROTOCOLS.includes(value);
}
function normalizeBaseURL(raw) {
	const value = raw.trim();
	if (!value) throw new Error("Base URL cannot be empty");
	const parsed = new URL(value);
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Base URL must use http:// or https://");
	if (parsed.username || parsed.password) throw new Error("Do not include credentials in the Base URL");
	return parsed.toString().replace(/\/$/u, "");
}
function baseURLForProtocol(raw, protocol) {
	const normalized = normalizeBaseURL(raw);
	if (protocol === "openai-codex-responses") return codexResponsesBaseURL(normalized);
	if (protocol !== "anthropic-messages") return normalized;
	const parsed = new URL(normalized);
	if (parsed.pathname.endsWith("/v1")) parsed.pathname = parsed.pathname.slice(0, -3) || "/";
	return parsed.toString().replace(/\/$/u, "");
}
/**
* pi-ai Codex Responses appends `/codex/responses` unless the base already ends
* with `/codex` or `/codex/responses`. CLIProxyAPI exposes that path at
* `/backend-api/codex/responses`, so a stored `/v1` OpenAI-compatible URL is
* rewritten to `/backend-api`.
*/
function codexResponsesBaseURL(normalized) {
	const parsed = new URL(normalized);
	const path = parsed.pathname.replace(/\/$/u, "") || "/";
	if (path.endsWith("/codex/responses") || path.endsWith("/codex") || path.endsWith("/backend-api")) return parsed.toString().replace(/\/$/u, "");
	parsed.pathname = path.endsWith("/v1") ? path.replace(/\/v1$/u, "/backend-api") : path === "/" ? "/backend-api" : `${path}/backend-api`;
	return parsed.toString().replace(/\/$/u, "");
}
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 3e5;
const DEFAULT_CONTEXT_WINDOW = 262144;
const DEFAULT_MAX_TOKENS = 32768;
/**
* Request-image bounds mirroring `dsh-llm-pi-ai`'s own defaults, which that
* package does not re-export from its entry. A relay behind a gateway with a
* smaller request-body cap lowers them per provider.
*/
const DEFAULT_MAX_REQUEST_IMAGE_BYTES = 20 * 1024 * 1024;
const DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET = 2048 * 2048;
const DEFAULT_REQUEST_IMAGE_MAX_BYTES = 1024 * 1024;
/** Official pi-ai / DSH routes this plugin must not claim. */
const RESERVED_PROVIDER_IDS = new Set([
	"amazon-bedrock",
	"ant-ling",
	"anthropic",
	"azure-openai-responses",
	"cerebras",
	"cloudflare-ai-gateway",
	"cloudflare-workers-ai",
	"deepseek",
	"deepseek-official",
	"fireworks",
	"github-copilot",
	"google",
	"google-vertex",
	"groq",
	"huggingface",
	"kimi-coding",
	"minimax",
	"minimax-cn",
	"mistral",
	"moonshotai",
	"moonshotai-cn",
	"nvidia",
	"openai",
	"openai-codex",
	"opencode",
	"opencode-go",
	"openrouter",
	"qwen-token-plan",
	"qwen-token-plan-cn",
	"radius",
	"together",
	"vercel-ai-gateway",
	"xai",
	"xiaomi",
	"xiaomi-token-plan-ams",
	"xiaomi-token-plan-cn",
	"xiaomi-token-plan-sgp",
	"zai",
	"zai-coding-cn"
]);
const SECRET_HEADER = /^(authorization|api-key|x-api-key|proxy-authorization)$/iu;
function validateProviderId(raw) {
	const id = raw.trim().toLowerCase();
	if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id)) throw new Error("Provider ID must start with a letter and contain lowercase letters, numbers, or hyphens");
	return id;
}
function assertUnreservedProviderId(raw, extraReserved = RESERVED_PROVIDER_IDS) {
	const id = validateProviderId(raw);
	if (RESERVED_PROVIDER_IDS.has(id) || extraReserved.has(id)) throw new Error(`Provider ID "${id}" is reserved by DeepSeek Harness; use a relay-* name`);
	return id;
}
function assertSafeHeaders(headers) {
	for (const name$1 of Object.keys(headers)) if (SECRET_HEADER.test(name$1)) throw new Error(`Header "${name$1}" cannot carry credentials; store the API key in the credentials field`);
}
function relayCredentialRef(route) {
	return `${validateProviderId(route).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}
function modelsEndpoints(baseURL) {
	const normalized = normalizeBaseURL(baseURL);
	const path = new URL(normalized).pathname.replace(/\/$/u, "");
	return [...new Set([`${normalized}/models`, ...path.endsWith("/v1") ? [] : [`${normalized}/v1/models`]])];
}
function parseModelIds(payload) {
	let entries;
	if (Array.isArray(payload)) entries = payload;
	else if (payload && typeof payload === "object") {
		const record$1 = payload;
		entries = Array.isArray(record$1.data) ? record$1.data : record$1.models;
	}
	if (!Array.isArray(entries)) throw new Error("The /models response does not contain a model array");
	return [...new Set(entries.map((entry) => {
		if (typeof entry === "string") return entry.trim();
		if (entry && typeof entry === "object" && typeof entry.id === "string") return entry.id.trim();
		return "";
	}).filter(Boolean))];
}
function sourceRank(model) {
	if (model.provider === "anthropic" || model.provider === "openai") return 0;
	if (model.provider === "openai-codex") return 1;
	if (isRelayProtocol(model.api)) return 2;
	if (model.api.startsWith("openai-")) return 3;
	return 10;
}
function catalogIndex(catalog) {
	const byId = /* @__PURE__ */ new Map();
	for (const candidate of catalog) {
		const current = byId.get(candidate.id);
		if (!current || sourceRank(candidate) < sourceRank(current)) byId.set(candidate.id, candidate);
	}
	return byId;
}
function inferProtocol(source, fallback) {
	if (!source) return fallback;
	if (source.api === "anthropic-messages") return "anthropic-messages";
	if (source.api === "openai-completions") return "openai-completions";
	if (source.api === "openai-codex-responses") return "openai-codex-responses";
	if (source.api === "openai-responses" || source.api === "azure-openai-responses") return "openai-responses";
}
function resolveOfficialModel(remoteId, config, catalog) {
	const reference = config.modelMappings[remoteId];
	if (reference) return catalog.find((model) => model.provider === reference.provider && model.id === reference.id);
	return catalogIndex(catalog).get(remoteId);
}

//#endregion
//#region src/discovery.ts
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const MAX_FAILURE_BODY_BYTES = 64 * 1024;
const MAX_FAILURE_DETAIL_CHARS = 300;
function authHeaders(protocol, apiKey) {
	if (protocol === "anthropic-messages") return {
		accept: "application/json",
		"anthropic-version": "2023-06-01",
		...apiKey ? { "x-api-key": apiKey } : {}
	};
	return {
		accept: "application/json",
		...apiKey ? { authorization: `Bearer ${apiKey}` } : {}
	};
}
/**
* The configured headers minus the names attribution owns, so a relay that
* only answers Claude Code or Codex User-Agents cannot be satisfied by
* configuration: the plugin never impersonates another client.
* @param configured - headers stored for the provider, if any.
* @param attribution - the attribution headers that win over them.
* @returns the headers to merge below attribution.
*/
function deploymentHeaders(configured, attribution) {
	if (!configured) return {};
	assertSafeHeaders(configured);
	const reserved = new Set(Object.keys(attribution).map((name$1) => name$1.toLowerCase()));
	return Object.fromEntries(Object.entries(configured).filter(([name$1]) => !reserved.has(name$1.toLowerCase())));
}
/**
* The message a refusal body states, across the `error.message`, string
* `error`, `message`, and `detail` forms OpenAI-compatible relays and their
* gateways use. A body that is not JSON (a proxy's HTML page) has no field
* worth quoting.
* @param text - the response body.
* @returns the stated message, or undefined when the body states none.
*/
function statedMessage(text) {
	let payload;
	try {
		payload = JSON.parse(text);
	} catch {
		return;
	}
	if (!payload || typeof payload !== "object") return void 0;
	const record$1 = payload;
	const nested = record$1.error && typeof record$1.error === "object" ? record$1.error.message : void 0;
	for (const candidate of [
		nested,
		record$1.error,
		record$1.message,
		record$1.detail
	]) if (typeof candidate === "string" && candidate.trim()) return candidate;
}
/**
* The endpoint's own explanation of a refusal, collapsed to one bounded line.
* @param response - the refused response, whose body this consumes.
* @param url - the interrogated endpoint, for the byte-limit error.
* @returns the explanation, or '' when the endpoint gave none.
*/
async function failureDetail(response, url) {
	const line = (statedMessage(await readBoundedText(response, url, MAX_FAILURE_BODY_BYTES).catch(() => "")) ?? "").replace(/\s+/gu, " ").trim();
	return line.length > MAX_FAILURE_DETAIL_CHARS ? `${line.slice(0, MAX_FAILURE_DETAIL_CHARS)}…` : line;
}
/**
* The failure text for a refused listing. The endpoint's own words replace the
* key guess whenever it says anything: a 401 can also mean the endpoint
* rejected the client, the account, or the route, and only the endpoint knows
* which.
* @param url - the interrogated endpoint.
* @param status - the HTTP status it answered.
* @param detail - the endpoint's explanation, or '' when it gave none.
* @returns the message to report.
*/
function failureMessage(url, status, detail) {
	if (detail) return `${url} answered ${status}: ${detail}`;
	if (status === 401 || status === 403) return `${url} answered ${status}; check the API key`;
	return `${url} answered ${status}`;
}
/**
* Accept one interrogation key, or refuse it before the header is built. A key
* carrying a character no HTTP header can hold makes `fetch` throw, which the
* loop below would otherwise report as an unreachable endpoint — blaming the
* relay for a local, deterministic fault. A blank field means "no key", which
* is how an unauthenticated endpoint is interrogated.
* @param raw - the key typed into the page or read from the credentials service.
* @returns the trimmed key, or undefined when none was supplied.
*/
function usableKey(raw) {
	if (raw === void 0) return void 0;
	const checked = normalizeApiKey(raw);
	if (checked.ok) return checked.value;
	if (checked.reason === "empty") return void 0;
	throw new LlmError("This API key contains characters no HTTP header can carry; paste the raw key only", INVALID_CREDENTIAL_CODE);
}
async function discoverRelayModels(request) {
	const baseURL = request.baseURL;
	if (!baseURL) throw new LlmError("Relay model discovery needs a Base URL", "DISCOVERY_FAILED");
	const protocol = request.api ?? "openai-completions";
	if (!isRelayProtocol(protocol)) throw new LlmError(`Unsupported relay protocol: ${protocol}`, "DISCOVERY_UNSUPPORTED");
	const apiKey = usableKey(request.apiKey);
	const attribution = attributionHeaders();
	const extra = deploymentHeaders(request.headers, attribution);
	let lastError = "";
	for (const url of modelsEndpoints(baseURL)) {
		let response;
		try {
			response = await fetch(url, {
				headers: {
					...authHeaders(protocol, apiKey),
					...extra,
					...attribution
				},
				...request.signal ? { signal: request.signal } : {}
			});
		} catch (error) {
			if (request.signal?.aborted) throw new LlmError("Relay model discovery aborted", "ABORTED", { cause: error });
			throw new LlmError(`Could not reach ${url}`, "DISCOVERY_FAILED", { cause: error });
		}
		if (!response.ok) {
			lastError = failureMessage(url, response.status, await failureDetail(response, url));
			if (response.status === 404 || response.status === 405) continue;
			throw new LlmError(lastError, "DISCOVERY_FAILED");
		}
		let payload;
		try {
			payload = JSON.parse(await readBoundedText(response, url, MAX_RESPONSE_BYTES));
		} catch (error) {
			if (error instanceof LlmError) throw error;
			throw new LlmError(`${url} did not answer with a valid model listing`, "DISCOVERY_FAILED", { cause: error });
		}
		return parseModelIds(payload).map((id) => ({ id }));
	}
	throw new LlmError(lastError || "Relay model discovery failed", "DISCOVERY_FAILED");
}

//#endregion
//#region src/codex-relay.ts
/** The claim pi-ai reads `chatgpt-account-id` from. */
const CODEX_ACCOUNT_CLAIM = "https://api.openai.com/auth";
/**
* The header a relay key travels in while the synthetic token holds
* `Authorization`. CLIProxyAPI — the gateway serving the `/backend-api/codex`
* alias this protocol talks to — authenticates a caller from `x-api-key` even
* when a bearer is present, and forwards neither header upstream: it injects
* its own Codex credential there.
*/
const CODEX_RELAY_KEY_HEADER = "x-api-key";
/**
* The account id pi-ai would derive from this key. The decode mirrors pi-ai's
* own (`atob` over the payload segment, same claim path), so this answers the
* only question that matters at the call: whether pi-ai can build Codex
* headers from the key as stored.
* @param apiKey - the key the credentials service resolved.
* @returns the account id, or undefined when the key carries none.
*/
function codexAccountId(apiKey) {
	const parts = apiKey.split(".");
	if (parts.length !== 3) return void 0;
	try {
		const accountId = JSON.parse(atob(parts[1]))?.[CODEX_ACCOUNT_CLAIM]?.chatgpt_account_id;
		return typeof accountId === "string" && accountId.length > 0 ? accountId : void 0;
	} catch {
		return;
	}
}
/**
* An unsigned token naming `accountId` in the claim pi-ai reads. The segments
* use standard base64, not base64url, because pi-ai decodes the payload with
* `atob`, which rejects the url alphabet.
* @param accountId - the account id to carry; the route name here.
* @returns the token to hand pi-ai as the API key.
*/
function syntheticCodexToken(accountId) {
	const segment = (value) => btoa(JSON.stringify(value));
	return [
		segment({
			alg: "none",
			typ: "JWT"
		}),
		segment({ [CODEX_ACCOUNT_CLAIM]: { chatgpt_account_id: accountId } }),
		"unsigned"
	].join(".");
}
/**
* The options one Codex Responses call runs with on a relay route.
*
* A key that already carries the claim keeps its `Authorization` untouched:
* that is a relay fronting real ChatGPT tokens, and pi-ai reads such a key
* itself. The speed tier still applies, because it is per-session choice
* rather than authentication.
* @param route - the provider id, which names the synthetic account.
* @param speedFor - resolves the calling session's speed tier.
* @param options - the options pi-ai was called with.
* @returns the options to delegate with.
*/
function codexRelayStreamOptions(route, speedFor, options) {
	const chosen = options?.serviceTier;
	const sessionTier = speedFor(options);
	const tier = sessionTier !== void 0 && chosen === void 0 ? { serviceTier: sessionTier } : {};
	const apiKey = options?.apiKey;
	if (apiKey !== void 0 && codexAccountId(apiKey) !== void 0) return {
		...options,
		...tier
	};
	const headers = {
		...options?.headers,
		...apiKey === void 0 ? {} : { [CODEX_RELAY_KEY_HEADER]: apiKey }
	};
	return {
		...options,
		...tier,
		apiKey: syntheticCodexToken(route),
		...Object.keys(headers).length > 0 ? { headers } : {}
	};
}
/**
* Codex Responses for a relay route.
*
* pi-ai derives `chatgpt-account-id` by decoding the API key as a ChatGPT OAuth
* token, and it does so before picking a transport: a relay key — 20 opaque
* characters, not a JWT — fails that decode with `Failed to extract accountId
* from token`, so neither the WebSocket nor the SSE endpoint is ever reached.
* The header is not what the relay authenticates on. It checks its own key and
* injects its own upstream Codex credential, and it accepts a request whose
* `chatgpt-account-id` it did not issue.
*
* So the token pi-ai reads is synthesized per route, and the key that would
* have been the bearer moves to {@link CODEX_RELAY_KEY_HEADER}, which pi-ai
* passes through untouched. A relay that authenticates on `Authorization`
* alone refuses such a request — it refuses the un-rewritten one too, one step
* earlier and with a less usable message, so nothing that worked stops working.
*
* The same wrapper carries the session's speed tier, because `service_tier`
* is a Codex-only body field and no DSH adapter sets one.
* @param route - the provider id whose credential authenticates the call.
* @param speedFor - resolves the calling session's speed tier.
* @param base - the implementation to wrap; pi-ai's Codex api by default.
* @returns the api entry to register for `openai-codex-responses`.
*/
function codexRelayApi(route, speedFor, base = openAICodexResponsesApi()) {
	return {
		stream: (model, context, options) => base.stream(model, context, codexRelayStreamOptions(route, speedFor, options)),
		streamSimple: (model, context, options) => base.streamSimple(model, context, codexRelayStreamOptions(route, speedFor, options))
	};
}

//#endregion
//#region src/materialize.ts
const DEFAULT_COST = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0
};
/**
* The selector label for a matched model. A remote id that differs from the
* official one is named too: two remote ids mapped to the same official model
* would otherwise be one indistinguishable label repeated.
* @param remoteId - the id the relay serves.
* @param summary - the official metadata it matched.
* @returns the display name.
*/
function matchedName(remoteId, summary) {
	return remoteId === summary.id ? summary.name : `${summary.name} (${remoteId})`;
}
function matchedModel(route, config, id, summary, protocol) {
	const source = BUILTIN_MODELS.find((model) => model.provider === summary.provider && model.id === summary.id);
	const copied = source ? structuredClone(source) : void 0;
	const inheritsCompat = protocol === summary.api;
	if (copied) {
		delete copied.headers;
		if (!inheritsCompat) delete copied.compat;
	}
	return {
		...copied,
		id,
		name: matchedName(id, summary),
		provider: route,
		api: protocol,
		baseUrl: baseURLForProtocol(config.baseURL, protocol),
		reasoning: summary.reasoning,
		input: [...summary.input],
		...summary.thinkingLevelMap ? { thinkingLevelMap: structuredClone(summary.thinkingLevelMap) } : {},
		...summary.compat && inheritsCompat ? { compat: structuredClone(summary.compat) } : {},
		cost: { ...summary.cost ?? copied?.cost ?? DEFAULT_COST },
		contextWindow: summary.contextWindow,
		maxTokens: summary.maxTokens
	};
}
function fallbackModel(route, config, id, protocol) {
	return {
		id,
		name: id,
		provider: route,
		api: protocol,
		baseUrl: baseURLForProtocol(config.baseURL, protocol),
		reasoning: false,
		input: ["text"],
		cost: { ...DEFAULT_COST },
		contextWindow: DEFAULT_CONTEXT_WINDOW,
		maxTokens: DEFAULT_MAX_TOKENS
	};
}
function materializeModels(route, config, catalog) {
	const excluded = new Set(config.excludedModels);
	return [...new Set(config.modelIds.map((id) => id.trim()).filter(Boolean))].filter((id) => !excluded.has(id)).flatMap((id) => {
		const summary = resolveOfficialModel(id, config, catalog);
		const protocol = config.protocolOverrides[id] ?? inferProtocol(summary, config.fallbackProtocol);
		if (!protocol) return [];
		return [summary ? matchedModel(route, config, id, summary, protocol) : fallbackModel(route, config, id, protocol)];
	});
}
function buildRelayProvider(route, config, catalog, speedFor) {
	return createProvider({
		id: route,
		name: config.displayName,
		baseUrl: config.baseURL,
		auth: { apiKey: {
			name: `${config.displayName} API key`,
			resolve: ({ credential }) => Promise.resolve({
				auth: credential?.key === void 0 ? {} : { apiKey: credential.key },
				source: config.apiKeyEnv
			})
		} },
		models: materializeModels(route, config, catalog),
		api: {
			"openai-completions": openAICompletionsApi(),
			"openai-responses": openAIResponsesApi(),
			"openai-codex-responses": codexRelayApi(route, speedFor),
			"anthropic-messages": anthropicMessagesApi()
		}
	});
}

//#endregion
//#region src/pi-auth.ts
/**
* The pi-ai auth injection for relay routes.
*
* `buildRelayProvider` gives every route a single `apiKey` method and
* `PiAiAdapter` resolves that key per request from the DSH credentials service,
* so pi-ai owns no credential of its own here: no relay route offers a sign-in,
* and no refresh rotates a token. The store therefore reports an empty
* credential plane, and a write that could not land is refused rather than
* dropped.
*
* `@deepseek-ai/dsh-llm-pi-ai` keeps its own `credentialStoreFrom` /
* `authContextFrom` builders private, so this is what a third-party adapter can
* supply for the required option.
* @param ctx - the plugin context carrying `ctx.credentials`.
* @returns the injection to hand {@link PiAiAdapterOptions.auth}.
*/
function relayAuthInjection(ctx) {
	return {
		credentials: {
			read: () => Promise.resolve(void 0),
			list: () => Promise.resolve([]),
			modify: async (providerId, fn) => {
				if (await fn(void 0) !== void 0) throw new Error(`relay-models: provider "${providerId}" cannot store a pi-ai credential; a relay route authenticates with the API key the DSH credentials service holds`);
			},
			delete: () => Promise.resolve()
		},
		authContext: {
			env: async (name$1) => {
				const stored = isCredentialRefName(name$1) ? (await ctx.credentials.resolve(credentialRef(name$1)))?.value : void 0;
				return stored !== void 0 && stored.length > 0 ? stored : process.env[name$1];
			},
			fileExists: () => Promise.resolve(false)
		}
	};
}

//#endregion
//#region src/shared/speed.ts
/**
* Per-session Codex speed tier: one in-memory choice per conversation,
* replacing the route-level `serviceTier` config. Restart clears it (the
* reference plugin's posture), so a stale choice never outlives the session
* that made it. `undefined` clears the session, restoring the default of no
* `service_tier` on the wire.
*/
var SpeedController = class {
	tiers = /* @__PURE__ */ new Map();
	/** The session's chosen tier, or undefined for the no-`service_tier` default. */
	get(sessionId) {
		return sessionId === void 0 ? void 0 : this.tiers.get(sessionId);
	}
	/** Set the session's tier; `undefined` clears it back to the default. */
	set(sessionId, tier) {
		if (tier === void 0) this.tiers.delete(sessionId);
		else this.tiers.set(sessionId, tier);
	}
};

//#endregion
//#region src/web-api.ts
const PATH = "/relay-models/api";
const MAX_BODY_BYTES = 1024 * 1024;
/** The operations this endpoint serves; anything else is refused by name. */
const RELAY_ACTIONS = [
	"catalog",
	"discover",
	"set-provider",
	"remove-provider",
	"get-speed",
	"set-speed"
];
/**
* Whether a request names an operation this endpoint serves.
* @param value - the `action` field of the request body.
* @returns true when the endpoint has a branch for it.
*/
function isRelayAction(value) {
	return RELAY_ACTIONS.includes(value);
}
/**
* Refuse an operation the switch above did not handle. Unreachable while the
* action union and the branches agree; adding a member without its branch is a
* compile error here.
* @param action - the unhandled action.
*/
function assertNever(action) {
	throw new Error(`Unhandled relay action: ${String(action)}`);
}
var RelayHttpError = class extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
		this.name = "RelayHttpError";
	}
};
/**
* The normalized URL of a bare `host[:port]` authority. Anything WHATWG parsing
* would rewrite — a path, userinfo, an unbracketed IPv6 literal — is not an
* authority and gets no trust, because parsing it would silently authorize the
* embedded hostname instead.
* @param value - the header value or configured entry, verbatim.
* @returns the parsed authority, or undefined when the value is not one.
*/
function authority(value) {
	try {
		const url = new URL(`http://${value}`);
		const written = value.toLowerCase();
		return url.host === written || url.hostname === written ? url : void 0;
	} catch {
		return;
	}
}
/**
* Whether a hostname names this machine's loopback authority.
* @param hostname - a WHATWG URL hostname (IPv6 literals keep their brackets).
* @returns true for localhost, IPv6 loopback, or any address in 127/8.
*/
function isLoopbackHostname(hostname) {
	if (hostname === "localhost" || hostname === "[::1]") return true;
	const parts = hostname.split(".");
	return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/u.test(part) && Number(part) <= 255);
}
/**
* Whether the request authority is one this deployment serves. A configured
* entry naming a port matches that exact authority; a port-less entry matches
* its hostname on any port.
*/
function isTrustedAuthority(host, trustedHosts) {
	return trustedHosts.some((entry) => {
		const trusted = authority(entry);
		if (!trusted) return false;
		return trusted.port === "" ? trusted.hostname === host.hostname : trusted.host === host.host;
	});
}
/**
* Refuse a configuration request a browser could have been tricked into
* sending. Three fences, in the order the `/api` carrier applies them:
*
* - **Host** — the socket reached this server, but a DNS-rebound page carries
*   the attacker's domain here, and Host is the one header rebinding cannot
*   forge. A deployment served behind a reverse proxy names its public
*   authority in `trustedHosts`.
* - **Fetch metadata** — an explicit cross-site marker is refused whatever
*   Origin says.
* - **Origin** — when a browser attaches one it must be exactly this authority.
*   A read may omit it; a write may not, because this endpoint stores API keys
*   and can make the host interrogate an address the request names.
* @param req - the incoming request.
* @param method - its HTTP method.
* @param trustedHosts - non-loopback authorities this deployment serves.
*/
function assertRequestOrigin(req, method, trustedHosts = []) {
	const rawHost = req.headers.host;
	const host = typeof rawHost === "string" ? authority(rawHost) : void 0;
	if (!host) throw new RelayHttpError(403, "Relay configuration requests must include a parsable Host");
	if (!isLoopbackHostname(host.hostname) && !isTrustedAuthority(host, trustedHosts)) throw new RelayHttpError(403, `Relay configuration requests refuse Host "${host.host}"; add it to trustedHosts to serve it`);
	if (req.headers["sec-fetch-site"] === "cross-site") throw new RelayHttpError(403, "Cross-site relay configuration requests are refused");
	const origin = req.headers.origin;
	if (!origin) {
		if (method === "GET") return;
		throw new RelayHttpError(403, "Relay configuration requests must include Origin");
	}
	let originHost;
	try {
		originHost = new URL(origin).host;
	} catch {
		throw new RelayHttpError(403, "Cross-origin relay configuration requests are refused");
	}
	if (originHost !== host.host) throw new RelayHttpError(403, "Cross-origin relay configuration requests are refused");
}
function resolveDiscoveryTarget(input, config) {
	const protocol = requiredString(input.protocol, "protocol");
	if (!isRelayProtocol(protocol)) throw new Error("Invalid relay protocol");
	const providerId = typeof input.provider === "string" ? input.provider.trim() : "";
	if (providerId) {
		const provider = config.providers[providerId];
		if (!provider) throw new Error(`Unknown provider: ${providerId}`);
		return {
			providerId,
			baseURL: provider.baseURL,
			protocol,
			...typeof input.apiKey === "string" && input.apiKey.trim() ? { apiKey: input.apiKey.trim() } : {},
			...provider.headers && Object.keys(provider.headers).length > 0 ? { headers: provider.headers } : {},
			useStoredKey: true
		};
	}
	return {
		baseURL: requiredString(input.baseURL, "baseURL"),
		protocol,
		...typeof input.apiKey === "string" ? { apiKey: input.apiKey } : {},
		useStoredKey: false
	};
}
function reply(res, status, value) {
	const body = JSON.stringify(value);
	res.statusCode = status;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.setHeader("cache-control", "no-store");
	res.end(body);
}
async function readBody(req) {
	const chunks = [];
	let total = 0;
	for await (const value of req) {
		const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
		total += chunk.length;
		if (total > MAX_BODY_BYTES) throw new Error("Request body is too large");
		chunks.push(chunk);
	}
	if (total === 0) return {};
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body must be a JSON object");
	return value;
}
function requiredString(value, field) {
	if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
	return value;
}
/**
* The stable code a refusal carries, for the page to act on rather than parse
* a message. A settings write refused for a stale revision is the one case the
* page can recover from on its own.
* @param error - the thrown value.
* @returns the code, or undefined when the failure has none.
*/
function failureCode(error) {
	const code = error?.code;
	return typeof code === "string" && code.length > 0 ? code : void 0;
}
function installWebApi(ctx, ns, current, onCatalogRefresh, speed) {
	const state = async () => {
		const descriptor = ctx.settings.describe({ redactSecrets: true }).find((item) => item.ns === ns);
		if (!descriptor) throw new Error("Relay settings are not ready");
		const config = current();
		const credentials = Object.fromEntries(await Promise.all(Object.values(config.providers).map(async (provider) => [provider.apiKeyEnv, (await ctx.credentials.describe(credentialRef(provider.apiKeyEnv))).configured])));
		return {
			config,
			revision: descriptor.revision,
			writable: ctx.settings.writable,
			credentials,
			catalog: currentOfficialCatalog()
		};
	};
	const handler = async (req, res) => {
		try {
			assertRequestOrigin(req, req.method ?? "GET", current().trustedHosts ?? []);
			if (req.method === "GET") {
				reply(res, 200, {
					ok: true,
					value: await state()
				});
				return;
			}
			if (req.method !== "POST") {
				res.setHeader("allow", "GET, POST");
				reply(res, 405, {
					ok: false,
					error: "Method not allowed"
				});
				return;
			}
			const input = record(await readBody(req));
			const action = requiredString(input.action, "action");
			if (!isRelayAction(action)) throw new Error(`Unknown action: ${action}`);
			if (action === "catalog") {
				const previous = currentOfficialCatalog();
				const value = await refreshOfficialCatalog().catch(() => currentOfficialCatalog());
				if (value !== previous) onCatalogRefresh();
				reply(res, 200, {
					ok: true,
					value
				});
				return;
			}
			if (action === "discover") {
				const target = resolveDiscoveryTarget(input, current());
				const stored = target.providerId ? current().providers[target.providerId] : void 0;
				const storedApiKey = target.useStoredKey && !target.apiKey && stored ? (await ctx.credentials.resolve(credentialRef(stored.apiKeyEnv)))?.value : void 0;
				reply(res, 200, {
					ok: true,
					value: (await discoverRelayModels({
						baseURL: target.baseURL,
						api: target.protocol,
						apiKey: target.apiKey ?? storedApiKey,
						...target.headers ? { headers: target.headers } : {}
					})).map((model) => model.id)
				});
				return;
			}
			if (action === "get-speed") {
				const sessionId = requiredString(input.sessionId, "sessionId");
				reply(res, 200, {
					ok: true,
					value: { tier: speed.get(sessionId) ?? null }
				});
				return;
			}
			if (action === "set-speed") {
				const sessionId = requiredString(input.sessionId, "sessionId");
				const raw = input.tier;
				if (raw !== null && raw !== void 0 && !RELAY_SERVICE_TIERS.includes(String(raw))) throw new Error(`Invalid speed tier: ${String(raw)}`);
				speed.set(sessionId, raw ?? void 0);
				reply(res, 200, { ok: true });
				return;
			}
			const route = requiredString(input.route, "route");
			const expectedRevision = typeof input.expectedRevision === "number" ? input.expectedRevision : void 0;
			if (action === "set-provider") {
				const provider = record(input.provider);
				await ctx.settings.mutate(ns, [{
					op: "set",
					path: ["providers", route],
					value: provider
				}], expectedRevision);
				if (typeof input.apiKey === "string" && input.apiKey.trim()) await ctx.credentials.set(credentialRef(provider.apiKeyEnv), input.apiKey.trim());
				reply(res, 200, { ok: true });
				return;
			}
			if (action === "remove-provider") {
				const provider = current().providers?.[route];
				await ctx.settings.mutate(ns, [{
					op: "unset",
					path: ["providers", route]
				}], expectedRevision);
				if (provider) await ctx.credentials.unset(credentialRef(provider.apiKeyEnv));
				reply(res, 200, { ok: true });
				return;
			}
			assertNever(action);
		} catch (error) {
			const code = failureCode(error);
			reply(res, error instanceof RelayHttpError ? error.status : code === "SETTINGS_CONFLICT" ? 409 : 400, {
				ok: false,
				error: error instanceof Error ? error.message : String(error),
				...code ? { code } : {}
			});
		}
	};
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: PATH,
		handler
	}), "relay-models: Web configuration API");
}

//#endregion
//#region src/index.ts
const name = "relay-models";
const inject = [
	"llm",
	"settings",
	"credentials",
	"webServer"
];
const NS = settingsNamespace("llm-relay-models");
const officialReference = Schema.object({
	provider: Schema.string().required(),
	id: Schema.string().required()
});
const providerConfig = Schema.object({
	displayName: Schema.string().required(),
	baseURL: Schema.string().required(),
	apiKeyEnv: Schema.string().required().role("credential-ref"),
	fallbackProtocol: Schema.union(RELAY_PROTOCOLS).required(),
	modelIds: Schema.array(Schema.string()).default([]),
	modelMappings: Schema.dict(officialReference).default({}),
	protocolOverrides: Schema.dict(Schema.union(RELAY_PROTOCOLS)).default({}),
	excludedModels: Schema.array(Schema.string()).default([]),
	headers: Schema.dict(Schema.string()).default({}),
	transport: Schema.union(RELAY_TRANSPORTS),
	streamIdleTimeoutMs: Schema.number().min(Number.MIN_VALUE).max(MAX_TIMER_DELAY_MS).default(DEFAULT_STREAM_IDLE_TIMEOUT_MS),
	maxRequestImageBytes: Schema.number().step(1).min(1).default(DEFAULT_MAX_REQUEST_IMAGE_BYTES),
	requestImagePixelBudget: Schema.number().step(1).min(1).default(DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET),
	requestImageMaxBytes: Schema.number().step(1).min(1).default(DEFAULT_REQUEST_IMAGE_MAX_BYTES),
	retryPolicy: RetryPolicySchema,
	syncedAt: Schema.natural()
});
const Config = Schema.object({
	providers: Schema.dict(providerConfig).default({}),
	trustedHosts: Schema.array(Schema.string()).default([])
});
function liveReservedProviderIds() {
	return new Set([...RESERVED_PROVIDER_IDS, ...getBuiltinProviders()]);
}
function validateProvider(route, config) {
	assertUnreservedProviderId(route, liveReservedProviderIds());
	if (!config.displayName.trim()) throw new Error(`Relay provider "${route}" needs a display name`);
	normalizeBaseURL(config.baseURL);
	if (config.apiKeyEnv !== relayCredentialRef(route)) throw new Error(`Relay provider "${route}" must use credential reference ${relayCredentialRef(route)}`);
	assertSafeHeaders(config.headers ?? {});
	for (const remoteId of Object.keys(config.modelMappings)) if (!remoteId.trim()) throw new Error(`Relay provider "${route}" has an empty remote model mapping key`);
	for (const remoteId of Object.keys(config.protocolOverrides)) if (!remoteId.trim()) throw new Error(`Relay provider "${route}" has an empty protocol override key`);
}
/**
* Refuse a section this plugin could not serve, at the write that stores it.
* Materialization is part of the check because that is where an unserviceable
* protocol or model fails: without it a schema-valid provider would be stored,
* the swap below would refuse it, and the page would report a successful save
* of a route that is not registered.
* @param config - the resolved section, schema-valid by construction.
*/
function validateConfig(config) {
	for (const [route, provider] of Object.entries(config.providers)) validateProvider(route, provider);
	resolveProfiles(config, currentOfficialCatalog().models, () => void 0);
}
function resolveProfile(provider, source, catalog, speedFor) {
	const profile = {
		provider,
		displayName: source.displayName,
		apiKeyEnv: credentialRef(source.apiKeyEnv),
		streamIdleTimeoutMs: source.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS,
		maxRequestImageBytes: source.maxRequestImageBytes ?? DEFAULT_MAX_REQUEST_IMAGE_BYTES,
		requestImagePixelBudget: source.requestImagePixelBudget ?? DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET,
		requestImageMaxBytes: source.requestImageMaxBytes ?? DEFAULT_REQUEST_IMAGE_MAX_BYTES,
		retryPolicy: resolveRetryPolicy(source.retryPolicy, `relay-models: provider "${provider}" retry policy`),
		piProvider: buildRelayProvider(provider, source, catalog, speedFor),
		configuredMaxTokens: /* @__PURE__ */ new Map()
	};
	if (source.headers && Object.keys(source.headers).length > 0) profile.headers = { ...source.headers };
	if (source.transport) profile.transport = source.transport;
	return profile;
}
function resolveProfiles(config, catalog, speedFor) {
	const profiles = /* @__PURE__ */ new Map();
	for (const [provider, source] of Object.entries(config.providers)) profiles.set(provider, resolveProfile(provider, source, catalog, speedFor));
	return profiles;
}
function apply(ctx, config) {
	const speed = new SpeedController();
	const speedFor = (options) => speed.get(options?.sessionId);
	let current = () => config;
	let profiles = resolveProfiles(config, currentOfficialCatalog().models, speedFor);
	/**
	* The key one request authenticates with, or undefined for a relay that takes
	* none — a self-hosted gateway on loopback is the case, and the page shows
	* such a provider as having no key.
	*
	* Handing pi-ai `undefined` cannot leak an unrelated ambient key here the way
	* it can for an installed catalog route: {@link buildRelayProvider} gives
	* every relay route one `apiKey` method whose resolver answers from this
	* credential alone, so an absent key means no `Authorization` header rather
	* than provider-native environment discovery.
	* @param profile - the resolved profile naming the credential reference.
	* @returns the usable key, or undefined when none is stored.
	*/
	const resolveApiKey = async (_provider, profile) => {
		const ref = String(profile.apiKeyEnv);
		const hit = (await ctx.credentials.resolve(credentialRef(ref)))?.value;
		return hit ? assertUsableApiKey(hit, "relay-models", ref) : void 0;
	};
	const adapter = new PiAiAdapter({
		profiles: () => profiles,
		resolveApiKey,
		auth: relayAuthInjection(ctx),
		resolveAttachments: () => ctx.get("attachments"),
		onReplayDegrade: ({ provider, model, reason }) => {
			ctx.logger.warn(`relay-models: unusable replay state on assistant history for route "${provider}/${model}"; sending that message as provider-neutral content (${reason})`);
		}
	});
	let registration;
	let directory;
	const directoryEntries = () => Object.entries(current().providers).map(([provider, source]) => ({
		provider,
		displayName: source.displayName,
		settingsNs: NS,
		settingsPath: ["providers", provider],
		declared: true
	}));
	const refreshDirectory = () => {
		const entries = directoryEntries();
		try {
			if (!directory && entries.length > 0) directory = ctx.llm.registerConfigurableProviders(entries);
			else if (directory) directory.replace(entries);
		} catch (error) {
			ctx.logger.error("relay-models: keeping the previous configurable-provider directory after a refused update");
			ctx.logger.error(error);
		}
	};
	const refresh = () => {
		const next = resolveProfiles(current(), currentOfficialCatalog().models, speedFor);
		const routes = [...next.keys()];
		const previous = profiles;
		profiles = next;
		try {
			if (!registration && routes.length > 0) registration = ctx.llm.registerAdapter(routes, adapter);
			else if (registration) registration.replace(routes);
		} catch (error) {
			profiles = previous;
			throw error;
		}
	};
	const safeRefresh = () => {
		try {
			refresh();
		} catch (error) {
			ctx.logger.error("relay-models: keeping the previously registered routes after a refused update");
			ctx.logger.error(error);
		}
		refreshDirectory();
	};
	refresh();
	refreshDirectory();
	ctx.llm.registerModelDiscovery(NS, async (request) => {
		const stored = request.provider ? current().providers[request.provider] : void 0;
		const baseURL = stored?.baseURL ?? request.baseURL;
		const protocol = (isRelayProtocol(request.api) ? request.api : void 0) ?? stored?.fallbackProtocol ?? "openai-completions";
		if (!baseURL) throw new LlmError("Relay model discovery needs a Base URL", "DISCOVERY_FAILED");
		const storedKey = stored ? (await ctx.credentials.resolve(credentialRef(stored.apiKeyEnv)))?.value : void 0;
		return discoverRelayModels({
			baseURL,
			api: protocol,
			apiKey: request.apiKey ?? storedKey,
			...stored?.headers && Object.keys(stored.headers).length > 0 ? { headers: stored.headers } : {},
			...request.signal ? { signal: request.signal } : {}
		});
	});
	ctx.effect(() => {
		const controller = new AbortController();
		refreshOfficialCatalog(controller.signal).then(() => {
			if (!controller.signal.aborted) safeRefresh();
		}).catch((error) => {
			if (!controller.signal.aborted) ctx.logger.warn("relay-models: using bundled model catalog because pi.dev refresh failed: %s", String(error));
		});
		return () => {
			controller.abort();
		};
	}, "relay-models: refresh pi.dev model catalog");
	installSettingsSection(ctx, NS, Config, config, {
		validate: validateConfig,
		setSource: (source) => {
			current = source;
		},
		onChange: safeRefresh
	});
	installWebApi(ctx, NS, () => current(), safeRefresh, speed);
}

//#endregion
export { Config, apply, inject, name };