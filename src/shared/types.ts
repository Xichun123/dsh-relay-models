export type RelayProtocol =
  | 'openai-completions'
  | 'openai-responses'
  | 'openai-codex-responses'
  | 'anthropic-messages'

export type RelayTransport = 'sse' | 'websocket' | 'websocket-cached' | 'auto'

/**
 * The Codex speed tier a route asks for. `fast` is Codex Fast mode: 1.5x model
 * speed at a higher ChatGPT credit rate. Absent sends no `service_tier` field,
 * which is what every DSH route does today.
 */
export type RelayServiceTier = 'fast' | 'priority' | 'flex'

export interface OfficialModelRef {
  provider: string
  id: string
}

export interface OfficialModelSummary extends OfficialModelRef {
  name: string
  api: string
  contextWindow: number
  maxTokens: number
  reasoning: boolean
  input: readonly string[]
  thinkingLevelMap?: Readonly<Record<string, unknown>>
  compat?: Readonly<Record<string, unknown>>
  cost?: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    tiers?: readonly {
      inputTokensAbove: number
      input: number
      output: number
      cacheRead: number
      cacheWrite: number
    }[]
  }
}

export interface OfficialCatalogSnapshot {
  models: readonly OfficialModelSummary[]
  source: 'remote' | 'bundled'
  revision?: string
  minimumVersion?: string
}

export interface RelayRetryPolicy {
  mode: 'normal' | 'always'
  maxRetries?: number
  retryableCodes?: string[]
  backoff?: {
    initialDelayMs?: number
    maxDelayMs?: number
    jitterRatio?: number
  }
}

export interface RelayProviderConfig {
  displayName: string
  baseURL: string
  apiKeyEnv: string
  fallbackProtocol: RelayProtocol
  modelIds: string[]
  modelMappings: Record<string, OfficialModelRef>
  protocolOverrides: Record<string, RelayProtocol>
  excludedModels: string[]
  headers: Record<string, string>
  transport?: RelayTransport
  /** Codex speed tier; absent sends no `service_tier`. Only Codex Responses reads it. */
  serviceTier?: RelayServiceTier
  /** Provider idle ceiling while a stream read is outstanding; the schema default applies when absent. */
  streamIdleTimeoutMs?: number
  /** Base64 image payload ceiling per request; oldest images offload above it. */
  maxRequestImageBytes?: number
  /** Total-pixel budget of each inline request image version. */
  requestImagePixelBudget?: number
  /** Raw encoded-byte cap of each inline request image version. */
  requestImageMaxBytes?: number
  retryPolicy?: RelayRetryPolicy
  syncedAt?: number
}

export interface RelayConfig {
  providers: Record<string, RelayProviderConfig>
  /**
   * Non-loopback `host[:port]` authorities the configuration page may be served
   * from — the reverse-proxy case. An entry naming a port matches that exact
   * authority; a port-less entry matches its hostname on any port. Empty means
   * loopback only, which is what a DNS-rebound page cannot satisfy.
   */
  trustedHosts?: string[]
}

export interface ModelCandidate extends OfficialModelRef {
  name: string
  api: string
  score: number
}

export interface RelayModelStatus {
  id: string
  protocol?: RelayProtocol
  officialApi?: string
  supported: boolean
  excluded: boolean
  metadataSource?: OfficialModelRef
  candidates: ModelCandidate[]
}
