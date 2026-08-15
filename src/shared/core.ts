import type {
  ModelCandidate,
  OfficialModelSummary,
  RelayModelStatus,
  RelayProtocol,
  RelayProviderConfig,
} from './types.ts'

export const RELAY_PROTOCOLS = [
  'openai-completions',
  'openai-responses',
  'anthropic-messages',
] as const satisfies readonly RelayProtocol[]

export function isRelayProtocol(value: unknown): value is RelayProtocol {
  return RELAY_PROTOCOLS.includes(value as RelayProtocol)
}

export function normalizeBaseURL(raw: string): string {
  const value = raw.trim()
  if (!value) throw new Error('Base URL cannot be empty')
  const parsed = new URL(value)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Base URL must use http:// or https://')
  }
  if (parsed.username || parsed.password) throw new Error('Do not include credentials in the Base URL')
  return parsed.toString().replace(/\/$/u, '')
}

export function baseURLForProtocol(raw: string, protocol: RelayProtocol): string {
  const normalized = normalizeBaseURL(raw)
  if (protocol !== 'anthropic-messages') return normalized
  const parsed = new URL(normalized)
  if (parsed.pathname.endsWith('/v1')) parsed.pathname = parsed.pathname.slice(0, -3) || '/'
  return parsed.toString().replace(/\/$/u, '')
}

export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 300_000
export const DEFAULT_CONTEXT_WINDOW = 262_144
export const DEFAULT_MAX_TOKENS = 32_768

/** Official pi-ai / DSH routes this plugin must not claim. */
export const RESERVED_PROVIDER_IDS: ReadonlySet<string> = new Set([
  'amazon-bedrock',
  'ant-ling',
  'anthropic',
  'azure-openai-responses',
  'cerebras',
  'cloudflare-ai-gateway',
  'cloudflare-workers-ai',
  'deepseek',
  'deepseek-official',
  'fireworks',
  'github-copilot',
  'google',
  'google-vertex',
  'groq',
  'huggingface',
  'kimi-coding',
  'minimax',
  'minimax-cn',
  'mistral',
  'moonshotai',
  'moonshotai-cn',
  'nvidia',
  'openai',
  'openai-codex',
  'opencode',
  'opencode-go',
  'openrouter',
  'qwen-token-plan',
  'qwen-token-plan-cn',
  'radius',
  'together',
  'vercel-ai-gateway',
  'xai',
  'xiaomi',
  'xiaomi-token-plan-ams',
  'xiaomi-token-plan-cn',
  'xiaomi-token-plan-sgp',
  'zai',
  'zai-coding-cn',
])

const SECRET_HEADER = /^(authorization|api-key|x-api-key|proxy-authorization)$/iu

export function validateProviderId(raw: string): string {
  const id = raw.trim().toLowerCase()
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new Error('Provider ID must start with a letter and contain lowercase letters, numbers, or hyphens')
  }
  return id
}

export function assertUnreservedProviderId(raw: string, extraReserved: ReadonlySet<string> = RESERVED_PROVIDER_IDS): string {
  const id = validateProviderId(raw)
  if (RESERVED_PROVIDER_IDS.has(id) || extraReserved.has(id)) {
    throw new Error(`Provider ID "${id}" is reserved by DeepSeek Harness; use a relay-* name`)
  }
  return id
}

export function assertSafeHeaders(headers: Readonly<Record<string, string>>): void {
  for (const name of Object.keys(headers)) {
    if (SECRET_HEADER.test(name)) {
      throw new Error(`Header "${name}" cannot carry credentials; store the API key in the credentials field`)
    }
  }
}

export function parseHeaderLines(raw: string): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^([^:=]+)[:=](.*)$/u)
    if (!match) throw new Error(`Invalid header line: ${trimmed}`)
    const name = match[1]!.trim()
    if (!name) throw new Error('Header name cannot be empty')
    headers[name] = match[2]!.trim()
  }
  assertSafeHeaders(headers)
  return headers
}

export function formatHeaderLines(headers: Readonly<Record<string, string>>): string {
  return Object.entries(headers).map(([name, value]) => `${name}: ${value}`).join('\n')
}

export function relayCredentialRef(route: string): string {
  return `${validateProviderId(route).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`
}

export function suggestProviderIdentity(rawBaseURL: string, existingIds: ReadonlySet<string>): { id: string; name: string } {
  const hostname = new URL(normalizeBaseURL(rawBaseURL)).hostname.toLowerCase()
  const generic = new Set(['api', 'www', 'gateway', 'proxy', 'openai', 'anthropic', 'ai', 'v1', 'com', 'net', 'org', 'io', 'cn'])
  const labels = hostname.split('.').filter(Boolean)
  const brand = labels.find(label => !generic.has(label)) ?? labels[0] ?? 'relay'
  const stem = `relay-${brand.replace(/[^a-z0-9]+/gu, '-')}`
  let id = validateProviderId(stem)
  for (let suffix = 2; existingIds.has(id); suffix += 1) id = `${stem}-${suffix}`
  const readable = brand.split(/[-_]+/u).filter(Boolean).map(part => part[0]!.toUpperCase() + part.slice(1)).join(' ')
  return { id, name: `${readable || 'Model'} Relay` }
}

