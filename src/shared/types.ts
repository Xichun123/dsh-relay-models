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
  protocol: RelayProtocol
  excluded: boolean
  metadataSource?: OfficialModelRef
  candidates: ModelCandidate[]
}
