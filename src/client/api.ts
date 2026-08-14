import type { RelayConfig, RelayProviderConfig, RelayProtocol } from '../shared/types.ts'

const ENDPOINT = '/relay-models/api'

export interface RelayPageSnapshot {
  config: RelayConfig
  revision: number
  writable: boolean
  credentials: Record<string, boolean>
}

interface ApiResult<T> {
  ok: boolean
  value?: T
  error?: string
}

async function request<T>(body?: object): Promise<T> {
  const response = await fetch(ENDPOINT, body === undefined ? {
    headers: { accept: 'application/json' },
  } : {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json() as ApiResult<T>
  if (!response.ok || !result.ok) throw new Error(result.error ?? `Relay API answered ${response.status}`)
  return result.value as T
}

export const relayPageApi = {
  load: (): Promise<RelayPageSnapshot> => request<RelayPageSnapshot>(),

  setProvider: (
    route: string,
    provider: RelayProviderConfig,
    expectedRevision: number,
    apiKey?: string,
  ): Promise<void> => request<void>({
    action: 'set-provider',
    route,
    provider,
    expectedRevision,
    ...apiKey ? { apiKey } : {},
  }),

  removeProvider: (route: string, expectedRevision: number): Promise<void> => request<void>({
    action: 'remove-provider',
    route,
    expectedRevision,
  }),

  discover: (input: {
    provider?: string
    baseURL: string
    protocol: RelayProtocol
    apiKey?: string
  }): Promise<string[]> => request<string[]>({ action: 'discover', ...input }),
}

export type RelayPageApi = typeof relayPageApi
