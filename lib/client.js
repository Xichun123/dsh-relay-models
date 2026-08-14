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
//#region src/shared/catalog.generated.ts
const OFFICIAL_MODELS = [
	{
		"provider": "amazon-bedrock",
		"id": "amazon.nova-2-lite-v1:0",
		"name": "Nova 2 Lite",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "amazon.nova-lite-v1:0",
		"name": "Nova Lite",
		"api": "bedrock-converse-stream",
		"contextWindow": 3e5,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "amazon.nova-micro-v1:0",
		"name": "Nova Micro",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "amazon.nova-pro-v1:0",
		"name": "Nova Pro",
		"api": "bedrock-converse-stream",
		"contextWindow": 3e5,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "anthropic.claude-fable-5",
		"name": "Claude Fable 5",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "anthropic.claude-haiku-4-5-20251001-v1:0",
		"name": "Claude Haiku 4.5",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "anthropic.claude-opus-4-1-20250805-v1:0",
		"name": "Claude Opus 4.1",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "anthropic.claude-opus-4-5-20251101-v1:0",
		"name": "Claude Opus 4.5",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "anthropic.claude-opus-4-6-v1",
		"name": "Claude Opus 4.6",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "anthropic.claude-opus-4-7",
		"name": "Claude Opus 4.7",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "anthropic.claude-opus-4-8",
		"name": "Claude Opus 4.8",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "anthropic.claude-sonnet-4-5-20250929-v1:0",
		"name": "Claude Sonnet 4.5",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "anthropic.claude-sonnet-4-6",
		"name": "Claude Sonnet 4.6",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "anthropic.claude-sonnet-5",
		"name": "Claude Sonnet 5",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "au.anthropic.claude-haiku-4-5-20251001-v1:0",
		"name": "Claude Haiku 4.5 (AU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "au.anthropic.claude-opus-4-6-v1",
		"name": "AU Anthropic Claude Opus 4.6",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "au.anthropic.claude-opus-4-8",
		"name": "Claude Opus 4.8 (AU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "au.anthropic.claude-opus-5",
		"name": "Claude Opus 5 (AU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "au.anthropic.claude-sonnet-4-5-20250929-v1:0",
		"name": "Claude Sonnet 4.5 (AU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "au.anthropic.claude-sonnet-4-6",
		"name": "AU Anthropic Claude Sonnet 4.6",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "au.anthropic.claude-sonnet-5",
		"name": "Claude Sonnet 5 (AU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "deepseek.r1-v1:0",
		"name": "DeepSeek-R1",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "deepseek.v3-v1:0",
		"name": "DeepSeek-V3.1",
		"api": "bedrock-converse-stream",
		"contextWindow": 163840,
		"maxTokens": 81920,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "deepseek.v3.2",
		"name": "DeepSeek-V3.2",
		"api": "bedrock-converse-stream",
		"contextWindow": 163840,
		"maxTokens": 81920,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "eu.anthropic.claude-fable-5",
		"name": "Claude Fable 5 (EU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "eu.anthropic.claude-haiku-4-5-20251001-v1:0",
		"name": "Claude Haiku 4.5 (EU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "eu.anthropic.claude-opus-4-5-20251101-v1:0",
		"name": "Claude Opus 4.5 (EU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "eu.anthropic.claude-opus-4-6-v1",
		"name": "Claude Opus 4.6 (EU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "eu.anthropic.claude-opus-4-7",
		"name": "Claude Opus 4.7 (EU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "eu.anthropic.claude-opus-4-8",
		"name": "Claude Opus 4.8 (EU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "eu.anthropic.claude-opus-5",
		"name": "Claude Opus 5 (EU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "eu.anthropic.claude-sonnet-4-5-20250929-v1:0",
		"name": "Claude Sonnet 4.5 (EU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "eu.anthropic.claude-sonnet-4-6",
		"name": "Claude Sonnet 4.6 (EU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "eu.anthropic.claude-sonnet-5",
		"name": "Claude Sonnet 5 (EU)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "global.anthropic.claude-fable-5",
		"name": "Claude Fable 5 (Global)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "global.anthropic.claude-haiku-4-5-20251001-v1:0",
		"name": "Claude Haiku 4.5 (Global)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "global.anthropic.claude-opus-4-5-20251101-v1:0",
		"name": "Claude Opus 4.5 (Global)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "global.anthropic.claude-opus-4-6-v1",
		"name": "Claude Opus 4.6 (Global)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "global.anthropic.claude-opus-4-7",
		"name": "Claude Opus 4.7 (Global)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "global.anthropic.claude-opus-4-8",
		"name": "Claude Opus 4.8 (Global)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "global.anthropic.claude-opus-5",
		"name": "Claude Opus 5 (Global)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "global.anthropic.claude-sonnet-4-5-20250929-v1:0",
		"name": "Claude Sonnet 4.5 (Global)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "global.anthropic.claude-sonnet-4-6",
		"name": "Claude Sonnet 4.6 (Global)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "global.anthropic.claude-sonnet-5",
		"name": "Claude Sonnet 5 (Global)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "google.gemma-3-27b-it",
		"name": "Google Gemma 3 27B Instruct",
		"api": "bedrock-converse-stream",
		"contextWindow": 202752,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "google.gemma-3-4b-it",
		"name": "Gemma 3 4B IT",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "jp.anthropic.claude-haiku-4-5-20251001-v1:0",
		"name": "Claude Haiku 4.5 (JP)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "jp.anthropic.claude-opus-4-7",
		"name": "Claude Opus 4.7 (JP)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "jp.anthropic.claude-opus-4-8",
		"name": "Claude Opus 4.8 (JP)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "jp.anthropic.claude-opus-5",
		"name": "Claude Opus 5 (JP)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "jp.anthropic.claude-sonnet-4-5-20250929-v1:0",
		"name": "Claude Sonnet 4.5 (JP)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "jp.anthropic.claude-sonnet-4-6",
		"name": "Claude Sonnet 4.6 (JP)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "jp.anthropic.claude-sonnet-5",
		"name": "Claude Sonnet 5 (JP)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "meta.llama3-1-70b-instruct-v1:0",
		"name": "Llama 3.1 70B Instruct",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "meta.llama3-1-8b-instruct-v1:0",
		"name": "Llama 3.1 8B Instruct",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "meta.llama3-3-70b-instruct-v1:0",
		"name": "Llama 3.3 70B Instruct",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "meta.llama4-maverick-17b-instruct-v1:0",
		"name": "Llama 4 Maverick 17B Instruct",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "meta.llama4-scout-17b-instruct-v1:0",
		"name": "Llama 4 Scout 17B Instruct",
		"api": "bedrock-converse-stream",
		"contextWindow": 35e5,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "minimax.minimax-m2",
		"name": "MiniMax M2",
		"api": "bedrock-converse-stream",
		"contextWindow": 204608,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "minimax.minimax-m2.1",
		"name": "MiniMax M2.1",
		"api": "bedrock-converse-stream",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "minimax.minimax-m2.5",
		"name": "MiniMax M2.5",
		"api": "bedrock-converse-stream",
		"contextWindow": 196608,
		"maxTokens": 98304,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "mistral.devstral-2-123b",
		"name": "Devstral 2 123B",
		"api": "bedrock-converse-stream",
		"contextWindow": 256e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "mistral.magistral-small-2509",
		"name": "Magistral Small 1.2",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4e4,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "mistral.ministral-3-14b-instruct",
		"name": "Ministral 14B 3.0",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "mistral.ministral-3-3b-instruct",
		"name": "Ministral 3 3B",
		"api": "bedrock-converse-stream",
		"contextWindow": 256e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "mistral.ministral-3-8b-instruct",
		"name": "Ministral 3 8B",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "mistral.mistral-large-3-675b-instruct",
		"name": "Mistral Large 3",
		"api": "bedrock-converse-stream",
		"contextWindow": 256e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "mistral.pixtral-large-2502-v1:0",
		"name": "Pixtral Large (25.02)",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "mistral.voxtral-mini-3b-2507",
		"name": "Voxtral Mini 3B 2507",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "mistral.voxtral-small-24b-2507",
		"name": "Voxtral Small 24B 2507",
		"api": "bedrock-converse-stream",
		"contextWindow": 32e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "moonshot.kimi-k2-thinking",
		"name": "Kimi K2 Thinking",
		"api": "bedrock-converse-stream",
		"contextWindow": 262143,
		"maxTokens": 16e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "moonshotai.kimi-k2.5",
		"name": "Kimi K2.5",
		"api": "bedrock-converse-stream",
		"contextWindow": 262143,
		"maxTokens": 16e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "nvidia.nemotron-nano-12b-v2",
		"name": "NVIDIA Nemotron Nano 12B v2 VL BF16",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "nvidia.nemotron-nano-3-30b",
		"name": "NVIDIA Nemotron Nano 3 30B",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "nvidia.nemotron-nano-9b-v2",
		"name": "NVIDIA Nemotron Nano 9B v2",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "nvidia.nemotron-super-3-120b",
		"name": "NVIDIA Nemotron 3 Super 120B A12B",
		"api": "bedrock-converse-stream",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-5.4",
		"name": "GPT-5.4",
		"api": "bedrock-converse-stream",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-5.5",
		"name": "GPT-5.5",
		"api": "bedrock-converse-stream",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-5.6-luna",
		"name": "GPT-5.6 Luna",
		"api": "bedrock-converse-stream",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-5.6-sol",
		"name": "GPT-5.6 Sol",
		"api": "bedrock-converse-stream",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-5.6-terra",
		"name": "GPT-5.6 Terra",
		"api": "bedrock-converse-stream",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-oss-120b",
		"name": "gpt-oss-120b",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-oss-120b-1:0",
		"name": "gpt-oss-120b",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-oss-20b",
		"name": "gpt-oss-20b",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-oss-20b-1:0",
		"name": "gpt-oss-20b",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-oss-safeguard-120b",
		"name": "GPT OSS Safeguard 120B",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "openai.gpt-oss-safeguard-20b",
		"name": "GPT OSS Safeguard 20B",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "qwen.qwen3-235b-a22b-2507-v1:0",
		"name": "Qwen3 235B A22B 2507",
		"api": "bedrock-converse-stream",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "qwen.qwen3-32b-v1:0",
		"name": "Qwen3 32B (dense)",
		"api": "bedrock-converse-stream",
		"contextWindow": 16384,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "qwen.qwen3-coder-30b-a3b-v1:0",
		"name": "Qwen3 Coder 30B A3B Instruct",
		"api": "bedrock-converse-stream",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "qwen.qwen3-coder-480b-a35b-v1:0",
		"name": "Qwen3 Coder 480B A35B Instruct",
		"api": "bedrock-converse-stream",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "qwen.qwen3-coder-next",
		"name": "Qwen3 Coder Next",
		"api": "bedrock-converse-stream",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "qwen.qwen3-next-80b-a3b",
		"name": "Qwen/Qwen3-Next-80B-A3B-Instruct",
		"api": "bedrock-converse-stream",
		"contextWindow": 262e3,
		"maxTokens": 262e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "qwen.qwen3-vl-235b-a22b",
		"name": "Qwen/Qwen3-VL-235B-A22B-Instruct",
		"api": "bedrock-converse-stream",
		"contextWindow": 262e3,
		"maxTokens": 262e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-fable-5",
		"name": "Claude Fable 5 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-haiku-4-5-20251001-v1:0",
		"name": "Claude Haiku 4.5 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-opus-4-1-20250805-v1:0",
		"name": "Claude Opus 4.1 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-opus-4-5-20251101-v1:0",
		"name": "Claude Opus 4.5 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-opus-4-6-v1",
		"name": "Claude Opus 4.6 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-opus-4-7",
		"name": "Claude Opus 4.7 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-opus-4-8",
		"name": "Claude Opus 4.8 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-opus-5",
		"name": "Claude Opus 5 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
		"name": "Claude Sonnet 4.5 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-sonnet-4-6",
		"name": "Claude Sonnet 4.6 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.anthropic.claude-sonnet-5",
		"name": "Claude Sonnet 5 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.deepseek.r1-v1:0",
		"name": "DeepSeek-R1 (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 128e3,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.meta.llama4-maverick-17b-instruct-v1:0",
		"name": "Llama 4 Maverick 17B Instruct (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "us.meta.llama4-scout-17b-instruct-v1:0",
		"name": "Llama 4 Scout 17B Instruct (US)",
		"api": "bedrock-converse-stream",
		"contextWindow": 35e5,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "writer.palmyra-x4-v1:0",
		"name": "Palmyra X4",
		"api": "bedrock-converse-stream",
		"contextWindow": 122880,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "writer.palmyra-x5-v1:0",
		"name": "Palmyra X5",
		"api": "bedrock-converse-stream",
		"contextWindow": 104e4,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "xai.grok-4.3",
		"name": "Grok 4.3",
		"api": "bedrock-converse-stream",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "zai.glm-4.7",
		"name": "GLM-4.7",
		"api": "bedrock-converse-stream",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "zai.glm-4.7-flash",
		"name": "GLM-4.7-Flash",
		"api": "bedrock-converse-stream",
		"contextWindow": 2e5,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "amazon-bedrock",
		"id": "zai.glm-5",
		"name": "GLM-5",
		"api": "bedrock-converse-stream",
		"contextWindow": 202752,
		"maxTokens": 101376,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "ant-ling",
		"id": "Ling-2.6-1T",
		"name": "Ling 2.6 1T",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "ant-ling",
		"id": "Ling-2.6-flash",
		"name": "Ling 2.6 Flash",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "ant-ling",
		"id": "Ring-2.6-1T",
		"name": "Ring 2.6 1T",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "anthropic",
		"id": "claude-fable-5",
		"name": "Claude Fable 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-haiku-4-5",
		"name": "Claude Haiku 4.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-haiku-4-5-20251001",
		"name": "Claude Haiku 4.5",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-opus-4-1",
		"name": "Claude Opus 4.1 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-opus-4-1-20250805",
		"name": "Claude Opus 4.1",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-opus-4-5",
		"name": "Claude Opus 4.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-opus-4-5-20251101",
		"name": "Claude Opus 4.5",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-opus-4-6",
		"name": "Claude Opus 4.6",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-opus-4-7",
		"name": "Claude Opus 4.7",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-opus-4-8",
		"name": "Claude Opus 4.8",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-opus-5",
		"name": "Claude Opus 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-sonnet-4-5",
		"name": "Claude Sonnet 4.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-sonnet-4-5-20250929",
		"name": "Claude Sonnet 4.5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-sonnet-4-6",
		"name": "Claude Sonnet 4.6",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "anthropic",
		"id": "claude-sonnet-5",
		"name": "Claude Sonnet 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-4",
		"name": "GPT-4",
		"api": "azure-openai-responses",
		"contextWindow": 8192,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-4-turbo",
		"name": "GPT-4 Turbo",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-4.1",
		"name": "GPT-4.1",
		"api": "azure-openai-responses",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-4.1-mini",
		"name": "GPT-4.1 mini",
		"api": "azure-openai-responses",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-4.1-nano",
		"name": "GPT-4.1 nano",
		"api": "azure-openai-responses",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-4o",
		"name": "GPT-4o",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-4o-2024-05-13",
		"name": "GPT-4o (2024-05-13)",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-4o-2024-08-06",
		"name": "GPT-4o (2024-08-06)",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-4o-2024-11-20",
		"name": "GPT-4o (2024-11-20)",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-4o-mini",
		"name": "GPT-4o mini",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5",
		"name": "GPT-5",
		"api": "azure-openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5-chat-latest",
		"name": "GPT-5 Chat Latest",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5-mini",
		"name": "GPT-5 Mini",
		"api": "azure-openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5-nano",
		"name": "GPT-5 Nano",
		"api": "azure-openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5-pro",
		"name": "GPT-5 Pro",
		"api": "azure-openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.1",
		"name": "GPT-5.1",
		"api": "azure-openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.2",
		"name": "GPT-5.2",
		"api": "azure-openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.2-chat-latest",
		"name": "GPT-5.2 Chat",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.2-pro",
		"name": "GPT-5.2 Pro",
		"api": "azure-openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.3-chat-latest",
		"name": "GPT-5.3 Chat (latest)",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.3-codex",
		"name": "GPT-5.3 Codex",
		"api": "azure-openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.3-codex-spark",
		"name": "GPT-5.3 Codex Spark",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.4",
		"name": "GPT-5.4",
		"api": "azure-openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.4-mini",
		"name": "GPT-5.4 mini",
		"api": "azure-openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.4-nano",
		"name": "GPT-5.4 nano",
		"api": "azure-openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.4-pro",
		"name": "GPT-5.4 Pro",
		"api": "azure-openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.5",
		"name": "GPT-5.5",
		"api": "azure-openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.5-pro",
		"name": "GPT-5.5 Pro",
		"api": "azure-openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.6-luna",
		"name": "GPT-5.6 Luna",
		"api": "azure-openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.6-sol",
		"name": "GPT-5.6 Sol",
		"api": "azure-openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-5.6-terra",
		"name": "GPT-5.6 Terra",
		"api": "azure-openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "gpt-realtime-2.1",
		"name": "GPT-Realtime-2.1",
		"api": "azure-openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "o1",
		"name": "o1",
		"api": "azure-openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "o1-pro",
		"name": "o1-pro",
		"api": "azure-openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "o3",
		"name": "o3",
		"api": "azure-openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "o3-mini",
		"name": "o3-mini",
		"api": "azure-openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "o3-pro",
		"name": "o3-pro",
		"api": "azure-openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "azure-openai-responses",
		"id": "o4-mini",
		"name": "o4-mini",
		"api": "azure-openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cerebras",
		"id": "gemma-4-31b",
		"name": "Gemma 4 31B IT",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 40960,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cerebras",
		"id": "gpt-oss-120b",
		"name": "GPT OSS 120B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 40960,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cerebras",
		"id": "zai-glm-4.7",
		"name": "Z.AI GLM-4.7",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 40960,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-3-5-haiku",
		"name": "Claude Haiku 3.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-3-haiku",
		"name": "Claude Haiku 3",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-3-opus",
		"name": "Claude Opus 3",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-3-sonnet",
		"name": "Claude Sonnet 3",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-3.5-haiku",
		"name": "Claude Haiku 3.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-3.5-sonnet",
		"name": "Claude Sonnet 3.5 v2",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-fable-5",
		"name": "Claude Fable 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-haiku-4-5",
		"name": "Claude Haiku 4.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-opus-4",
		"name": "Claude Opus 4 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-opus-4-1",
		"name": "Claude Opus 4.1 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-opus-4-5",
		"name": "Claude Opus 4.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-opus-4-6",
		"name": "Claude Opus 4.6 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-opus-4-7",
		"name": "Claude Opus 4.7",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-opus-4-8",
		"name": "Claude Opus 4.8",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-sonnet-4",
		"name": "Claude Sonnet 4 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-sonnet-4-5",
		"name": "Claude Sonnet 4.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-sonnet-4-6",
		"name": "Claude Sonnet 4.6",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "claude-sonnet-5",
		"name": "Claude Sonnet 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "workers-ai/@cf/moonshotai/kimi-k2.5",
		"name": "Kimi K2.5",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "workers-ai/@cf/moonshotai/kimi-k2.6",
		"name": "Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "workers-ai/@cf/nvidia/nemotron-3-120b-a12b",
		"name": "Nemotron 3 Super 120B",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "workers-ai/@cf/zai-org/glm-4.7-flash",
		"name": "GLM-4.7-Flash",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "workers-ai/@cf/zai-org/glm-5.2",
		"name": "Glm 5.2",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-4",
		"name": "GPT-4",
		"api": "openai-responses",
		"contextWindow": 8192,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-4-turbo",
		"name": "GPT-4 Turbo",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-4o",
		"name": "GPT-4o",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-4o-mini",
		"name": "GPT-4o mini",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-5.1",
		"name": "GPT-5.1",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-5.1-codex",
		"name": "GPT-5.1 Codex",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-5.2",
		"name": "GPT-5.2",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-5.2-codex",
		"name": "GPT-5.2 Codex",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-5.3-codex",
		"name": "GPT-5.3 Codex",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-5.4",
		"name": "GPT-5.4",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-5.5",
		"name": "GPT-5.5",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-5.6-luna",
		"name": "GPT-5.6 Luna",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-5.6-sol",
		"name": "GPT-5.6 Sol",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "gpt-5.6-terra",
		"name": "GPT-5.6 Terra",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "o1",
		"name": "o1",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "o3",
		"name": "o3",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "o3-mini",
		"name": "o3-mini",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "o3-pro",
		"name": "o3-pro",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-ai-gateway",
		"id": "o4-mini",
		"name": "o4-mini",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/google/gemma-4-26b-a4b-it",
		"name": "Gemma 4 26B A4B IT",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/ibm-granite/granite-4.0-h-micro",
		"name": "Granite 4.0 H Micro",
		"api": "openai-completions",
		"contextWindow": 131e3,
		"maxTokens": 131e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
		"name": "Llama 3.3 70B Instruct fp8 Fast",
		"api": "openai-completions",
		"contextWindow": 24e3,
		"maxTokens": 24e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/meta/llama-4-scout-17b-16e-instruct",
		"name": "Llama 4 Scout 17B 16E Instruct",
		"api": "openai-completions",
		"contextWindow": 131e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/mistralai/mistral-small-3.1-24b-instruct",
		"name": "Mistral Small 3.1 24B Instruct",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/moonshotai/kimi-k2.6",
		"name": "Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/moonshotai/kimi-k2.7-code",
		"name": "Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/nvidia/nemotron-3-120b-a12b",
		"name": "Nemotron 3 Super 120B",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/openai/gpt-oss-120b",
		"name": "GPT OSS 120B",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/openai/gpt-oss-20b",
		"name": "GPT OSS 20B",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/qwen/qwen3-30b-a3b-fp8",
		"name": "Qwen3 30B A3b fp8",
		"api": "openai-completions",
		"contextWindow": 32768,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/zai-org/glm-4.7-flash",
		"name": "GLM-4.7-Flash",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "cloudflare-workers-ai",
		"id": "@cf/zai-org/glm-5.2",
		"name": "Glm 5.2",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "deepseek",
		"id": "deepseek-v4-flash",
		"name": "DeepSeek V4 Flash",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "deepseek",
		"id": "deepseek-v4-pro",
		"name": "DeepSeek V4 Pro",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/deepseek-v4-flash",
		"name": "DeepSeek V4 Flash",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/deepseek-v4-pro",
		"name": "DeepSeek V4 Pro",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/glm-5p1",
		"name": "GLM 5.1",
		"api": "anthropic-messages",
		"contextWindow": 202800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/gpt-oss-120b",
		"name": "GPT OSS 120B",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/gpt-oss-20b",
		"name": "GPT OSS 20B",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/kimi-k2p6",
		"name": "Kimi K2.6",
		"api": "anthropic-messages",
		"contextWindow": 262e3,
		"maxTokens": 262e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/kimi-k2p7-code",
		"name": "Kimi K2.7 Code",
		"api": "anthropic-messages",
		"contextWindow": 262e3,
		"maxTokens": 262e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/minimax-m2p7",
		"name": "MiniMax-M2.7",
		"api": "anthropic-messages",
		"contextWindow": 196608,
		"maxTokens": 196608,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/minimax-m3",
		"name": "MiniMax-M3",
		"api": "anthropic-messages",
		"contextWindow": 512e3,
		"maxTokens": 512e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/qwen3p7-plus",
		"name": "Qwen 3.7 Plus",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/routers/glm-5p1-fast",
		"name": "GLM 5.1 Fast",
		"api": "anthropic-messages",
		"contextWindow": 202800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/routers/kimi-k2p6-fast",
		"name": "Kimi K2.6 Fast",
		"api": "anthropic-messages",
		"contextWindow": 262e3,
		"maxTokens": 262e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/routers/kimi-k2p6-turbo",
		"name": "Kimi K2.6 Turbo",
		"api": "anthropic-messages",
		"contextWindow": 262e3,
		"maxTokens": 262e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/routers/kimi-k2p7-code-fast",
		"name": "Kimi K2.7 Code Fast",
		"api": "anthropic-messages",
		"contextWindow": 262e3,
		"maxTokens": 262e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/models/glm-5p2",
		"name": "GLM 5.2",
		"api": "openai-completions",
		"contextWindow": 1048575,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "fireworks",
		"id": "accounts/fireworks/routers/glm-5p2-fast",
		"name": "GLM 5.2 Fast",
		"api": "openai-completions",
		"contextWindow": 1048575,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-haiku-4.5",
		"name": "Claude Haiku 4.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-opus-4.5",
		"name": "Claude Opus 4.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-opus-4.6",
		"name": "Claude Opus 4.6",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-opus-4.7",
		"name": "Claude Opus 4.7",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-opus-4.8",
		"name": "Claude Opus 4.8",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-opus-5",
		"name": "Claude Opus 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-sonnet-4",
		"name": "Claude Sonnet 4 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 216e3,
		"maxTokens": 16e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-sonnet-4.5",
		"name": "Claude Sonnet 4.5 (latest)",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-sonnet-4.6",
		"name": "Claude Sonnet 4.6",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-sonnet-5",
		"name": "Claude Sonnet 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "claude-fable-5",
		"name": "Claude Fable 5",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gemini-2.5-pro",
		"name": "Gemini 2.5 Pro",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gemini-3-flash-preview",
		"name": "Gemini 3 Flash Preview",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gemini-3.1-pro-preview",
		"name": "Gemini 3.1 Pro Preview",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gemini-3.5-flash",
		"name": "Gemini 3.5 Flash",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-4.1",
		"name": "GPT-4.1",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "kimi-k2.7-code",
		"name": "Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5-mini",
		"name": "GPT-5 Mini",
		"api": "openai-responses",
		"contextWindow": 264e3,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5.2",
		"name": "GPT-5.2",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5.2-codex",
		"name": "GPT-5.2 Codex",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5.3-codex",
		"name": "GPT-5.3 Codex",
		"api": "openai-responses",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5.4",
		"name": "GPT-5.4",
		"api": "openai-responses",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5.4-mini",
		"name": "GPT-5.4 mini",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5.4-nano",
		"name": "GPT-5.4 nano",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5.5",
		"name": "GPT-5.5",
		"api": "openai-responses",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5.6-luna",
		"name": "GPT-5.6 Luna",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5.6-sol",
		"name": "GPT-5.6 Sol",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "gpt-5.6-terra",
		"name": "GPT-5.6 Terra",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "github-copilot",
		"id": "mai-code-1-flash-picker",
		"name": "MAI-Code-1-Flash",
		"api": "openai-responses",
		"contextWindow": 256e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "google",
		"id": "deep-research-max-preview-04-2026",
		"name": "Deep Research Max Preview (Apr-21-2026)",
		"api": "google-generative-ai",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "deep-research-preview-04-2026",
		"name": "Deep Research Preview (Apr-21-2026)",
		"api": "google-generative-ai",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-2.0-flash",
		"name": "Gemini 2.0 Flash",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-2.0-flash-lite",
		"name": "Gemini 2.0 Flash-Lite",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-2.5-computer-use-preview-10-2025",
		"name": "Gemini 2.5 Computer Use Preview 10-2025",
		"api": "google-generative-ai",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-2.5-flash",
		"name": "Gemini 2.5 Flash",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-2.5-flash-lite",
		"name": "Gemini 2.5 Flash-Lite",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-2.5-pro",
		"name": "Gemini 2.5 Pro",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3-flash-preview",
		"name": "Gemini 3 Flash Preview",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3-pro-preview",
		"name": "Gemini 3 Pro Preview",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3.1-flash-lite",
		"name": "Gemini 3.1 Flash Lite",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3.1-flash-lite-image",
		"name": "Nano Banana 2 Lite",
		"api": "google-generative-ai",
		"contextWindow": 65536,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3.1-flash-lite-preview",
		"name": "Gemini 3.1 Flash Lite Preview",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3.1-flash-live-preview",
		"name": "Gemini 3.1 Flash Live Preview",
		"api": "google-generative-ai",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3.1-pro-preview",
		"name": "Gemini 3.1 Pro Preview",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3.1-pro-preview-customtools",
		"name": "Gemini 3.1 Pro Preview Custom Tools",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3.5-flash",
		"name": "Gemini 3.5 Flash",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3.5-flash-lite",
		"name": "Gemini 3.5 Flash Lite",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-3.6-flash",
		"name": "Gemini 3.6 Flash",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-flash-latest",
		"name": "Gemini Flash Latest",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-flash-lite-latest",
		"name": "Gemini Flash-Lite Latest",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemini-robotics-er-1.6-preview",
		"name": "Gemini Robotics-ER 1.6 Preview",
		"api": "google-generative-ai",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemma-4-26b-a4b-it",
		"name": "Gemma 4 26B A4B IT",
		"api": "google-generative-ai",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google",
		"id": "gemma-4-31b-it",
		"name": "Gemma 4 31B IT",
		"api": "google-generative-ai",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-2.5-flash",
		"name": "Gemini 2.5 Flash",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-2.5-flash-lite",
		"name": "Gemini 2.5 Flash-Lite",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-2.5-pro",
		"name": "Gemini 2.5 Pro",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-3-flash-preview",
		"name": "Gemini 3 Flash Preview",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-3.1-flash-lite",
		"name": "Gemini 3.1 Flash Lite",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-3.1-pro-preview",
		"name": "Gemini 3.1 Pro Preview",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-3.1-pro-preview-customtools",
		"name": "Gemini 3.1 Pro Preview Custom Tools",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-3.5-flash",
		"name": "Gemini 3.5 Flash",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-3.5-flash-lite",
		"name": "Gemini 3.5 Flash Lite",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-3.6-flash",
		"name": "Gemini 3.6 Flash",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-flash-latest",
		"name": "Gemini Flash Latest",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "google-vertex",
		"id": "gemini-flash-lite-latest",
		"name": "Gemini Flash-Lite Latest",
		"api": "google-vertex",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "groq",
		"id": "llama-3.1-8b-instant",
		"name": "Llama 3.1 8B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "groq",
		"id": "llama-3.3-70b-versatile",
		"name": "Llama 3.3 70B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "groq",
		"id": "meta-llama/llama-4-scout-17b-16e-instruct",
		"name": "Llama 4 Scout 17B 16E",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "groq",
		"id": "openai/gpt-oss-120b",
		"name": "GPT OSS 120B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "groq",
		"id": "openai/gpt-oss-20b",
		"name": "GPT OSS 20B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "groq",
		"id": "openai/gpt-oss-safeguard-20b",
		"name": "Safety GPT OSS 20B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "groq",
		"id": "qwen/qwen3-32b",
		"name": "Qwen3-32B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 40960,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "MiniMaxAI/MiniMax-M2",
		"name": "MiniMax-M2",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "MiniMaxAI/MiniMax-M2.1",
		"name": "MiniMax-M2.1",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "MiniMaxAI/MiniMax-M2.5",
		"name": "MiniMax-M2.5",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "MiniMaxAI/MiniMax-M2.7",
		"name": "MiniMax-M2.7",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "MiniMaxAI/MiniMax-M3",
		"name": "MiniMax-M3",
		"api": "openai-completions",
		"contextWindow": 524288,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3-235B-A22B",
		"name": "Qwen3 235B-A22B",
		"api": "openai-completions",
		"contextWindow": 40960,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3-235B-A22B-Thinking-2507",
		"name": "Qwen3-235B-A22B-Thinking-2507",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3-32B",
		"name": "Qwen3 32B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3-Coder-30B-A3B-Instruct",
		"name": "Qwen3-Coder 30B-A3B Instruct",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
		"name": "Qwen3-Coder-480B-A35B-Instruct",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 66536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3-Coder-Next",
		"name": "Qwen3-Coder-Next",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3-Next-80B-A3B-Instruct",
		"name": "Qwen3-Next-80B-A3B-Instruct",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 66536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3-Next-80B-A3B-Thinking",
		"name": "Qwen3-Next-80B-A3B-Thinking",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3.5-122B-A10B",
		"name": "Qwen3.5 122B-A10B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3.5-27B",
		"name": "Qwen3.5 27B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3.5-35B-A3B",
		"name": "Qwen3.5 35B-A3B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3.5-397B-A17B",
		"name": "Qwen3.5-397B-A17B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3.5-9B",
		"name": "Qwen3.5 9B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3.6-27B",
		"name": "Qwen3.6 27B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "Qwen/Qwen3.6-35B-A3B",
		"name": "Qwen3.6 35B-A3B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "XiaomiMiMo/MiMo-V2-Flash",
		"name": "MiMo-V2-Flash",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "XiaomiMiMo/MiMo-V2.5",
		"name": "MiMo-V2.5",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "XiaomiMiMo/MiMo-V2.5-Pro",
		"name": "MiMo-V2.5-Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "deepseek-ai/DeepSeek-R1",
		"name": "DeepSeek-R1",
		"api": "openai-completions",
		"contextWindow": 64e3,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "deepseek-ai/DeepSeek-R1-0528",
		"name": "DeepSeek-R1-0528",
		"api": "openai-completions",
		"contextWindow": 163840,
		"maxTokens": 163840,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "deepseek-ai/DeepSeek-V3.2",
		"name": "DeepSeek-V3.2",
		"api": "openai-completions",
		"contextWindow": 163840,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "deepseek-ai/DeepSeek-V4-Flash",
		"name": "DeepSeek V4 Flash",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "deepseek-ai/DeepSeek-V4-Pro",
		"name": "DeepSeek V4 Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 393216,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "google/gemma-4-26B-A4B-it",
		"name": "Gemma 4 26B A4B IT",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "google/gemma-4-31B-it",
		"name": "Gemma 4 31B IT",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "meta-llama/Llama-3.3-70B-Instruct",
		"name": "Llama-3.3-70B-Instruct",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "moonshotai/Kimi-K2-Instruct",
		"name": "Kimi-K2-Instruct",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "moonshotai/Kimi-K2-Instruct-0905",
		"name": "Kimi-K2-Instruct-0905",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "moonshotai/Kimi-K2-Thinking",
		"name": "Kimi-K2-Thinking",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "moonshotai/Kimi-K2.5",
		"name": "Kimi-K2.5",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "moonshotai/Kimi-K2.6",
		"name": "Kimi-K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "moonshotai/Kimi-K2.7-Code",
		"name": "Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "openai/gpt-oss-120b",
		"name": "GPT OSS 120B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "openai/gpt-oss-20b",
		"name": "GPT OSS 20B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "stepfun-ai/Step-3.5-Flash",
		"name": "Step 3.5 Flash",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "stepfun-ai/Step-3.7-Flash",
		"name": "Step 3.7 Flash",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "zai-org/GLM-4.5",
		"name": "GLM-4.5",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 98304,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "zai-org/GLM-4.5-Air",
		"name": "GLM-4.5-Air",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 98304,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "zai-org/GLM-4.5V",
		"name": "GLM-4.5V",
		"api": "openai-completions",
		"contextWindow": 65536,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "huggingface",
		"id": "zai-org/GLM-4.6",
		"name": "GLM-4.6",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "zai-org/GLM-4.7",
		"name": "GLM-4.7",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "zai-org/GLM-4.7-Flash",
		"name": "GLM-4.7-Flash",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "zai-org/GLM-5",
		"name": "GLM-5",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "zai-org/GLM-5.1",
		"name": "GLM-5.1",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "huggingface",
		"id": "zai-org/GLM-5.2",
		"name": "GLM-5.2",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "kimi-coding",
		"id": "k3",
		"name": "Kimi K3",
		"api": "anthropic-messages",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "kimi-coding",
		"id": "k3-256k",
		"name": "Kimi K3-256K",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "kimi-coding",
		"id": "kimi-for-coding",
		"name": "Kimi K2.7 Code",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "kimi-coding",
		"id": "kimi-for-coding-highspeed",
		"name": "Kimi For Coding HighSpeed",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "minimax",
		"id": "MiniMax-M2.7",
		"name": "MiniMax-M2.7",
		"api": "anthropic-messages",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "minimax",
		"id": "MiniMax-M2.7-highspeed",
		"name": "MiniMax-M2.7-highspeed",
		"api": "anthropic-messages",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "minimax",
		"id": "MiniMax-M3",
		"name": "MiniMax-M3",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "minimax-cn",
		"id": "MiniMax-M2.7",
		"name": "MiniMax-M2.7",
		"api": "anthropic-messages",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "minimax-cn",
		"id": "MiniMax-M2.7-highspeed",
		"name": "MiniMax-M2.7-highspeed",
		"api": "anthropic-messages",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "minimax-cn",
		"id": "MiniMax-M3",
		"name": "MiniMax-M3",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "codestral-latest",
		"name": "Codestral (latest)",
		"api": "mistral-conversations",
		"contextWindow": 256e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "devstral-2512",
		"name": "Devstral 2",
		"api": "mistral-conversations",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "devstral-latest",
		"name": "Devstral 2",
		"api": "mistral-conversations",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "devstral-medium-2507",
		"name": "Devstral Medium",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "devstral-medium-latest",
		"name": "Devstral 2 (latest)",
		"api": "mistral-conversations",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "devstral-small-2505",
		"name": "Devstral Small 2505",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "devstral-small-2507",
		"name": "Devstral Small",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "labs-devstral-small-2512",
		"name": "Devstral Small 2",
		"api": "mistral-conversations",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "magistral-medium-latest",
		"name": "Magistral Medium (latest)",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "magistral-small",
		"name": "Magistral Small",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "ministral-3b-latest",
		"name": "Ministral 3B (latest)",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "ministral-8b-latest",
		"name": "Ministral 8B (latest)",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "mistral-large-2411",
		"name": "Mistral Large 2.1",
		"api": "mistral-conversations",
		"contextWindow": 131072,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "mistral-large-2512",
		"name": "Mistral Large 3",
		"api": "mistral-conversations",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "mistral-large-latest",
		"name": "Mistral Large (latest)",
		"api": "mistral-conversations",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "mistral-medium-2505",
		"name": "Mistral Medium 3",
		"api": "mistral-conversations",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "mistral-medium-2508",
		"name": "Mistral Medium 3.1",
		"api": "mistral-conversations",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "mistral-medium-2604",
		"name": "Mistral Medium 3.5",
		"api": "mistral-conversations",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "mistral-medium-3.5",
		"name": "Mistral Medium 3.5",
		"api": "mistral-conversations",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "mistral-medium-latest",
		"name": "Mistral Medium (latest)",
		"api": "mistral-conversations",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "mistral-nemo",
		"name": "Mistral Nemo",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "mistral-small-2506",
		"name": "Mistral Small 3.2",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "mistral-small-2603",
		"name": "Mistral Small 4",
		"api": "mistral-conversations",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "mistral-small-latest",
		"name": "Mistral Small (latest)",
		"api": "mistral-conversations",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "open-mistral-7b",
		"name": "Mistral 7B",
		"api": "mistral-conversations",
		"contextWindow": 8e3,
		"maxTokens": 8e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "open-mistral-nemo",
		"name": "Open Mistral Nemo",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "open-mixtral-8x22b",
		"name": "Mixtral 8x22B",
		"api": "mistral-conversations",
		"contextWindow": 64e3,
		"maxTokens": 64e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "open-mixtral-8x7b",
		"name": "Mixtral 8x7B",
		"api": "mistral-conversations",
		"contextWindow": 32e3,
		"maxTokens": 32e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "mistral",
		"id": "pixtral-12b",
		"name": "Pixtral 12B",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "mistral",
		"id": "pixtral-large-latest",
		"name": "Pixtral Large (latest)",
		"api": "mistral-conversations",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "moonshotai",
		"id": "kimi-k2-0711-preview",
		"name": "Kimi K2 0711",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "moonshotai",
		"id": "kimi-k2-0905-preview",
		"name": "Kimi K2 0905",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "moonshotai",
		"id": "kimi-k2-thinking",
		"name": "Kimi K2 Thinking",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "moonshotai",
		"id": "kimi-k2-thinking-turbo",
		"name": "Kimi K2 Thinking Turbo",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "moonshotai",
		"id": "kimi-k2-turbo-preview",
		"name": "Kimi K2 Turbo",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "moonshotai",
		"id": "kimi-k2.5",
		"name": "Kimi K2.5",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "moonshotai",
		"id": "kimi-k2.6",
		"name": "Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "moonshotai",
		"id": "kimi-k2.7-code",
		"name": "Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "moonshotai",
		"id": "kimi-k2.7-code-highspeed",
		"name": "Kimi K2.7 Code HighSpeed",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "moonshotai",
		"id": "kimi-k3",
		"name": "Kimi K3",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "moonshotai-cn",
		"id": "kimi-k2-0711-preview",
		"name": "Kimi K2 0711",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "moonshotai-cn",
		"id": "kimi-k2-0905-preview",
		"name": "Kimi K2 0905",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "moonshotai-cn",
		"id": "kimi-k2-thinking",
		"name": "Kimi K2 Thinking",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "moonshotai-cn",
		"id": "kimi-k2-thinking-turbo",
		"name": "Kimi K2 Thinking Turbo",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "moonshotai-cn",
		"id": "kimi-k2-turbo-preview",
		"name": "Kimi K2 Turbo",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "moonshotai-cn",
		"id": "kimi-k2.5",
		"name": "Kimi K2.5",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "moonshotai-cn",
		"id": "kimi-k2.6",
		"name": "Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "moonshotai-cn",
		"id": "kimi-k2.7-code",
		"name": "Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "moonshotai-cn",
		"id": "kimi-k2.7-code-highspeed",
		"name": "Kimi K2.7 Code HighSpeed",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "moonshotai-cn",
		"id": "kimi-k3",
		"name": "Kimi K3",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "nvidia",
		"id": "meta/llama-3.1-70b-instruct",
		"name": "Llama 3.1 70b Instruct",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "nvidia",
		"id": "meta/llama-3.1-8b-instruct",
		"name": "Llama 3.1 8B Instruct",
		"api": "openai-completions",
		"contextWindow": 16e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "nvidia",
		"id": "meta/llama-3.2-11b-vision-instruct",
		"name": "Llama 3.2 11b Vision Instruct",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "nvidia",
		"id": "meta/llama-3.2-90b-vision-instruct",
		"name": "Llama-3.2-90B-Vision-Instruct",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "nvidia",
		"id": "meta/llama-3.3-70b-instruct",
		"name": "Llama 3.3 70b Instruct",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "nvidia",
		"id": "minimaxai/minimax-m3",
		"name": "MiniMax-M3",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "nvidia",
		"id": "mistralai/mistral-small-4-119b-2603",
		"name": "mistral-small-4-119b-2603",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "nvidia",
		"id": "moonshotai/kimi-k2.6",
		"name": "Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "nvidia",
		"id": "nvidia/nemotron-3-nano-30b-a3b",
		"name": "nemotron-3-nano-30b-a3b",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "nvidia",
		"id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
		"name": "Nemotron 3 Nano Omni",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "nvidia",
		"id": "nvidia/nemotron-3-super-120b-a12b",
		"name": "Nemotron 3 Super",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "nvidia",
		"id": "nvidia/nemotron-3-ultra-550b-a55b",
		"name": "Nemotron 3 Ultra 550B A55B",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "nvidia",
		"id": "nvidia/nvidia-nemotron-nano-9b-v2",
		"name": "nvidia-nemotron-nano-9b-v2",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "nvidia",
		"id": "openai/gpt-oss-120b",
		"name": "GPT-OSS-120B",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "nvidia",
		"id": "openai/gpt-oss-20b",
		"name": "GPT OSS 20B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "nvidia",
		"id": "stepfun-ai/step-3.5-flash",
		"name": "Step 3.5 Flash",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "nvidia",
		"id": "stepfun-ai/step-3.7-flash",
		"name": "Step 3.7 Flash",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "nvidia",
		"id": "z-ai/glm-5.2",
		"name": "GLM-5.2",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openai",
		"id": "gpt-4",
		"name": "GPT-4",
		"api": "openai-responses",
		"contextWindow": 8192,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openai",
		"id": "gpt-4-turbo",
		"name": "GPT-4 Turbo",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-4.1",
		"name": "GPT-4.1",
		"api": "openai-responses",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-4.1-mini",
		"name": "GPT-4.1 mini",
		"api": "openai-responses",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-4.1-nano",
		"name": "GPT-4.1 nano",
		"api": "openai-responses",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-4o",
		"name": "GPT-4o",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-4o-2024-05-13",
		"name": "GPT-4o (2024-05-13)",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-4o-2024-08-06",
		"name": "GPT-4o (2024-08-06)",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-4o-2024-11-20",
		"name": "GPT-4o (2024-11-20)",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-4o-mini",
		"name": "GPT-4o mini",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5",
		"name": "GPT-5",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5-chat-latest",
		"name": "GPT-5 Chat Latest",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5-mini",
		"name": "GPT-5 Mini",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5-nano",
		"name": "GPT-5 Nano",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5-pro",
		"name": "GPT-5 Pro",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.1",
		"name": "GPT-5.1",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.2",
		"name": "GPT-5.2",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.2-chat-latest",
		"name": "GPT-5.2 Chat",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.2-pro",
		"name": "GPT-5.2 Pro",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.3-chat-latest",
		"name": "GPT-5.3 Chat (latest)",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.3-codex",
		"name": "GPT-5.3 Codex",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.3-codex-spark",
		"name": "GPT-5.3 Codex Spark",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.4",
		"name": "GPT-5.4",
		"api": "openai-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.4-mini",
		"name": "GPT-5.4 mini",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.4-nano",
		"name": "GPT-5.4 nano",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.4-pro",
		"name": "GPT-5.4 Pro",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.5",
		"name": "GPT-5.5",
		"api": "openai-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.5-pro",
		"name": "GPT-5.5 Pro",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.6-luna",
		"name": "GPT-5.6 Luna",
		"api": "openai-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.6-sol",
		"name": "GPT-5.6 Sol",
		"api": "openai-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-5.6-terra",
		"name": "GPT-5.6 Terra",
		"api": "openai-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "gpt-realtime-2.1",
		"name": "GPT-Realtime-2.1",
		"api": "openai-responses",
		"contextWindow": 128e3,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "o1",
		"name": "o1",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "o1-pro",
		"name": "o1-pro",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "o3",
		"name": "o3",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "o3-mini",
		"name": "o3-mini",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openai",
		"id": "o3-pro",
		"name": "o3-pro",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai",
		"id": "o4-mini",
		"name": "o4-mini",
		"api": "openai-responses",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai-codex",
		"id": "gpt-5.3-codex-spark",
		"name": "GPT-5.3 Codex Spark",
		"api": "openai-codex-responses",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openai-codex",
		"id": "gpt-5.4",
		"name": "GPT-5.4",
		"api": "openai-codex-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai-codex",
		"id": "gpt-5.4-mini",
		"name": "GPT-5.4 mini",
		"api": "openai-codex-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai-codex",
		"id": "gpt-5.5",
		"name": "GPT-5.5",
		"api": "openai-codex-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai-codex",
		"id": "gpt-5.6-luna",
		"name": "GPT-5.6 Luna",
		"api": "openai-codex-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai-codex",
		"id": "gpt-5.6-sol",
		"name": "GPT-5.6 Sol",
		"api": "openai-codex-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openai-codex",
		"id": "gpt-5.6-terra",
		"name": "GPT-5.6 Terra",
		"api": "openai-codex-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-fable-5",
		"name": "Claude Fable 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-haiku-4-5",
		"name": "Claude Haiku 4.5",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-opus-4-1",
		"name": "Claude Opus 4.1",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-opus-4-5",
		"name": "Claude Opus 4.5",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-opus-4-6",
		"name": "Claude Opus 4.6",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-opus-4-7",
		"name": "Claude Opus 4.7",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-opus-4-8",
		"name": "Claude Opus 4.8",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-opus-5",
		"name": "Claude Opus 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-sonnet-4",
		"name": "Claude Sonnet 4",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-sonnet-4-5",
		"name": "Claude Sonnet 4.5",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-sonnet-4-6",
		"name": "Claude Sonnet 4.6",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "claude-sonnet-5",
		"name": "Claude Sonnet 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "qwen3.5-plus",
		"name": "Qwen3.5 Plus",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "qwen3.6-plus",
		"name": "Qwen3.6 Plus",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gemini-3-flash",
		"name": "Gemini 3 Flash",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gemini-3.1-pro",
		"name": "Gemini 3.1 Pro Preview",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gemini-3.5-flash",
		"name": "Gemini 3.5 Flash",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gemini-3.5-flash-lite",
		"name": "Gemini 3.5 Flash Lite",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gemini-3.6-flash",
		"name": "Gemini 3.6 Flash",
		"api": "google-generative-ai",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "big-pickle",
		"name": "Big Pickle",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "deepseek-v4-flash",
		"name": "DeepSeek V4 Flash",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "deepseek-v4-flash-free",
		"name": "DeepSeek V4 Flash Free",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "deepseek-v4-pro",
		"name": "DeepSeek V4 Pro",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "glm-5",
		"name": "GLM-5",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "glm-5.1",
		"name": "GLM-5.1",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "glm-5.2",
		"name": "GLM-5.2",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "grok-build-0.1",
		"name": "Grok Build 0.1",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "kimi-k2.5",
		"name": "Kimi K2.5",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "kimi-k2.6",
		"name": "Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "kimi-k2.7-code",
		"name": "Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "laguna-s-2.1-free",
		"name": "Laguna S 2.1 Free",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "ling-3.0-flash-free",
		"name": "Ling-3.0-flash Free",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "mimo-v2.5-free",
		"name": "MiMo V2.5 Free",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "minimax-m2.5",
		"name": "MiniMax-M2.5",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "minimax-m2.7",
		"name": "MiniMax-M2.7",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "minimax-m3",
		"name": "MiniMax-M3",
		"api": "openai-completions",
		"contextWindow": 512e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "nemotron-3-ultra-free",
		"name": "Nemotron 3 Ultra Free",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "north-mini-code-free",
		"name": "North Mini Code Free",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5",
		"name": "GPT-5",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5-codex",
		"name": "GPT-5 Codex",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5-nano",
		"name": "GPT-5 Nano",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.1",
		"name": "GPT-5.1",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.1-codex",
		"name": "GPT-5.1 Codex",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.1-codex-max",
		"name": "GPT-5.1 Codex Max",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.1-codex-mini",
		"name": "GPT-5.1 Codex Mini",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.2",
		"name": "GPT-5.2",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.2-codex",
		"name": "GPT-5.2 Codex",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.3-codex",
		"name": "GPT-5.3 Codex",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.4",
		"name": "GPT-5.4",
		"api": "openai-responses",
		"contextWindow": 272e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.4-mini",
		"name": "GPT-5.4 Mini",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.4-nano",
		"name": "GPT-5.4 Nano",
		"api": "openai-responses",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.4-pro",
		"name": "GPT-5.4 Pro",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.5",
		"name": "GPT-5.5",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.5-pro",
		"name": "GPT-5.5 Pro",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.6-luna",
		"name": "GPT-5.6 Luna",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.6-sol",
		"name": "GPT-5.6 Sol",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "gpt-5.6-terra",
		"name": "GPT-5.6 Terra",
		"api": "openai-responses",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode",
		"id": "grok-4.5",
		"name": "Grok 4.5",
		"api": "openai-responses",
		"contextWindow": 5e5,
		"maxTokens": 5e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode-go",
		"id": "minimax-m3",
		"name": "MiniMax-M3",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode-go",
		"id": "qwen3.7-max",
		"name": "Qwen3.7 Max",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode-go",
		"id": "qwen3.7-plus",
		"name": "Qwen3.7 Plus",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode-go",
		"id": "deepseek-v4-flash",
		"name": "DeepSeek V4 Flash",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode-go",
		"id": "deepseek-v4-pro",
		"name": "DeepSeek V4 Pro",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode-go",
		"id": "glm-5.1",
		"name": "GLM-5.1",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode-go",
		"id": "glm-5.2",
		"name": "GLM-5.2",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode-go",
		"id": "hy3",
		"name": "Hy3",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode-go",
		"id": "kimi-k2.6",
		"name": "Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode-go",
		"id": "kimi-k2.7-code",
		"name": "Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode-go",
		"id": "kimi-k3",
		"name": "Kimi K3 (2x usage)",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode-go",
		"id": "mimo-v2.5",
		"name": "MiMo V2.5",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode-go",
		"id": "mimo-v2.5-pro",
		"name": "MiMo V2.5 Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode-go",
		"id": "minimax-m2.7",
		"name": "MiniMax-M2.7",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "opencode-go",
		"id": "qwen3.6-plus",
		"name": "Qwen3.6 Plus",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "opencode-go",
		"id": "grok-4.5",
		"name": "Grok 4.5",
		"api": "openai-responses",
		"contextWindow": 5e5,
		"maxTokens": 5e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "ai21/jamba-large-1.7",
		"name": "AI21: Jamba Large 1.7",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "aion-labs/aion-2.0",
		"name": "AionLabs: Aion-2.0",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "aion-labs/aion-3.0",
		"name": "AionLabs: Aion-3.0",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "aion-labs/aion-3.0-mini",
		"name": "AionLabs: Aion-3.0-Mini",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "amazon/nova-2-lite-v1",
		"name": "Amazon: Nova 2 Lite",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65535,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "amazon/nova-lite-v1",
		"name": "Amazon: Nova Lite 1.0",
		"api": "openai-completions",
		"contextWindow": 3e5,
		"maxTokens": 5120,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "amazon/nova-micro-v1",
		"name": "Amazon: Nova Micro 1.0",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 5120,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "amazon/nova-premier-v1",
		"name": "Amazon: Nova Premier 1.0",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 32e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "amazon/nova-pro-v1",
		"name": "Amazon: Nova Pro 1.0",
		"api": "openai-completions",
		"contextWindow": 3e5,
		"maxTokens": 5120,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-3-haiku",
		"name": "Anthropic: Claude 3 Haiku",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-fable-5",
		"name": "Anthropic: Claude Fable 5",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-haiku-4.5",
		"name": "Anthropic: Claude Haiku 4.5",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-opus-4",
		"name": "Anthropic: Claude Opus 4",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-opus-4.1",
		"name": "Anthropic: Claude Opus 4.1",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-opus-4.5",
		"name": "Anthropic: Claude Opus 4.5",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-opus-4.6",
		"name": "Anthropic: Claude Opus 4.6",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-opus-4.7",
		"name": "Anthropic: Claude Opus 4.7",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-opus-4.7-fast",
		"name": "Anthropic: Claude Opus 4.7 (Fast)",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-opus-4.8",
		"name": "Anthropic: Claude Opus 4.8",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-opus-4.8-fast",
		"name": "Anthropic: Claude Opus 4.8 (Fast)",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-opus-5",
		"name": "Claude Opus 5",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-opus-5-fast",
		"name": "Claude Opus 5 (Fast)",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-sonnet-4",
		"name": "Anthropic: Claude Sonnet 4",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-sonnet-4.5",
		"name": "Anthropic: Claude Sonnet 4.5",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-sonnet-4.6",
		"name": "Anthropic: Claude Sonnet 4.6",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "anthropic/claude-sonnet-5",
		"name": "Anthropic: Claude Sonnet 5",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "arcee-ai/trinity-large-thinking",
		"name": "Arcee AI: Trinity Large Thinking",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "arcee-ai/virtuoso-large",
		"name": "Arcee AI: Virtuoso Large",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 64e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "auto",
		"name": "Auto",
		"api": "openai-completions",
		"contextWindow": 2e6,
		"maxTokens": 3e4,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "bytedance-seed/seed-1.6",
		"name": "ByteDance Seed: Seed 1.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "bytedance-seed/seed-1.6-flash",
		"name": "ByteDance Seed: Seed 1.6 Flash",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "bytedance-seed/seed-2.0-lite",
		"name": "ByteDance Seed: Seed-2.0-Lite",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "bytedance-seed/seed-2.0-mini",
		"name": "ByteDance Seed: Seed-2.0-Mini",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "cohere/command-r-08-2024",
		"name": "Cohere: Command R (08-2024)",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "cohere/command-r-plus-08-2024",
		"name": "Cohere: Command R+ (08-2024)",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "cohere/north-mini-code:free",
		"name": "Cohere: North Mini Code (free)",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "deepseek/deepseek-chat",
		"name": "DeepSeek: DeepSeek V3",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "deepseek/deepseek-chat-v3-0324",
		"name": "DeepSeek: DeepSeek V3 0324",
		"api": "openai-completions",
		"contextWindow": 163840,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "deepseek/deepseek-chat-v3.1",
		"name": "DeepSeek: DeepSeek V3.1",
		"api": "openai-completions",
		"contextWindow": 163840,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "deepseek/deepseek-r1",
		"name": "DeepSeek: R1",
		"api": "openai-completions",
		"contextWindow": 64e3,
		"maxTokens": 16e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "deepseek/deepseek-r1-0528",
		"name": "DeepSeek: R1 0528",
		"api": "openai-completions",
		"contextWindow": 163840,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "deepseek/deepseek-v3.1-terminus",
		"name": "DeepSeek: DeepSeek V3.1 Terminus",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "deepseek/deepseek-v3.2",
		"name": "DeepSeek: DeepSeek V3.2",
		"api": "openai-completions",
		"contextWindow": 163840,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "deepseek/deepseek-v3.2-exp",
		"name": "DeepSeek: DeepSeek V3.2 Exp",
		"api": "openai-completions",
		"contextWindow": 163840,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "deepseek/deepseek-v4-flash",
		"name": "DeepSeek: DeepSeek V4 Flash",
		"api": "openai-completions",
		"contextWindow": 1048575,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "deepseek/deepseek-v4-pro",
		"name": "DeepSeek: DeepSeek V4 Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-2.5-flash",
		"name": "Google: Gemini 2.5 Flash",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65535,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-2.5-flash-lite",
		"name": "Google: Gemini 2.5 Flash Lite",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65535,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-2.5-pro",
		"name": "Google: Gemini 2.5 Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-2.5-pro-preview",
		"name": "Google: Gemini 2.5 Pro Preview 06-05",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-2.5-pro-preview-05-06",
		"name": "Google: Gemini 2.5 Pro Preview 05-06",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65535,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-3-flash-preview",
		"name": "Google: Gemini 3 Flash Preview",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65535,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-3-pro-image",
		"name": "Google: Nano Banana Pro (Gemini 3 Pro Image)",
		"api": "openai-completions",
		"contextWindow": 65536,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-3.1-flash-lite",
		"name": "Google: Gemini 3.1 Flash Lite",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-3.1-flash-lite-preview",
		"name": "Google: Gemini 3.1 Flash Lite Preview",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-3.1-pro-preview",
		"name": "Google: Gemini 3.1 Pro Preview",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-3.1-pro-preview-customtools",
		"name": "Google: Gemini 3.1 Pro Preview Custom Tools",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-3.5-flash",
		"name": "Google: Gemini 3.5 Flash",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-3.5-flash-lite",
		"name": "Google: Gemini 3.5 Flash Lite",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemini-3.6-flash",
		"name": "Google: Gemini 3.6 Flash",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemma-3-12b-it",
		"name": "Google: Gemma 3 12B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemma-3-27b-it",
		"name": "Google: Gemma 3 27B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemma-4-26b-a4b-it",
		"name": "Google: Gemma 4 26B A4B ",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemma-4-26b-a4b-it:free",
		"name": "Google: Gemma 4 26B A4B  (free)",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemma-4-31b-it",
		"name": "Google: Gemma 4 31B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "google/gemma-4-31b-it:free",
		"name": "Google: Gemma 4 31B (free)",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "ibm-granite/granite-4.1-8b",
		"name": "IBM: Granite 4.1 8B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "inception/mercury-2",
		"name": "Inception: Mercury 2",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 5e4,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "inclusionai/ling-2.6-1t",
		"name": "inclusionAI: Ling-2.6-1T",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "inclusionai/ling-2.6-flash",
		"name": "inclusionAI: Ling-2.6-flash",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "inclusionai/ling-3.0-flash:free",
		"name": "Ling-3.0-flash (free)",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "inclusionai/ring-2.6-1t",
		"name": "inclusionAI: Ring-2.6-1T",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "kwaipilot/kat-coder-air-v2.5",
		"name": "Kwaipilot: KAT-Coder-Air V2.5",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 8e4,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "kwaipilot/kat-coder-pro-v2",
		"name": "Kwaipilot: KAT-Coder-Pro V2",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 8e4,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "kwaipilot/kat-coder-pro-v2.5",
		"name": "Kwaipilot: KAT-Coder-Pro V2.5",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 8e4,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "meituan/longcat-2.0",
		"name": "Meituan: LongCat 2.0",
		"api": "openai-completions",
		"contextWindow": 1048756,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "meta-llama/llama-3.1-70b-instruct",
		"name": "Meta: Llama 3.1 70B Instruct",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "meta-llama/llama-3.1-8b-instruct",
		"name": "Meta: Llama 3.1 8B Instruct",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "meta-llama/llama-3.3-70b-instruct",
		"name": "Meta: Llama 3.3 70B Instruct",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "meta-llama/llama-4-maverick",
		"name": "Meta: Llama 4 Maverick",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "meta-llama/llama-4-scout",
		"name": "Meta: Llama 4 Scout",
		"api": "openai-completions",
		"contextWindow": 327680,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "meta/muse-spark-1.1",
		"name": "Meta: Muse Spark 1.1",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "minimax/minimax-m1",
		"name": "MiniMax: MiniMax M1",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 4e4,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "minimax/minimax-m2",
		"name": "MiniMax: MiniMax M2",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "minimax/minimax-m2.1",
		"name": "MiniMax: MiniMax M2.1",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "minimax/minimax-m2.5",
		"name": "MiniMax: MiniMax M2.5",
		"api": "openai-completions",
		"contextWindow": 196608,
		"maxTokens": 196608,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "minimax/minimax-m2.7",
		"name": "MiniMax: MiniMax M2.7",
		"api": "openai-completions",
		"contextWindow": 196608,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "minimax/minimax-m3",
		"name": "MiniMax: MiniMax M3",
		"api": "openai-completions",
		"contextWindow": 524288,
		"maxTokens": 512e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/codestral-2508",
		"name": "Mistral: Codestral 2508",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/devstral-2512",
		"name": "Mistral: Devstral 2 2512",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/ministral-14b-2512",
		"name": "Mistral: Ministral 3 14B 2512",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/ministral-3b-2512",
		"name": "Mistral: Ministral 3 3B 2512",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/ministral-8b-2512",
		"name": "Mistral: Ministral 3 8B 2512",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mistral-large",
		"name": "Mistral Large",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mistral-large-2407",
		"name": "Mistral Large 2407",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mistral-large-2512",
		"name": "Mistral: Mistral Large 3 2512",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mistral-medium-3",
		"name": "Mistral: Mistral Medium 3",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mistral-medium-3-5",
		"name": "Mistral: Mistral Medium 3.5",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mistral-medium-3.1",
		"name": "Mistral: Mistral Medium 3.1",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mistral-nemo",
		"name": "Mistral: Mistral Nemo",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mistral-saba",
		"name": "Mistral: Saba",
		"api": "openai-completions",
		"contextWindow": 32768,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mistral-small-2603",
		"name": "Mistral: Mistral Small 4",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mistral-small-3.2-24b-instruct",
		"name": "Mistral: Mistral Small 3.2 24B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/mixtral-8x22b-instruct",
		"name": "Mistral: Mixtral 8x22B Instruct",
		"api": "openai-completions",
		"contextWindow": 65536,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "mistralai/voxtral-small-24b-2507",
		"name": "Mistral: Voxtral Small 24B 2507",
		"api": "openai-completions",
		"contextWindow": 32e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "moonshotai/kimi-k2",
		"name": "MoonshotAI: Kimi K2 0711",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 100352,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "moonshotai/kimi-k2-0905",
		"name": "MoonshotAI: Kimi K2 0905",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 100352,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "moonshotai/kimi-k2-thinking",
		"name": "MoonshotAI: Kimi K2 Thinking",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 100352,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "moonshotai/kimi-k2.5",
		"name": "MoonshotAI: Kimi K2.5",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "moonshotai/kimi-k2.6",
		"name": "MoonshotAI: Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "moonshotai/kimi-k2.7-code",
		"name": "MoonshotAI: Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "moonshotai/kimi-k3",
		"name": "MoonshotAI: Kimi K3",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "nex-agi/nex-n2-mini",
		"name": "Nex AGI: Nex-N2-Mini",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "nex-agi/nex-n2-pro",
		"name": "Nex AGI: Nex-N2-Pro",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "nvidia/nemotron-3-nano-30b-a3b",
		"name": "NVIDIA: Nemotron 3 Nano 30B A3B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 228e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "nvidia/nemotron-3-nano-30b-a3b:free",
		"name": "NVIDIA: Nemotron 3 Nano 30B A3B (free)",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
		"name": "NVIDIA: Nemotron 3 Nano Omni (free)",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "nvidia/nemotron-3-super-120b-a12b",
		"name": "NVIDIA: Nemotron 3 Super",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "nvidia/nemotron-3-super-120b-a12b:free",
		"name": "NVIDIA: Nemotron 3 Super (free)",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "nvidia/nemotron-3-ultra-550b-a55b",
		"name": "NVIDIA: Nemotron 3 Ultra",
		"api": "openai-completions",
		"contextWindow": 512288,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "nvidia/nemotron-3-ultra-550b-a55b:free",
		"name": "NVIDIA: Nemotron 3 Ultra (free)",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "nvidia/nemotron-nano-12b-v2-vl:free",
		"name": "NVIDIA: Nemotron Nano 12B 2 VL (free)",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "nvidia/nemotron-nano-9b-v2:free",
		"name": "NVIDIA: Nemotron Nano 9B V2 (free)",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-3.5-turbo",
		"name": "OpenAI: GPT-3.5 Turbo",
		"api": "openai-completions",
		"contextWindow": 16385,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-3.5-turbo-0613",
		"name": "OpenAI: GPT-3.5 Turbo (older v0613)",
		"api": "openai-completions",
		"contextWindow": 4095,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-3.5-turbo-16k",
		"name": "OpenAI: GPT-3.5 Turbo 16k",
		"api": "openai-completions",
		"contextWindow": 16385,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4",
		"name": "OpenAI: GPT-4",
		"api": "openai-completions",
		"contextWindow": 8191,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4-turbo",
		"name": "OpenAI: GPT-4 Turbo",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4-turbo-preview",
		"name": "OpenAI: GPT-4 Turbo Preview",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4.1",
		"name": "OpenAI: GPT-4.1",
		"api": "openai-completions",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4.1-mini",
		"name": "OpenAI: GPT-4.1 Mini",
		"api": "openai-completions",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4.1-nano",
		"name": "OpenAI: GPT-4.1 Nano",
		"api": "openai-completions",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4o",
		"name": "OpenAI: GPT-4o",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4o-2024-05-13",
		"name": "OpenAI: GPT-4o (2024-05-13)",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4o-2024-08-06",
		"name": "OpenAI: GPT-4o (2024-08-06)",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4o-2024-11-20",
		"name": "OpenAI: GPT-4o (2024-11-20)",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4o-mini",
		"name": "OpenAI: GPT-4o-mini",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-4o-mini-2024-07-18",
		"name": "OpenAI: GPT-4o-mini (2024-07-18)",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5",
		"name": "OpenAI: GPT-5",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5-codex",
		"name": "OpenAI: GPT-5 Codex",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5-mini",
		"name": "OpenAI: GPT-5 Mini",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5-nano",
		"name": "OpenAI: GPT-5 Nano",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5-pro",
		"name": "OpenAI: GPT-5 Pro",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.1",
		"name": "OpenAI: GPT-5.1",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.1-chat",
		"name": "OpenAI: GPT-5.1 Chat",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.1-codex",
		"name": "OpenAI: GPT-5.1-Codex",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.1-codex-max",
		"name": "OpenAI: GPT-5.1-Codex-Max",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.1-codex-mini",
		"name": "OpenAI: GPT-5.1-Codex-Mini",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.2",
		"name": "OpenAI: GPT-5.2",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.2-chat",
		"name": "OpenAI: GPT-5.2 Chat",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.2-codex",
		"name": "OpenAI: GPT-5.2-Codex",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.2-pro",
		"name": "OpenAI: GPT-5.2 Pro",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.3-chat",
		"name": "OpenAI: GPT-5.3 Chat",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.3-codex",
		"name": "OpenAI: GPT-5.3-Codex",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.4",
		"name": "OpenAI: GPT-5.4",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.4-mini",
		"name": "OpenAI: GPT-5.4 Mini",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.4-nano",
		"name": "OpenAI: GPT-5.4 Nano",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.4-pro",
		"name": "OpenAI: GPT-5.4 Pro",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.5",
		"name": "OpenAI: GPT-5.5",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.5-pro",
		"name": "OpenAI: GPT-5.5 Pro",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.6-luna",
		"name": "OpenAI: GPT-5.6 Luna",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.6-luna-pro",
		"name": "OpenAI: GPT-5.6 Luna Pro",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.6-sol",
		"name": "OpenAI: GPT-5.6 Sol",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.6-sol-pro",
		"name": "OpenAI: GPT-5.6 Sol Pro",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.6-terra",
		"name": "OpenAI: GPT-5.6 Terra",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-5.6-terra-pro",
		"name": "OpenAI: GPT-5.6 Terra Pro",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-audio",
		"name": "OpenAI: GPT Audio",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-audio-mini",
		"name": "OpenAI: GPT Audio Mini",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-chat-latest",
		"name": "OpenAI: GPT Chat Latest",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-oss-120b",
		"name": "OpenAI: gpt-oss-120b",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-oss-20b",
		"name": "OpenAI: gpt-oss-20b",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-oss-20b:free",
		"name": "OpenAI: gpt-oss-20b (free)",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/gpt-oss-safeguard-20b",
		"name": "OpenAI: gpt-oss-safeguard-20b",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/o1",
		"name": "OpenAI: o1",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/o3",
		"name": "OpenAI: o3",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/o3-deep-research",
		"name": "OpenAI: o3 Deep Research",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/o3-mini",
		"name": "OpenAI: o3 Mini",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/o3-mini-high",
		"name": "OpenAI: o3 Mini High",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "openai/o3-pro",
		"name": "OpenAI: o3 Pro",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/o4-mini",
		"name": "OpenAI: o4 Mini",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/o4-mini-deep-research",
		"name": "OpenAI: o4 Mini Deep Research",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openai/o4-mini-high",
		"name": "OpenAI: o4 Mini High",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openrouter/auto",
		"name": "Auto Router",
		"api": "openai-completions",
		"contextWindow": 2e6,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openrouter/auto-beta",
		"name": "Auto Router (Beta)",
		"api": "openai-completions",
		"contextWindow": 2e6,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openrouter/free",
		"name": "Free Models Router",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "openrouter/fusion",
		"name": "OpenRouter: Fusion",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 3e4,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "poolside/laguna-m.1",
		"name": "Poolside: Laguna M.1",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "poolside/laguna-m.1:free",
		"name": "Poolside: Laguna M.1 (free)",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "poolside/laguna-s-2.1",
		"name": "Poolside: Laguna S 2.1",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "poolside/laguna-s-2.1:free",
		"name": "Poolside: Laguna S 2.1 (free)",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "poolside/laguna-xs-2.1",
		"name": "Poolside: Laguna XS 2.1",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "poolside/laguna-xs-2.1:free",
		"name": "Poolside: Laguna XS 2.1 (free)",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen-2.5-72b-instruct",
		"name": "Qwen2.5 72B Instruct",
		"api": "openai-completions",
		"contextWindow": 32768,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen-2.5-7b-instruct",
		"name": "Qwen: Qwen2.5 7B Instruct",
		"api": "openai-completions",
		"contextWindow": 32768,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen-plus",
		"name": "Qwen: Qwen-Plus",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen-plus-2025-07-28",
		"name": "Qwen: Qwen Plus 0728",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen-plus-2025-07-28:thinking",
		"name": "Qwen: Qwen Plus 0728 (thinking)",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-14b",
		"name": "Qwen: Qwen3 14B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-235b-a22b",
		"name": "Qwen: Qwen3 235B A22B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-235b-a22b-2507",
		"name": "Qwen: Qwen3 235B A22B Instruct 2507",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-235b-a22b-thinking-2507",
		"name": "Qwen: Qwen3 235B A22B Thinking 2507",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-30b-a3b",
		"name": "Qwen: Qwen3 30B A3B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-30b-a3b-instruct-2507",
		"name": "Qwen: Qwen3 30B A3B Instruct 2507",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-30b-a3b-thinking-2507",
		"name": "Qwen: Qwen3 30B A3B Thinking 2507",
		"api": "openai-completions",
		"contextWindow": 81920,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-32b",
		"name": "Qwen: Qwen3 32B",
		"api": "openai-completions",
		"contextWindow": 40960,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-8b",
		"name": "Qwen: Qwen3 8B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-coder",
		"name": "Qwen: Qwen3 Coder 480B A35B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-coder-30b-a3b-instruct",
		"name": "Qwen: Qwen3 Coder 30B A3B Instruct",
		"api": "openai-completions",
		"contextWindow": 16e4,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-coder-flash",
		"name": "Qwen: Qwen3 Coder Flash",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-coder-next",
		"name": "Qwen: Qwen3 Coder Next",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-coder-plus",
		"name": "Qwen: Qwen3 Coder Plus",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-max",
		"name": "Qwen: Qwen3 Max",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-max-thinking",
		"name": "Qwen: Qwen3 Max Thinking",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-next-80b-a3b-instruct",
		"name": "Qwen: Qwen3 Next 80B A3B Instruct",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-next-80b-a3b-thinking",
		"name": "Qwen: Qwen3 Next 80B A3B Thinking",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-vl-235b-a22b-instruct",
		"name": "Qwen: Qwen3 VL 235B A22B Instruct",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-vl-235b-a22b-thinking",
		"name": "Qwen: Qwen3 VL 235B A22B Thinking",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-vl-30b-a3b-instruct",
		"name": "Qwen: Qwen3 VL 30B A3B Instruct",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-vl-30b-a3b-thinking",
		"name": "Qwen: Qwen3 VL 30B A3B Thinking",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-vl-32b-instruct",
		"name": "Qwen: Qwen3 VL 32B Instruct",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-vl-8b-instruct",
		"name": "Qwen: Qwen3 VL 8B Instruct",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3-vl-8b-thinking",
		"name": "Qwen: Qwen3 VL 8B Thinking",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.5-122b-a10b",
		"name": "Qwen: Qwen3.5-122B-A10B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.5-27b",
		"name": "Qwen: Qwen3.5-27B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.5-35b-a3b",
		"name": "Qwen: Qwen3.5-35B-A3B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.5-397b-a17b",
		"name": "Qwen: Qwen3.5 397B A17B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.5-9b",
		"name": "Qwen: Qwen3.5-9B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.5-flash-02-23",
		"name": "Qwen: Qwen3.5-Flash",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.5-plus-02-15",
		"name": "Qwen: Qwen3.5 Plus 2026-02-15",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.5-plus-20260420",
		"name": "Qwen: Qwen3.5 Plus 2026-04-20",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.6-27b",
		"name": "Qwen: Qwen3.6 27B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.6-35b-a3b",
		"name": "Qwen: Qwen3.6 35B A3B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.6-flash",
		"name": "Qwen: Qwen3.6 Flash",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.6-max-preview",
		"name": "Qwen: Qwen3.6 Max Preview",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.6-plus",
		"name": "Qwen: Qwen3.6 Plus",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.7-max",
		"name": "Qwen: Qwen3.7 Max",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "qwen/qwen3.7-plus",
		"name": "Qwen: Qwen3.7 Plus",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "rekaai/reka-edge",
		"name": "Reka Edge",
		"api": "openai-completions",
		"contextWindow": 16384,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "relace/relace-search",
		"name": "Relace: Relace Search",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "sakana/fugu-ultra",
		"name": "Sakana: Fugu Ultra",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "sao10k/l3.1-euryale-70b",
		"name": "Sao10K: Llama 3.1 Euryale 70B v2.2",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "stepfun/step-3.5-flash",
		"name": "StepFun: Step 3.5 Flash",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "stepfun/step-3.7-flash",
		"name": "StepFun: Step 3.7 Flash",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "tencent/hy3",
		"name": "Tencent: Hy3",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "tencent/hy3-preview",
		"name": "Tencent: Hy3 preview",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "thedrummer/unslopnemo-12b",
		"name": "TheDrummer: UnslopNemo 12B",
		"api": "openai-completions",
		"contextWindow": 32768,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "thinkingmachines/inkling",
		"name": "Thinking Machines: Inkling",
		"api": "openai-completions",
		"contextWindow": 524288,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "upstage/solar-pro-3",
		"name": "Upstage: Solar Pro 3",
		"api": "openai-completions",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "x-ai/grok-4.20",
		"name": "xAI: Grok 4.20",
		"api": "openai-completions",
		"contextWindow": 2e6,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "x-ai/grok-4.3",
		"name": "xAI: Grok 4.3",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "x-ai/grok-4.5",
		"name": "xAI: Grok 4.5",
		"api": "openai-completions",
		"contextWindow": 5e5,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "x-ai/grok-build-0.1",
		"name": "xAI: Grok Build 0.1",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "xiaomi/mimo-v2.5",
		"name": "Xiaomi: MiMo-V2.5",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "xiaomi/mimo-v2.5-pro",
		"name": "Xiaomi: MiMo-V2.5-Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-4.5",
		"name": "Z.ai: GLM 4.5",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 98304,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-4.5-air",
		"name": "Z.ai: GLM 4.5 Air",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 98304,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-4.5v",
		"name": "Z.ai: GLM 4.5V",
		"api": "openai-completions",
		"contextWindow": 65536,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-4.6",
		"name": "Z.ai: GLM 4.6",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-4.6v",
		"name": "Z.ai: GLM 4.6V",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-4.7",
		"name": "Z.ai: GLM 4.7",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-4.7-flash",
		"name": "Z.ai: GLM 4.7 Flash",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-5",
		"name": "Z.ai: GLM 5",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-5-turbo",
		"name": "Z.ai: GLM 5 Turbo",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-5.1",
		"name": "Z.ai: GLM 5.1",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-5.2",
		"name": "Z.ai: GLM 5.2",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "openrouter",
		"id": "z-ai/glm-5v-turbo",
		"name": "Z.ai: GLM 5V Turbo",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "~anthropic/claude-fable-latest",
		"name": "Anthropic: Claude Fable Latest",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "~anthropic/claude-haiku-latest",
		"name": "Anthropic Claude Haiku Latest",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "~anthropic/claude-opus-latest",
		"name": "Anthropic: Claude Opus Latest",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "~anthropic/claude-sonnet-latest",
		"name": "Anthropic Claude Sonnet Latest",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "~google/gemini-flash-latest",
		"name": "Google Gemini Flash Latest",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "~google/gemini-pro-latest",
		"name": "Google Gemini Pro Latest",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "~moonshotai/kimi-latest",
		"name": "MoonshotAI Kimi Latest",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "~openai/gpt-latest",
		"name": "OpenAI GPT Latest",
		"api": "openai-completions",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "~openai/gpt-mini-latest",
		"name": "OpenAI GPT Mini Latest",
		"api": "openai-completions",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "openrouter",
		"id": "~x-ai/grok-latest",
		"name": "xAI: Grok Latest",
		"api": "openai-completions",
		"contextWindow": 5e5,
		"maxTokens": 4096,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "MiniMax-M2.5",
		"name": "MiniMax-M2.5",
		"api": "openai-completions",
		"contextWindow": 196608,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "deepseek-v3.2",
		"name": "DeepSeek V3.2",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "deepseek-v4-flash",
		"name": "DeepSeek V4 Flash",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "deepseek-v4-pro",
		"name": "DeepSeek V4 Pro",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "glm-5",
		"name": "GLM-5",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "glm-5.1",
		"name": "GLM-5.1",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "glm-5.2",
		"name": "GLM-5.2",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "kimi-k2.5",
		"name": "Kimi K2.5",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 98304,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "kimi-k2.6",
		"name": "Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "kimi-k2.7-code",
		"name": "Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "qwen3.6-flash",
		"name": "Qwen3.6 Flash",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "qwen3.6-plus",
		"name": "Qwen3.6 Plus",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "qwen3.7-max",
		"name": "Qwen3.7 Max",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "qwen3.7-plus",
		"name": "Qwen3.7 Plus",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan",
		"id": "qwen3.8-max-preview",
		"name": "Qwen3.8 Max Preview",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "MiniMax-M2.5",
		"name": "MiniMax-M2.5",
		"api": "openai-completions",
		"contextWindow": 196608,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "deepseek-v3.2",
		"name": "DeepSeek V3.2",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "deepseek-v4-flash",
		"name": "DeepSeek V4 Flash",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "deepseek-v4-pro",
		"name": "DeepSeek V4 Pro",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "glm-5",
		"name": "GLM-5",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "glm-5.1",
		"name": "GLM-5.1",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "glm-5.2",
		"name": "GLM-5.2",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "kimi-k2.5",
		"name": "Kimi K2.5",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 98304,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "kimi-k2.6",
		"name": "Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "kimi-k2.7-code",
		"name": "Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "qwen3.6-flash",
		"name": "Qwen3.6 Flash",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "qwen3.6-plus",
		"name": "Qwen3.6 Plus",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "qwen3.7-max",
		"name": "Qwen3.7 Max",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "qwen3.7-plus",
		"name": "Qwen3.7 Plus",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "qwen-token-plan-cn",
		"id": "qwen3.8-max-preview",
		"name": "Qwen3.8 Max Preview",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "together",
		"id": "MiniMaxAI/MiniMax-M2.7",
		"name": "MiniMax-M2.7",
		"api": "openai-completions",
		"contextWindow": 202752,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "together",
		"id": "MiniMaxAI/MiniMax-M3",
		"name": "MiniMax-M3",
		"api": "openai-completions",
		"contextWindow": 524288,
		"maxTokens": 25e4,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "together",
		"id": "Qwen/Qwen2.5-7B-Instruct-Turbo",
		"name": "Qwen 2.5 7B Instruct Turbo",
		"api": "openai-completions",
		"contextWindow": 32768,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "together",
		"id": "Qwen/Qwen3.5-9B",
		"name": "Qwen3.5 9B",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "together",
		"id": "Qwen/Qwen3.6-Plus",
		"name": "Qwen3.6 Plus",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 5e5,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "together",
		"id": "Qwen/Qwen3.7-Max",
		"name": "Qwen3.7 Max",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 5e5,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "together",
		"id": "deepseek-ai/DeepSeek-V4-Pro",
		"name": "DeepSeek V4 Pro",
		"api": "openai-completions",
		"contextWindow": 512e3,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "together",
		"id": "google/gemma-4-31B-it",
		"name": "Gemma 4 31B Instruct",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "together",
		"id": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
		"name": "Llama 3.3 70B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "together",
		"id": "moonshotai/Kimi-K2.6",
		"name": "Kimi K2.6",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 131e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "together",
		"id": "moonshotai/Kimi-K2.7-Code",
		"name": "Kimi K2.7 Code",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "together",
		"id": "nvidia/nemotron-3-ultra-550b-a55b",
		"name": "Nemotron 3 Ultra 550B A55B",
		"api": "openai-completions",
		"contextWindow": 512300,
		"maxTokens": 512300,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "together",
		"id": "openai/gpt-oss-120b",
		"name": "GPT OSS 120B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "together",
		"id": "openai/gpt-oss-20b",
		"name": "GPT OSS 20B",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "together",
		"id": "thinkingmachines/Inkling",
		"name": "Inkling",
		"api": "openai-completions",
		"contextWindow": 524288,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "together",
		"id": "zai-org/GLM-5.2",
		"name": "GLM-5.2",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 164e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen-3-14b",
		"name": "Qwen3-14B",
		"api": "anthropic-messages",
		"contextWindow": 40960,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen-3-235b",
		"name": "Qwen3 235B A22B",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen-3-30b",
		"name": "Qwen3-30B-A3B",
		"api": "anthropic-messages",
		"contextWindow": 40960,
		"maxTokens": 16384,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen-3-32b",
		"name": "Qwen 3 32B",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen-3.6-max-preview",
		"name": "Qwen 3.6 Max Preview",
		"api": "anthropic-messages",
		"contextWindow": 24e4,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-235b-a22b-thinking",
		"name": "Qwen3 VL 235B A22B Thinking",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-coder",
		"name": "Qwen3 Coder 480B A35B Instruct",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-coder-30b-a3b",
		"name": "Qwen 3 Coder 30B A3B Instruct",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-coder-next",
		"name": "Qwen3 Coder Next",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-coder-plus",
		"name": "Qwen3 Coder Plus",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-max",
		"name": "Qwen3 Max",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-max-preview",
		"name": "Qwen3 Max Preview",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-max-thinking",
		"name": "Qwen 3 Max Thinking",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-next-80b-a3b-instruct",
		"name": "Qwen3 Next 80B A3B Instruct",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-next-80b-a3b-thinking",
		"name": "Qwen3 Next 80B A3B Thinking",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-vl-235b-a22b-instruct",
		"name": "Qwen3 VL 235B A22B Instruct",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 129024,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-vl-instruct",
		"name": "Qwen3 VL 235B A22B Instruct",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 129024,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3-vl-thinking",
		"name": "Qwen3 VL 235B A22B Thinking",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3.5-flash",
		"name": "Qwen 3.5 Flash",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3.5-plus",
		"name": "Qwen 3.5 Plus",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3.6-27b",
		"name": "Qwen 3.6 27B",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3.6-plus",
		"name": "Qwen 3.6 Plus",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3.7-max",
		"name": "Qwen 3.7 Max",
		"api": "anthropic-messages",
		"contextWindow": 991e3,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "alibaba/qwen3.7-plus",
		"name": "Qwen 3.7 Plus",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "amazon/nova-2-lite",
		"name": "Nova 2 Lite",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 1e6,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "amazon/nova-lite",
		"name": "Nova Lite",
		"api": "anthropic-messages",
		"contextWindow": 3e5,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "amazon/nova-micro",
		"name": "Nova Micro",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "amazon/nova-pro",
		"name": "Nova Pro",
		"api": "anthropic-messages",
		"contextWindow": 3e5,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-3-haiku",
		"name": "Claude 3 Haiku",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-fable-5",
		"name": "Claude Fable 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-haiku-4.5",
		"name": "Claude Haiku 4.5",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-opus-4",
		"name": "Claude Opus 4",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-opus-4.1",
		"name": "Claude Opus 4.1",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-opus-4.5",
		"name": "Claude Opus 4.5",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-opus-4.6",
		"name": "Claude Opus 4.6",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-opus-4.7",
		"name": "Claude Opus 4.7",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-opus-4.8",
		"name": "Claude Opus 4.8",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-opus-4.8-fast",
		"name": "Claude Opus 4.8 (Fast)",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-opus-5",
		"name": "Claude Opus 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-opus-5-fast",
		"name": "Claude Opus 5 (Fast)",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-sonnet-4",
		"name": "Claude Sonnet 4",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-sonnet-4.5",
		"name": "Claude Sonnet 4.5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-sonnet-4.6",
		"name": "Claude Sonnet 4.6",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "anthropic/claude-sonnet-5",
		"name": "Claude Sonnet 5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "arcee-ai/trinity-large-thinking",
		"name": "Trinity Large Thinking",
		"api": "anthropic-messages",
		"contextWindow": 262100,
		"maxTokens": 8e4,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "arcee-ai/trinity-mini",
		"name": "Trinity Mini",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "bytedance/seed-1.6",
		"name": "Seed 1.6",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "bytedance/seed-1.8",
		"name": "Bytedance Seed 1.8",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "cohere/command-a",
		"name": "Command A",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 8e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "deepseek/deepseek-r1",
		"name": "DeepSeek-R1",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "deepseek/deepseek-v3",
		"name": "DeepSeek V3 0324",
		"api": "anthropic-messages",
		"contextWindow": 163840,
		"maxTokens": 163840,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "deepseek/deepseek-v3.1",
		"name": "DeepSeek V3.1",
		"api": "anthropic-messages",
		"contextWindow": 163840,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "deepseek/deepseek-v3.1-terminus",
		"name": "DeepSeek V3.1 Terminus",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "deepseek/deepseek-v3.2",
		"name": "DeepSeek V3.2",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 8e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "deepseek/deepseek-v3.2-thinking",
		"name": "DeepSeek V3.2 Thinking",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 8e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "deepseek/deepseek-v4-flash",
		"name": "DeepSeek V4 Flash",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "deepseek/deepseek-v4-pro",
		"name": "DeepSeek V4 Pro",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 384e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemini-2.5-flash",
		"name": "Gemini 2.5 Flash",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemini-2.5-flash-lite",
		"name": "Gemini 2.5 Flash Lite",
		"api": "anthropic-messages",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemini-2.5-pro",
		"name": "Gemini 2.5 Pro",
		"api": "anthropic-messages",
		"contextWindow": 1048576,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemini-3-flash",
		"name": "Gemini 3 Flash",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 65e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemini-3-pro-preview",
		"name": "Gemini 3 Pro Preview",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemini-3.1-flash-lite",
		"name": "Gemini 3.1 Flash Lite",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 65e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemini-3.1-pro-preview",
		"name": "Gemini 3.1 Pro Preview",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemini-3.5-flash",
		"name": "Gemini 3.5 Flash",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemini-3.5-flash-lite",
		"name": "Gemini 3.5 Flash Lite",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 65e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemini-3.6-flash",
		"name": "Gemini 3.6 Flash",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemma-4-26b-a4b-it",
		"name": "Gemma 4 26B A4B IT",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "google/gemma-4-31b-it",
		"name": "Gemma 4 31B IT",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "inception/mercury-2",
		"name": "Mercury 2",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "inception/mercury-coder-small",
		"name": "Mercury Coder Small Beta",
		"api": "anthropic-messages",
		"contextWindow": 32e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "inclusionai/ling-3.0-flash-free",
		"name": "Ling 3.0 Flash",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "interfaze/interfaze-beta",
		"name": "Interfaze Beta",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "kwaipilot/kat-coder-air-v2.5",
		"name": "Kat Coder Air V2.5",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 8e4,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "kwaipilot/kat-coder-pro-v1",
		"name": "KAT-Coder-Pro V1",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 32e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "kwaipilot/kat-coder-pro-v2",
		"name": "Kat Coder Pro V2",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "kwaipilot/kat-coder-pro-v2.5",
		"name": "Kat Coder Pro V2.5",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 8e4,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "meta/llama-3.1-70b",
		"name": "Llama 3.1 70B Instruct",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "meta/llama-3.1-8b",
		"name": "Llama 3.1 8B Instruct",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "meta/llama-3.3-70b",
		"name": "Llama 3.3 70B Instruct",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "meta/llama-4-maverick",
		"name": "Llama 4 Maverick 17B Instruct",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "meta/llama-4-scout",
		"name": "Llama 4 Scout 17B Instruct",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 8192,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "meta/muse-spark-1.1",
		"name": "Muse Spark 1.1",
		"api": "anthropic-messages",
		"contextWindow": 1048576,
		"maxTokens": 1048576,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "minimax/minimax-m2",
		"name": "MiniMax M2",
		"api": "anthropic-messages",
		"contextWindow": 205e3,
		"maxTokens": 205e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "minimax/minimax-m2.1",
		"name": "MiniMax M2.1",
		"api": "anthropic-messages",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "minimax/minimax-m2.1-lightning",
		"name": "MiniMax M2.1 Lightning",
		"api": "anthropic-messages",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "minimax/minimax-m2.5",
		"name": "MiniMax M2.5",
		"api": "anthropic-messages",
		"contextWindow": 204800,
		"maxTokens": 131e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "minimax/minimax-m2.5-highspeed",
		"name": "MiniMax M2.5 High Speed",
		"api": "anthropic-messages",
		"contextWindow": 204800,
		"maxTokens": 131e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "minimax/minimax-m2.7",
		"name": "MiniMax M2.7",
		"api": "anthropic-messages",
		"contextWindow": 204800,
		"maxTokens": 131e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "minimax/minimax-m2.7-highspeed",
		"name": "MiniMax M2.7 High Speed",
		"api": "anthropic-messages",
		"contextWindow": 204800,
		"maxTokens": 131100,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "minimax/minimax-m3",
		"name": "MiniMax M3",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 1e6,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/codestral",
		"name": "Mistral Codestral",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 4e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/devstral-2",
		"name": "Devstral 2",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/devstral-small-2",
		"name": "Devstral Small 2",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/magistral-medium",
		"name": "Magistral Medium 2509",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/magistral-small",
		"name": "Magistral Small 2509",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 64e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/ministral-14b",
		"name": "Ministral 14B",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/ministral-3b",
		"name": "Ministral 3B",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 4e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/ministral-8b",
		"name": "Ministral 8B",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 4e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/mistral-large-3",
		"name": "Mistral Large 3",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/mistral-medium",
		"name": "Mistral Medium 3.1",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 64e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/mistral-medium-3.5",
		"name": "Mistral Medium Latest",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/mistral-nemo",
		"name": "Mistral Nemo 12B",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 128e3,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/mistral-small",
		"name": "Mistral Small",
		"api": "anthropic-messages",
		"contextWindow": 32e3,
		"maxTokens": 4e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "mistral/pixtral-12b",
		"name": "Pixtral 12B 2409",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 4e3,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "moonshotai/kimi-k2",
		"name": "Kimi K2 Instruct",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "moonshotai/kimi-k2-thinking",
		"name": "Kimi K2 Thinking",
		"api": "anthropic-messages",
		"contextWindow": 216144,
		"maxTokens": 216144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "moonshotai/kimi-k2.5",
		"name": "Kimi K2.5",
		"api": "anthropic-messages",
		"contextWindow": 262114,
		"maxTokens": 262114,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "moonshotai/kimi-k2.6",
		"name": "Kimi K2.6",
		"api": "anthropic-messages",
		"contextWindow": 262e3,
		"maxTokens": 262e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "moonshotai/kimi-k2.7-code",
		"name": "Kimi K2.7 Code",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "moonshotai/kimi-k2.7-code-highspeed",
		"name": "Kimi K2.7 Code High Speed",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "moonshotai/kimi-k3",
		"name": "Kimi K3",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "nvidia/nemotron-3-nano-30b-a3b",
		"name": "Nemotron 3 Nano 30B A3B",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "nvidia/nemotron-3-super-120b-a12b",
		"name": "NVIDIA Nemotron 3 Super 120B A12B",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 32e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "nvidia/nemotron-3-ultra-550b-a55b",
		"name": "Nemotron 3 Ultra",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 65e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "nvidia/nemotron-nano-12b-v2-vl",
		"name": "Nvidia Nemotron Nano 12B V2 VL",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "nvidia/nemotron-nano-9b-v2",
		"name": "Nvidia Nemotron Nano 9B V2",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-3.5-turbo",
		"name": "GPT-3.5 Turbo",
		"api": "anthropic-messages",
		"contextWindow": 16385,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-4-turbo",
		"name": "GPT-4 Turbo",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 4096,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-4.1",
		"name": "GPT-4.1",
		"api": "anthropic-messages",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-4.1-mini",
		"name": "GPT-4.1 mini",
		"api": "anthropic-messages",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-4.1-nano",
		"name": "GPT-4.1 nano",
		"api": "anthropic-messages",
		"contextWindow": 1047576,
		"maxTokens": 32768,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-4o",
		"name": "GPT-4o",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-4o-mini",
		"name": "GPT-4o mini",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5",
		"name": "GPT-5",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5-codex",
		"name": "GPT-5-Codex",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5-mini",
		"name": "GPT-5 mini",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5-nano",
		"name": "GPT-5 nano",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5-pro",
		"name": "GPT-5 pro",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 272e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.1-codex",
		"name": "GPT-5.1-Codex",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.1-codex-max",
		"name": "GPT 5.1 Codex Max",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.1-codex-mini",
		"name": "GPT 5.1 Codex Mini",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.1-instant",
		"name": "GPT-5.1 Instant",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.1-thinking",
		"name": "GPT 5.1 Thinking",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.2",
		"name": "GPT 5.2",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.2-codex",
		"name": "GPT 5.2 Codex",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.2-pro",
		"name": "GPT 5.2 ",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.3-chat",
		"name": "GPT-5.3 Chat",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 16384,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.3-codex",
		"name": "GPT 5.3 Codex",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.4",
		"name": "GPT 5.4",
		"api": "anthropic-messages",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.4-mini",
		"name": "GPT 5.4 Mini",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.4-nano",
		"name": "GPT 5.4 Nano",
		"api": "anthropic-messages",
		"contextWindow": 4e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.4-pro",
		"name": "GPT 5.4 Pro",
		"api": "anthropic-messages",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.5",
		"name": "GPT 5.5",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.5-pro",
		"name": "GPT 5.5 Pro",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.6-luna",
		"name": "GPT 5.6 Luna",
		"api": "anthropic-messages",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.6-sol",
		"name": "GPT 5.6 Sol",
		"api": "anthropic-messages",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-5.6-terra",
		"name": "GPT 5.6 Terra",
		"api": "anthropic-messages",
		"contextWindow": 105e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-oss-120b",
		"name": "GPT OSS 120B",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-oss-20b",
		"name": "GPT OSS 20B",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 8192,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/gpt-oss-safeguard-20b",
		"name": "GPT OSS Safeguard 20B",
		"api": "anthropic-messages",
		"contextWindow": 131072,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/o1",
		"name": "o1",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/o3",
		"name": "o3",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/o3-deep-research",
		"name": "o3-deep-research",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/o3-mini",
		"name": "o3-mini",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/o3-pro",
		"name": "o3 Pro",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "openai/o4-mini",
		"name": "o4-mini",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 1e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "poolside/laguna-s-2.1",
		"name": "Laguna S 2.1",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "poolside/laguna-s-2.1-free",
		"name": "Laguna S 2.1 Free",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 32768,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "sakana/fugu-ultra",
		"name": "Fugu Ultra",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 1e6,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "stepfun/step-3.5-flash",
		"name": "StepFun 3.5 Flash",
		"api": "anthropic-messages",
		"contextWindow": 262114,
		"maxTokens": 262114,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "stepfun/step-3.7-flash",
		"name": "Step 3.7 Flash",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "tencent/hy3",
		"name": "Hy3",
		"api": "anthropic-messages",
		"contextWindow": 262144,
		"maxTokens": 262144,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "thinkingmachines/inkling",
		"name": "Inkling",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-4.1-fast-non-reasoning",
		"name": "Grok 4.1 Fast Non-Reasoning",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 1e6,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-4.1-fast-reasoning",
		"name": "Grok 4.1 Fast Reasoning",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 1e6,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-4.20-multi-agent",
		"name": "Grok 4.20 Multi-Agent",
		"api": "anthropic-messages",
		"contextWindow": 2e6,
		"maxTokens": 2e6,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-4.20-multi-agent-beta",
		"name": "Grok 4.20 Multi Agent Beta",
		"api": "anthropic-messages",
		"contextWindow": 2e6,
		"maxTokens": 2e6,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-4.20-non-reasoning",
		"name": "Grok 4.20 Non-Reasoning",
		"api": "anthropic-messages",
		"contextWindow": 2e6,
		"maxTokens": 2e6,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-4.20-non-reasoning-beta",
		"name": "Grok 4.20 Beta Non-Reasoning",
		"api": "anthropic-messages",
		"contextWindow": 2e6,
		"maxTokens": 2e6,
		"reasoning": false,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-4.20-reasoning",
		"name": "Grok 4.20 Reasoning",
		"api": "anthropic-messages",
		"contextWindow": 2e6,
		"maxTokens": 2e6,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-4.20-reasoning-beta",
		"name": "Grok 4.20 Beta Reasoning",
		"api": "anthropic-messages",
		"contextWindow": 2e6,
		"maxTokens": 2e6,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-4.3",
		"name": "Grok 4.3",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 1e6,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-4.5",
		"name": "Grok 4.5",
		"api": "anthropic-messages",
		"contextWindow": 5e5,
		"maxTokens": 5e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xai/grok-build-0.1",
		"name": "Grok Build 0.1",
		"api": "anthropic-messages",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xiaomi/mimo-v2.5",
		"name": "MiMo M2.5",
		"api": "anthropic-messages",
		"contextWindow": 105e4,
		"maxTokens": 131100,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "xiaomi/mimo-v2.5-pro",
		"name": "MiMo V2.5 Pro",
		"api": "anthropic-messages",
		"contextWindow": 105e4,
		"maxTokens": 131e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-4.5",
		"name": "GLM 4.5",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 96e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-4.5-air",
		"name": "GLM 4.5 Air",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 96e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-4.5v",
		"name": "GLM 4.5V",
		"api": "anthropic-messages",
		"contextWindow": 66e3,
		"maxTokens": 16e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-4.6",
		"name": "GLM 4.6",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 96e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-4.6v",
		"name": "GLM-4.6V",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 24e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-4.6v-flash",
		"name": "GLM-4.6V-Flash",
		"api": "anthropic-messages",
		"contextWindow": 128e3,
		"maxTokens": 24e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-4.7",
		"name": "GLM 4.7",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 12e4,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-4.7-flash",
		"name": "GLM 4.7 Flash",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 131e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-4.7-flashx",
		"name": "GLM 4.7 FlashX",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-5",
		"name": "GLM 5",
		"api": "anthropic-messages",
		"contextWindow": 202800,
		"maxTokens": 131100,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-5-turbo",
		"name": "GLM 5 Turbo",
		"api": "anthropic-messages",
		"contextWindow": 202800,
		"maxTokens": 131100,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-5.1",
		"name": "GLM 5.1",
		"api": "anthropic-messages",
		"contextWindow": 202e3,
		"maxTokens": 202e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-5.2",
		"name": "GLM 5.2",
		"api": "anthropic-messages",
		"contextWindow": 104e4,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-5.2-fast",
		"name": "GLM 5.2 Fast",
		"api": "anthropic-messages",
		"contextWindow": 1e6,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "vercel-ai-gateway",
		"id": "zai/glm-5v-turbo",
		"name": "GLM 5V Turbo",
		"api": "anthropic-messages",
		"contextWindow": 2e5,
		"maxTokens": 128e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "xai",
		"id": "grok-4.3",
		"name": "Grok 4.3",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 3e4,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "xai",
		"id": "grok-build-0.1",
		"name": "Grok Build 0.1",
		"api": "openai-completions",
		"contextWindow": 256e3,
		"maxTokens": 256e3,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "xai",
		"id": "grok-4.5",
		"name": "Grok 4.5",
		"api": "openai-responses",
		"contextWindow": 5e5,
		"maxTokens": 5e5,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "xiaomi",
		"id": "mimo-v2-flash",
		"name": "MiMo-V2-Flash",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 65536,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "xiaomi",
		"id": "mimo-v2-omni",
		"name": "MiMo-V2-Omni",
		"api": "openai-completions",
		"contextWindow": 262144,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "xiaomi",
		"id": "mimo-v2-pro",
		"name": "MiMo-V2-Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "xiaomi",
		"id": "mimo-v2.5",
		"name": "MiMo-V2.5",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "xiaomi",
		"id": "mimo-v2.5-pro",
		"name": "MiMo-V2.5-Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "xiaomi",
		"id": "mimo-v2.5-pro-ultraspeed",
		"name": "MiMo-V2.5-Pro-UltraSpeed",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "xiaomi-token-plan-ams",
		"id": "mimo-v2-pro",
		"name": "MiMo-V2-Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "xiaomi-token-plan-ams",
		"id": "mimo-v2.5",
		"name": "MiMo-V2.5",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "xiaomi-token-plan-ams",
		"id": "mimo-v2.5-pro",
		"name": "MiMo-V2.5-Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "xiaomi-token-plan-cn",
		"id": "mimo-v2-pro",
		"name": "MiMo-V2-Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "xiaomi-token-plan-cn",
		"id": "mimo-v2.5",
		"name": "MiMo-V2.5",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "xiaomi-token-plan-cn",
		"id": "mimo-v2.5-pro",
		"name": "MiMo-V2.5-Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "xiaomi-token-plan-sgp",
		"id": "mimo-v2-pro",
		"name": "MiMo-V2-Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "xiaomi-token-plan-sgp",
		"id": "mimo-v2.5",
		"name": "MiMo-V2.5",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "xiaomi-token-plan-sgp",
		"id": "mimo-v2.5-pro",
		"name": "MiMo-V2.5-Pro",
		"api": "openai-completions",
		"contextWindow": 1048576,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai",
		"id": "glm-4.5-air",
		"name": "GLM-4.5-Air",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 98304,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai",
		"id": "glm-4.7",
		"name": "GLM-4.7",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai",
		"id": "glm-5-turbo",
		"name": "GLM-5-Turbo",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai",
		"id": "glm-5.1",
		"name": "GLM-5.1",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai",
		"id": "glm-5.2",
		"name": "GLM-5.2",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai",
		"id": "glm-5v-turbo",
		"name": "GLM-5V-Turbo",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	},
	{
		"provider": "zai-coding-cn",
		"id": "glm-4.5-air",
		"name": "GLM-4.5-Air",
		"api": "openai-completions",
		"contextWindow": 131072,
		"maxTokens": 98304,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai-coding-cn",
		"id": "glm-4.7",
		"name": "GLM-4.7",
		"api": "openai-completions",
		"contextWindow": 204800,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai-coding-cn",
		"id": "glm-5-turbo",
		"name": "GLM-5-Turbo",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai-coding-cn",
		"id": "glm-5.1",
		"name": "GLM-5.1",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai-coding-cn",
		"id": "glm-5.2",
		"name": "GLM-5.2",
		"api": "openai-completions",
		"contextWindow": 1e6,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text"]
	},
	{
		"provider": "zai-coding-cn",
		"id": "glm-5v-turbo",
		"name": "GLM-5V-Turbo",
		"api": "openai-completions",
		"contextWindow": 2e5,
		"maxTokens": 131072,
		"reasoning": true,
		"input": ["text", "image"]
	}
];

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
function validateProviderId(raw) {
	const id = raw.trim().toLowerCase();
	if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id)) throw new Error("Provider ID must start with a letter and contain lowercase letters, numbers, or hyphens");
	return id;
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
	if (source.provider === "anthropic" || source.api === "anthropic-messages") return "anthropic-messages";
	if (source.provider === "openai" || source.provider === "openai-codex" || source.api === "openai-responses" || source.api === "openai-codex-responses" || source.api === "azure-openai-responses") return "openai-responses";
	return "openai-completions";
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
		return {
			id,
			protocol: config.protocolOverrides[id] ?? inferProtocol(source, config.fallbackProtocol),
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
	return "OpenAI Chat Completions";
}
function officialModel(reference) {
	return OFFICIAL_MODELS.find((model) => model.provider === reference.provider && model.id === reference.id);
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
			const id = validateProviderId(route);
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
		className: "drm-button primary",
		disabled: !snapshot.writable,
		onClick: () => {
			setOpen(true);
		},
		children: "添加中转站"
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
function MappingEditor({ status, onMap, onClose }) {
	const [query, setQuery] = (0, react.useState)("");
	const results = (0, react.useMemo)(() => {
		if (!query.trim()) return status.candidates.map((candidate) => officialModel(candidate)).filter((model) => model !== void 0);
		const needle = query.trim().toLowerCase();
		return OFFICIAL_MODELS.filter((model) => model.id.toLowerCase().includes(needle) || model.name.toLowerCase().includes(needle) || model.provider.toLowerCase().includes(needle)).slice(0, 30);
	}, [query, status]);
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
function ProviderCard({ route, provider, snapshot, api, onReload }) {
	const [expanded, setExpanded] = (0, react.useState)(false);
	const [busy, setBusy] = (0, react.useState)(false);
	const [error, setError] = (0, react.useState)();
	const [notice, setNotice] = (0, react.useState)();
	const [confirmDelete, setConfirmDelete] = (0, react.useState)(false);
	const [mappingModel, setMappingModel] = (0, react.useState)();
	const [baseURL, setBaseURL] = (0, react.useState)(provider.baseURL);
	const [fallback, setFallback] = (0, react.useState)(provider.fallbackProtocol);
	const [keyDraft, setKeyDraft] = (0, react.useState)("");
	(0, react.useEffect)(() => {
		setBaseURL(provider.baseURL);
		setFallback(provider.fallbackProtocol);
	}, [provider]);
	const statuses = (0, react.useMemo)(() => relayModelStatuses(provider, OFFICIAL_MODELS), [provider]);
	const active = statuses.filter((status) => !status.excluded);
	const matched = active.filter((status) => status.metadataSource);
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
			fallbackProtocol: fallback
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
									setExpanded((value) => !value);
								},
								children: expanded ? "收起" : "管理"
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [active.length - matched.length, " 个未匹配"] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [statuses.length - active.length, " 个已排除"] }),
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
			error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-error",
				children: error
			}) : null,
			notice ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-success",
				children: notice
			}) : null,
			expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "drm-actions",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "drm-button primary",
						disabled: busy,
						onClick: () => {
							saveConnection();
						},
						children: "保存连接设置"
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "drm-models",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: "drm-table",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "远端模型" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "元数据来源" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "实际协议" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: "操作" })
						] }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: statuses.map((status) => {
							const mapping = provider.modelMappings[status.id];
							const source = status.metadataSource;
							return [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [
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
										save({
											...provider,
											protocolOverrides: overrides
										}, value ? "协议覆盖已保存" : "协议已恢复自动选择");
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
										value: "",
										children: ["自动：", protocolLabel(status.protocol)]
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
											save({
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
											save({
												...provider,
												excludedModels: updateExcludedModels(provider.excludedModels, [status.id], !status.excluded)
											}, status.excluded ? "模型已恢复" : "模型已排除");
										},
										children: status.excluded ? "恢复" : "排除"
									})]
								}) })
							] }, status.id), mappingModel === status.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
								colSpan: 4,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MappingEditor, {
									status,
									onClose: () => {
										setMappingModel(void 0);
									},
									onMap: async (model) => {
										await save({
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
			] }) : null
		]
	});
}
function RelayModelsSection({ api }) {
	const [snapshot, setSnapshot] = (0, react.useState)();
	const [error, setError] = (0, react.useState)();
	const reload = (0, react.useCallback)(async () => {
		try {
			setSnapshot(await api.load());
			setError(void 0);
		} catch (cause) {
			setError(messageOf(cause));
		}
	}, [api]);
	(0, react.useEffect)(() => {
		reload();
	}, [reload]);
	if (!snapshot && !error) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
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
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "drm-head-copy",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: "drm-title",
						children: "中转模型"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "drm-muted",
						children: "自动发现中转站模型，匹配 pi 官方元数据，并在同一 Provider 内按模型选择 OpenAI Chat Completions、OpenAI Responses 或 Anthropic Messages。此插件不会向 Agent 注册工具，也不会添加任何上下文。"
					})]
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
						reload();
					},
					children: "重试"
				}) })]
			}) : null,
			snapshot && Object.keys(snapshot.config.providers).length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "drm-empty",
				children: "还没有中转站。点击“添加中转站”开始。"
			}) : null,
			snapshot ? Object.entries(snapshot.config.providers).map(([route, provider]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderCard, {
				route,
				provider,
				snapshot,
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
.drm-section{display:flex;flex-direction:column;gap:14px;max-width:920px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}.drm-head{display:flex;align-items:flex-start;gap:12px}.drm-head-copy{flex:1}.drm-title{margin:0;font-size:18px;line-height:26px;font-weight:600}.drm-muted{margin:2px 0 0;color:var(--dsw-alias-label-tertiary)}.drm-error{padding:10px 12px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}.drm-success{color:var(--dsw-alias-state-success-primary)}.drm-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px}.drm-card-head{display:flex;align-items:center;gap:8px}.drm-card-title{font-weight:600}.drm-route{font-size:12px;color:var(--dsw-alias-label-tertiary)}.drm-spacer{flex:1}.drm-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.drm-button{box-sizing:border-box;height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}.drm-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.drm-button.primary{border:none;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}.drm-button.danger{border:none;color:var(--dsw-alias-state-error-primary)}.drm-button:disabled{opacity:.45;cursor:default}.drm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.drm-field{display:flex;flex-direction:column;gap:4px}.drm-field.wide{grid-column:1/-1}.drm-label{font-size:12px;color:var(--dsw-alias-label-secondary)}.drm-input,.drm-select{box-sizing:border-box;width:100%;height:34px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}.drm-input:focus,.drm-select:focus{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:1px}.drm-summary{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-secondary)}.drm-models{overflow:auto;border:1px solid var(--dsw-alias-border-l3);border-radius:8px}.drm-table{width:100%;border-collapse:collapse;min-width:760px}.drm-table th,.drm-table td{padding:8px 10px;text-align:left;border-bottom:1px solid var(--dsw-alias-border-l3);vertical-align:middle}.drm-table th{font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}.drm-table tr:last-child td{border-bottom:none}.drm-model-id{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}.drm-pill{display:inline-flex;padding:1px 7px;border-radius:10px;background:var(--dsw-alias-interactive-bg-hover);font-size:11px;line-height:18px}.drm-pill.warn{color:var(--dsw-alias-state-warn-label)}.drm-link{border:0;padding:0;background:none;color:var(--dsw-alias-state-business-primary);font:inherit;font-size:12px;cursor:pointer}.drm-add{border:1px dashed var(--dsw-alias-border-l2);border-radius:12px;padding:14px}.drm-empty{padding:24px;text-align:center;color:var(--dsw-alias-label-tertiary)}.drm-map{margin-top:8px;padding:10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);display:flex;flex-direction:column;gap:8px}.drm-candidates{display:flex;flex-direction:column;gap:4px;max-height:240px;overflow:auto}.drm-candidate{display:flex;align-items:center;gap:8px;padding:7px 8px;border:1px solid var(--dsw-alias-border-l3);border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer}.drm-candidate:hover{background:var(--dsw-alias-interactive-bg-hover)}.drm-candidate-name{flex:1}.drm-confirm{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-state-error-primary)}@media(max-width:720px){.drm-grid{grid-template-columns:1fr}.drm-field.wide{grid-column:auto}.drm-head{flex-direction:column}.drm-actions{width:100%}}
`;
function installStyles() {
	if (document.querySelector(`style[data-plugin="${ID}"]`)) return;
	const style = document.createElement("style");
	style.dataset.plugin = ID;
	style.textContent = CSS;
	document.head.append(style);
}

//#endregion
//#region src/client/index.ts
const inject = ["slots"];
function apply(ctx) {
	installStyles();
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