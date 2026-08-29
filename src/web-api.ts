import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { currentOfficialCatalog, refreshOfficialCatalog } from './catalog.ts'
import { discoverRelayModels } from './discovery.ts'
import { isRelayProtocol, RELAY_SERVICE_TIERS } from './shared/core.ts'
import type { SpeedController } from './shared/speed.ts'
import type { RelayConfig, RelayProtocol, RelayProviderConfig, RelayServiceTier } from './shared/types.ts'

const PATH = '/relay-models/api'
const MAX_BODY_BYTES = 1024 * 1024

/** The operations this endpoint serves; anything else is refused by name. */
const RELAY_ACTIONS = ['catalog', 'discover', 'set-provider', 'remove-provider', 'get-speed', 'set-speed'] as const

/** One operation of {@link RELAY_ACTIONS}. */
type RelayAction = (typeof RELAY_ACTIONS)[number]

/**
 * Whether a request names an operation this endpoint serves.
 * @param value - the `action` field of the request body.
 * @returns true when the endpoint has a branch for it.
 */
function isRelayAction(value: string): value is RelayAction {
  return (RELAY_ACTIONS as readonly string[]).includes(value)
}

/**
 * Refuse an operation the switch above did not handle. Unreachable while the
 * action union and the branches agree; adding a member without its branch is a
 * compile error here.
 * @param action - the unhandled action.
 */
function assertNever(action: never): never {
  throw new Error(`Unhandled relay action: ${String(action)}`)
}

export class RelayHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'RelayHttpError'
  }
}

/**
 * The normalized URL of a bare `host[:port]` authority. Anything WHATWG parsing
 * would rewrite — a path, userinfo, an unbracketed IPv6 literal — is not an
 * authority and gets no trust, because parsing it would silently authorize the
 * embedded hostname instead.
 * @param value - the header value or configured entry, verbatim.
 * @returns the parsed authority, or undefined when the value is not one.
 */
function authority(value: string): URL | undefined {
  try {
    const url = new URL(`http://${value}`)
    const written = value.toLowerCase()
    return url.host === written || url.hostname === written ? url : undefined
  } catch {
    // A value that is not a parsable authority carries no host to trust.
    return undefined
  }
}

/**
 * Whether a hostname names this machine's loopback authority.
 * @param hostname - a WHATWG URL hostname (IPv6 literals keep their brackets).
 * @returns true for localhost, IPv6 loopback, or any address in 127/8.
 */
function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  const parts = hostname.split('.')
  return parts.length === 4
    && parts[0] === '127'
    && parts.every(part => /^\d{1,3}$/u.test(part) && Number(part) <= 255)
}

/**
 * Whether the request authority is one this deployment serves. A configured
 * entry naming a port matches that exact authority; a port-less entry matches
 * its hostname on any port.
 */
function isTrustedAuthority(host: URL, trustedHosts: readonly string[]): boolean {
  return trustedHosts.some(entry => {
    const trusted = authority(entry)
    if (!trusted) return false
    return trusted.port === '' ? trusted.hostname === host.hostname : trusted.host === host.host
  })
}

/**
 * Refuse a configuration request a browser could have been tricked into
 * sending. Three fences, in the order the `/api` carrier applies them:
 *
 * - **Host** — the socket reached this server, but a DNS-rebound page carries
 *   the attacker's domain here, and Host is the one header rebinding cannot
 *   forge. A deployment served behind a reverse proxy names its public
 *   authority in `trustedHosts`.
 * - **Fetch metadata** — an explicit cross-site marker is refused whatever
 *   Origin says.
 * - **Origin** — when a browser attaches one it must be exactly this authority.
 *   A read may omit it; a write may not, because this endpoint stores API keys
 *   and can make the host interrogate an address the request names.
 * @param req - the incoming request.
 * @param method - its HTTP method.
 * @param trustedHosts - non-loopback authorities this deployment serves.
 */
