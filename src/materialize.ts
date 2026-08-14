import {
  createProvider,
  type Api,
  type Model,
  type Provider,
} from '@earendil-works/pi-ai'
import { getBuiltinModels, getBuiltinProviders } from '@earendil-works/pi-ai/providers/all'
import { anthropicMessagesApi } from '@earendil-works/pi-ai/api/anthropic-messages.lazy'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { openAIResponsesApi } from '@earendil-works/pi-ai/api/openai-responses.lazy'
import { baseURLForProtocol, inferProtocol, resolveOfficialModel } from './shared/core.ts'
import type { OfficialModelSummary, RelayProtocol, RelayProviderConfig } from './shared/types.ts'

const DEFAULT_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const FULL_CATALOG: Model<Api>[] = getBuiltinProviders().flatMap(
  provider => getBuiltinModels(provider) as Model<Api>[],
)

export const OFFICIAL_SUMMARIES: readonly OfficialModelSummary[] = FULL_CATALOG.map(model => ({
  provider: model.provider,
  id: model.id,
  name: model.name,
  api: model.api,
  contextWindow: model.contextWindow,
  maxTokens: model.maxTokens,
  reasoning: model.reasoning,
  input: [...model.input],
}))

const HEADER_PROFILES = {
  claude: {
    'user-agent': 'claude-cli/2.1.198 (external, sdk-cli)',
    'x-app': 'cli',
    'anthropic-beta': 'claude-code-20250219,interleaved-thinking-2025-05-14',
  },
  claudeLongContext: {
    'user-agent': 'claude-cli/2.1.198 (external, sdk-cli)',
    'x-app': 'cli',
    'anthropic-beta': 'claude-code-20250219,context-1m-2025-08-07,interleaved-thinking-2025-05-14',
  },
  codex: {
    'user-agent': 'codex_cli_rs/0.144.1 (Mac OS 15.7.7; arm64) ghostty/1.3.1',
  },
}

function headersFor(model: Model<Api>): Record<string, string> | undefined {
  if (model.api === 'openai-responses') return HEADER_PROFILES.codex
  if (model.api === 'anthropic-messages') {
    return model.contextWindow >= 1_000_000 ? HEADER_PROFILES.claudeLongContext : HEADER_PROFILES.claude
  }
  if (model.api === 'openai-completions') return HEADER_PROFILES.claude
  return undefined
}

function fullSource(summary: OfficialModelSummary): Model<Api> {
  const source = FULL_CATALOG.find(model => model.provider === summary.provider && model.id === summary.id)
  if (!source) throw new Error(`Official model disappeared: ${summary.provider}/${summary.id}`)
  return source
}

function matchedModel(route: string, config: RelayProviderConfig, id: string, source: Model<Api>, protocol: RelayProtocol): Model<Api> {
  const copied = structuredClone(source) as Model<Api>
  delete copied.headers
  const model: Model<Api> = {
    ...copied,
    id,
    provider: route,
    api: protocol,
    baseUrl: baseURLForProtocol(config.baseURL, protocol),
  }
  const headers = headersFor(model)
  return headers ? { ...model, headers } : model
}

function fallbackModel(route: string, config: RelayProviderConfig, id: string, protocol: RelayProtocol): Model<Api> {
  const model = {
    id,
    name: id,
    provider: route,
    api: protocol,
    baseUrl: baseURLForProtocol(config.baseURL, protocol),
    reasoning: false,
    input: ['text'],
    cost: { ...DEFAULT_COST },
    contextWindow: 128_000,
    maxTokens: 16_384,
  } as Model<Api>
  const headers = headersFor(model)
  return headers ? { ...model, headers } : model
}

export function materializeModels(route: string, config: RelayProviderConfig): Model<Api>[] {
  const excluded = new Set(config.excludedModels)
  return [...new Set(config.modelIds.map(id => id.trim()).filter(Boolean))]
    .filter(id => !excluded.has(id))
    .map(id => {
      const summary = resolveOfficialModel(id, config, OFFICIAL_SUMMARIES)
      const protocol = config.protocolOverrides[id] ?? inferProtocol(summary, config.fallbackProtocol)
      return summary
        ? matchedModel(route, config, id, fullSource(summary), protocol)
        : fallbackModel(route, config, id, protocol)
    })
}

export function buildRelayProvider(route: string, config: RelayProviderConfig): Provider {
  return createProvider({
    id: route,
    name: config.displayName,
    baseUrl: config.baseURL,
    auth: {
      apiKey: {
        name: `${config.displayName} API key`,
        resolve: ({ credential }) => Promise.resolve({
          auth: credential?.key === undefined ? {} : { apiKey: credential.key },
          source: config.apiKeyEnv,
        }),
      },
    },
    models: materializeModels(route, config),
    api: {
      'openai-completions': openAICompletionsApi(),
      'openai-responses': openAIResponsesApi(),
      'anthropic-messages': anthropicMessagesApi(),
    },
  })
}
