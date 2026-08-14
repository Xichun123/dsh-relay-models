import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { discoverRelayModels } from './discovery.ts'
import { isRelayProtocol } from './shared/core.ts'
import type { Config } from './index.ts'
import type { RelayProviderConfig } from './shared/types.ts'

const PATH = '/relay-models/api'
const MAX_BODY_BYTES = 1024 * 1024

function reply(res: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(body)
}

function sameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin
  const host = req.headers.host
  if (!origin || !host) return true
  return origin === `http://${host}` || origin === `https://${host}`
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

export function installWebApi(ctx: Context, ns: SettingsNamespace, current: () => Config): void {
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
    }
  }

  const handler = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (!sameOrigin(req)) {
      reply(res, 403, { ok: false, error: 'Cross-origin relay configuration requests are refused' })
      return
    }
    try {
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
      if (action === 'discover') {
        const protocol = requiredString(input.protocol, 'protocol')
        if (!isRelayProtocol(protocol)) throw new Error('Invalid relay protocol')
        const provider = typeof input.provider === 'string' ? current().providers[input.provider] : undefined
        const storedApiKey = provider
          ? (await ctx.credentials.resolve(credentialRef(provider.apiKeyEnv)))?.value
          : undefined
        const models = await discoverRelayModels({
          baseURL: requiredString(input.baseURL, 'baseURL'),
          api: protocol,
          apiKey: typeof input.apiKey === 'string' ? input.apiKey : storedApiKey,
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
      reply(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
    }
  }

  ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: PATH, handler }), 'relay-models: Web configuration API')
}
