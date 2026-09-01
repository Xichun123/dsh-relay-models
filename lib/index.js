import { credentialRef, isCredentialRefName } from "@deepseek-ai/dsh-credentials";
import Schema from "@deepseek-ai/schemastery";
import { INVALID_CREDENTIAL_CODE, LlmError, RetryPolicySchema, assertUsableApiKey, attributionHeaders, normalizeApiKey, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { MAX_TIMER_DELAY_MS } from "@deepseek-ai/dsh-timeout";
import { builtinProviders, getBuiltinModels, getBuiltinProviders } from "@earendil-works/pi-ai/providers/all";
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
	return Buffer.concat(chunks).toString("utf8");
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
			headers: { accept: "application/json" },
			signal: signal ? AbortSignal.any([signal, timeout]) : timeout
		});
		if (!response.ok) throw new Error(`${CATALOG_URL} answered ${response.status}`);
		const models = parseOfficialCatalog(JSON.parse(await readBoundedText(response, CATALOG_URL, MAX_CATALOG_BYTES)));
		expiresAt = Date.now() + CACHE_MS;
		snapshot = {
			models,
			source: "remote"
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
* The logical RPC channel the settings page is served on. Connection owns the
* physical route, its browser-trust fence, and its authentication; both halves
* only have to agree on this string.
*/
const RELAY_CHANNEL = "/relay-models";
/**
* The Codex speed tiers a session may choose, in the order the Speed menu lists
* them. Only `priority` — the canonical `service_tier` for Fast mode, and the
* value Codex CLI sends for `/fast`. The `fast` spelling is an alias the public
* API accepts, but pi-ai prices and echo-corrects only `priority` and `flex`,
* so sending `fast` would silently record the turn at the standard rate.
* Choosing none keeps `service_tier` out of the body, which is what every other
* DSH route does.
*/
const RELAY_SERVICE_TIERS = ["priority"];
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
/**
* DSH routes that no pi-ai provider entry names, so no live provider list can
* report them. Every other official id is read from the installed pi-ai build
* (the node half) or from the model catalog the page already holds, which is
* why this set holds one entry instead of a copy of pi-ai's registry going
* stale on every release.
*/
const RESERVED_PROVIDER_IDS = new Set(["deepseek-official"]);
const SECRET_HEADER = /^(authorization|api-key|x-api-key|proxy-authorization)$/iu;
function validateProviderId(raw) {
	const id = raw.trim().toLowerCase();
	if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id)) throw new Error("Provider ID must start with a letter and contain lowercase letters, numbers, or hyphens");
	return id;
}
/**
* Accept a provider id no other route already owns.
* @param raw - the id typed into the page or stored in settings.
* @param taken - official ids this caller knows: the installed pi-ai providers
* on the node half, the catalog's providers on the page.
* @returns the normalized id.
*/
function assertUnreservedProviderId(raw, taken = /* @__PURE__ */ new Set()) {
	const id = validateProviderId(raw);
	if (RESERVED_PROVIDER_IDS.has(id) || taken.has(id)) throw new Error(`Provider ID "${id}" is reserved by DeepSeek Harness; use a relay-* name`);
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
/**
* How much one catalog entry is preferred when several official models share a
* remote id. `openai-codex` ranks first: those ids are the Codex family, and
* Codex Responses is the only wire that carries `service_tier`, so a bare
* `gpt-5.6-sol` from a relay lands on Codex rather than plain Responses. A
* relay that speaks only plain Responses needs `protocolOverrides` for that
* model, or a `modelMappings` entry naming the `openai` catalog copy.
*/
function sourceRank(model) {
	if (model.provider === "openai-codex") return 0;
	if (model.provider === "anthropic" || model.provider === "openai") return 1;
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
	const record$1 = payload ?? {};
	const nested = record$1.error?.message;
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
* Keep a tier through pi-ai's `streamSimple`: its base-options rebuild preserves
* `onPayload` but drops the API-specific `serviceTier`, so restore the wire field
* at the last hook before serialization. A caller's payload replacement still
* runs first and keeps authority when it already names `service_tier`.
*/
function preserveServiceTierPayload(options) {
	const serviceTier = options.serviceTier;
	if (serviceTier === void 0) return options;
	const onPayload = options.onPayload;
	return {
		...options,
		onPayload: async (payload, model) => {
			const replaced = await onPayload?.(payload, model);
			const body = replaced === void 0 ? payload : replaced;
			if (body === null || typeof body !== "object" || Array.isArray(body) || Object.hasOwn(body, "service_tier")) return body;
			return {
				...body,
				service_tier: serviceTier
			};
		}
	};
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
		streamSimple: (model, context, options) => base.streamSimple(model, context, preserveServiceTierPayload(codexRelayStreamOptions(route, speedFor, options)))
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
function record(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request payload must be a JSON object");
	return value;
}
function requiredString(value, field) {
	if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required`);
	return value;
}
function messageOf(error) {
	return error instanceof Error ? error.message : String(error);
}
/**
* Map one refusal onto the carrier's closed error taxonomy. A settings write
* refused for a stale revision is the one case the page recovers from on its
* own, and `settings-conflict` carries both revisions so it can re-read rather
* than parse a message.
* @param ns - this plugin's settings namespace.
* @param error - the thrown value.
* @returns the error branch to answer with.
*/
function refusal(ns, error) {
	const failure = error;
	if (failure?.code === "SETTINGS_CONFLICT" && typeof failure.expected === "number" && typeof failure.actual === "number") return {
		ok: false,
		error: {
			code: "settings-conflict",
			message: messageOf(error),
			details: {
				ns,
				expected: failure.expected,
				actual: failure.actual
			}
		}
	};
	return {
		ok: false,
		error: {
			code: "settings-rejected",
			message: messageOf(error),
			details: { ns }
		}
	};
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
	const serve = async (endpoint, payload, signal) => {
		const input = record(payload);
		switch (endpoint) {
			case "state": return {
				ok: true,
				value: await state()
			};
			case "catalog": {
				const previous = currentOfficialCatalog();
				const value = await refreshOfficialCatalog(signal).catch(() => currentOfficialCatalog());
				if (value !== previous) onCatalogRefresh();
				return {
					ok: true,
					value
				};
			}
			case "discover": {
				const target = resolveDiscoveryTarget(input, current());
				const stored = target.providerId ? current().providers[target.providerId] : void 0;
				const storedApiKey = target.useStoredKey && !target.apiKey && stored ? (await ctx.credentials.resolve(credentialRef(stored.apiKeyEnv)))?.value : void 0;
				return {
					ok: true,
					value: (await discoverRelayModels({
						baseURL: target.baseURL,
						api: target.protocol,
						apiKey: target.apiKey ?? storedApiKey,
						...target.headers ? { headers: target.headers } : {},
						signal
					})).map((model) => model.id)
				};
			}
			case "get-speed": return {
				ok: true,
				value: { tier: speed.get(requiredString(input.sessionId, "sessionId")) ?? null }
			};
			case "set-speed": {
				const sessionId = requiredString(input.sessionId, "sessionId");
				const raw = input.tier;
				if (raw !== null && raw !== void 0 && !RELAY_SERVICE_TIERS.includes(String(raw))) throw new Error(`Invalid speed tier: ${String(raw)}`);
				speed.set(sessionId, raw ?? void 0);
				return {
					ok: true,
					value: null
				};
			}
			case "set-provider": {
				const route = requiredString(input.route, "route");
				const provider = record(input.provider);
				await ctx.settings.mutate(ns, [{
					op: "set",
					path: ["providers", route],
					value: provider
				}], revisionOf(input));
				if (typeof input.apiKey === "string" && input.apiKey.trim()) await ctx.credentials.set(credentialRef(provider.apiKeyEnv), input.apiKey.trim());
				return {
					ok: true,
					value: null
				};
			}
			case "remove-provider": {
				const route = requiredString(input.route, "route");
				const provider = current().providers[route];
				await ctx.settings.mutate(ns, [{
					op: "unset",
					path: ["providers", route]
				}], revisionOf(input));
				if (provider) await ctx.credentials.unset(credentialRef(provider.apiKeyEnv));
				return {
					ok: true,
					value: null
				};
			}
			default: throw new Error(`Unknown endpoint: ${endpoint}`);
		}
	};
	ctx.effect(() => {
		const dispose = ctx.connection.rpc.handle(RELAY_CHANNEL, async (endpoint, payload, signal) => serve(endpoint, payload, signal).catch((error) => refusal(ns, error)), { authority: "trusted-host" });
		return () => {
			dispose();
		};
	}, "relay-models: Web configuration channel");
}
function revisionOf(input) {
	return typeof input.expectedRevision === "number" ? input.expectedRevision : void 0;
}

//#endregion
//#region src/index.ts
const name = "relay-models";
const inject = [
	"llm",
	"settings",
	"credentials",
	"connection"
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
	retryPolicy: RetryPolicySchema,
	syncedAt: Schema.natural()
});
const Config = Schema.object({ providers: Schema.dict(providerConfig).default({}) });
/**
* Every provider id the installed pi-ai build ships, read live so a pi-ai
* release that adds one is covered without editing this plugin.
* `builtinProviders()` rather than `getBuiltinProviders()` because a provider
* with a dynamically refreshed catalog (`radius`) owns no static model table
* and is missing from the latter.
*/
function liveReservedProviderIds() {
	return new Set(builtinProviders().map((provider) => provider.id));
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
		maxRequestImageBytes: DEFAULT_MAX_REQUEST_IMAGE_BYTES,
		requestImagePixelBudget: DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET,
		requestImageMaxBytes: DEFAULT_REQUEST_IMAGE_MAX_BYTES,
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