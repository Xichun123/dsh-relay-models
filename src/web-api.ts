import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { currentOfficialCatalog, refreshOfficialCatalog } from './catalog.ts'
import { discoverRelayModels } from './discovery.ts'
import { isRelayProtocol } from './shared/core.ts'
import type { RelayConfig, RelayProtocol, RelayProviderConfig } from './shared/types.ts'

const PATH = '/relay-models/api'
const MAX_BODY_BYTES = 1024 * 1024

export class RelayHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'RelayHttpError'
  }
}

export function assertRequestOrigin(req: IncomingMessage, method: string): void {
  const origin = req.headers.origin
  const host = req.headers.host
  if (!host) throw new RelayHttpError(403, 'Relay configuration requests must include Host')
  if (!origin) {
    if (method === 'GET') return
    throw new RelayHttpError(403, 'Relay configuration requests must include Origin')
  }
  if (origin !== `http://${host}` && origin !== `https://${host}`) {
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

export function installWebApi(
  ctx: Context,
  ns: SettingsNamespace,
  current: () => RelayConfig,
  onCatalogRefresh: () => void,
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
      assertRequestOrigin(req, req.method ?? 'GET')
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
      throw new Error(`Unknown action: ${action}`)
    } catch (error) {
      const status = error instanceof RelayHttpError ? error.status : 400
      reply(res, status, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: PATH, handler }), 'relay-models: Web configuration API')
}
