import { getBuiltinModels, getBuiltinProviders } from '@earendil-works/pi-ai/providers/all'
import type { Api, Model } from '@earendil-works/pi-ai'
import { readBoundedText } from './bounded-response.ts'
import type { OfficialCatalogSnapshot, OfficialModelSummary } from './shared/types.ts'

const CATALOG_URL = 'https://pi.dev/api/models'
const MAX_CATALOG_BYTES = 4 * 1024 * 1024
const CACHE_MS = 60_000

/**
 * Every model the installed `pi-ai` build ships. This is the offline catalog
 * and the source of the api-specific model fields a matched relay model copies,
 * so both read the same build that materialization hands to `PiAiAdapter`.
 */
export const BUILTIN_MODELS: readonly Model<Api>[] = getBuiltinProviders()
  .flatMap(provider => getBuiltinModels(provider) as Model<Api>[])

/**
 * The metadata summary of one installed model.
 * @param model - an installed `pi-ai` model.
 * @returns the summary the matcher and the settings page read.
 */
function summarize(model: Model<Api>): OfficialModelSummary {
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
    // pi-ai types `compat` as one closed interface per api, none of which is
    // indexable; the summary carries it opaquely for materialization to copy
    // back onto a model of the same api.
    ...model.compat ? { compat: model.compat as Readonly<Record<string, unknown>> } : {},
    ...model.cost ? { cost: model.cost } : {},
  }
}

/** The installed build's metadata, served whenever pi.dev is unreachable. */
export const BUNDLED_MODELS: readonly OfficialModelSummary[] = BUILTIN_MODELS.map(summarize)

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function parseOfficialCatalog(payload: unknown): OfficialModelSummary[] {
  const providers = object(payload)
  if (!providers) throw new Error('pi.dev model catalog must be an object')
  const models: OfficialModelSummary[] = []
  for (const [providerKey, entriesValue] of Object.entries(providers)) {
    const entries = object(entriesValue)
    if (!entries) continue
    for (const [idKey, value] of Object.entries(entries)) {
      const model = object(value)
      if (!model) continue
      const cost = object(model.cost)
      const provider = typeof model?.provider === 'string' ? model.provider : providerKey
      const id = typeof model?.id === 'string' ? model.id : idKey
      const name = typeof model?.name === 'string' ? model.name : id
      const api = typeof model?.api === 'string' ? model.api : undefined
      const contextWindow = number(model?.contextWindow)
      const maxTokens = number(model?.maxTokens)
      const reasoning = model?.reasoning
      const input = Array.isArray(model?.input) ? model.input.filter((item): item is string => typeof item === 'string') : undefined
      if (!provider || !id || !api || contextWindow === undefined || maxTokens === undefined
        || typeof reasoning !== 'boolean' || !input) continue
      const thinkingLevelMap = object(model.thinkingLevelMap)
      const compat = object(model.compat)
      const tiers = Array.isArray(cost?.tiers) ? cost.tiers.flatMap(value => {
        const tier = object(value)
        const inputTokensAbove = number(tier?.inputTokensAbove)
        const inputCost = number(tier?.input)
        const output = number(tier?.output)
        const cacheRead = number(tier?.cacheRead)
        const cacheWrite = number(tier?.cacheWrite)
        return inputTokensAbove === undefined || inputCost === undefined || output === undefined
          || cacheRead === undefined || cacheWrite === undefined
          ? [] : [{ inputTokensAbove, input: inputCost, output, cacheRead, cacheWrite }]
      }) : []
      models.push({
        provider,
        id,
        name,
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
          ...tiers.length > 0 ? { tiers } : {},
        },
      })
    }
  }
  if (models.length === 0) throw new Error('pi.dev model catalog contains no usable models')
  return models
}

let snapshot: OfficialCatalogSnapshot = { models: BUNDLED_MODELS, source: 'bundled' }
let expiresAt = 0
let pending: Promise<OfficialCatalogSnapshot> | undefined

export function currentOfficialCatalog(): OfficialCatalogSnapshot {
  return snapshot
}

export async function refreshOfficialCatalog(signal?: AbortSignal): Promise<OfficialCatalogSnapshot> {
  if (Date.now() < expiresAt) return snapshot
  if (pending) return pending
  pending = (async () => {
    const timeout = AbortSignal.timeout(10_000)
    const response = await fetch(CATALOG_URL, {
      headers: { accept: 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    if (!response.ok) throw new Error(`${CATALOG_URL} answered ${response.status}`)
    const models = parseOfficialCatalog(JSON.parse(await readBoundedText(response, CATALOG_URL, MAX_CATALOG_BYTES)))
    expiresAt = Date.now() + CACHE_MS
    snapshot = { models, source: 'remote' }
    return snapshot
  })().finally(() => { pending = undefined })
  return pending
}
