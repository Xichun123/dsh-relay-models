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
//#region src/catalog.ts
const CATALOG_URL = "https://pi.dev/api/models";
const MAX_CATALOG_BYTES = 4 * 1024 * 1024;
const CACHE_MS = 6e4;
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
	models: OFFICIAL_MODELS,
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
	if (source.api === "anthropic-messages") return "anthropic-messages";
	if (source.api === "openai-completions") return "openai-completions";
	if (source.api === "openai-responses" || source.api === "openai-codex-responses" || source.api === "azure-openai-responses") return "openai-responses";
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
function matchedModel(route, config, id, summary, protocol) {
	const source = FULL_CATALOG.find((model$1) => model$1.provider === summary.provider && model$1.id === summary.id);
	const copied = source ? structuredClone(source) : void 0;
	if (copied) delete copied.headers;
	const model = {
		...copied,
		id,
		name: summary.name,
		provider: route,
		api: protocol,
		baseUrl: baseURLForProtocol(config.baseURL, protocol),
		reasoning: summary.reasoning,
		input: [...summary.input],
		...summary.thinkingLevelMap ? { thinkingLevelMap: structuredClone(summary.thinkingLevelMap) } : {},
		...summary.compat ? { compat: structuredClone(summary.compat) } : {},
		cost: { ...summary.cost ?? copied?.cost ?? DEFAULT_COST },
		contextWindow: summary.contextWindow,
		maxTokens: summary.maxTokens
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
function materializeModels(route, config, catalog) {
	const excluded = new Set(config.excludedModels);
	return [...new Set(config.modelIds.map((id) => id.trim()).filter(Boolean))].filter((id) => !excluded.has(id)).flatMap((id) => {
		const summary = resolveOfficialModel(id, config, catalog);
		const protocol = config.protocolOverrides[id] ?? inferProtocol(summary, config.fallbackProtocol);
		if (!protocol) return [];
		return [summary ? matchedModel(route, config, id, summary, protocol) : fallbackModel(route, config, id, protocol)];
	});
}
function buildRelayProvider(route, config, catalog) {
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
async function discoverRelayModels(request) {
	const baseURL = request.baseURL;
	if (!baseURL) throw new LlmError("Relay model discovery needs a Base URL", "DISCOVERY_FAILED");
	const protocol = request.api ?? "openai-completions";
	if (!isRelayProtocol(protocol)) throw new LlmError(`Unsupported relay protocol: ${protocol}`, "DISCOVERY_UNSUPPORTED");
	const apiKey = request.apiKey?.trim();
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
function installWebApi(ctx, ns, current, onCatalogRefresh) {
	const state = async () => {
		const descriptor = ctx.settings.describe({ redactSecrets: true }).find((item) => item.ns === ns);
		if (!descriptor) throw new Error("Relay settings are not ready");
		const config = current();
		const credentials = Object.fromEntries(await Promise.all(Object.values(config.providers).map(async (provider) => [provider.apiKeyEnv, (await ctx.credentials.describe(credentialRef(provider.apiKeyEnv))).configured])));
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
				const protocol = requiredString(input.protocol, "protocol");
				if (!isRelayProtocol(protocol)) throw new Error("Invalid relay protocol");
				const provider = typeof input.provider === "string" ? current().providers[input.provider] : void 0;
				const storedApiKey = provider ? (await ctx.credentials.resolve(credentialRef(provider.apiKeyEnv)))?.value : void 0;
				reply(res, 200, {
					ok: true,
					value: (await discoverRelayModels({
						baseURL: requiredString(input.baseURL, "baseURL"),
						api: protocol,
						apiKey: typeof input.apiKey === "string" ? input.apiKey : storedApiKey
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
const officialReference = z.object({
	provider: z.string().required(),
	id: z.string().required()
});
const providerConfig = z.object({
	displayName: z.string().required(),
	baseURL: z.string().required(),
	apiKeyEnv: z.string().required().role("credential-ref"),
	fallbackProtocol: z.union(RELAY_PROTOCOLS).required(),
	modelIds: z.array(z.string()).default([]),
	modelMappings: z.dict(officialReference).default({}),
	protocolOverrides: z.dict(z.union(RELAY_PROTOCOLS)).default({}),
	excludedModels: z.array(z.string()).default([]),
	syncedAt: z.natural()
});
const Config = z.object({ providers: z.dict(providerConfig).default({}) });
function validateProvider(route, config) {
	if (validateProviderId(route) !== route) throw new Error(`Relay provider route must be normalized: ${route}`);
	if (!config.displayName.trim()) throw new Error(`Relay provider "${route}" needs a display name`);
	normalizeBaseURL(config.baseURL);
	if (config.apiKeyEnv !== relayCredentialRef(route)) throw new Error(`Relay provider "${route}" must use credential reference ${relayCredentialRef(route)}`);
	for (const remoteId of Object.keys(config.modelMappings)) if (!remoteId.trim()) throw new Error(`Relay provider "${route}" has an empty remote model mapping key`);
	for (const remoteId of Object.keys(config.protocolOverrides)) if (!remoteId.trim()) throw new Error(`Relay provider "${route}" has an empty protocol override key`);
}
function validateConfig(config) {
	for (const [route, provider] of Object.entries(config.providers)) validateProvider(route, provider);
}
function resolveProfiles(config, catalog) {
	const profiles = /* @__PURE__ */ new Map();
	for (const [provider, source] of Object.entries(config.providers)) profiles.set(provider, {
		provider,
		displayName: source.displayName,
		apiKeyEnv: source.apiKeyEnv,
		streamIdleTimeoutMs: 3e5,
		retryPolicy: resolveRetryPolicy(void 0, `relay-models: provider "${provider}" retry policy`),
		piProvider: buildRelayProvider(provider, source, catalog),
		configuredMaxTokens: /* @__PURE__ */ new Map()
	});
	return profiles;
}
function apply(ctx, config) {
	let current = () => config;
	let profiles = resolveProfiles(config, currentOfficialCatalog().models);
	const resolveApiKey = async (provider, profile) => {
		const ref = String(profile.apiKeyEnv);
		const hit = (await ctx.credentials.resolve(credentialRef(ref)))?.value;
		if (hit) return assertUsableApiKey(hit, "relay-models", ref);
		throw new LlmError(`relay-models: no credential for provider "${provider}"; store ${ref} on the Relay Models page`, "MISSING_CREDENTIAL");
	};
	const adapter = new PiAiAdapter({
		profiles: () => profiles,
		resolveApiKey,
		resolveAttachments: () => ctx.get("attachments")
	});
	let registration;
	const refresh = () => {
		const next = resolveProfiles(current(), currentOfficialCatalog().models);
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
	ctx.effect(() => {
		const controller = new AbortController();
		refreshOfficialCatalog(controller.signal).then(() => {
			if (!controller.signal.aborted) refresh();
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
		onChange: refresh
	});
	installWebApi(ctx, NS, () => current(), refresh);
}

//#endregion
export { Config, apply, inject, name };