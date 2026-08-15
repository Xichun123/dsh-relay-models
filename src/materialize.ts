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
import {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_TOKENS,
  baseURLForProtocol,
  inferProtocol,
  resolveOfficialModel,
} from './shared/core.ts'
import type { OfficialModelSummary, RelayProtocol, RelayProviderConfig } from './shared/types.ts'

const DEFAULT_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const FULL_CATALOG: Model<Api>[] = getBuiltinProviders().flatMap(
  provider => getBuiltinModels(provider) as Model<Api>[],
)

function matchedModel(route: string, config: RelayProviderConfig, id: string, summary: OfficialModelSummary, protocol: RelayProtocol): Model<Api> {
  const source = FULL_CATALOG.find(model => model.provider === summary.provider && model.id === summary.id)
  const copied = source ? structuredClone(source) as Model<Api> : undefined
  if (copied) delete copied.headers
  return {
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
    cost: { ...(summary.cost ?? copied?.cost ?? DEFAULT_COST) },
    contextWindow: summary.contextWindow,
    maxTokens: summary.maxTokens,
  } as Model<Api>
}

function fallbackModel(route: string, config: RelayProviderConfig, id: string, protocol: RelayProtocol): Model<Api> {
  return {
    id,
    name: id,
    provider: route,
    api: protocol,
    baseUrl: baseURLForProtocol(config.baseURL, protocol),
    reasoning: false,
    input: ['text'],
    cost: { ...DEFAULT_COST },
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxTokens: DEFAULT_MAX_TOKENS,
  } as Model<Api>
}

export function materializeModels(
  route: string,
  config: RelayProviderConfig,
  catalog: readonly OfficialModelSummary[],
): Model<Api>[] {
  const excluded = new Set(config.excludedModels)
  return [...new Set(config.modelIds.map(id => id.trim()).filter(Boolean))]
    .filter(id => !excluded.has(id))
    .flatMap(id => {
      const summary = resolveOfficialModel(id, config, catalog)
      const protocol = config.protocolOverrides[id] ?? inferProtocol(summary, config.fallbackProtocol)
      if (!protocol) return []
      return [summary
        ? matchedModel(route, config, id, summary, protocol)
        : fallbackModel(route, config, id, protocol)]
    })
}

export function buildRelayProvider(
  route: string,
  config: RelayProviderConfig,
  catalog: readonly OfficialModelSummary[],
): Provider {
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
    models: materializeModels(route, config, catalog),
    api: {
      'openai-completions': openAICompletionsApi(),
      'openai-responses': openAIResponsesApi(),
      'anthropic-messages': anthropicMessagesApi(),
    },
  })
}
