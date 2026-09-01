import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { RELAY_CHANNEL } from '../shared/core.ts'
import type { OfficialCatalogSnapshot, RelayConfig, RelayProviderConfig, RelayProtocol, RelayServiceTier } from '../shared/types.ts'

export interface RelayPageSnapshot {
  config: RelayConfig
  revision: number
  writable: boolean
  credentials: Record<string, boolean>
  catalog: OfficialCatalogSnapshot
}

/** A refusal the page can act on: {@link RelayApiError.code} names the cause. */
export class RelayApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message)
    this.name = 'RelayApiError'
  }
}

/** The host's stale-revision refusal, which a reload clears. */
export const RELAY_STALE_CODE = 'settings-conflict'

let cachedPage: RelayPageSnapshot | undefined
let transport: ClientConnectionRpc | undefined
const speedListeners = new Set<() => void>()

/**
 * Watch for a speed tier written anywhere on this page — the composer toggle or
 * the /fast popup — so the toggle never shows a tier another surface replaced.
 * @param listener - called after each successful write.
 * @returns the unsubscribe handle.
 */
export function onSpeedChanged(listener: () => void): () => void {
  speedListeners.add(listener)
  return () => { speedListeners.delete(listener) }
}

/**
 * Adopt the browser's Connection transport. Every call below rides the same
 * fenced, authenticated channel the rest of the app uses, so this page owns no
 * HTTP surface of its own.
 * @param rpc - the `ctx.connection.rpc` caller.
 */
export function bindRelayTransport(rpc: ClientConnectionRpc): void {
  transport = rpc
}

async function request<T>(endpoint: string, payload: object = {}): Promise<T> {
  if (!transport) throw new RelayApiError('The relay settings page is not connected to the harness')
  const result = await transport.call(RELAY_CHANNEL, endpoint, payload)
  if (!result.ok) throw new RelayApiError(result.error.message, result.error.code)
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
  load: async (): Promise<RelayPageSnapshot> => rememberRelayPage(await request<RelayPageSnapshot>('state')),
  catalog: async (): Promise<OfficialCatalogSnapshot> => {
    const catalog = await request<OfficialCatalogSnapshot>('catalog')
    if (cachedPage) cachedPage = { ...cachedPage, catalog }
    return catalog
  },

  setProvider: (
    route: string,
    provider: RelayProviderConfig,
    expectedRevision: number,
    apiKey?: string,
  ): Promise<void> => request<void>('set-provider', {
    route,
    provider,
    expectedRevision,
    ...apiKey ? { apiKey } : {},
  }),

  removeProvider: (route: string, expectedRevision: number): Promise<void> =>
    request<void>('remove-provider', { route, expectedRevision }),

  discover: (input: {
    provider?: string
    baseURL: string
    protocol: RelayProtocol
    apiKey?: string
  }): Promise<string[]> => request<string[]>('discover', input),

  getSpeed: async (sessionId: string): Promise<RelayServiceTier | null> =>
    (await request<{ tier: RelayServiceTier | null }>('get-speed', { sessionId })).tier,

  setSpeed: async (sessionId: string, tier: RelayServiceTier | null): Promise<void> => {
    await request<void>('set-speed', { sessionId, tier })
    for (const listener of speedListeners) listener()
  },
}

export type RelayPageApi = typeof relayPageApi
