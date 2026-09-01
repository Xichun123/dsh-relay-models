import type {
  ModelCandidate,
  OfficialModelSummary,
  RelayModelStatus,
  RelayProtocol,
  RelayProviderConfig,
  RelayServiceTier,
  RelayTransport,
} from './types.ts'

export const RELAY_PROTOCOLS = [
  'openai-completions',
  'openai-responses',
  'openai-codex-responses',
  'anthropic-messages',
] as const satisfies readonly RelayProtocol[]

export const RELAY_TRANSPORTS = [
  'auto',
  'websocket',
  'websocket-cached',
  'sse',
] as const satisfies readonly RelayTransport[]

/**
 * The logical RPC channel the settings page is served on. Connection owns the
 * physical route, its browser-trust fence, and its authentication; both halves
 * only have to agree on this string.
 */
export const RELAY_CHANNEL = '/relay-models'

/**
 * The Codex speed tiers a session may choose, in the order the Speed menu lists
 * them. Only `priority` — the canonical `service_tier` for Fast mode, and the
 * value Codex CLI sends for `/fast`. The `fast` spelling is an alias the public
 * API accepts, but pi-ai prices and echo-corrects only `priority` and `flex`,
 * so sending `fast` would silently record the turn at the standard rate.
 * Choosing none keeps `service_tier` out of the body, which is what every other
 * DSH route does.
 */
export const RELAY_SERVICE_TIERS = [
  'priority',
] as const satisfies readonly RelayServiceTier[]

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
  if (protocol === 'openai-codex-responses') return codexResponsesBaseURL(normalized)
  if (protocol !== 'anthropic-messages') return normalized
  const parsed = new URL(normalized)
  if (parsed.pathname.endsWith('/v1')) parsed.pathname = parsed.pathname.slice(0, -3) || '/'
  return parsed.toString().replace(/\/$/u, '')
}

/**
 * pi-ai Codex Responses appends `/codex/responses` unless the base already ends
 * with `/codex` or `/codex/responses`. CLIProxyAPI exposes that path at
 * `/backend-api/codex/responses`, so a stored `/v1` OpenAI-compatible URL is
 * rewritten to `/backend-api`.
 */
export function codexResponsesBaseURL(normalized: string): string {
  const parsed = new URL(normalized)
  const path = parsed.pathname.replace(/\/$/u, '') || '/'
  if (path.endsWith('/codex/responses') || path.endsWith('/codex') || path.endsWith('/backend-api')) {
    return parsed.toString().replace(/\/$/u, '')
  }
  parsed.pathname = path.endsWith('/v1')
    ? path.replace(/\/v1$/u, '/backend-api')
    : path === '/' ? '/backend-api' : `${path}/backend-api`
  return parsed.toString().replace(/\/$/u, '')
}

export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 300_000
export const DEFAULT_CONTEXT_WINDOW = 262_144
export const DEFAULT_MAX_TOKENS = 32_768

/**
 * Request-image bounds mirroring `dsh-llm-pi-ai`'s own defaults, which that
 * package does not re-export from its entry. A relay behind a gateway with a
 * smaller request-body cap lowers them per provider.
 */
export const DEFAULT_MAX_REQUEST_IMAGE_BYTES = 20 * 1024 * 1024
export const DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET = 2048 * 2048
export const DEFAULT_REQUEST_IMAGE_MAX_BYTES = 1024 * 1024

/**
 * DSH routes that no pi-ai provider entry names, so no live provider list can
 * report them. Every other official id is read from the installed pi-ai build
 * (the node half) or from the model catalog the page already holds, which is
 * why this set holds one entry instead of a copy of pi-ai's registry going
 * stale on every release.
 */
export const RESERVED_PROVIDER_IDS: ReadonlySet<string> = new Set(['deepseek-official'])

const SECRET_HEADER = /^(authorization|api-key|x-api-key|proxy-authorization)$/iu

export function validateProviderId(raw: string): string {
  const id = raw.trim().toLowerCase()
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id)) {
    throw new Error('Provider ID must start with a letter and contain lowercase letters, numbers, or hyphens')
  }
  return id
}

/**
 * Accept a provider id no other route already owns.
 * @param raw - the id typed into the page or stored in settings.
 * @param taken - official ids this caller knows: the installed pi-ai providers
 * on the node half, the catalog's providers on the page.
 * @returns the normalized id.
 */
export function assertUnreservedProviderId(raw: string, taken: ReadonlySet<string> = new Set()): string {
  const id = validateProviderId(raw)
  if (RESERVED_PROVIDER_IDS.has(id) || taken.has(id)) {
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
  // An address literal has no brand label to borrow: its first octet would
  // name the provider `relay-127`. A self-hosted gateway on this machine is
  // what that address usually is, so say so.
  const brand = /^[\d.]+$/u.test(hostname) || hostname.startsWith('[')
    ? 'local'
    : labels.find(label => !generic.has(label)) ?? labels[0] ?? 'relay'
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

/**
 * How much one catalog entry is preferred when several official models share a
 * remote id. `openai-codex` ranks first: those ids are the Codex family, and
 * Codex Responses is the only wire that carries `service_tier`, so a bare
 * `gpt-5.6-sol` from a relay lands on Codex rather than plain Responses. A
 * relay that speaks only plain Responses needs `protocolOverrides` for that
 * model, or a `modelMappings` entry naming the `openai` catalog copy.
 */
function sourceRank(model: OfficialModelSummary): number {
  if (model.provider === 'openai-codex') return 0
  if (model.provider === 'anthropic' || model.provider === 'openai') return 1
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

/**
 * Official models whose normalized id contains the remote one or is contained
 * by it — a release-dated or vendor-prefixed spelling of the same model. This
 * is a shortlist, not a search: the mapping panel searches the whole catalog by
 * hand when none of these is the right model.
 * @param remoteModelId - the id the relay serves.
 * @param catalog - official metadata to match against.
 * @param limit - how many candidates to offer.
 * @returns the closest candidates, nearest length first.
 */
export function suggestOfficialCandidates(
  remoteModelId: string,
  catalog: readonly OfficialModelSummary[],
  limit = 3,
): ModelCandidate[] {
  const needle = normalizeModelName(remoteModelId)
  if (!needle) return []
  return catalog
    .filter(model => {
      const normalized = normalizeModelName(model.id)
      return normalized !== '' && (needle.includes(normalized) || normalized.includes(needle))
    })
    .sort((a, b) => sourceRank(a) - sourceRank(b)
      || Math.abs(normalizeModelName(a.id).length - needle.length) - Math.abs(normalizeModelName(b.id).length - needle.length)
      || a.provider.localeCompare(b.provider)
      || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map(model => ({ provider: model.provider, id: model.id, name: model.name, api: model.api }))
}

export function inferProtocol(source: OfficialModelSummary | undefined, fallback: RelayProtocol): RelayProtocol | undefined {
  if (!source) return fallback
  if (source.api === 'anthropic-messages') return 'anthropic-messages'
  if (source.api === 'openai-completions') return 'openai-completions'
  if (source.api === 'openai-codex-responses') return 'openai-codex-responses'
  if (source.api === 'openai-responses' || source.api === 'azure-openai-responses') return 'openai-responses'
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
