import { aliasOf, lookup, type ModelIndex, type PiModel } from './catalog.ts'

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

const THINKING_FORMATS = new Set([
  'openai', 'deepseek', 'openrouter', 'together', 'baseten', 'zai', 'qwen',
  'chat-template', 'qwen-chat-template', 'string-thinking', 'ant-ling',
])

const COMPLETIONS_COMPAT = new Set([
  'supportsStore', 'supportsDeveloperRole', 'supportsReasoningEffort',
  'supportsUsageInStreaming', 'supportsFinishReason', 'maxTokensField',
  'requiresToolResultName', 'requiresAssistantAfterToolResult',
  'requiresThinkingAsText', 'requiresReasoningContentOnAssistantMessages',
  'thinkingFormat', 'chatTemplateKwargs', 'chatTemplateArgs',
  'supportsThinkingTokenBudget', 'supportsStrictMode', 'cacheControlFormat',
  'supportsLongCacheRetention',
])

const RESPONSES_COMPAT = new Set([
  'supportsDeveloperRole', 'supportsStrictMode', 'supportsLongCacheRetention',
])

const ANTHROPIC_COMPAT = new Set([
  'supportsEagerToolInputStreaming', 'supportsLongCacheRetention',
  'supportsCacheControlOnTools', 'supportsTemperature', 'forceAdaptiveThinking',
  'allowEmptySignature', 'supportsStrictTools',
])

const BEDROCK_COMPAT = new Set(['supportsStrictMode'])

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

function allowedCompat(api: string | undefined): Set<string> | undefined {
  if (api === 'openai-completions') return COMPLETIONS_COMPAT
  if (api === 'anthropic-messages') return ANTHROPIC_COMPAT
  if (api === 'bedrock-converse-stream') return BEDROCK_COMPAT
  if (api !== undefined && api.endsWith('responses')) return RESPONSES_COMPAT
  return undefined
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

export function compatFields(
  compat: Record<string, unknown> | undefined,
  api: string | undefined,
): Record<string, unknown> | undefined {
  if (compat === undefined) return undefined
  const allowed = allowedCompat(api)
  if (allowed === undefined) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(compat)) {
    if (!allowed.has(key) || value == null) continue
    if (key === 'thinkingFormat' && (typeof value !== 'string' || !THINKING_FORMATS.has(value))) continue
    if (key === 'maxTokensField' && value !== 'max_tokens' && value !== 'max_completion_tokens') continue
    if (isRecord(value) && Object.keys(value).length === 0) continue
    out[key] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
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

export function enrichDiscovered(
  models: readonly DiscoveredModel[],
  index: ModelIndex,
  api?: string,
): DiscoveredModel[] {
  return models.map((model) => {
    const hit = resolve(index, model.id, api)
    if (hit === undefined) return model
    const name = model.name ?? hit.name
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
  if (next.name == null && hit.name !== undefined) next.name = hit.name
  if (!positive(next.contextWindow) && positive(hit.contextWindow)) next.contextWindow = hit.contextWindow
  if (!positive(next.maxTokens) && positive(hit.maxTokens)) next.maxTokens = hit.maxTokens
  const input = modalities(next.input) ?? modalities(hit.input)
  if ((!Array.isArray(next.input) || next.input.length === 0) && input !== undefined) next.input = input
  if (next.reasoningEfforts == null) {
    const efforts = reasoningEfforts(hit)
    if (efforts !== undefined) next.reasoningEfforts = efforts
  }
  if (next.compat == null) {
    const compat = compatFields(hit.compat, api)
    if (compat !== undefined) next.compat = compat
  }
  return next
}

function apiOf(section: unknown, route: string): string | undefined {
  if (!isRecord(section) || !isRecord(section.providers) || !isRecord(section.providers[route])) return undefined
  const api = section.providers[route].api
  return typeof api === 'string' ? api : undefined
}

export function enrichOps(ops: readonly PathOp[], section: unknown, index: ModelIndex): PathOp[] {
  return ops.map((op) => {
    if (op.op !== 'set' || op.path?.[0] !== 'providers') return op
    const path = op.path
    if (path.length === 2 && isRecord(op.value) && Array.isArray(op.value.models)) {
      const api = typeof op.value.api === 'string' ? op.value.api : undefined
      return {
        ...op,
        value: {
          ...op.value,
          models: op.value.models.map(model => isRecord(model) ? enrichEntry(model, index, api) : model),
        },
      }
    }
    if (path.length === 3 && path[2] === 'models' && Array.isArray(op.value)) {
      const api = apiOf(section, path[1] ?? '')
      return {
        ...op,
        value: op.value.map(model => isRecord(model) ? enrichEntry(model, index, api) : model),
      }
    }
    return op
  })
}
