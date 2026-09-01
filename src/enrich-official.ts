import { inferProtocol, suggestOfficialCandidates } from './shared/core.ts'
import type { OfficialModelSummary } from './shared/types.ts'

/** One `llm-pi-ai` models[] entry, as stored in settings. Extra keys are kept. */
export interface PiAiModelEntry {
  id: string
  name?: string
  contextWindow?: number
  maxTokens?: number
  input?: string[]
  reasoningEfforts?: false | Record<string, string | null>
  compat?: Record<string, unknown>
  [key: string]: unknown
}

/** One `llm-pi-ai` provider route. Extra keys are kept. */
export interface PiAiRouteEntry {
  api?: string
  baseURL?: string
  models?: PiAiModelEntry[]
  compat?: Record<string, unknown>
  [key: string]: unknown
}

export type PiAiProvidersMap = Record<string, PiAiRouteEntry>

/**
 * Default wire switches for an OpenAI-compatible gateway whose URL pi-ai does
 * not recognize. Detection then pretends the endpoint is OpenAI itself, which
 * is wrong for almost every 中转: they reject `developer`, ignore `store`,
 * and read `max_tokens` rather than `max_completion_tokens`.
 */
export const OPENAI_COMPLETIONS_GATEWAY_COMPAT = {
  supportsDeveloperRole: false,
  supportsStore: false,
  maxTokensField: 'max_tokens',
} as const

/** Responses-family gateways still reject `developer` on a private URL. */
export const OPENAI_RESPONSES_GATEWAY_COMPAT = {
  supportsDeveloperRole: false,
} as const

export interface OfficialEnrichment {
  providers: PiAiProvidersMap
  changed: boolean
  notes: string[]
}

