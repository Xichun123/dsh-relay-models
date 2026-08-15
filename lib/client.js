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
let react_dom = require("react-dom");
react_dom = __toESM(react_dom);
let react_jsx_runtime = require("react/jsx-runtime");
react_jsx_runtime = __toESM(react_jsx_runtime);

//#region src/client/api.ts
const ENDPOINT = "/relay-models/api";
async function request(body) {
	const response = await fetch(ENDPOINT, body === void 0 ? { headers: { accept: "application/json" } } : {
		method: "POST",
		headers: {
			accept: "application/json",
			"content-type": "application/json"
		},
		body: JSON.stringify(body)
	});
	const result = await response.json();
	if (!response.ok || !result.ok) throw new Error(result.error ?? `Relay API answered ${response.status}`);
	return result.value;
}
const relayPageApi = {
	load: () => request(),
	catalog: () => request({ action: "catalog" }),
	setProvider: (route, provider, expectedRevision, apiKey) => request({
		action: "set-provider",
		route,
		provider,
		expectedRevision,
		...apiKey ? { apiKey } : {}
	}),
	removeProvider: (route, expectedRevision) => request({
		action: "remove-provider",
		route,
		expectedRevision
	}),
	discover: (input) => request({
		action: "discover",
		...input
	})
};

//#endregion
//#region src/shared/core.ts
const RELAY_PROTOCOLS = [
	"openai-completions",
	"openai-responses",
	"anthropic-messages"
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
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 3e5;
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
	const brand = labels.find((label) => !generic.has(label)) ?? labels[0] ?? "relay";
	const stem = `relay-${brand.replace(/[^a-z0-9]+/gu, "-")}`;
	let id = validateProviderId(stem);
	for (let suffix = 2; existingIds.has(id); suffix += 1) id = `${stem}-${suffix}`;
	const readable = brand.split(/[-_]+/u).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
	return {
		id,
		name: `${readable || "Model"} Relay`
	};
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
function normalizeModelName(value) {
	return value.toLowerCase().replace(/^.*\//u, "").replace(/(?:^|[-_.])20\d{6}$/u, "").replace(/[^a-z0-9]+/gu, "");
}
function editDistance(left, right) {
	const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
	for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
		const current = [leftIndex];
		for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) current[rightIndex] = Math.min(current[rightIndex - 1] + 1, previous[rightIndex] + 1, previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1));
		for (let index = 0; index < current.length; index += 1) previous[index] = current[index];
	}
	return previous[right.length];
}
function suggestOfficialCandidates(remoteModelId, catalog, limit = 3) {
	const needle = normalizeModelName(remoteModelId);
	if (!needle) return [];
	const candidates = /* @__PURE__ */ new Map();
	for (const model of catalog) {
		const normalized = normalizeModelName(model.id);
		if (!normalized) continue;
		const maxLength = Math.max(needle.length, normalized.length);
		const similarity = maxLength === 0 ? 1 : 1 - editDistance(needle, normalized) / maxLength;
		const containment = needle.includes(normalized) || normalized.includes(needle) ? .25 : 0;
		const candidate = {
			provider: model.provider,
			id: model.id,
			name: model.name,
			api: model.api,
			score: Math.round(Math.min(1, similarity + containment) * 100)
		};
		const key = `${candidate.provider}/${candidate.id}`;
		if ((candidates.get(key)?.score ?? -1) < candidate.score) candidates.set(key, candidate);
	}
	return [...candidates.values()].filter((candidate) => candidate.score >= 35).sort((a, b) => b.score - a.score || a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id)).slice(0, limit);
}
function inferProtocol(source, fallback) {
	if (!source) return fallback;
	if (source.api === "anthropic-messages") return "anthropic-messages";
	if (source.api === "openai-completions") return "openai-completions";
	if (source.api === "openai-responses" || source.api === "openai-codex-responses" || source.api === "azure-openai-responses") return "openai-responses";
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
//#region src/client/RelayModelsSection.tsx
function messageOf(error) {
	return error instanceof Error ? error.message : String(error);
}
function protocolLabel(protocol) {
	if (protocol === "anthropic-messages") return "Anthropic Messages";
	if (protocol === "openai-responses") return "OpenAI Responses";
	if (protocol === "openai-completions") return "OpenAI Chat Completions";
	return "不支持（需手动覆盖）";
}
function officialModel(reference, catalog) {
	return catalog.find((model) => model.provider === reference.provider && model.id === reference.id);
}
function AddProvider({ api, snapshot, onDone }) {
	const [open, setOpen] = (0, react.useState)(false);
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
			const id = assertUnreservedProviderId(route);
			if (snapshot.config.providers[id]) throw new Error(`Provider ${id} already exists`);
			if (!displayName.trim()) throw new Error("请输入显示名称");
			if (!apiKey.trim()) throw new Error("请输入 API Key");
			const modelIds = await api.discover({
				baseURL,
				protocol,
				apiKey: apiKey.trim()
			});
			if (modelIds.length === 0) throw new Error("端点没有返回模型");
			const ref = relayCredentialRef(id);
			const provider = {
				displayName: displayName.trim(),
				baseURL: baseURL.trim(),
				apiKeyEnv: ref,
				fallbackProtocol: protocol,
				modelIds,
				modelMappings: {},
				protocolOverrides: {},
				excludedModels: [],
				headers: {},
				streamIdleTimeoutMs: DEFAULT_STREAM_IDLE_TIMEOUT_MS,
				syncedAt: Date.now()
			};
			await api.setProvider(id, provider, snapshot.revision, apiKey.trim());
			await onDone();
			setOpen(false);
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
	if (!open) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
		type: "button",
		className: "drm-icon-button",
		disabled: !snapshot.writable,
		"aria-label": "添加中转站",
		title: "添加中转站",
		onClick: () => {
			setOpen(true);
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
			width: "16",
			height: "16",
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "currentColor",
				d: "M8 3a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 8 3z"
			})
		})
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
							children: "Provider ID"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "drm-input",
							value: route,
							placeholder: "relay-example",
							onChange: (event) => {
								setRoute(event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: "显示名称"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "drm-input",
							value: displayName,
							placeholder: "Example Relay",
							onChange: (event) => {
								setDisplayName(event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field wide",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: "Base URL"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "drm-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "drm-input",
								value: baseURL,
								placeholder: "https://gateway.example/v1",
								onChange: (event) => {
									setBaseURL(event.target.value);
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "drm-button",
								disabled: !baseURL,
								onClick: suggest,
								children: "生成名称"
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: "未匹配模型的默认协议"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "drm-select",
							value: protocol,
							onChange: (event) => {
								setProtocol(event.target.value);
							},
							children: RELAY_PROTOCOLS.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value,
								children: protocolLabel(value)
							}, value))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: "API Key"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "drm-input",
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
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "drm-button primary",
					disabled: busy,
					onClick: () => {
						add();
					},
					children: busy ? "正在发现模型…" : "发现模型并添加"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "drm-button",
					disabled: busy,
					onClick: () => {
						setOpen(false);
						setError(void 0);
					},
					children: "取消"
				})]
			})
		]
	});
}
function Dialog({ open, title, onClose, children }) {
	const titleId = (0, react.useId)();
	(0, react.useEffect)(() => {
		if (!open) return;
		const onKey = (event) => {
			if (event.key === "Escape") onClose();
		};
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = previous;
			window.removeEventListener("keydown", onKey);
		};
	}, [onClose, open]);
	if (!open) return null;
	return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: "drm-overlay",
		onMouseDown: onClose,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "drm-dialog",
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": titleId,
			onMouseDown: (event) => {
				event.stopPropagation();
			},
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-dialog-head",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: "drm-dialog-title",
						id: titleId,
						children: title
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "drm-spacer" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "drm-button",
						onClick: onClose,
						children: "关闭"
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-dialog-body",
				children
			})]
		})
	}), document.body);
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
function MappingEditor({ status, catalog, onMap, onClose }) {
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
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				className: "drm-input",
				autoFocus: true,
				value: query,
				placeholder: "搜索官方 Provider、模型 ID 或名称",
				onChange: (event) => {
					setQuery(event.target.value);
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				className: "drm-button",
				onClick: onClose,
				children: "关闭"
			})]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "drm-candidates",
			children: results.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "drm-muted",
				children: "没有候选；输入关键词搜索完整目录。"
			}) : results.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
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
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "drm-pill",
					children: model.api
				})]
			}, `${model.provider}/${model.id}`))
		})]
	});
}
function ModelManager({ provider, catalog, statuses, busy, error, notice, onSave }) {
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
			label: "全部",
			count: counts.all
		},
		{
			id: "active",
			label: "可用",
			count: counts.active
		},
		{
			id: "unmatched",
			label: "未匹配",
			count: counts.unmatched
		},
		{
			id: "unsupported",
			label: "需覆盖",
			count: counts.unsupported
		},
		{
			id: "excluded",
			label: "已排除",
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
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				className: "drm-input drm-search",
				value: query,
				placeholder: "筛选模型 ID 或官方来源",
				onChange: (event) => {
					setQuery(event.target.value);
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-filters",
				children: filters.filter((item) => item.id === "all" || item.count > 0).map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: `drm-chip${filter === item.id ? " active" : ""}`,
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
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
					"已选 ",
					selectedIds.length,
					" 个"
				] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "drm-button",
					disabled: busy,
					onClick: () => {
						onSave({
							...provider,
							excludedModels: updateExcludedModels(provider.excludedModels, selectedIds, true)
						}, `已排除 ${selectedIds.length} 个模型`);
						setSelected(/* @__PURE__ */ new Set());
					},
					children: "排除"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "drm-button",
					disabled: busy,
					onClick: () => {
						onSave({
							...provider,
							excludedModels: updateExcludedModels(provider.excludedModels, selectedIds, false)
						}, `已恢复 ${selectedIds.length} 个模型`);
						setSelected(/* @__PURE__ */ new Set());
					},
					children: "恢复"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
					className: "drm-select drm-batch-select",
					value: batchProtocol,
					onChange: (event) => {
						setBatchProtocol(event.target.value);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value: "",
						children: "恢复自动协议"
					}), RELAY_PROTOCOLS.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
						value,
						children: protocolLabel(value)
					}, value))]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "drm-button",
					disabled: busy,
					onClick: () => {
						const overrides = { ...provider.protocolOverrides };
						for (const id of selectedIds) if (batchProtocol) overrides[id] = batchProtocol;
						else delete overrides[id];
						onSave({
							...provider,
							protocolOverrides: overrides
						}, batchProtocol ? `已为 ${selectedIds.length} 个模型设置协议` : `已为 ${selectedIds.length} 个模型恢复自动协议`);
						setSelected(/* @__PURE__ */ new Set());
					},
					children: "应用协议"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "drm-link",
					onClick: () => {
						setSelected(/* @__PURE__ */ new Set());
					},
					children: "取消选择"
				})
			]
		}) : null,
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "drm-muted",
			children: query.trim() || filter !== "all" ? `显示 ${visible.length} / ${statuses.length}` : `${statuses.length} 个模型`
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
							"aria-label": "选择当前列表"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "远端模型" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "元数据来源" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "实际协议" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "操作" })
				] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
					colSpan: 5,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "drm-muted",
						children: "没有符合条件的模型。"
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
								"aria-label": `选择 ${status.id}`
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("td", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-model-id",
							children: status.id
						}), status.excluded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-pill warn",
							children: "已排除"
						}) : null] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: source ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							source.provider,
							"/",
							source.id,
							mapping ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "drm-pill",
								children: "人工"
							}) : null,
							!status.supported ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "drm-pill warn",
								children: [status.officialApi, " 需覆盖"]
							}) : null
						] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-muted",
							children: "未匹配"
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
								}, value ? "协议覆盖已保存" : "协议已恢复自动选择");
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
								value: "",
								children: ["自动：", status.supported ? protocolLabel(status.protocol) : `不支持 ${status.officialApi ?? ""}`]
							}), RELAY_PROTOCOLS.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value,
								children: protocolLabel(value)
							}, value))]
						}) }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "drm-actions",
							children: [mapping ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "drm-link",
								disabled: busy,
								onClick: () => {
									const mappings = { ...provider.modelMappings };
									delete mappings[status.id];
									onSave({
										...provider,
										modelMappings: mappings
									}, "人工映射已取消");
								},
								children: "取消映射"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "drm-link",
								onClick: () => {
									setMappingModel(status.id);
								},
								children: "人工映射"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "drm-link",
								disabled: busy,
								onClick: () => {
									onSave({
										...provider,
										excludedModels: updateExcludedModels(provider.excludedModels, [status.id], !status.excluded)
									}, status.excluded ? "模型已恢复" : "模型已排除");
								},
								children: status.excluded ? "恢复" : "排除"
							})]
						}) })
					] }, status.id), mappingModel === status.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
						colSpan: 5,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MappingEditor, {
							status,
							catalog,
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
								}, "人工映射已保存");
								setMappingModel(void 0);
							}
						})
					}) }, `${status.id}:mapping`) : null];
				}) })]
			})
		})
	] });
}
function ProviderCard({ route, provider, snapshot, catalog, api, onReload }) {
	const [connectionOpen, setConnectionOpen] = (0, react.useState)(false);
	const [modelsOpen, setModelsOpen] = (0, react.useState)(false);
	const [busy, setBusy] = (0, react.useState)(false);
	const [error, setError] = (0, react.useState)();
	const [notice, setNotice] = (0, react.useState)();
	const [confirmDelete, setConfirmDelete] = (0, react.useState)(false);
	const [baseURL, setBaseURL] = (0, react.useState)(provider.baseURL);
	const [fallback, setFallback] = (0, react.useState)(provider.fallbackProtocol);
	const [headersDraft, setHeadersDraft] = (0, react.useState)(formatHeaderLines(provider.headers ?? {}));
	const [keyDraft, setKeyDraft] = (0, react.useState)("");
	(0, react.useEffect)(() => {
		setBaseURL(provider.baseURL);
		setFallback(provider.fallbackProtocol);
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
			await onReload();
			if (success) setNotice(success);
		} catch (cause) {
			setError(messageOf(cause));
		} finally {
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
	}, "模型列表已同步");
	const saveConnection = () => run(async () => {
		const next = {
			...provider,
			baseURL: baseURL.trim(),
			fallbackProtocol: fallback,
			headers: parseHeaderLines(headersDraft),
			streamIdleTimeoutMs: provider.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS
		};
		await api.setProvider(route, next, snapshot.revision, keyDraft.trim() || void 0);
		setKeyDraft("");
	}, "连接设置已保存");
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `drm-pill ${credential ? "" : "warn"}`,
						children: credential ? "密钥已配置" : "缺少密钥"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "drm-actions",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "drm-button",
								disabled: busy,
								onClick: () => {
									sync();
								},
								children: "同步"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "drm-button",
								onClick: () => {
									setConnectionOpen((value) => !value);
								},
								children: connectionOpen ? "收起连接" : "连接"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "drm-button",
								onClick: () => {
									setModelsOpen(true);
								},
								children: "模型"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "drm-button danger",
								onClick: () => {
									setConfirmDelete(true);
								},
								children: "删除"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-summary",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [active.length, " 个可用模型"] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [matched.length, " 个匹配官方元数据"] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [included.length - matched.length, " 个未匹配"] }),
					unsupported.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [unsupported.length, " 个协议需覆盖"] }) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [statuses.filter((status) => status.excluded).length, " 个已排除"] }),
					provider.syncedAt ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["同步于 ", new Date(provider.syncedAt).toLocaleString()] }) : null
				]
			}),
			confirmDelete ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-confirm",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "删除 Provider、配置和托管密钥？" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "drm-button danger",
						disabled: busy,
						onClick: () => {
							remove();
						},
						children: "确认删除"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "drm-button",
						onClick: () => {
							setConfirmDelete(false);
						},
						children: "取消"
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
							children: "Base URL"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "drm-input",
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
							children: "默认协议"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "drm-select",
							value: fallback,
							onChange: (event) => {
								setFallback(event.target.value);
							},
							children: RELAY_PROTOCOLS.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value,
								children: protocolLabel(value)
							}, value))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: "drm-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "drm-label",
							children: "替换 API Key（留空则保留）"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: "drm-input",
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
							children: "额外请求头（每行 Name: value；不要放密钥。User-Agent 由 DSH 覆盖）"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: "drm-input",
							style: {
								height: 72,
								padding: "8px 10px"
							},
							value: headersDraft,
							placeholder: "X-Custom: value",
							onChange: (event) => {
								setHeadersDraft(event.target.value);
							}
						})]
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-actions",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "drm-button primary",
					disabled: busy,
					onClick: () => {
						saveConnection();
					},
					children: "保存连接设置"
				})
			})] }) : null,
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Dialog, {
				open: modelsOpen,
				title: `${provider.displayName} · 模型`,
				onClose: () => {
					setModelsOpen(false);
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelManager, {
					provider,
					catalog,
					statuses,
					busy,
					error,
					notice,
					onSave: save
				})
			})
		]
	});
}
function RelayModelsSection({ api }) {
	const [snapshot, setSnapshot] = (0, react.useState)();
	const [catalog, setCatalog] = (0, react.useState)();
	const [error, setError] = (0, react.useState)();
	const reload = (0, react.useCallback)(async () => {
		try {
			setSnapshot(await api.load());
			setError(void 0);
		} catch (cause) {
			setError(messageOf(cause));
		}
	}, [api]);
	const initialize = (0, react.useCallback)(async () => {
		try {
			const [nextSnapshot, nextCatalog] = await Promise.all([api.load(), api.catalog()]);
			setSnapshot(nextSnapshot);
			setCatalog(nextCatalog);
			setError(void 0);
		} catch (cause) {
			setError(messageOf(cause));
		}
	}, [api]);
	(0, react.useEffect)(() => {
		initialize();
	}, [initialize]);
	if ((!snapshot || !catalog) && !error) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
		className: "drm-section",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
			className: "drm-muted",
			children: "正在加载中转模型配置…"
		})
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
		className: "drm-section",
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-head",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					className: "drm-title",
					children: "中转模型"
				}), snapshot ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AddProvider, {
					api,
					snapshot,
					onDone: reload
				}) : null]
			}),
			error ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "drm-error",
				children: [error, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "drm-button",
					onClick: () => {
						initialize();
					},
					children: "重试"
				}) })]
			}) : null,
			snapshot && Object.keys(snapshot.config.providers).length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-empty",
				children: "还没有中转站。点击右上角 + 开始。"
			}) : null,
			snapshot && catalog ? Object.entries(snapshot.config.providers).map(([route, provider]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderCard, {
				route,
				provider,
				snapshot,
				catalog: catalog.models,
				api,
				onReload: reload
			}, route)) : null
		]
	});
}

