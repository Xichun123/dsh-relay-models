import type { OfficialCatalogSnapshot, RelayConfig, RelayProviderConfig, RelayProtocol } from '../shared/types.ts'

const ENDPOINT = '/relay-models/api'

export interface RelayPageSnapshot {
  config: RelayConfig
  revision: number
  writable: boolean
  credentials: Record<string, boolean>
  catalog: OfficialCatalogSnapshot
}

interface ApiResult<T> {
  ok: boolean
  value?: T
  error?: string
  code?: string
}

/** A refusal the page can act on: {@link RelayApiError.code} names the cause. */
export class RelayApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message)
    this.name = 'RelayApiError'
  }
}

/** The host's stale-revision refusal, which a reload clears. */
export const RELAY_STALE_CODE = 'SETTINGS_CONFLICT'

let cachedPage: RelayPageSnapshot | undefined

async function request<T>(body?: object): Promise<T> {
  const response = await fetch(ENDPOINT, body === undefined ? {
    headers: { accept: 'application/json' },
  } : {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const result = await response.json() as ApiResult<T>
  if (!response.ok || !result.ok) {
    throw new RelayApiError(result.error ?? `Relay API answered ${response.status}`, result.code)
  }
  return result.value as T
}

export function peekRelayPage(): RelayPageSnapshot | undefined {
  return cachedPage
}

export function rememberRelayPage(next: RelayPageSnapshot): RelayPageSnapshot {
  cachedPage = next
  return next
}

export const relayPageApi = {
  load: async (): Promise<RelayPageSnapshot> => rememberRelayPage(await request<RelayPageSnapshot>()),
  catalog: async (): Promise<OfficialCatalogSnapshot> => {
    const catalog = await request<OfficialCatalogSnapshot>({ action: 'catalog' })
    if (cachedPage) cachedPage = { ...cachedPage, catalog }
    return catalog
  },

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