function normalizeModelName(value: string): string {
  return value.toLowerCase().replace(/^.*\//u, '').replace(/(?:^|[-_.])20\d{6}$/u, '').replace(/[^a-z0-9]+/gu, '')
}

function idsEquivalent(remoteId: string, officialId: string): boolean {
  return normalizeModelName(remoteId) === normalizeModelName(officialId)
}

function thinkingMapToEfforts(
  map: Readonly<Record<string, unknown>> | undefined,
  reasoning: boolean,
): false | Record<string, string | null> {
  if (!reasoning) return false
  if (!map) return false
  const efforts: Record<string, string | null> = {}
  for (const [level, wire] of Object.entries(map)) {
    if (wire === null) {
      if (level === 'off') efforts.off = null
      continue
    }
    if (typeof wire === 'string' && wire.length > 0) efforts[level] = wire
  }
  return Object.keys(efforts).some(level => level !== 'off') ? efforts : false
}

function lookup(catalog: readonly OfficialModelSummary[], provider: string, id: string): OfficialModelSummary | undefined {
  return catalog.find(model => model.provider === provider && model.id === id)
}

/**
 * Pick official metadata for a gateway model id. Exact catalog ids win; a
 * vendor-prefixed or dated spelling is accepted only when the normalized id
 * is identical, so `openai/gpt-4.1` matches and `gpt-4` does not become `gpt-4o`.
 */
export function matchOfficialForGateway(
  remoteId: string,
  catalog: readonly OfficialModelSummary[],
  routeApi?: string,
): OfficialModelSummary | undefined {
  const exact = catalog.filter(model => model.id === remoteId)
  const pool = exact.length > 0
    ? exact
    : suggestOfficialCandidates(remoteId, catalog, 8)
      .map(candidate => lookup(catalog, candidate.provider, candidate.id))
      .filter((model): model is OfficialModelSummary => model !== undefined)
      .filter(model => idsEquivalent(remoteId, model.id))
  if (pool.length === 0) return undefined
  const preferred = routeApi
    ? pool.find(model => model.api === routeApi || inferProtocol(model, 'openai-completions') === routeApi)
    : undefined
  return preferred ?? pool[0]
}

function mergeCompat(
  current: Record<string, unknown> | undefined,
  defaults: Readonly<Record<string, unknown>>,
): Record<string, unknown> | undefined {
  const next = { ...defaults, ...current }
  const changed = Object.entries(defaults).some(([key, value]) => current?.[key] === undefined && next[key] === value)
  if (!changed && current) return current
  if (!changed && !current) return { ...defaults }
  return next
}

function enrichModel(
  entry: PiAiModelEntry,
  catalog: readonly OfficialModelSummary[],
  routeApi: string | undefined,
  notes: string[],
  route: string,
): PiAiModelEntry {
  const matched = matchOfficialForGateway(entry.id, catalog, routeApi)
  if (!matched) return entry
  const next: PiAiModelEntry = { ...entry }
  let filled = false
  if (entry.contextWindow === undefined) {
    next.contextWindow = matched.contextWindow
    filled = true
  }
  if (entry.maxTokens === undefined) {
    next.maxTokens = matched.maxTokens
    filled = true
  }
  if (entry.name === undefined) {
    next.name = entry.id === matched.id ? matched.name : `${matched.name} (${entry.id})`
    filled = true
  }
  if ((entry.input === undefined || entry.input.length === 0) && matched.input.length > 0) {
    next.input = [...matched.input]
    filled = true
  }
  if (entry.reasoningEfforts === undefined) {
    const efforts = thinkingMapToEfforts(matched.thinkingLevelMap, matched.reasoning)
    if (efforts !== false) {
      next.reasoningEfforts = efforts
      filled = true
    } else if (!matched.reasoning) {
      next.reasoningEfforts = false
      filled = true
    }
  }
  const sameApi = routeApi === undefined || matched.api === routeApi
    || inferProtocol(matched, 'openai-completions') === routeApi
  if (sameApi && matched.compat && routeApi === 'openai-completions') {
    const thinkingFormat = matched.compat.thinkingFormat
    const supportsReasoningEffort = matched.compat.supportsReasoningEffort
    const extra: Record<string, unknown> = {}
    if (typeof thinkingFormat === 'string') extra.thinkingFormat = thinkingFormat
    if (typeof supportsReasoningEffort === 'boolean') extra.supportsReasoningEffort = supportsReasoningEffort
    if (Object.keys(extra).length > 0) {
      const merged = mergeCompat(entry.compat, extra)
      if (merged !== entry.compat) {
        next.compat = merged
        filled = true
      }
    }
  }
  if (!filled) return entry
  notes.push(`${route}/${entry.id} <- ${matched.provider}/${matched.id}`)
  return next
}

function gatewayCompatFor(api: string | undefined): Readonly<Record<string, unknown>> | undefined {
  if (api === 'openai-completions' || api === undefined) return OPENAI_COMPLETIONS_GATEWAY_COMPAT
  if (api === 'openai-responses' || api === 'openai-codex-responses' || api === 'azure-openai-responses') {
    return OPENAI_RESPONSES_GATEWAY_COMPAT
  }
  return undefined
}

function isHandDeclaredGateway(route: PiAiRouteEntry): boolean {
  return typeof route.baseURL === 'string' && route.baseURL.trim() !== ''
    && Array.isArray(route.models) && route.models.length > 0
}

/**
 * Fill missing official-model fields and gateway `compat` on `llm-pi-ai`
 * custom providers. Already-set fields are left alone.
 */
export function enrichOfficialProviders(
  providers: PiAiProvidersMap,
  catalog: readonly OfficialModelSummary[],
): OfficialEnrichment {
  const notes: string[] = []
  let changed = false
  const next: PiAiProvidersMap = {}
  for (const [route, profile] of Object.entries(providers)) {
    if (!isHandDeclaredGateway(profile)) {
      next[route] = profile
      continue
    }
    const models = (profile.models ?? []).map(entry => {
      if (typeof entry?.id !== 'string' || !entry.id.trim()) return entry
      const enriched = enrichModel(entry, catalog, profile.api, notes, route)
      if (enriched !== entry) changed = true
      return enriched
    })
    let compat = profile.compat
    const defaults = gatewayCompatFor(profile.api)
    if (defaults) {
      const merged = mergeCompat(profile.compat, defaults)
      if (JSON.stringify(merged) !== JSON.stringify(profile.compat ?? {})) {
        compat = merged
        changed = true
        notes.push(`${route} compat <- gateway defaults`)
      }
    }
    next[route] = models === profile.models && compat === profile.compat
      ? profile
      : { ...profile, models, ...compat ? { compat } : {} }
  }
  return { providers: changed ? next : providers, changed, notes }
}
