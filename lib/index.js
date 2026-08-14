import { credentialRef } from "@deepseek-ai/dsh-credentials";
import z from "@deepseek-ai/schemastery";
import { LlmError, assertUsableApiKey, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { createProvider } from "@earendil-works/pi-ai";
import { getBuiltinModels, getBuiltinProviders } from "@earendil-works/pi-ai/providers/all";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { openAIResponsesApi } from "@earendil-works/pi-ai/api/openai-responses.lazy";

//#region src/shared/core.ts
const PROTOCOLS = [
	"openai-completions",
	"openai-responses",
	"anthropic-messages"
];
function relayProtocols() {
	return PROTOCOLS;
}
function isRelayProtocol(value) {
	return PROTOCOLS.some((protocol) => protocol === value);
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
	if (protocol !== "anthropic-messages") return normalized;
	const parsed = new URL(normalized);
	if (parsed.pathname.endsWith("/v1")) parsed.pathname = parsed.pathname.slice(0, -3) || "/";
	return parsed.toString().replace(/\/$/u, "");
}
function validateProviderId(raw) {
	const id = raw.trim().toLowerCase();
	if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id)) throw new Error("Provider ID must start with a letter and contain lowercase letters, numbers, or hyphens");
	return id;
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
	if (source.provider === "anthropic" || source.api === "anthropic-messages") return "anthropic-messages";
	if (source.provider === "openai" || source.provider === "openai-codex" || source.api === "openai-responses" || source.api === "openai-codex-responses" || source.api === "azure-openai-responses") return "openai-responses";
	return "openai-completions";
}
function resolveOfficialModel(remoteId, config, catalog) {
	const reference = config.modelMappings[remoteId];
	if (reference) return catalog.find((model) => model.provider === reference.provider && model.id === reference.id);
	return catalogIndex(catalog).get(remoteId);
}

//#endregion
//#region src/materialize.ts
const DEFAULT_COST = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0
};
const FULL_CATALOG = getBuiltinProviders().flatMap((provider) => getBuiltinModels(provider));
const OFFICIAL_SUMMARIES = FULL_CATALOG.map((model) => ({
	provider: model.provider,
	id: model.id,
	name: model.name,
	api: model.api,
	contextWindow: model.contextWindow,
	maxTokens: model.maxTokens,
	reasoning: model.reasoning,
	input: [...model.input]
}));
const HEADER_PROFILES = {
	claude: {
		"user-agent": "claude-cli/2.1.198 (external, sdk-cli)",
		"x-app": "cli",
		"anthropic-beta": "claude-code-20250219,interleaved-thinking-2025-05-14"
	},
	claudeLongContext: {
		"user-agent": "claude-cli/2.1.198 (external, sdk-cli)",
		"x-app": "cli",
		"anthropic-beta": "claude-code-20250219,context-1m-2025-08-07,interleaved-thinking-2025-05-14"
	},
	codex: { "user-agent": "codex_cli_rs/0.144.1 (Mac OS 15.7.7; arm64) ghostty/1.3.1" }
};
function headersFor(model) {
	if (model.api === "openai-responses") return HEADER_PROFILES.codex;
	if (model.api === "anthropic-messages") return model.contextWindow >= 1e6 ? HEADER_PROFILES.claudeLongContext : HEADER_PROFILES.claude;
	if (model.api === "openai-completions") return HEADER_PROFILES.claude;
}
function fullSource(summary) {
	const source = FULL_CATALOG.find((model) => model.provider === summary.provider && model.id === summary.id);
	if (!source) throw new Error(`Official model disappeared: ${summary.provider}/${summary.id}`);
	return source;
}
function matchedModel(route, config, id, source, protocol) {
	const copied = structuredClone(source);
	delete copied.headers;
	const model = {
		...copied,
		id,
		provider: route,
		api: protocol,
		baseUrl: baseURLForProtocol(config.baseURL, protocol)
	};
	const headers = headersFor(model);
	return headers ? {
		...model,
		headers
	} : model;
}
function fallbackModel(route, config, id, protocol) {
	const model = {
		id,
		name: id,
		provider: route,
		api: protocol,
		baseUrl: baseURLForProtocol(config.baseURL, protocol),
		reasoning: false,
		input: ["text"],
		cost: { ...DEFAULT_COST },
		contextWindow: 128e3,
		maxTokens: 16384
	};
	const headers = headersFor(model);
	return headers ? {
		...model,
		headers
	} : model;
}
function materializeModels(route, config) {
	const excluded = new Set(config.excludedModels);
	return [...new Set(config.modelIds.map((id) => id.trim()).filter(Boolean))].filter((id) => !excluded.has(id)).map((id) => {
		const summary = resolveOfficialModel(id, config, OFFICIAL_SUMMARIES);
		const protocol = config.protocolOverrides[id] ?? inferProtocol(summary, config.fallbackProtocol);
		return summary ? matchedModel(route, config, id, fullSource(summary), protocol) : fallbackModel(route, config, id, protocol);
	});
}
function buildRelayProvider(route, config) {
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
		models: materializeModels(route, config),
		api: {
			"openai-completions": openAICompletionsApi(),
			"openai-responses": openAIResponsesApi(),
			"anthropic-messages": anthropicMessagesApi()
		}
	});
}