//#endregion
//#region src/client/styles.ts
const ID = "dsh-relay-models";
const CSS = `
.drm-section{display:flex;flex-direction:column;gap:14px;max-width:920px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}.drm-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.drm-icon-button{box-sizing:border-box;flex:none;width:32px;height:32px;padding:0;border:none;border-radius:16px;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.drm-icon-button:hover:not(:disabled){filter:brightness(1.08)}.drm-icon-button:disabled{opacity:.45;cursor:default}.drm-add{width:100%}.drm-title{margin:0;font-size:18px;line-height:26px;font-weight:600}.drm-muted{margin:2px 0 0;color:var(--dsw-alias-label-tertiary)}.drm-error{padding:10px 12px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}.drm-success{color:var(--dsw-alias-state-success-primary)}.drm-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px}.drm-card-head{display:flex;align-items:center;gap:8px}.drm-card-title{font-weight:600}.drm-route{font-size:12px;color:var(--dsw-alias-label-tertiary)}.drm-spacer{flex:1}.drm-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.drm-button{box-sizing:border-box;height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}.drm-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.drm-button.primary{border:none;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}.drm-button.danger{border:none;color:var(--dsw-alias-state-error-primary)}.drm-button:disabled{opacity:.45;cursor:default}.drm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.drm-field{display:flex;flex-direction:column;gap:4px}.drm-field.wide{grid-column:1/-1}.drm-label{font-size:12px;color:var(--dsw-alias-label-secondary)}.drm-input,.drm-select{box-sizing:border-box;width:100%;height:34px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}.drm-input:focus,.drm-select:focus{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.drm-summary{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-secondary)}.drm-models{overflow:auto;border:1px solid var(--dsw-alias-border-l3);border-radius:8px}.drm-table{width:100%;border-collapse:collapse;min-width:760px}.drm-table th,.drm-table td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--dsw-alias-border-l3);vertical-align:middle}.drm-table th{font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}.drm-table tr:last-child td{border-bottom:none}.drm-model-id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.drm-pill{display:inline-flex;padding:1px 7px;border-radius:10px;background:var(--dsw-alias-interactive-bg-hover);font-size:11px;line-height:18px}.drm-pill.warn{color:var(--dsw-alias-state-warn-label)}.drm-link{border:0;padding:0;background:none;color:var(--dsw-alias-state-business-primary);font:inherit;font-size:12px;cursor:pointer}.drm-add{border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;padding:14px}.drm-empty{padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary)}.drm-map{margin-top:8px;padding:10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:8px}.drm-candidates{display:flex;flex-direction:column;gap:4px;max-height:240px;overflow:auto}.drm-candidate{display:flex;align-items:center;gap:8px;padding:7px 8px;border:1px solid var(--dsw-alias-border-l3);border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer}.drm-candidate:hover{background:var(--dsw-alias-interactive-bg-hover)}.drm-candidate-name{flex:1}.drm-confirm{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-state-error-primary)}.drm-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;background:color-mix(in srgb,#000 46%,transparent)}.drm-dialog{width:min(1100px,calc(100vw - 32px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 18px 48px color-mix(in srgb,#000 28%,transparent)}.drm-dialog-head{display:flex;align-items:center;gap:10px;flex:none;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)}.drm-dialog-title{margin:0;font-size:16px;line-height:24px;font-weight:600}.drm-dialog-body{display:flex;flex-direction:column;gap:12px;min-height:0;flex:1;padding:16px;overflow:auto}.drm-dialog .drm-table{min-width:920px}.drm-dialog .drm-select{min-width:240px}.drm-dialog .drm-candidates{max-height:min(360px,40vh)}.drm-toolbar{display:flex;flex-direction:column;gap:8px}.drm-search{max-width:420px}.drm-filters{display:flex;flex-wrap:wrap;gap:6px}.drm-chip{box-sizing:border-box;height:28px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}.drm-chip.active{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}.drm-batch{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);font-size:12px}.drm-batch-select{width:auto;min-width:180px}.drm-check{width:36px}@media(max-width:720px){.drm-grid{grid-template-columns:1fr}.drm-field.wide{grid-column:auto}.drm-head{flex-direction:column}.drm-actions{width:100%}}
`;
function installStyles() {
	if (document.querySelector(`style[data-plugin="${ID}"]`)) return () => {};
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
const inject = ["slots"];
function apply(ctx) {
	ctx.effect(() => installStyles(), "relay-models: settings styles");
	ctx.slots.inject("settings.section", () => ctx.slots.register({
		name: "settings.section",
		id: "relay-models",
		order: 15,
		label: () => "中转模型",
		inject: () => ({ api: relayPageApi })
	}, RelayModelsSection));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });