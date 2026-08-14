import type { RelayConfig, RelayProviderConfig, RelayProtocol } from '../shared/types.ts'

const ENDPOINT = '/relay-models/api'

export interface RelayPageSnapshot {
  config: RelayConfig
  revision: number
  writable: boolean
  credentials: Record<string, { configured: boolean; writable: boolean; source?: string }>
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

export class RelayPageApi {
  load(): Promise<RelayPageSnapshot> {
    return request<RelayPageSnapshot>()
  }

  setProvider(
    route: string,
    provider: RelayProviderConfig,
    expectedRevision: number,
    apiKey?: string,
  ): Promise<RelayPageSnapshot> {
    return request<RelayPageSnapshot>({
      action: 'set-provider',
      route,
      provider,
      expectedRevision,
      ...apiKey ? { apiKey } : {},
    })
  }

  removeProvider(route: string, expectedRevision: number): Promise<RelayPageSnapshot> {
    return request<RelayPageSnapshot>({ action: 'remove-provider', route, expectedRevision })
  }

  discover(input: {
    provider?: string
    baseURL: string
    protocol: RelayProtocol
    apiKey?: string
  }): Promise<string[]> {
    return request<string[]>({ action: 'discover', ...input })
  }
}
