import { Data, Effect, Either } from 'effect'
import { isCompatJson } from './compat.ts'

/** Live pi.dev model catalog. Not the npm `@earendil-works/pi-ai` snapshot. */
export const CATALOG_URL = 'https://pi.dev/api/models'

const MAX_BYTES = 8 * 1024 * 1024

const PROVIDERS = [
  'openai', 'anthropic', 'google', 'xai', 'deepseek',
  'moonshotai', 'minimax', 'qwen', 'zai', 'xiaomi',
]

export interface PiModel {
  id: string
  name?: string
  api?: string
  provider?: string
  input?: string[]
  contextWindow?: number
  maxTokens?: number
  reasoning?: boolean
  thinkingLevelMap?: Record<string, string | null>
  compat?: Record<string, unknown>
}

export type Catalog = Record<string, Record<string, unknown>>

export type ModelIndex = Map<string, PiModel[]>

export interface CatalogChoice {
  id: string
  name: string
  provider: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const THINKING_LEVELS = new Set(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])

function asModel(id: string, raw: unknown): PiModel | undefined {
  if (!isRecord(raw)) return undefined
  const model: PiModel = { id }
  // Validate known fields before constructing a trusted model; never spread raw rows.
  for (const key of ['id', 'name', 'api', 'provider'] as const) {
    const value = raw[key]
    if (value === undefined) continue
    if (typeof value !== 'string' || value.length === 0) return undefined
    model[key] = value
  }
  if (model.id.length === 0) return undefined
  for (const key of ['contextWindow', 'maxTokens'] as const) {
    const value = raw[key]
    if (value === undefined) continue
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) return undefined
    model[key] = value
  }
  if (raw.input !== undefined) {
    if (!Array.isArray(raw.input) || !raw.input.every(value => value === 'text' || value === 'image')) return undefined
    model.input = raw.input.map(value => String(value))
  }
  if (raw.reasoning !== undefined) {
    if (typeof raw.reasoning !== 'boolean') return undefined
    model.reasoning = raw.reasoning
  }
  if (raw.thinkingLevelMap !== undefined) {
    if (!isRecord(raw.thinkingLevelMap)) return undefined
    const entries: [string, string | null][] = []
    for (const [key, value] of Object.entries(raw.thinkingLevelMap)) {
      if (!THINKING_LEVELS.has(key)) continue
      if (value !== null && typeof value !== 'string') return undefined
      entries.push([key, value])
    }
    model.thinkingLevelMap = Object.fromEntries(entries)
  }
  if (raw.compat !== undefined) {
    // Preserve future keys/values until the running Host can judge them at save
    // time. Discovery needs no compat, and a cached catalog must survive a Host
    // namespace re-registration with a different vocabulary.
    if (!isRecord(raw.compat) || !isCompatJson(raw.compat)) return undefined
    model.compat = structuredClone(raw.compat)
  }
  return model
}

export function indexCatalog(catalog: Catalog): ModelIndex {
  const byId = new Map<string, PiModel[]>()
  for (const [provider, models] of Object.entries(catalog)) {
    if (!PROVIDERS.includes(provider)) continue
    if (models === null || typeof models !== 'object' || Array.isArray(models)) continue
    for (const [id, raw] of Object.entries(models)) {
      const model = asModel(id, raw)
      if (model === undefined) continue
      const list = byId.get(model.id) ?? []
      list.push(model)
      byId.set(model.id, list)
    }
  }
  return byId
}

function rank(model: PiModel): number {
  const at = PROVIDERS.indexOf(model.provider ?? '')
  return at === -1 ? PROVIDERS.length : at
}

function pick(models: readonly PiModel[]): PiModel {
  return models.reduce((a, b) => rank(a) <= rank(b) ? a : b)
}

const aliases = new Map<string, string>()

export function aliasOf(id: string): string | undefined {
  return aliases.get(id)
    ?? (id.includes('/') ? aliases.get(id.slice(id.lastIndexOf('/') + 1)) : undefined)
}

export function setAlias(id: string, catalogId: string | undefined): void {
  if (id.length === 0) return
  if (catalogId === undefined || catalogId.length === 0) aliases.delete(id)
  else aliases.set(id, catalogId)
}

export function resetAliases(): void {
  aliases.clear()
}