export function assertRequestOrigin(
  req: IncomingMessage,
  method: string,
  trustedHosts: readonly string[] = [],
): void {
  const rawHost = req.headers.host
  const host = typeof rawHost === 'string' ? authority(rawHost) : undefined
  if (!host) throw new RelayHttpError(403, 'Relay configuration requests must include a parsable Host')
  if (!isLoopbackHostname(host.hostname) && !isTrustedAuthority(host, trustedHosts)) {
    throw new RelayHttpError(403, `Relay configuration requests refuse Host "${host.host}"; add it to trustedHosts to serve it`)
  }
  if (req.headers['sec-fetch-site'] === 'cross-site') {
    throw new RelayHttpError(403, 'Cross-site relay configuration requests are refused')
  }
  const origin = req.headers.origin
  if (!origin) {
    if (method === 'GET') return
    throw new RelayHttpError(403, 'Relay configuration requests must include Origin')
  }
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    // An opaque or malformed Origin names no authority that could match.
    throw new RelayHttpError(403, 'Cross-origin relay configuration requests are refused')
  }
  if (originHost !== host.host) {
    throw new RelayHttpError(403, 'Cross-origin relay configuration requests are refused')
  }
}

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

function reply(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const value of req) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value)
    total += chunk.length
    if (total > MAX_BODY_BYTES) throw new Error('Request body is too large')
    chunks.push(chunk)
  }
  if (total === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Request body must be a JSON object')
  return value as Record<string, unknown>
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`)
  return value
}

/**
 * The stable code a refusal carries, for the page to act on rather than parse
 * a message. A settings write refused for a stale revision is the one case the
 * page can recover from on its own.
 * @param error - the thrown value.
 * @returns the code, or undefined when the failure has none.
 */
function failureCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code
  return typeof code === 'string' && code.length > 0 ? code : undefined
}

export function installWebApi(
  ctx: Context,
  ns: SettingsNamespace,
  current: () => RelayConfig,
  onCatalogRefresh: () => void,
  speed: SpeedController,
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

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      assertRequestOrigin(req, req.method ?? 'GET', current().trustedHosts ?? [])
      if (req.method === 'GET') {
        reply(res, 200, { ok: true, value: await state() })
        return
      }
      if (req.method !== 'POST') {
        res.setHeader('allow', 'GET, POST')
        reply(res, 405, { ok: false, error: 'Method not allowed' })
        return
      }
      const input = record(await readBody(req))
      const action = requiredString(input.action, 'action')
      if (!isRelayAction(action)) {
        // Named before any field is read: an unknown action must not be
        // reported as a missing field of an operation that does not exist.
        throw new Error(`Unknown action: ${action}`)
      }
      if (action === 'catalog') {
        const previous = currentOfficialCatalog()
        const value = await refreshOfficialCatalog().catch(() => currentOfficialCatalog())
        if (value !== previous) onCatalogRefresh()
        reply(res, 200, { ok: true, value })
        return
      }
      if (action === 'discover') {
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
        })
        reply(res, 200, { ok: true, value: models.map(model => model.id) })
        return
      }
      if (action === 'get-speed') {
        const sessionId = requiredString(input.sessionId, 'sessionId')
        reply(res, 200, { ok: true, value: { tier: speed.get(sessionId) ?? null } })
        return
      }
      if (action === 'set-speed') {
        const sessionId = requiredString(input.sessionId, 'sessionId')
        const raw = input.tier
        if (raw !== null && raw !== undefined && !(RELAY_SERVICE_TIERS as readonly string[]).includes(String(raw))) {
          throw new Error(`Invalid speed tier: ${String(raw)}`)
        }
        speed.set(sessionId, (raw ?? undefined) as RelayServiceTier | undefined)
        reply(res, 200, { ok: true })
        return
      }
      const route = requiredString(input.route, 'route')
      const expectedRevision = typeof input.expectedRevision === 'number' ? input.expectedRevision : undefined
      if (action === 'set-provider') {
        const provider = record(input.provider) as unknown as RelayProviderConfig
        await ctx.settings.mutate(ns, [{ op: 'set', path: ['providers', route], value: provider }], expectedRevision)
        if (typeof input.apiKey === 'string' && input.apiKey.trim()) {
          await ctx.credentials.set(credentialRef(provider.apiKeyEnv), input.apiKey.trim())
        }
        reply(res, 200, { ok: true })
        return
      }
      if (action === 'remove-provider') {
        const provider = current().providers?.[route]
        await ctx.settings.mutate(ns, [{ op: 'unset', path: ['providers', route] }], expectedRevision)
        if (provider) await ctx.credentials.unset(credentialRef(provider.apiKeyEnv))
        reply(res, 200, { ok: true })
        return
      }
      assertNever(action)
    } catch (error) {
      const code = failureCode(error)
      const status = error instanceof RelayHttpError
        ? error.status
        : code === 'SETTINGS_CONFLICT' ? 409 : 400
      reply(res, status, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        ...code ? { code } : {},
      })
    }
  }

  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: PATH, handler }), 'relay-models: Web configuration API')
}
