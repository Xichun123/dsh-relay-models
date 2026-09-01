import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'
// Type-only: pulls Connection's `ctx.connection` merge into this program.
import type {} from '@deepseek-ai/dsh-client-connection'
import { currentOfficialCatalog, refreshOfficialCatalog } from './catalog.ts'
import { discoverRelayModels } from './discovery.ts'
import { isRelayProtocol, RELAY_CHANNEL, RELAY_SERVICE_TIERS } from './shared/core.ts'
import type { SpeedController } from './shared/speed.ts'
import type { RelayConfig, RelayProtocol, RelayProviderConfig, RelayServiceTier } from './shared/types.ts'

/** Where a discovery request may interrogate, resolved from the request and the stored configuration. */
export interface DiscoveryTarget {
  /** Stored provider the draft edits, absent for an endpoint that is not saved yet. */
  providerId?: string
  /** Endpoint to interrogate: the stored Base URL wins over any address the request names. */
  baseURL: string
  /** Wire protocol to interrogate with. */
  protocol: RelayProtocol
  /** Key typed into the draft, when the request carries one. */
  apiKey?: string
  /** Extra request headers stored for the provider; an unsaved endpoint has none. */
  headers?: Readonly<Record<string, string>>
  /** Whether the stored credential may answer for a missing {@link apiKey}. */
  useStoredKey: boolean
}

export function resolveDiscoveryTarget(
  input: Record<string, unknown>,
  config: RelayConfig,
): DiscoveryTarget {
  const protocol = requiredString(input.protocol, 'protocol')
  if (!isRelayProtocol(protocol)) throw new Error('Invalid relay protocol')
  const providerId = typeof input.provider === 'string' ? input.provider.trim() : ''
  if (providerId) {
    const provider = config.providers[providerId]
    if (!provider) throw new Error(`Unknown provider: ${providerId}`)
    return {
      providerId,
      baseURL: provider.baseURL,
      protocol,
      ...typeof input.apiKey === 'string' && input.apiKey.trim() ? { apiKey: input.apiKey.trim() } : {},
      ...provider.headers && Object.keys(provider.headers).length > 0 ? { headers: provider.headers } : {},
      useStoredKey: true,
    }
  }
  return {
    baseURL: requiredString(input.baseURL, 'baseURL'),
    protocol,
    ...typeof input.apiKey === 'string' ? { apiKey: input.apiKey } : {},
    useStoredKey: false,
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Request payload must be a JSON object')
  return value as Record<string, unknown>
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`)
  return value
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Map one refusal onto the carrier's closed error taxonomy. A settings write
 * refused for a stale revision is the one case the page recovers from on its
 * own, and `settings-conflict` carries both revisions so it can re-read rather
 * than parse a message.
 * @param ns - this plugin's settings namespace.
 * @param error - the thrown value.
 * @returns the error branch to answer with.
 */
function refusal(ns: SettingsNamespace, error: unknown): RpcResult<never> {
  const failure = error as { code?: unknown; expected?: unknown; actual?: unknown } | null
  if (failure?.code === 'SETTINGS_CONFLICT'
    && typeof failure.expected === 'number' && typeof failure.actual === 'number') {
    return {
      ok: false,
      error: {
        code: 'settings-conflict',
        message: messageOf(error),
        details: { ns, expected: failure.expected, actual: failure.actual },
      },
    }
  }
  return { ok: false, error: { code: 'settings-rejected', message: messageOf(error), details: { ns } } }
}

export function installWebApi(
  ctx: Context,
  ns: SettingsNamespace,
  current: () => RelayConfig,
  onCatalogRefresh: () => void,
  speed: SpeedController,
  onOfficialEnrich?: () => void,
): void {
  const state = async (): Promise<unknown> => {
    const descriptor = ctx.settings.describe({ redactSecrets: true }).find(item => item.ns === ns)
    if (!descriptor) throw new Error('Relay settings are not ready')
    const config = current()
    const credentials = Object.fromEntries(await Promise.all(
      Object.values(config.providers).map(async provider => [
        provider.apiKeyEnv,
        (await ctx.credentials.describe(credentialRef(provider.apiKeyEnv))).configured,
      ]),
    ))
    return {
      config,
      revision: descriptor.revision,
      writable: ctx.settings.writable,
      credentials,
      catalog: currentOfficialCatalog(),
    }
  }

  const serve = async (endpoint: string, payload: unknown, signal: AbortSignal): Promise<RpcResult<unknown>> => {
    const input = record(payload)
    switch (endpoint) {
      case 'state':
        return { ok: true, value: await state() }
      case 'catalog': {
        const previous = currentOfficialCatalog()
        const value = await refreshOfficialCatalog(signal).catch(() => currentOfficialCatalog())
        if (value !== previous) onCatalogRefresh()
        onOfficialEnrich?.()
        return { ok: true, value }
      }
      case 'enrich-official': {
        onOfficialEnrich?.()
        return { ok: true, value: null }
      }
      case 'discover': {
        const target = resolveDiscoveryTarget(input, current())
        const stored = target.providerId ? current().providers[target.providerId] : undefined
        const storedApiKey = target.useStoredKey && !target.apiKey && stored
          ? (await ctx.credentials.resolve(credentialRef(stored.apiKeyEnv)))?.value
          : undefined
        const models = await discoverRelayModels({
          baseURL: target.baseURL,
          api: target.protocol,
          apiKey: target.apiKey ?? storedApiKey,
          ...target.headers ? { headers: target.headers } : {},
          signal,
        })
        return { ok: true, value: models.map(model => model.id) }
      }
      case 'get-speed':
        return { ok: true, value: { tier: speed.get(requiredString(input.sessionId, 'sessionId')) ?? null } }
      case 'set-speed': {
        const sessionId = requiredString(input.sessionId, 'sessionId')
        const raw = input.tier
        if (raw !== null && raw !== undefined && !(RELAY_SERVICE_TIERS as readonly string[]).includes(String(raw))) {
          throw new Error(`Invalid speed tier: ${String(raw)}`)
        }
        speed.set(sessionId, (raw ?? undefined) as RelayServiceTier | undefined)
        return { ok: true, value: null }
      }
      case 'set-provider': {
        const route = requiredString(input.route, 'route')
        const provider = record(input.provider) as unknown as RelayProviderConfig
        await ctx.settings.mutate(ns, [{ op: 'set', path: ['providers', route], value: provider }], revisionOf(input))
        if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
          await ctx.credentials.set(credentialRef(provider.apiKeyEnv), input.apiKey.trim())
        }
        return { ok: true, value: null }
      }
      case 'remove-provider': {
        const route = requiredString(input.route, 'route')
        const provider = current().providers[route]
        await ctx.settings.mutate(ns, [{ op: 'unset', path: ['providers', route] }], revisionOf(input))
        if (provider) await ctx.credentials.unset(credentialRef(provider.apiKeyEnv))
        return { ok: true, value: null }
      }
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`)
    }
  }

  ctx.effect(() => {
    const dispose = ctx.connection.rpc.handle(
      RELAY_CHANNEL,
      async (endpoint, payload, signal) => serve(endpoint, payload, signal).catch(error => refusal(ns, error)),
      { authority: 'trusted-host' },
    )
    return () => { void dispose() }
  }, 'relay-models: Web configuration channel')
}

function revisionOf(input: Record<string, unknown>): number | undefined {
  return typeof input.expectedRevision === 'number' ? input.expectedRevision : undefined
}