export function listAliases(): Record<string, string> {
  return Object.fromEntries(aliases)
}

function lookupDirect(index: ModelIndex, id: string, api?: string): PiModel | undefined {
  const exact = index.get(id)
  const slash = id.includes('/') ? index.get(id.slice(id.lastIndexOf('/') + 1)) : undefined
  const candidates = exact ?? slash
  if (candidates === undefined || candidates.length === 0) return undefined
  if (api !== undefined) {
    const matched = candidates.filter(model => model.api === api)
    if (matched.length > 0) return pick(matched)
  }
  return pick(candidates)
}

export function lookup(index: ModelIndex, id: string, api?: string): PiModel | undefined {
  const hit = lookupDirect(index, id, api)
  if (hit !== undefined) return hit
  const mapped = aliasOf(id)
  return mapped === undefined ? undefined : lookupDirect(index, mapped, api)
}

export function listChoices(index: ModelIndex): CatalogChoice[] {
  const out: CatalogChoice[] = []
  for (const [id, models] of index) {
    const model = pick(models)
    out.push({
      id,
      name: typeof model.name === 'string' && model.name.length > 0 ? model.name : id,
      provider: model.provider ?? '',
    })
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

/** A catalog failure is optional enrichment, never a provider discovery failure. */
export class CatalogError extends Data.TaggedError('CatalogError')<{
  message: string
  cause?: unknown
}> {}

const catalogError = (cause: unknown): CatalogError => cause instanceof CatalogError
  ? cause
  : new CatalogError({ message: cause instanceof Error ? cause.message : String(cause), cause })

const download = Effect.gen(function*() {
  const text = yield* Effect.tryPromise({
    try: async (signal) => {
      const response = await fetch(CATALOG_URL, { headers: { accept: 'application/json' }, signal })
      const reader = response.body?.getReader()
      try {
        if (!response.ok) throw new CatalogError({ message: `pi.dev models HTTP ${String(response.status)}` })
        const oversized = (): CatalogError => new CatalogError({ message: 'pi.dev models response too large' })
        if (Number(response.headers.get('content-length')) > MAX_BYTES) throw oversized()
        if (reader === undefined) return ''
        const chunks: Uint8Array[] = []
        let total = 0
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          total += value.byteLength
          if (total > MAX_BYTES) throw oversized()
          chunks.push(value)
        }
        return Buffer.concat(chunks, total).toString('utf8')
      } finally {
        // The original read/status error wins over cleanup of a failed stream.
        await reader?.cancel().catch(() => {})
        reader?.releaseLock()
      }
    },
    catch: catalogError,
  })
  const body: unknown = yield* Effect.try({ try: () => JSON.parse(text) as unknown, catch: catalogError })
  if (!isRecord(body)) return yield* Effect.fail(new CatalogError({ message: 'pi.dev models: expected a provider map' }))
  return indexCatalog(body as Catalog)
})

/**
 * One plugin-owned successful snapshot. Concurrent readers share the download;
 * interrupting a reader leaves other readers alive. Disposal aborts the download.
 */
export function createCatalog(options: { timeoutMs?: number } = {}): {
  load: Effect.Effect<ModelIndex, CatalogError>
  dispose(): void
} {
  const timeoutMs = options.timeoutMs ?? 30_000
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 30_000) {
    throw new RangeError('catalog timeoutMs must be in (0, 30000]')
  }
  const lifetime = new AbortController()
  let pending: Promise<ModelIndex> | undefined
  const load = Effect.tryPromise({
    try: () => {
      if (lifetime.signal.aborted) return Promise.reject(new CatalogError({ message: 'catalog disposed' }))
      // Caller interruption must not own the shared fetch's AbortSignal.
      pending ??= Effect.runPromise(Effect.either(download.pipe(Effect.timeoutFail({
        duration: timeoutMs,
        onTimeout: () => new CatalogError({ message: 'pi.dev models request timed out' }),
      }))), { signal: lifetime.signal }).then(result => {
        if (Either.isLeft(result)) throw result.left
        return result.right
      }).catch((error: unknown) => {
        pending = undefined
        throw error
      })
      return pending
    },
    catch: catalogError,
  })
  return { load, dispose: () => { lifetime.abort(); pending = undefined } }
}
