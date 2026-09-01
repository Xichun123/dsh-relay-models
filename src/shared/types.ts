// Type-only, so the browser bundle carries no edge to the node LLM package.
import type { RetryPolicyConfig } from '@deepseek-ai/dsh-llm'

export type RelayProtocol =
  | 'openai-completions'
  | 'openai-responses'
  | 'openai-codex-responses'
  | 'anthropic-messages'

export type RelayTransport = 'sse' | 'websocket' | 'websocket-cached' | 'auto'

/**
 * The Codex speed tier a session asks for. One value, because Fast mode is one
 * thing: OpenAI renamed Priority processing to Fast mode and kept `priority` as
 * the canonical `service_tier`, so `priority` is what Codex CLI puts on the
 * wire for `/fast` — `service_tier = "fast"` in its `config.toml` is a legacy
 * alias normalized to `priority` at load. Absent sends no `service_tier` field,
 * which is what every other DSH route does. Chosen per session from the
 * composer Speed toggle or the /fast popup; the relay route carries no tier.
 */
export type RelayServiceTier = 'priority'

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
  /** Provider idle ceiling while a stream read is outstanding; the schema default applies when absent. */
  streamIdleTimeoutMs?: number
  retryPolicy?: RetryPolicyConfig
  syncedAt?: number
}

export interface RelayConfig {
  providers: Record<string, RelayProviderConfig>
}

export interface ModelCandidate extends OfficialModelRef {
  name: string
  api: string
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