export function modelsEndpoints(baseURL: string): string[] {
  const normalized = normalizeBaseURL(baseURL)
  const path = new URL(normalized).pathname.replace(/\/$/u, '')
  return [...new Set([`${normalized}/models`, ...path.endsWith('/v1') ? [] : [`${normalized}/v1/models`]])]
}

export function parseModelIds(payload: unknown): string[] {
  let entries: unknown
  if (Array.isArray(payload)) entries = payload
  else if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    entries = Array.isArray(record.data) ? record.data : record.models
  }
  if (!Array.isArray(entries)) throw new Error('The /models response does not contain a model array')
  return [...new Set(entries.map(entry => {
    if (typeof entry === 'string') return entry.trim()
    if (entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string') {
      return (entry as { id: string }).id.trim()
    }
    return ''
  }).filter(Boolean))]
}

function sourceRank(model: OfficialModelSummary): number {
  if (model.provider === 'anthropic' || model.provider === 'openai') return 0
  if (model.provider === 'openai-codex') return 1
  if (isRelayProtocol(model.api)) return 2
  if (model.api.startsWith('openai-')) return 3
  return 10
}

function catalogIndex(catalog: readonly OfficialModelSummary[]): Map<string, OfficialModelSummary> {
  const byId = new Map<string, OfficialModelSummary>()
  for (const candidate of catalog) {
    const current = byId.get(candidate.id)
    if (!current || sourceRank(candidate) < sourceRank(current)) byId.set(candidate.id, candidate)
  }
  return byId
}

function normalizeModelName(value: string): string {
  return value.toLowerCase().replace(/^.*\//u, '').replace(/(?:^|[-_.])20\d{6}$/u, '').replace(/[^a-z0-9]+/gu, '')
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex]
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1]! + 1,
        previous[rightIndex]! + 1,
        previous[rightIndex - 1]! + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      )
    }
    for (let index = 0; index < current.length; index += 1) previous[index] = current[index]!
  }
  return previous[right.length]!
}

export function suggestOfficialCandidates(
  remoteModelId: string,
  catalog: readonly OfficialModelSummary[],
  limit = 3,
): ModelCandidate[] {
  const needle = normalizeModelName(remoteModelId)
  if (!needle) return []
  const candidates = new Map<string, ModelCandidate>()
  for (const model of catalog) {
    const normalized = normalizeModelName(model.id)
    if (!normalized) continue
    const maxLength = Math.max(needle.length, normalized.length)
    const similarity = maxLength === 0 ? 1 : 1 - editDistance(needle, normalized) / maxLength
    const containment = needle.includes(normalized) || normalized.includes(needle) ? 0.25 : 0
    const candidate = {
      provider: model.provider,
      id: model.id,
      name: model.name,
      api: model.api,
      score: Math.round(Math.min(1, similarity + containment) * 100),
    }
    const key = `${candidate.provider}/${candidate.id}`
    if ((candidates.get(key)?.score ?? -1) < candidate.score) candidates.set(key, candidate)
  }
  return [...candidates.values()]
    .filter(candidate => candidate.score >= 35)
    .sort((a, b) => b.score - a.score || a.provider.localeCompare(b.provider) || a.id.localeCompare(b.id))
    .slice(0, limit)
}

export function inferProtocol(source: OfficialModelSummary | undefined, fallback: RelayProtocol): RelayProtocol | undefined {
  if (!source) return fallback
  if (source.api === 'anthropic-messages') return 'anthropic-messages'
  if (source.api === 'openai-completions') return 'openai-completions'
  if (source.api === 'openai-responses' || source.api === 'openai-codex-responses'
    || source.api === 'azure-openai-responses') return 'openai-responses'
  return undefined
}

export function resolveOfficialModel(
  remoteId: string,
  config: RelayProviderConfig,
  catalog: readonly OfficialModelSummary[],
): OfficialModelSummary | undefined {
  const reference = config.modelMappings[remoteId]
  if (reference) return catalog.find(model => model.provider === reference.provider && model.id === reference.id)
  return catalogIndex(catalog).get(remoteId)
}

export function relayModelStatuses(
  config: RelayProviderConfig,
  catalog: readonly OfficialModelSummary[],
): RelayModelStatus[] {
  const excluded = new Set(config.excludedModels)
  return [...new Set(config.modelIds.map(id => id.trim()).filter(Boolean))].map(id => {
    const source = resolveOfficialModel(id, config, catalog)
    const protocol = config.protocolOverrides[id] ?? inferProtocol(source, config.fallbackProtocol)
    return {
      id,
      ...protocol ? { protocol } : {},
      ...source ? { officialApi: source.api } : {},
      supported: protocol !== undefined,
      excluded: excluded.has(id),
      ...source ? { metadataSource: { provider: source.provider, id: source.id }, candidates: [] } : {
        candidates: suggestOfficialCandidates(id, catalog),
      },
    }
  })
}

export function updateExcludedModels(current: readonly string[], ids: readonly string[], excluded: boolean): string[] {
  const values = new Set(current)
  for (const id of ids) excluded ? values.add(id) : values.delete(id)
  return [...values].sort()
}
