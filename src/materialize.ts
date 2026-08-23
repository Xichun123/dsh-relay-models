import {
  createProvider,
  type Api,
  type Model,
  type Provider,
} from '@earendil-works/pi-ai'
import { anthropicMessagesApi } from '@earendil-works/pi-ai/api/anthropic-messages.lazy'
import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import { openAICodexResponsesApi } from '@earendil-works/pi-ai/api/openai-codex-responses.lazy'
import { openAIResponsesApi } from '@earendil-works/pi-ai/api/openai-responses.lazy'
import { BUILTIN_MODELS } from './catalog.ts'
import {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_MAX_TOKENS,
  baseURLForProtocol,
  inferProtocol,
  resolveOfficialModel,
} from './shared/core.ts'
import type { OfficialModelSummary, RelayProtocol, RelayProviderConfig } from './shared/types.ts'

const DEFAULT_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

/**
 * The selector label for a matched model. A remote id that differs from the
 * official one is named too: two remote ids mapped to the same official model
 * would otherwise be one indistinguishable label repeated.
 * @param remoteId - the id the relay serves.
 * @param summary - the official metadata it matched.
 * @returns the display name.
 */
function matchedName(remoteId: string, summary: OfficialModelSummary): string {
  return remoteId === summary.id ? summary.name : `${summary.name} (${remoteId})`
}

function matchedModel(route: string, config: RelayProviderConfig, id: string, summary: OfficialModelSummary, protocol: RelayProtocol): Model<Api> {
  const source = BUILTIN_MODELS.find(model => model.provider === summary.provider && model.id === summary.id)
  const copied = source ? structuredClone(source) as Model<Api> : undefined
  // pi-ai types `compat` per api, so the switches an official model carries
  // describe the protocol it was published for. A model this configuration
  // repointed keeps none, and pi-ai's own baseURL detection answers for the
  // new protocol instead — the rule `dsh-llm-pi-ai` applies to a repointed
  // catalog route.
  const inheritsCompat = protocol === summary.api
  if (copied) {
    delete copied.headers
    if (!inheritsCompat) delete copied.compat
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
      'openai-codex-responses': openAICodexResponsesApi(),
      'anthropic-messages': anthropicMessagesApi(),
    },
  })
}
