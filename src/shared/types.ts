export type RelayProtocol = 'openai-completions' | 'openai-responses' | 'anthropic-messages'

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

export interface RelayProviderConfig {
  displayName: string
  baseURL: string
  apiKeyEnv: string
  fallbackProtocol: RelayProtocol
  modelIds: string[]
  modelMappings: Record<string, OfficialModelRef>
  protocolOverrides: Record<string, RelayProtocol>
  excludedModels: string[]
  syncedAt?: number
}

export interface RelayConfig {
  providers: Record<string, RelayProviderConfig>
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