//#endregion
//#region src/discovery.ts
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
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
async function boundedText(response, url) {
	const declared = Number(response.headers.get("content-length") ?? NaN);
	if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) {
		await response.body?.cancel();
		throw new LlmError(`${url} answered with more than ${MAX_RESPONSE_BYTES} bytes`, "DISCOVERY_FAILED");
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
			if (total > MAX_RESPONSE_BYTES) throw new LlmError(`${url} answered with more than ${MAX_RESPONSE_BYTES} bytes`, "DISCOVERY_FAILED");
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
async function discoverRelayModels(request, storedApiKey) {
	const baseURL = request.baseURL;
	if (!baseURL) throw new LlmError("Relay model discovery needs a Base URL", "DISCOVERY_FAILED");
	const protocol = request.api ?? "openai-completions";
	if (!isRelayProtocol(protocol)) throw new LlmError(`Unsupported relay protocol: ${protocol}`, "DISCOVERY_UNSUPPORTED");
	const apiKey = request.apiKey?.trim() || await storedApiKey?.();
	let lastError = "";
	for (const url of modelsEndpoints(baseURL)) {
		let response;
		try {
			response = await fetch(url, {
				headers: authHeaders(protocol, apiKey),
				...request.signal ? { signal: request.signal } : {}
			});
		} catch (error) {
			if (request.signal?.aborted) throw new LlmError("Relay model discovery aborted", "ABORTED", { cause: error });
			throw new LlmError(`Could not reach ${url}`, "DISCOVERY_FAILED", { cause: error });
		}
		if (!response.ok) {
			lastError = `${url} answered ${response.status}${response.status === 401 || response.status === 403 ? "; check the API key" : ""}`;
			if (response.status === 404 || response.status === 405) continue;
			throw new LlmError(lastError, "DISCOVERY_FAILED");
		}
		let payload;
		try {
			payload = JSON.parse(await boundedText(response, url));
		} catch (error) {
			if (error instanceof LlmError) throw error;
			throw new LlmError(`${url} did not answer with a valid model listing`, "DISCOVERY_FAILED", { cause: error });
		}
		return parseModelIds(payload).map((id) => ({ id }));
	}
	throw new LlmError(lastError || "Relay model discovery failed", "DISCOVERY_FAILED");
}

//#endregion
//#region src/web-api.ts
const PATH = "/relay-models/api";
const MAX_BODY_BYTES = 1024 * 1024;
function reply(res, status, value) {
	const body = JSON.stringify(value);
	res.statusCode = status;
	res.setHeader("content-type", "application/json; charset=utf-8");
	res.setHeader("cache-control", "no-store");
	res.end(body);
}
function sameOrigin(req) {
	const origin = req.headers.origin;
	const host = req.headers.host;
	if (!origin || !host) return true;
	return origin === `http://${host}` || origin === `https://${host}`;
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
function installWebApi(ctx, ns, current) {
	const state = async () => {
		const descriptor = ctx.settings.describe({ redactSecrets: true }).find((item) => item.ns === ns);
		if (!descriptor) throw new Error("Relay settings are not ready");
		const config = current();
		const credentials = Object.fromEntries(await Promise.all([...new Set(Object.values(config.providers ?? {}).map((provider) => provider.apiKeyEnv))].map(async (ref) => [ref, await ctx.credentials.describe(credentialRef(ref))])));
		return {
			config,
			revision: descriptor.revision,
			writable: ctx.settings.writable,
			credentials
		};
	};
	const handler = async (req, res) => {
		if (!sameOrigin(req)) {
			reply(res, 403, {
				ok: false,
				error: "Cross-origin relay configuration requests are refused"
			});
			return;
		}
		try {
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
			if (action === "discover") {
				const protocol = requiredString(input.protocol, "protocol");
				if (!isRelayProtocol(protocol)) throw new Error("Invalid relay protocol");
				reply(res, 200, {
					ok: true,
					value: (await discoverRelayModels({
						provider: typeof input.provider === "string" ? input.provider : void 0,
						baseURL: requiredString(input.baseURL, "baseURL"),
						api: protocol,
						apiKey: typeof input.apiKey === "string" ? input.apiKey : void 0
					}, async () => {
						const provider = typeof input.provider === "string" ? current().providers?.[input.provider] : void 0;
						if (!provider) return void 0;
						return (await ctx.credentials.resolve(credentialRef(provider.apiKeyEnv)))?.value;
					})).map((model) => model.id)
				});
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
				reply(res, 200, {
					ok: true,
					value: await state()
				});
				return;
			}
			if (action === "remove-provider") {
				const provider = current().providers?.[route];
				await ctx.settings.mutate(ns, [{
					op: "unset",
					path: ["providers", route]
				}], expectedRevision);
				if (provider) await ctx.credentials.unset(credentialRef(provider.apiKeyEnv));
				reply(res, 200, {
					ok: true,
					value: await state()
				});
				return;
			}
			throw new Error(`Unknown action: ${action}`);
		} catch (error) {
			reply(res, 400, {
				ok: false,
				error: error instanceof Error ? error.message : String(error)
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
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 3e5;
const officialReference = z.object({
	provider: z.string().required(),
	id: z.string().required()
});
const providerConfig = z.object({
	displayName: z.string().required(),
	baseURL: z.string().required(),
	apiKeyEnv: z.string().required().role("credential-ref"),
	fallbackProtocol: z.union(relayProtocols()).required(),
	modelIds: z.array(z.string()).default([]),
	modelMappings: z.dict(officialReference).default({}),
	protocolOverrides: z.dict(z.union(relayProtocols())).default({}),
	excludedModels: z.array(z.string()).default([]),
	syncedAt: z.natural()
});
const Config = z.object({ providers: z.dict(providerConfig).default({}) });
function validateProvider(route, config) {
	if (validateProviderId(route) !== route) throw new Error(`Relay provider route must be normalized: ${route}`);
	if (!config.displayName.trim()) throw new Error(`Relay provider "${route}" needs a display name`);
	normalizeBaseURL(config.baseURL);
	if (config.apiKeyEnv !== relayCredentialRef(route)) throw new Error(`Relay provider "${route}" must use credential reference ${relayCredentialRef(route)}`);
	if (!isRelayProtocol(config.fallbackProtocol)) throw new Error(`Relay provider "${route}" has an invalid fallback protocol`);
	const catalog = new Set(OFFICIAL_SUMMARIES.map((model) => `${model.provider}/${model.id}`));
	for (const [remoteId, reference] of Object.entries(config.modelMappings)) {
		if (!remoteId.trim()) throw new Error(`Relay provider "${route}" has an empty remote model mapping key`);
		if (!catalog.has(`${reference.provider}/${reference.id}`)) throw new Error(`Relay provider "${route}" maps "${remoteId}" to unknown model ${reference.provider}/${reference.id}`);
	}
	for (const [remoteId, protocol] of Object.entries(config.protocolOverrides)) if (!remoteId.trim() || !isRelayProtocol(protocol)) throw new Error(`Relay provider "${route}" has an invalid protocol override`);
	buildRelayProvider(route, config);
}
function validateConfig(config) {
	for (const [route, provider] of Object.entries(config.providers ?? {})) validateProvider(route, provider);
}
function resolveProfiles(config) {
	validateConfig(config);
	const profiles = /* @__PURE__ */ new Map();
	for (const [provider, source] of Object.entries(config.providers ?? {})) profiles.set(provider, {
		provider,
		displayName: source.displayName,
		apiKeyEnv: source.apiKeyEnv,
		streamIdleTimeoutMs: DEFAULT_STREAM_IDLE_TIMEOUT_MS,
		retryPolicy: resolveRetryPolicy(void 0, `relay-models: provider "${provider}" retry policy`),
		piProvider: buildRelayProvider(provider, source),
		configuredMaxTokens: /* @__PURE__ */ new Map()
	});
	return profiles;
}
function apply(ctx, config) {
	let current = () => config;
	let profiles = resolveProfiles(config);
	const resolveApiKey = async (provider, profile) => {
		const ref = String(profile.apiKeyEnv ?? "");
		const hit = ref ? (await ctx.credentials.resolve(credentialRef(ref)))?.value : void 0;
		if (hit) return assertUsableApiKey(hit, "relay-models", ref);
		throw new LlmError(`relay-models: no credential for provider "${provider}"; store ${ref || "its configured API key reference"} on the Relay Models page`, "MISSING_CREDENTIAL");
	};
	const adapter = new PiAiAdapter({
		profiles: () => profiles,
		resolveApiKey,
		resolveAttachments: () => ctx.get("attachments")
	});
	let registration;
	const refresh = () => {
		const next = resolveProfiles(current());
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
	refresh();
	const storedApiKey = async (provider) => {
		if (!provider) return void 0;
		const profile = current().providers?.[provider];
		if (!profile) return void 0;
		return (await ctx.credentials.resolve(credentialRef(profile.apiKeyEnv)))?.value;
	};
	ctx.llm.registerModelDiscovery(NS, (request) => discoverRelayModels(request, () => storedApiKey(request.provider)));
	installSettingsSection(ctx, NS, Config, config, {
		validate: validateConfig,
		setSource: (source) => {
			current = source;
		},
		onChange: refresh
	});
	installWebApi(ctx, NS, () => current());
}

//#endregion
export { Config, apply, inject, name };