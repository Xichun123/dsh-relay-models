import { aliasOf, lookup, type ModelIndex, type PiModel } from './catalog.ts'
import type { CompatFilter } from './compat.ts'

export interface DiscoveredModel {
  id: string
  name?: string
  contextWindow?: number
  maxTokens?: number
}

export interface PathOp {
  op: string
  path?: readonly string[]
  value?: unknown
}

const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function modalities(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined
  const next = input.filter((item): item is 'text' | 'image' => item === 'text' || item === 'image')
  return next.length > 0 ? next : undefined
}

export function reasoningEfforts(model: PiModel): Record<string, string | null> | undefined {
  if (model.reasoning !== true) return undefined
  // pi-ai maps are sparse: an absent key is supported for the five base levels
  // (wire = the level name, off sends nothing) and unsupported for xhigh/max.
  // DSH treats a declared reasoningEfforts as exhaustive, so the expansion has
  // to happen here — copying only listed keys would drop default-supported
  // base levels on sparse catalog rows.
  const map = model.thinkingLevelMap
  const out: Record<string, string | null> = {}
  for (const level of THINKING_LEVELS) {
    const listed = map !== undefined && Object.hasOwn(map, level)
    const wire = listed ? map[level] : undefined
    if (listed) {
      if (wire === null || typeof wire !== 'string' || wire.length === 0) continue
      out[level] = wire
    } else if (level !== 'xhigh' && level !== 'max') {
      out[level] = level === 'off' ? null : level
    }
  }
  return Object.keys(out).some(level => level !== 'off') ? out : undefined
}

function catalogIdOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function resolve(
  index: ModelIndex,
  id: string,
  api: string | undefined,
  catalogId?: string,
): PiModel | undefined {
  return (catalogId === undefined ? undefined : lookup(index, catalogId, api))
    ?? lookup(index, id, api)
}

function isDefaultName(name: unknown, id: string): boolean {
  // Native discovery uses the request id when the endpoint omits a display name.
  return name == null || (typeof name === 'string' && (name.trim().length === 0 || name === id))
}

export function enrichDiscovered(
  models: readonly DiscoveredModel[],
  index: ModelIndex,
  api?: string,
): DiscoveredModel[] {
  return models.map((model) => {
    const hit = resolve(index, model.id, api)
    if (hit === undefined) return model
    const name = isDefaultName(model.name, model.id) ? hit.name ?? model.name : model.name
    const contextWindow = model.contextWindow ?? (positive(hit.contextWindow) ? hit.contextWindow : undefined)
    const maxTokens = model.maxTokens ?? (positive(hit.maxTokens) ? hit.maxTokens : undefined)
    return {
      id: model.id,
      ...name === undefined ? {} : { name },
      ...contextWindow === undefined ? {} : { contextWindow },
      ...maxTokens === undefined ? {} : { maxTokens },
    }
  })
}

export function enrichEntry(
  entry: Record<string, unknown>,
  index: ModelIndex,
  api?: string,
  filterCompat?: CompatFilter,
): Record<string, unknown> {
  const id = entry.id
  if (typeof id !== 'string' || id.length === 0) return entry
  const hit = resolve(index, id, typeof api === 'string' ? api : undefined, catalogIdOf(entry.catalogId))
  if (hit === undefined) return entry
  const next = { ...entry }
  if (next.catalogId == null) {
    const mapped = aliasOf(id)
    if (mapped !== undefined) next.catalogId = mapped
  }
  if (isDefaultName(next.name, id) && hit.name !== undefined) next.name = hit.name
  if (!positive(next.contextWindow) && positive(hit.contextWindow)) next.contextWindow = hit.contextWindow
  if (!positive(next.maxTokens) && positive(hit.maxTokens)) next.maxTokens = hit.maxTokens
  const input = modalities(next.input) ?? modalities(hit.input)
  if ((!Array.isArray(next.input) || next.input.length === 0) && input !== undefined) next.input = input
  if (next.reasoningEfforts == null) {
    const efforts = reasoningEfforts(hit)
    if (efforts !== undefined) next.reasoningEfforts = efforts
  }
  if (next.compat == null) {
    const compat = filterCompat?.(hit.compat, api)
    if (compat !== undefined) next.compat = compat
  }
  return next
}

function apiOf(section: unknown, route: string): string | undefined {
  if (!isRecord(section) || !isRecord(section.providers) || !isRecord(section.providers[route])) return undefined
  const api = section.providers[route].api
  return typeof api === 'string' ? api : undefined
}

export function enrichOps(ops: readonly PathOp[], section: unknown, index: ModelIndex, filterCompat?: CompatFilter): PathOp[] {
  const apis = new Map<string, string | undefined>()
  return ops.map((op) => {
    if (op.path?.[0] !== 'providers') return op
    const path = op.path
    const route = path[1] ?? ''
    // Settings applies path edits in order, including protocol edits before a model list.
    if (path.length === 2) {
      apis.set(route, op.op === 'set' && isRecord(op.value) && typeof op.value.api === 'string' ? op.value.api : undefined)
    } else if (path.length === 3 && path[2] === 'api') {
      apis.set(route, op.op === 'set' && typeof op.value === 'string' ? op.value : undefined)
    }
    if (op.op !== 'set') return op
    if (path.length === 2 && isRecord(op.value) && Array.isArray(op.value.models)) {
      const api = typeof op.value.api === 'string' ? op.value.api : undefined
      return {
        ...op,
        value: {
          ...op.value,
          models: op.value.models.map(model => isRecord(model) ? enrichEntry(model, index, api, filterCompat) : model),
        },
      }
    }
    if (path.length === 3 && path[2] === 'models' && Array.isArray(op.value)) {
      const api = apis.has(route) ? apis.get(route) : apiOf(section, route)
      return {
        ...op,
        value: op.value.map(model => isRecord(model) ? enrichEntry(model, index, api, filterCompat) : model),
      }
    }
    return op
  })
}
