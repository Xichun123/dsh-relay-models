window.__ModuleLoader__.load({ id: "dsh-relay-models", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);
let __deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
__deepseek_ai_dsh_client_ui_primitives = __toESM(__deepseek_ai_dsh_client_ui_primitives);
let react_jsx_runtime = require("react/jsx-runtime");
react_jsx_runtime = __toESM(react_jsx_runtime);

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
	for (const name of Object.keys(headers)) if (SECRET_HEADER.test(name)) throw new Error(`Header "${name}" cannot carry credentials; store the API key in the credentials field`);
}
function parseHeaderLines(raw) {
	const headers = {};
	for (const line of raw.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const match = trimmed.match(/^([^:=]+)[:=](.*)$/u);
		if (!match) throw new Error(`Invalid header line: ${trimmed}`);
		const name = match[1].trim();
		if (!name) throw new Error("Header name cannot be empty");
		headers[name] = match[2].trim();
	}
	assertSafeHeaders(headers);
	return headers;
}
function formatHeaderLines(headers) {
	return Object.entries(headers).map(([name, value]) => `${name}: ${value}`).join("\n");
}
function relayCredentialRef(route) {
	return `${validateProviderId(route).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}
function suggestProviderIdentity(rawBaseURL, existingIds) {
	const hostname = new URL(normalizeBaseURL(rawBaseURL)).hostname.toLowerCase();
	const generic = new Set([
		"api",
		"www",
		"gateway",
		"proxy",
		"openai",
		"anthropic",
		"ai",
		"v1",
		"com",
		"net",
		"org",
		"io",
		"cn"
	]);
	const labels = hostname.split(".").filter(Boolean);
	const brand = /^[\d.]+$/u.test(hostname) || hostname.startsWith("[") ? "local" : labels.find((label) => !generic.has(label)) ?? labels[0] ?? "relay";
	const stem = `relay-${brand.replace(/[^a-z0-9]+/gu, "-")}`;
	let id = validateProviderId(stem);
	for (let suffix = 2; existingIds.has(id); suffix += 1) id = `${stem}-${suffix}`;
	const readable = brand.split(/[-_]+/u).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
	return {
		id,
		name: `${readable || "Model"} Relay`
	};
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
function normalizeModelName(value) {
	return value.toLowerCase().replace(/^.*\//u, "").replace(/(?:^|[-_.])20\d{6}$/u, "").replace(/[^a-z0-9]+/gu, "");
}
/**
* Official models whose normalized id contains the remote one or is contained
* by it — a release-dated or vendor-prefixed spelling of the same model. This
* is a shortlist, not a search: the mapping panel searches the whole catalog by
* hand when none of these is the right model.
* @param remoteModelId - the id the relay serves.
* @param catalog - official metadata to match against.
* @param limit - how many candidates to offer.
* @returns the closest candidates, nearest length first.
*/
function suggestOfficialCandidates(remoteModelId, catalog, limit = 3) {
	const needle = normalizeModelName(remoteModelId);
	if (!needle) return [];
	return catalog.filter((model) => {
		const normalized = normalizeModelName(model.id);
		return normalized !== "" && (needle.includes(normalized) || normalized.includes(needle));
	}).sort((a, b) => sourceRank(a) - sourceRank(b) || Math.abs(normalizeModelName(a.id).length - needle.length) - Math.abs(normalizeModelName(b.id).length - needle.length) || a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id)).slice(0, limit).map((model) => ({
		provider: model.provider,
		id: model.id,
		name: model.name,
		api: model.api
	}));
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
function relayModelStatuses(config, catalog) {
	const excluded = new Set(config.excludedModels);
	return [...new Set(config.modelIds.map((id) => id.trim()).filter(Boolean))].map((id) => {
		const source = resolveOfficialModel(id, config, catalog);
		const protocol = config.protocolOverrides[id] ?? inferProtocol(source, config.fallbackProtocol);
		return {
			id,
			...protocol ? { protocol } : {},
			...source ? { officialApi: source.api } : {},
			supported: protocol !== void 0,
			excluded: excluded.has(id),
			...source ? {
				metadataSource: {
					provider: source.provider,
					id: source.id
				},
				candidates: []
			} : { candidates: suggestOfficialCandidates(id, catalog) }
		};
	});
}
function updateExcludedModels(current, ids, excluded) {
	const values = new Set(current);
	for (const id of ids) excluded ? values.add(id) : values.delete(id);
	return [...values].sort();
}

//#endregion
//#region src/client/api.ts
/** A refusal the page can act on: {@link RelayApiError.code} names the cause. */
var RelayApiError = class extends Error {
	constructor(message, code) {
		super(message);
		this.code = code;
		this.name = "RelayApiError";
	}
};
/** The host's stale-revision refusal, which a reload clears. */
const RELAY_STALE_CODE = "settings-conflict";
let cachedPage;
let transport;
const speedListeners = /* @__PURE__ */ new Set();
/**
* Watch for a speed tier written anywhere on this page — the composer toggle or
* the /fast popup — so the toggle never shows a tier another surface replaced.
* @param listener - called after each successful write.
* @returns the unsubscribe handle.
*/
function onSpeedChanged(listener) {
	speedListeners.add(listener);
	return () => {
		speedListeners.delete(listener);
	};
}
/**
* Adopt the browser's Connection transport. Every call below rides the same
* fenced, authenticated channel the rest of the app uses, so this page owns no
* HTTP surface of its own.
* @param rpc - the `ctx.connection.rpc` caller.
*/
function bindRelayTransport(rpc) {
	transport = rpc;
}
async function request(endpoint, payload = {}) {
	if (!transport) throw new RelayApiError("The relay settings page is not connected to the harness");
	const result = await transport.call(RELAY_CHANNEL, endpoint, payload);
	if (!result.ok) throw new RelayApiError(result.error.message, result.error.code);
	return result.value;
}
function peekRelayPage() {
	return cachedPage;
}
function rememberRelayPage(next) {
	cachedPage = next;
	return next;
}
const relayPageApi = {
	load: async () => rememberRelayPage(await request("state")),
	catalog: async () => {
		const catalog = await request("catalog");
		if (cachedPage) cachedPage = {
			...cachedPage,
			catalog
		};
		return catalog;
	},
	setProvider: (route, provider, expectedRevision, apiKey) => request("set-provider", {
		route,
		provider,
		expectedRevision,
		...apiKey ? { apiKey } : {}
	}),
	removeProvider: (route, expectedRevision) => request("remove-provider", {
		route,
		expectedRevision
	}),
	discover: (input) => request("discover", input),
	getSpeed: async (sessionId) => (await request("get-speed", { sessionId })).tier,
	setSpeed: async (sessionId, tier) => {
		await request("set-speed", {
			sessionId,
			tier
		});
		for (const listener of speedListeners) listener();
	}
};

//#endregion
//#region src/client/locales.ts
/** Locale bundles for the relay models settings section. */
/** English copy. */
const en = {
	nav: "Relay models",
	title: "Relay models",
	empty: "No relay yet. Use “Add a relay” above.",
	retry: "Retry",
	add: "Add a relay",
	cancel: "Cancel",
	close: "Close",
	providerId: "Provider ID",
	providerIdPlaceholder: "relay-example",
	displayName: "Display name",
	displayNamePlaceholder: "Example Relay",
	baseURL: "Base URL",
	baseURLPlaceholder: "https://gateway.example/v1",
	suggestName: "Suggest",
	fallbackProtocol: "Protocol for unmatched models",
	apiKey: "API key",
	discoverAndAdd: "Discover models and add",
	discovering: "Discovering models…",
	needDisplayName: "Enter a display name",
	alreadyExists: "Provider {id} already exists",
	noModels: "The endpoint returned no models",
	keyConfigured: "Key configured",
	keyMissing: "No key",
	sync: "Sync",
	synced: "Model list synced",
	connection: "Connection",
	connectionCollapse: "Hide connection",
	models: "Models",
	remove: "Delete",
	removeConfirm: "Delete this provider, its configuration, and its managed key?",
	removeConfirmAction: "Confirm delete",
	summaryActive: "{count} usable models",
	summaryMatched: "{count} matched official metadata",
	summaryUnmatched: "{count} unmatched",
	summaryUnsupported: "{count} need a protocol override",
	summaryExcluded: "{count} excluded",
	summarySyncedAt: "Synced {at}",
	codexTransport: "Codex transport",
	replaceKey: "Replace API key (blank keeps it)",
	extraHeaders: "Extra request headers (Name: value per line; no keys. DSH owns User-Agent)",
	extraHeadersPlaceholder: "X-Custom: value",
	saveConnection: "Save connection settings",
	connectionSaved: "Connection settings saved",
	filterAll: "All",
	filterActive: "Usable",
	filterUnmatched: "Unmatched",
	filterUnsupported: "Needs override",
	filterExcluded: "Excluded",
	searchModels: "Filter by model ID or official source",
	showingCount: "Showing {shown} / {total}",
	modelCount: "{count} models",
	selectedCount: "{count} selected",
	exclude: "Exclude",
	restore: "Restore",
	excluded: "Excluded {count} models",
	restored: "Restored {count} models",
	autoProtocol: "Back to automatic protocol",
	applyProtocol: "Apply protocol",
	protocolApplied: "Protocol set for {count} models",
	protocolCleared: "Automatic protocol restored for {count} models",
	clearSelection: "Clear selection",
	protocolAutoOption: "Automatic: {value}",
	protocolUnsupportedApi: "{api} unsupported",
	columnModel: "Remote model",
	columnSource: "Metadata source",
	columnProtocol: "Effective protocol",
	columnActions: "Actions",
	selectVisible: "Select the current list",
	selectOne: "Select {id}",
	noMatches: "No model matches these filters.",
	unmatched: "Unmatched",
	manual: "Manual",
	needsOverride: "{api} needs an override",
	map: "Map by hand",
	unmap: "Clear mapping",
	mapSaved: "Manual mapping saved",
	unmapped: "Manual mapping cleared",
	searchCatalog: "Search official provider, model ID, or name",
	noCandidates: "No candidate; type a keyword to search the whole catalog.",
	protocolSaved: "Protocol override saved",
	protocolAuto: "Protocol back to automatic",
	excludedTag: "Excluded",
	protocolCompletions: "OpenAI Chat Completions",
	protocolResponses: "OpenAI Responses",
	protocolCodex: "Codex Responses (WS)",
	protocolAnthropic: "Anthropic Messages",
	protocolUnsupported: "Unsupported (needs an override)",
	transportAuto: "Automatic (WS first, SSE on failure)",
	transportWebsocket: "WebSocket",
	transportWebsocketCached: "WebSocket cached session",
	transportSse: "SSE",
	serviceTierUnset: "Standard",
	serviceTierFast: "Fast",
	speed: "Speed",
	commandFast: "Switch this session’s Codex speed tier",
	commandFastUnavailable: "The current model is not a Codex Responses relay model; /fast only applies to one",
	staleReloaded: "These settings changed elsewhere. The page reloaded them; try again."
};
/** Chinese copy. This dictionary defines the key set every other locale must match. */
const zh = {
	nav: "中转模型",
	title: "中转模型",
	empty: "还没有中转站。点击右上角“添加中转站”。",
	retry: "重试",
	add: "添加中转站",
	cancel: "取消",
	close: "关闭",
	providerId: "Provider ID",
	providerIdPlaceholder: "relay-example",
	displayName: "显示名称",
	displayNamePlaceholder: "Example Relay",
	baseURL: "Base URL",
	baseURLPlaceholder: "https://gateway.example/v1",
	suggestName: "生成名称",
	fallbackProtocol: "未匹配模型的默认协议",
	apiKey: "API Key",
	discoverAndAdd: "发现模型并添加",
	discovering: "正在发现模型…",
	needDisplayName: "请输入显示名称",
	alreadyExists: "Provider {id} 已存在",
	noModels: "端点没有返回模型",
	keyConfigured: "密钥已配置",
	keyMissing: "缺少密钥",
	sync: "同步",
	synced: "模型列表已同步",
	connection: "连接",
	connectionCollapse: "收起连接",
	models: "模型",
	remove: "删除",
	removeConfirm: "删除 Provider、配置和托管密钥？",
	removeConfirmAction: "确认删除",
	summaryActive: "{count} 个可用模型",
	summaryMatched: "{count} 个匹配官方元数据",
	summaryUnmatched: "{count} 个未匹配",
	summaryUnsupported: "{count} 个协议需覆盖",
	summaryExcluded: "{count} 个已排除",
	summarySyncedAt: "同步于 {at}",
	codexTransport: "Codex 传输",
	replaceKey: "替换 API Key（留空则保留）",
	extraHeaders: "额外请求头（每行 Name: value；不要放密钥。User-Agent 由 DSH 覆盖）",
	extraHeadersPlaceholder: "X-Custom: value",
	saveConnection: "保存连接设置",
	connectionSaved: "连接设置已保存",
	filterAll: "全部",
	filterActive: "可用",
	filterUnmatched: "未匹配",
	filterUnsupported: "需覆盖",
	filterExcluded: "已排除",
	searchModels: "筛选模型 ID 或官方来源",
	showingCount: "显示 {shown} / {total}",
	modelCount: "{count} 个模型",
	selectedCount: "已选 {count} 个",
	exclude: "排除",
	restore: "恢复",
	excluded: "已排除 {count} 个模型",
	restored: "已恢复 {count} 个模型",
	autoProtocol: "恢复自动协议",
	applyProtocol: "应用协议",
	protocolApplied: "已为 {count} 个模型设置协议",
	protocolCleared: "已为 {count} 个模型恢复自动协议",
	clearSelection: "取消选择",
	protocolAutoOption: "自动：{value}",
	protocolUnsupportedApi: "不支持 {api}",
	columnModel: "远端模型",
	columnSource: "元数据来源",
	columnProtocol: "实际协议",
	columnActions: "操作",
	selectVisible: "选择当前列表",
	selectOne: "选择 {id}",
	noMatches: "没有符合条件的模型。",
	unmatched: "未匹配",
	manual: "人工",
	needsOverride: "{api} 需覆盖",
	map: "人工映射",
	unmap: "取消映射",
	mapSaved: "人工映射已保存",
	unmapped: "人工映射已取消",
	searchCatalog: "搜索官方 Provider、模型 ID 或名称",
	noCandidates: "没有候选；输入关键词搜索完整目录。",
	protocolSaved: "协议覆盖已保存",
	protocolAuto: "协议已恢复自动选择",
	excludedTag: "已排除",
	protocolCompletions: "OpenAI Chat Completions",
	protocolResponses: "OpenAI Responses",
	protocolCodex: "Codex Responses（WS）",
	protocolAnthropic: "Anthropic Messages",
	protocolUnsupported: "不支持（需手动覆盖）",
	transportAuto: "自动（先 WS，失败回 SSE）",
	transportWebsocket: "WebSocket",
	transportWebsocketCached: "WebSocket 缓存会话",
	transportSse: "SSE",
	serviceTierUnset: "标准",
	serviceTierFast: "快速",
	speed: "速度",
	commandFast: "切换当前会话的 Codex 速度档",
	commandFastUnavailable: "当前模型不是 Codex Responses 中转模型；/fast 仅对此类模型可用",
	staleReloaded: "配置已在别处更新，页面已重新载入，请再试一次。"
};

//#endregion
//#region src/client/RelayModelsSection.tsx
function messageOf(error) {
	return error instanceof Error ? error.message : String(error);
}
/** Whether a refusal was the host rejecting a revision the page had already outgrown. */
function isStale(error) {
	return error?.code === RELAY_STALE_CODE;
}
function protocolLabel(t, protocol) {
	if (protocol === "anthropic-messages") return t("protocolAnthropic");
	if (protocol === "openai-codex-responses") return t("protocolCodex");
	if (protocol === "openai-responses") return t("protocolResponses");
	if (protocol === "openai-completions") return t("protocolCompletions");
	return t("protocolUnsupported");
}
function transportLabel(t, transport$1) {
	if (transport$1 === "websocket") return t("transportWebsocket");
	if (transport$1 === "websocket-cached") return t("transportWebsocketCached");
	if (transport$1 === "sse") return t("transportSse");
	return t("transportAuto");
}
function officialModel(reference, catalog) {
	return catalog.find((model) => model.provider === reference.provider && model.id === reference.id);
}
function AddProvider({ api, snapshot, t, open, onOpen, onDone }) {
	const [route, setRoute] = (0, react.useState)("");
	const [displayName, setDisplayName] = (0, react.useState)("");
	const [baseURL, setBaseURL] = (0, react.useState)("");
	const [protocol, setProtocol] = (0, react.useState)("openai-completions");
	const [apiKey, setApiKey] = (0, react.useState)("");
	const [busy, setBusy] = (0, react.useState)(false);
	const [error, setError] = (0, react.useState)();
	const suggest = () => {
		try {
			const value = suggestProviderIdentity(baseURL, new Set(Object.keys(snapshot.config.providers)));
			setRoute(value.id);
			if (!displayName) setDisplayName(value.name);
			setError(void 0);
		} catch (cause) {
			setError(messageOf(cause));
		}
	};
	const add = async () => {
		setBusy(true);
		setError(void 0);
		try {
			const id = assertUnreservedProviderId(route, new Set(snapshot.catalog.models.map((model) => model.provider)));
			if (snapshot.config.providers[id]) throw new Error(t("alreadyExists", { id }));
			if (!displayName.trim()) throw new Error(t("needDisplayName"));
			const modelIds = await api.discover({
				baseURL,
				protocol,
				...apiKey.trim() ? { apiKey: apiKey.trim() } : {}
			});
			if (modelIds.length === 0) throw new Error(t("noModels"));
			const provider = {
				displayName: displayName.trim(),
				baseURL: baseURL.trim(),
				apiKeyEnv: relayCredentialRef(id),
				fallbackProtocol: protocol,
				modelIds,
				modelMappings: {},
				protocolOverrides: {},
				excludedModels: [],
				headers: {},
				syncedAt: Date.now()
			};
			await api.setProvider(id, provider, snapshot.revision, apiKey.trim() || void 0);
			await onDone();
			onOpen(false);
			setRoute("");
			setDisplayName("");
			setBaseURL("");
			setApiKey("");
		} catch (cause) {
			setError(messageOf(cause));
		} finally {
			setBusy(false);
		}
	};
	if (!open) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
		variant: "primary",
		size: "sm",
		disabled: !snapshot.writable,
		onClick: () => {
			onOpen(true);
		},
		children: t("add")
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "drm-add",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-grid",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: t("providerId")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Input, {
							value: route,
							placeholder: t("providerIdPlaceholder"),
							onChange: (event) => {
								setRoute(event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: t("displayName")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Input, {
							value: displayName,
							placeholder: t("displayNamePlaceholder"),
							onChange: (event) => {
								setDisplayName(event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field wide",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: t("baseURL")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "drm-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Input, {
								className: "drm-grow",
								value: baseURL,
								placeholder: t("baseURLPlaceholder"),
								onChange: (event) => {
									setBaseURL(event.target.value);
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "outline",
								disabled: !baseURL,
								onClick: suggest,
								children: t("suggestName")
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: t("fallbackProtocol")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "drm-select",
							value: protocol,
							onChange: (event) => {
								setProtocol(event.target.value);
							},
							children: RELAY_PROTOCOLS.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value,
								children: protocolLabel(t, value)
							}, value))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: t("apiKey")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Input, {
							type: "password",
							autoComplete: "off",
							value: apiKey,
							onChange: (event) => {
								setApiKey(event.target.value);
							}
						})]
					})
				]
			}),
			error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-error",
				children: error
			}) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-actions",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					size: "sm",
					disabled: busy,
					onClick: () => {
						add();
					},
					children: busy ? t("discovering") : t("discoverAndAdd")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					size: "sm",
					disabled: busy,
					onClick: () => {
						onOpen(false);
						setError(void 0);
					},
					children: t("cancel")
				})]
			})
		]
	});
}
function matchesFilter(status, filter) {
	if (filter === "active") return !status.excluded && status.supported;
	if (filter === "unmatched") return !status.excluded && !status.metadataSource;
	if (filter === "unsupported") return !status.excluded && !status.supported;
	if (filter === "excluded") return status.excluded;
	return true;
}
function matchesQuery(status, query) {
	const needle = query.trim().toLowerCase();
	if (!needle) return true;
	return status.id.toLowerCase().includes(needle) || (status.metadataSource?.provider.toLowerCase().includes(needle) ?? false) || (status.metadataSource?.id.toLowerCase().includes(needle) ?? false);
}
function MappingEditor({ status, catalog, t, onMap, onClose }) {
	const [query, setQuery] = (0, react.useState)("");
	const results = (0, react.useMemo)(() => {
		if (!query.trim()) return status.candidates.map((candidate) => officialModel(candidate, catalog)).filter((model) => model !== void 0);
		const needle = query.trim().toLowerCase();
		return catalog.filter((model) => model.id.toLowerCase().includes(needle) || model.name.toLowerCase().includes(needle) || model.provider.toLowerCase().includes(needle)).slice(0, 30);
	}, [
		catalog,
		query,
		status
	]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "drm-map",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "drm-actions",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Input, {
				className: "drm-grow",
				autoFocus: true,
				value: query,
				placeholder: t("searchCatalog"),
				onChange: (event) => {
					setQuery(event.target.value);
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
				size: "sm",
				variant: "outline",
				onClick: onClose,
				children: t("close")
			})]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "drm-candidates",
			children: results.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "drm-muted",
				children: t("noCandidates")
			}) : results.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "drm-candidate",
				onClick: () => {
					onMap(model);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "drm-candidate-name",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: model.name }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "drm-route",
							children: [
								model.provider,
								"/",
								model.id
							]
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Pill, { children: model.api })]
			}, `${model.provider}/${model.id}`))
		})]
	});
}
function ModelManager({ provider, catalog, statuses, busy, error, notice, t, onSave }) {
	const [query, setQuery] = (0, react.useState)("");
	const [filter, setFilter] = (0, react.useState)("all");
	const [selected, setSelected] = (0, react.useState)(() => /* @__PURE__ */ new Set());
	const [batchProtocol, setBatchProtocol] = (0, react.useState)("");
	const [mappingModel, setMappingModel] = (0, react.useState)();
	const counts = (0, react.useMemo)(() => ({
		all: statuses.length,
		active: statuses.filter((status) => matchesFilter(status, "active")).length,
		unmatched: statuses.filter((status) => matchesFilter(status, "unmatched")).length,
		unsupported: statuses.filter((status) => matchesFilter(status, "unsupported")).length,
		excluded: statuses.filter((status) => matchesFilter(status, "excluded")).length
	}), [statuses]);
	const visible = (0, react.useMemo)(() => statuses.filter((status) => matchesFilter(status, filter) && matchesQuery(status, query)), [
		filter,
		query,
		statuses
	]);
	const visibleIds = (0, react.useMemo)(() => visible.map((status) => status.id), [visible]);
	const selectedVisible = visibleIds.filter((id) => selected.has(id));
	const allVisibleSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
	const toggle = (id, on) => {
		setSelected((current) => {
			const next = new Set(current);
			if (on) next.add(id);
			else next.delete(id);
			return next;
		});
	};
	const toggleVisible = (on) => {
		setSelected((current) => {
			const next = new Set(current);
			for (const id of visibleIds) on ? next.add(id) : next.delete(id);
			return next;
		});
	};
	const selectedIds = selectedVisible;
	const filters = [
		{
			id: "all",
			label: t("filterAll"),
			count: counts.all
		},
		{
			id: "active",
			label: t("filterActive"),
			count: counts.active
		},
		{
			id: "unmatched",
			label: t("filterUnmatched"),
			count: counts.unmatched
		},
		{
			id: "unsupported",
			label: t("filterUnsupported"),
			count: counts.unsupported
		},
		{
			id: "excluded",
			label: t("filterExcluded"),
			count: counts.excluded
		}
	];
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
		error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "drm-error",
			children: error
		}) : null,
		notice ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "drm-success",
			children: notice
		}) : null,
		/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "drm-toolbar",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Input, {
				className: "drm-search",
				value: query,
				placeholder: t("searchModels"),
				onChange: (event) => {
					setQuery(event.target.value);
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-filters",
				children: filters.filter((item) => item.id === "all" || item.count > 0).map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(__deepseek_ai_dsh_client_ui_primitives.Pill, {
					active: filter === item.id,
					onClick: () => {
						setFilter(item.id);
					},
					children: [
						item.label,
						" ",
						item.count
					]
				}, item.id))
			})]
		}),
		selectedIds.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "drm-batch",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("selectedCount", { count: selectedIds.length }) }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "outline",
					disabled: busy,
					onClick: () => {
						onSave({
							...provider,
							excludedModels: updateExcludedModels(provider.excludedModels, selectedIds, true)
						}, t("excluded", { count: selectedIds.length }));
						setSelected(/* @__PURE__ */ new Set());
					},
					children: t("exclude")
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "outline",
					disabled: busy,
					onClick: () => {
						onSave({
							...provider,
							excludedModels: updateExcludedModels(provider.excludedModels, selectedIds, false)
						}, t("restored", { count: selectedIds.length }));
						setSelected(/* @__PURE__ */ new Set());
					},
					children: t("restore")
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					className: "drm-select drm-batch-select",
					value: batchProtocol,
					onChange: (event) => {
						setBatchProtocol(event.target.value);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: t("autoProtocol")
					}), RELAY_PROTOCOLS.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value,
						children: protocolLabel(t, value)
					}, value))]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "outline",
					disabled: busy,
					onClick: () => {
						const overrides = { ...provider.protocolOverrides };
						for (const id of selectedIds) if (batchProtocol) overrides[id] = batchProtocol;
						else delete overrides[id];
						onSave({
							...provider,
							protocolOverrides: overrides
						}, batchProtocol ? t("protocolApplied", { count: selectedIds.length }) : t("protocolCleared", { count: selectedIds.length }));
						setSelected(/* @__PURE__ */ new Set());
					},
					children: t("applyProtocol")
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "drm-link",
					onClick: () => {
						setSelected(/* @__PURE__ */ new Set());
					},
					children: t("clearSelection")
				})
			]
		}) : null,
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "drm-muted",
			children: query.trim() || filter !== "all" ? t("showingCount", {
				shown: visible.length,
				total: statuses.length
			}) : t("modelCount", { count: statuses.length })
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "drm-models",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
				className: "drm-table",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
						className: "drm-check",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: allVisibleSelected,
							disabled: visibleIds.length === 0,
							onChange: (event) => {
								toggleVisible(event.target.checked);
							},
							"aria-label": t("selectVisible")
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("columnModel") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("columnSource") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("columnProtocol") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: t("columnActions") })
				] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
					colSpan: 5,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "drm-muted",
						children: t("noMatches")
					})
				}) }) : visible.map((status) => {
					const mapping = provider.modelMappings[status.id];
					const source = status.metadataSource;
					return [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
							className: "drm-check",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: selected.has(status.id),
								onChange: (event) => {
									toggle(status.id, event.target.checked);
								},
								"aria-label": t("selectOne", { id: status.id })
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-model-id",
							children: status.id
						}), status.excluded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Pill, {
							className: "drm-warn",
							children: t("excludedTag")
						}) : null] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: source ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							source.provider,
							"/",
							source.id,
							mapping ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Pill, { children: t("manual") }) : null,
							!status.supported ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Pill, {
								className: "drm-warn",
								children: t("needsOverride", { api: status.officialApi ?? "" })
							}) : null
						] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-muted",
							children: t("unmatched")
						}) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							className: "drm-select",
							value: provider.protocolOverrides[status.id] ?? "",
							disabled: busy,
							onChange: (event) => {
								const value = event.target.value;
								const overrides = { ...provider.protocolOverrides };
								if (value) overrides[status.id] = value;
								else delete overrides[status.id];
								onSave({
									...provider,
									protocolOverrides: overrides
								}, value ? t("protocolSaved") : t("protocolAuto"));
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: t("protocolAutoOption", { value: status.supported ? protocolLabel(t, status.protocol) : t("protocolUnsupportedApi", { api: status.officialApi ?? "" }) })
							}), RELAY_PROTOCOLS.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value,
								children: protocolLabel(t, value)
							}, value))]
						}) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "drm-actions",
							children: [mapping ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "drm-link",
								disabled: busy,
								onClick: () => {
									const mappings = { ...provider.modelMappings };
									delete mappings[status.id];
									onSave({
										...provider,
										modelMappings: mappings
									}, t("unmapped"));
								},
								children: t("unmap")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "drm-link",
								onClick: () => {
									setMappingModel(status.id);
								},
								children: t("map")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "drm-link",
								disabled: busy,
								onClick: () => {
									onSave({
										...provider,
										excludedModels: updateExcludedModels(provider.excludedModels, [status.id], !status.excluded)
									}, status.excluded ? t("restored", { count: 1 }) : t("excluded", { count: 1 }));
								},
								children: status.excluded ? t("restore") : t("exclude")
							})]
						}) })
					] }, status.id), mappingModel === status.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						colSpan: 5,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MappingEditor, {
							status,
							catalog,
							t,
							onClose: () => {
								setMappingModel(void 0);
							},
							onMap: async (model) => {
								await onSave({
									...provider,
									modelMappings: {
										...provider.modelMappings,
										[status.id]: {
											provider: model.provider,
											id: model.id
										}
									}
								}, t("mapSaved"));
								setMappingModel(void 0);
							}
						})
					}) }, `${status.id}:mapping`) : null];
				}) })]
			})
		})
	] });
}
function ProviderCard({ route, provider, snapshot, catalog, api, t, onReload }) {
	const [connectionOpen, setConnectionOpen] = (0, react.useState)(false);
	const [modelsOpen, setModelsOpen] = (0, react.useState)(false);
	const [busy, setBusy] = (0, react.useState)(false);
	const [error, setError] = (0, react.useState)();
	const [notice, setNotice] = (0, react.useState)();
	const [confirmDelete, setConfirmDelete] = (0, react.useState)(false);
	const [baseURL, setBaseURL] = (0, react.useState)(provider.baseURL);
	const [fallback, setFallback] = (0, react.useState)(provider.fallbackProtocol);
	const [transport$1, setTransport] = (0, react.useState)(provider.transport ?? "auto");
	const [headersDraft, setHeadersDraft] = (0, react.useState)(formatHeaderLines(provider.headers ?? {}));
	const [keyDraft, setKeyDraft] = (0, react.useState)("");
	(0, react.useEffect)(() => {
		setBaseURL(provider.baseURL);
		setFallback(provider.fallbackProtocol);
		setTransport(provider.transport ?? "auto");
		setHeadersDraft(formatHeaderLines(provider.headers ?? {}));
	}, [provider]);
	const statuses = (0, react.useMemo)(() => relayModelStatuses(provider, catalog), [catalog, provider]);
	const included = statuses.filter((status) => !status.excluded);
	const active = included.filter((status) => status.supported);
	const matched = included.filter((status) => status.metadataSource);
	const unsupported = included.filter((status) => !status.supported);
	const credential = snapshot.credentials[provider.apiKeyEnv];
	const run = async (task, success) => {
		setBusy(true);
		setError(void 0);
		setNotice(void 0);
		try {
			await task();
			if (success) setNotice(success);
		} catch (cause) {
			setError(isStale(cause) ? t("staleReloaded") : messageOf(cause));
		} finally {
			await onReload().catch(() => void 0);
			setBusy(false);
		}
	};
	const save = async (next, success) => run(async () => {
		await api.setProvider(route, next, snapshot.revision);
	}, success);
	const sync = () => run(async () => {
		const ids = await api.discover({
			provider: route,
			baseURL: provider.baseURL,
			protocol: provider.fallbackProtocol
		});
		await api.setProvider(route, {
			...provider,
			modelIds: ids,
			syncedAt: Date.now()
		}, snapshot.revision);
	}, t("synced"));
	const saveConnection = () => run(async () => {
		const next = {
			...provider,
			baseURL: baseURL.trim(),
			fallbackProtocol: fallback,
			transport: transport$1,
			headers: parseHeaderLines(headersDraft)
		};
		await api.setProvider(route, next, snapshot.revision, keyDraft.trim() || void 0);
		setKeyDraft("");
	}, t("connectionSaved"));
	const remove = () => run(async () => {
		await api.removeProvider(route, snapshot.revision);
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
		className: "drm-card",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-card-head",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "drm-card-title",
						children: provider.displayName
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "drm-route",
						children: route
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "drm-spacer" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Pill, {
						className: credential ? void 0 : "drm-warn",
						children: credential ? t("keyConfigured") : t("keyMissing")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "drm-actions",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "outline",
								disabled: busy,
								onClick: () => {
									sync();
								},
								children: t("sync")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "outline",
								onClick: () => {
									setConnectionOpen((value) => !value);
								},
								children: connectionOpen ? t("connectionCollapse") : t("connection")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "outline",
								onClick: () => {
									setModelsOpen(true);
								},
								children: t("models")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								className: "drm-danger",
								onClick: () => {
									setConfirmDelete(true);
								},
								children: t("remove")
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-summary",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("summaryActive", { count: active.length }) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("summaryMatched", { count: matched.length }) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("summaryUnmatched", { count: included.length - matched.length }) }),
					unsupported.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("summaryUnsupported", { count: unsupported.length }) }) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("summaryExcluded", { count: statuses.filter((status) => status.excluded).length }) }),
					provider.syncedAt ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("summarySyncedAt", { at: new Date(provider.syncedAt).toLocaleString() }) }) : null
				]
			}),
			confirmDelete ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-confirm",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("removeConfirm") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						className: "drm-danger",
						disabled: busy,
						onClick: () => {
							remove();
						},
						children: t("removeConfirmAction")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "outline",
						onClick: () => {
							setConfirmDelete(false);
						},
						children: t("cancel")
					})
				]
			}) : null,
			error && !modelsOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-error",
				children: error
			}) : null,
			notice && !modelsOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-success",
				children: notice
			}) : null,
			connectionOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-grid",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field wide",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: t("baseURL")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Input, {
							value: baseURL,
							onChange: (event) => {
								setBaseURL(event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: t("fallbackProtocol")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "drm-select",
							value: fallback,
							onChange: (event) => {
								setFallback(event.target.value);
							},
							children: RELAY_PROTOCOLS.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value,
								children: protocolLabel(t, value)
							}, value))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: t("codexTransport")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "drm-select",
							value: transport$1,
							onChange: (event) => {
								setTransport(event.target.value);
							},
							children: RELAY_TRANSPORTS.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value,
								children: transportLabel(t, value)
							}, value))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: t("replaceKey")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Input, {
							type: "password",
							autoComplete: "off",
							value: keyDraft,
							onChange: (event) => {
								setKeyDraft(event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field wide",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: t("extraHeaders")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: "drm-textarea",
							value: headersDraft,
							placeholder: t("extraHeadersPlaceholder"),
							onChange: (event) => {
								setHeadersDraft(event.target.value);
							}
						})]
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-actions",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					size: "sm",
					disabled: busy,
					onClick: () => {
						saveConnection();
					},
					children: t("saveConnection")
				})
			})] }) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: modelsOpen,
				title: `${provider.displayName} · ${t("models")}`,
				closeLabel: t("close"),
				onClose: () => {
					setModelsOpen(false);
				},
				className: "drm-wide-dialog",
				contentClassName: "drm-dialog-content",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelManager, {
					provider,
					catalog,
					statuses,
					busy,
					error,
					notice,
					t,
					onSave: save
				})
			})
		]
	});
}
function RelayModelsSection({ api, t }) {
	const [snapshot, setSnapshot] = (0, react.useState)(() => peekRelayPage());
	const [catalog, setCatalog] = (0, react.useState)(() => peekRelayPage()?.catalog);
	const [adding, setAdding] = (0, react.useState)(false);
	const [error, setError] = (0, react.useState)();
	/**
	* Read the page state. `refreshCatalog` additionally asks the host to re-read
	* pi.dev, which only the first mount and an explicit retry need.
	*/
	const load = (0, react.useCallback)(async (refreshCatalog = false) => {
		try {
			const next = await api.load();
			setSnapshot(next);
			setCatalog(next.catalog);
			setError(void 0);
			if (refreshCatalog) api.catalog().then(setCatalog).catch(() => void 0);
		} catch (cause) {
			setError(messageOf(cause));
		}
	}, [api]);
	const reload = (0, react.useCallback)(async () => {
		await load();
	}, [load]);
	(0, react.useEffect)(() => {
		load(true);
	}, [load]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: "drm-section",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-head",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: "drm-title",
					children: t("title")
				}), snapshot ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AddProvider, {
					api,
					snapshot,
					t,
					open: adding,
					onOpen: setAdding,
					onDone: reload
				}) : null]
			}),
			error ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-error",
				children: [error, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "outline",
					onClick: () => {
						load(true);
					},
					children: t("retry")
				}) })]
			}) : null,
			snapshot && !adding && Object.keys(snapshot.config.providers).length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-empty",
				children: t("empty")
			}) : null,
			snapshot && catalog ? Object.entries(snapshot.config.providers).map(([route, provider]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderCard, {
				route,
				provider,
				snapshot,
				catalog: catalog.models,
				api,
				t,
				onReload: reload
			}, route)) : null
		]
	});
}

//#endregion
//#region src/client/SpeedSelect.tsx
/** The display label of one tier, or the no-tier default when null. */
function speedTierLabel(t, tier) {
	return tier === "priority" ? t("serviceTierFast") : t("serviceTierUnset");
}
/** The option rows the menu lists: the no-tier default, then each speed tier. */
const OPTIONS = [null, ...RELAY_SERVICE_TIERS];
/** The row id one option carries; the no-tier default has no tier to name it. */
function optionId(tier) {
	return tier ?? "unset";
}
/**
* The composer Speed control. State is re-read when the session's model
* selection changes or another surface writes the tier, both of which arrive
* through {@link SpeedSelectInjected.subscribe}; a failed read keeps the last
* known state, so a transient failure never locks the toggle away.
*/
function SpeedSelect({ loadSpeed, setSpeed, subscribe, t }) {
	const [state, setState] = (0, react.useState)(null);
	const [open, setOpen] = (0, react.useState)(false);
	const [busy, setBusy] = (0, react.useState)(false);
	const loadRef = (0, react.useRef)(loadSpeed);
	const subscribeRef = (0, react.useRef)(subscribe);
	loadRef.current = loadSpeed;
	subscribeRef.current = subscribe;
	(0, react.useEffect)(() => {
		let cancelled = false;
		let inflight = false;
		let queued = false;
		const reload = () => {
			const load = loadRef.current;
			if (load === void 0) return;
			if (inflight) {
				queued = true;
				return;
			}
			inflight = true;
			load().then((loaded) => {
				if (!cancelled) setState(loaded);
			}, () => {}).finally(() => {
				inflight = false;
				if (queued && !cancelled) {
					queued = false;
					reload();
				}
			});
		};
		reload();
		const stop = subscribeRef.current?.(reload);
		return () => {
			cancelled = true;
			stop?.();
		};
	}, []);
	if (loadSpeed === void 0 || setSpeed === void 0 || t === void 0 || state === null || !state.visible) return null;
	const choose = (id) => {
		const tier = OPTIONS.find((option) => optionId(option) === id) ?? null;
		if (busy) return;
		if (tier === state.tier) {
			setOpen(false);
			return;
		}
		setBusy(true);
		setSpeed(tier).then((ok) => {
			setBusy(false);
			if (ok) {
				setState({
					visible: true,
					tier
				});
				setOpen(false);
			}
		});
	};
	const tierLabel = speedTierLabel(t, state.tier);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__deepseek_ai_dsh_client_ui_primitives.Menu, {
		open,
		side: "top",
		align: "end",
		compact: true,
		selectedId: optionId(state.tier),
		items: OPTIONS.map((tier) => ({
			id: optionId(tier),
			label: speedTierLabel(t, tier),
			disabled: busy
		})),
		onSelect: choose,
		onClose: () => {
			setOpen(false);
		},
		anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
			type: "button",
			className: "drm-speed-trigger",
			"aria-haspopup": "menu",
			"aria-expanded": open,
			title: `${t("speed")} · ${tierLabel}`,
			disabled: busy,
			onClick: () => {
				setOpen((value) => !value);
			},
			children: tierLabel
		})
	});
}

//#endregion
//#region src/client/styles.ts
/**
* Layout and data-table styling only. Buttons, text inputs, pills, menus, and
* the modal shell come from `@deepseek-ai/dsh-client-ui-primitives`, which the
* web shell already seeds into the module table with its stylesheet, so this
* page inherits their geometry, hover, focus, and disabled states instead of
* restating them.
*/
const CSS = `

.drm-section{display:flex;flex-direction:column;gap:14px;max-width:920px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}.drm-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.drm-title{margin:0;font-size:18px;line-height:26px;font-weight:600}.drm-muted{margin:2px 0 0;color:var(--dsw-alias-label-tertiary)}.drm-error{padding:10px 12px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}.drm-success{color:var(--dsw-alias-state-success-primary)}.drm-danger{color:var(--dsw-alias-state-error-primary)}.drm-danger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}.drm-warn{color:var(--dsw-alias-state-warn-label)}.drm-grow{flex:1;min-width:0}.drm-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px}.drm-card-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.drm-card-title{font-weight:600}.drm-route{font-size:12px;color:var(--dsw-alias-label-tertiary)}.drm-spacer{flex:1}.drm-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.drm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.drm-field{display:flex;flex-direction:column;gap:4px}.drm-field.wide{grid-column:1/-1}.drm-label{font-size:12px;color:var(--dsw-alias-label-secondary)}.drm-select{box-sizing:border-box;width:100%;height:32px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}.drm-textarea{box-sizing:border-box;width:100%;height:72px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;resize:vertical}.drm-select:focus,.drm-textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}.drm-summary{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-secondary)}.drm-models{overflow:auto;border:1px solid var(--dsw-alias-border-l3);border-radius:8px}.drm-table{width:100%;border-collapse:collapse;min-width:760px}.drm-table th,.drm-table td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--dsw-alias-border-l3);vertical-align:middle}.drm-table th{font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}.drm-table tr:last-child td{border-bottom:none}.drm-model-id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.drm-link{border:0;padding:0;background:none;color:var(--dsw-alias-state-business-primary);font:inherit;font-size:12px;cursor:pointer}.drm-link:disabled{opacity:.45;cursor:default}.drm-add{width:100%;border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px}.drm-empty{padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary)}.drm-map{margin-top:8px;padding:10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:8px}.drm-candidates{display:flex;flex-direction:column;gap:4px;max-height:240px;overflow:auto}.drm-candidate{display:flex;align-items:center;gap:8px;padding:7px 8px;border:1px solid var(--dsw-alias-border-l3);border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer}.drm-candidate:hover{background:var(--dsw-alias-interactive-bg-hover)}.drm-candidate-name{flex:1}.drm-confirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--dsw-alias-state-error-primary)}.drm-wide-dialog .drm-table{min-width:920px}.drm-wide-dialog .drm-select{min-width:240px}.drm-wide-dialog .drm-candidates{max-height:min(360px,40vh)}.drm-toolbar{display:flex;flex-direction:column;gap:8px}.drm-search{max-width:420px}.drm-filters{display:flex;flex-wrap:wrap;gap:6px}.drm-batch{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);font-size:12px}.drm-batch-select{width:auto;min-width:180px}.drm-check{width:36px}@media(max-width:720px){.drm-grid{grid-template-columns:1fr}.drm-field.wide{grid-column:auto}.drm-head{flex-direction:column;align-items:flex-start}.drm-actions{width:100%}}.drm-wide-dialog.drm-wide-dialog{width:min(1100px,calc(100vw - 32px));max-height:calc(100vh - 32px)}.drm-dialog-content{display:flex;flex-direction:column;min-height:0;max-height:calc(100vh - 140px);overflow:auto}.drm-speed-trigger{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;padding:2px 8px;cursor:pointer;white-space:nowrap}.drm-speed-trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
`;
const ID = "dsh-relay-models";
/**
* Attach this page stylesheet for the lifetime of the plugin. The loader
* inventories `data-plugin` sheets, so a reload removes exactly this one.
* @returns the disposer removing the sheet.
*/
function installStyles() {
	const style = document.createElement("style");
	style.dataset.plugin = ID;
	style.textContent = CSS;
	document.head.append(style);
	return () => {
		style.remove();
	};
}

//#endregion
//#region src/client/index.ts
/** Dictionary namespace owned by this page. */
const NS = "relay-models";
/**
* Whether the session's current model is served on the Codex Responses wire —
* the only protocol a speed tier reaches. Read live so a model switch made
* since the last announcement self-corrects the toggle.
*/
async function currentCodexModel(directories, sessionId) {
	const selection = directories.directoryFor(sessionId).store.getSnapshot().current;
	if (selection === null) return false;
	const page = await relayPageApi.load();
	const provider = page.config.providers[selection.provider];
	if (provider === void 0) return false;
	const status = relayModelStatuses(provider, page.catalog.models).find((entry) => entry.id === selection.model);
	return status?.protocol === "openai-codex-responses" && status.supported && !status.excluded;
}
/** The `loadSpeed` half of the inject face: this page's speed state plus visibility. */
function createSpeedLoader(directories, sessionId) {
	return async () => {
		const [visible, tier] = await Promise.all([currentCodexModel(directories, sessionId), relayPageApi.getSpeed(sessionId).catch(() => null)]);
		return {
			visible,
			tier
		};
	};
}
/** The `setSpeed` half of the inject face: boolean outcome for the busy state. */
function createSpeedSetter(sessionId) {
	return (tier) => relayPageApi.setSpeed(sessionId, tier).then(() => true, () => false);
}
/**
* The `subscribe` half of the inject face. The two things that invalidate the
* toggle both announce themselves: the session's model directory is a store,
* and every tier write on this page goes through one function.
*/
function createSpeedSubscriber(directories, sessionId) {
	return (listener) => {
		const stopModel = directories.directoryFor(sessionId).store.subscribe(listener);
		const stopSpeed = onSpeedChanged(listener);
		return () => {
			stopModel();
			stopSpeed();
		};
	};
}
const inject = [
	"slots",
	"locale",
	"connection"
];
/**
* Mount the relay models settings page.
*
* The nav row sits between Models (10) and Plugins (15): this page configures
* model routes, and a tie with another section would leave their order to
* registration timing.
* @param ctx - the browser plugin context.
*/
function apply(ctx) {
	bindRelayTransport(ctx.get("connection").rpc);
	ctx.effect(() => installStyles(), "relay-models: settings styles");
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "relay-models: section dictionaries");
	const t = ctx.locale.bind(NS);
	relayPageApi.load().catch(() => void 0);
	ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "relay-models",
		order: 12,
		label: () => t("nav"),
		locale: NS,
		inject: () => ({ api: relayPageApi })
	}, RelayModelsSection));
	ctx.inject(["modelDirectories"], (modelScope) => {
		const scope = modelScope;
		const directories = scope.get("modelDirectories");
		scope.slots.inject("conversation.input.right", () => scope.slots.register({
			name: "conversation.input.right",
			id: "relay-models-speed",
			order: 0,
			locale: NS,
			inject: (sessionId) => ({
				loadSpeed: createSpeedLoader(directories, sessionId),
				setSpeed: createSpeedSetter(sessionId),
				subscribe: createSpeedSubscriber(directories, sessionId)
			})
		}, SpeedSelect));
		scope.inject(["commandUi"], (commandScope) => {
			const command = commandScope;
			const commandUi = command.get("commandUi");
			command.effect(() => commandUi.register({
				name: "fast",
				description: t("commandFast"),
				available: () => true,
				ui: {
					kind: "popupSelect",
					options: async (session) => {
						const state = await createSpeedLoader(directories, session.sessionId)();
						if (!state.visible) throw new Error(t("commandFastUnavailable"));
						return [null, ...RELAY_SERVICE_TIERS].map((tier) => ({
							id: tier ?? "unset",
							label: speedTierLabel(t, tier),
							active: tier === state.tier
						}));
					},
					onSelect: async (option, session) => {
						await relayPageApi.setSpeed(session.sessionId, option.id === "unset" ? null : option.id);
					}
				}
			}), "relay-models: /fast contribution");
		});
	});
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });