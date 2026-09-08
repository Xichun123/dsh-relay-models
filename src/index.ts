import { Effect } from 'effect'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createCatalog, listAliases, listChoices, setAlias } from './catalog.ts'
import type { ModelIndex } from './catalog.ts'
import { enrichDiscovered, enrichOps } from './enrich.ts'
import type { DiscoveredModel, PathOp } from './enrich.ts'
import { createUserAgentRewrite, userAgentTarget } from './headers.ts'
import { createCompatFilter } from './compat.ts'

const NS = 'llm-pi-ai'

interface Logger {
  warn(message: string, ...args: unknown[]): void
}

/** DSH 0.1.3-alpha.2 discovery draft; cancellation is a separate argument. */
interface DiscoveryRequest {
  provider?: string
  baseURL?: string
  api?: string
  apiKey?: string
}

type Discover = (ns: string, request: DiscoveryRequest, signal?: AbortSignal) => Promise<DiscoveredModel[]>
type Mutate = (ns: string, ops: readonly PathOp[], expectedRevision?: number) => Promise<void>

interface SettingsService {
  get(ns: string): unknown
  mutate: Mutate
}

interface WebServer {
  register(route: {
    kind: 'exact'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  }): () => void
}

/** Minimal structural Host face; no second Cordis runtime is bundled. */
interface PluginContext {
  llm: { discoverModels: Discover }
  settings?: SettingsService
  webServer?: WebServer
  logger: Logger
  inject(names: string[], callback: (ctx: PluginContext) => void): void
  effect(callback: () => (() => void) | void): void
  on(event: 'llm/stream', listener: (options: { provider: string }, next: () => AsyncIterable<unknown>) => AsyncIterable<unknown>): () => void
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const cleanup = (): void => {
      req.off('data', data)
      req.off('end', end)
      req.off('error', fail)
      req.off('aborted', aborted)
    }
    const fail = (error: Error): void => { cleanup(); reject(error) }
    const aborted = (): void => { fail(new Error('alias request aborted')) }
    const data = (chunk: Buffer): void => {
      size += chunk.byteLength
      if (size > 4096) { fail(new Error('alias body too large')); return }
      chunks.push(chunk)
    }
    const end = (): void => { cleanup(); resolve(Buffer.concat(chunks).toString('utf8')) }
    req.on('data', data)
    req.on('end', end)
    req.on('error', fail)
    req.on('aborted', aborted)
  })
}

export const name = 'dsh-relay-models'
export const inject = ['llm']

/** Enrich native discovery and model-list writes; all registrations belong to Cordis effects. */
export function apply(ctx: PluginContext): void {
  const catalog = createCatalog()
  const rewrite = createUserAgentRewrite()
  let headerSettings: SettingsService | undefined
  ctx.effect(() => rewrite.install())
  const lifetime = new AbortController()
  ctx.effect(() => () => { lifetime.abort(); catalog.dispose() })
  const load = (signal?: AbortSignal): Promise<ModelIndex> => Effect.runPromise(catalog.load, {
    signal: signal === undefined ? lifetime.signal : AbortSignal.any([signal, lifetime.signal]),
  })
  // Interruption is not a CatalogError and must not become a successful fallback.
  const optionalIndex = (signal?: AbortSignal): Promise<ModelIndex | undefined> => Effect.runPromise(
    catalog.load.pipe(Effect.catchTag('CatalogError', error => Effect.sync(() => {
      ctx.logger.warn('dsh-relay-models: pi.dev catalog unavailable; leaving model fields unchanged')
      ctx.logger.warn(error.message)
      return undefined
    }))),
    { signal: signal === undefined ? lifetime.signal : AbortSignal.any([signal, lifetime.signal]) },
  )

  ctx.effect(() => {
    const llm = ctx.llm
    const original = llm.discoverModels
    let active = true
    const discover: Discover = async (ns, request, signal) => {
      // 0.1.3 owns Anthropic listing, credentials, headers, parsing and LlmError codes.
      const target = active && ns === NS ? userAgentTarget(headerSettings?.get(NS), request.provider, request.baseURL) : undefined
      const models = await rewrite.run(target, () => original.call(llm, ns, request, signal))
      if (!active || ns !== NS || models.length === 0) return models
      signal?.throwIfAborted()
      const index = await optionalIndex(signal)
      return index === undefined ? models : enrichDiscovered(models, index, request.api)
    }
    llm.discoverModels = discover
    return () => {
      active = false
      // Do not overwrite a wrapper installed by another plugin after this one.
      if (llm.discoverModels === discover) llm.discoverModels = original
    }
  })

  ctx.inject(['webServer'], (webCtx) => {
    const server = webCtx.webServer!
    webCtx.effect(() => server.register({
      kind: 'exact',
      path: '/dsh-relay-models/catalog',
      handler: async (req, res) => {
        if (req.method !== 'GET') { res.writeHead(405, { allow: 'GET' }); res.end(); return }
        try {
          const body = JSON.stringify({ choices: listChoices(await load()), aliases: listAliases() })
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
          res.end(body)
        } catch (error) {
          webCtx.logger.warn(`dsh-relay-models: catalog route failed: ${String(error)}`)
          res.writeHead(502)
          res.end()
        }
      },
    }))
    webCtx.effect(() => server.register({
      kind: 'exact',
      path: '/dsh-relay-models/alias',
      handler: async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405, { allow: 'POST' }); res.end(); return }
        // JSON-only prevents cross-origin HTML form submissions to this local mutation route.
        if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json') {
          res.writeHead(415); res.end(); return
        }
        try {
          const body: unknown = JSON.parse(await readBody(req))
          if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error('expected an alias object')
          const row = body as { id?: unknown; catalogId?: unknown }
          if (typeof row.id !== 'string' || row.id.trim().length === 0
            || (row.catalogId !== undefined && typeof row.catalogId !== 'string')) throw new Error('invalid alias')
          if (typeof row.catalogId === 'string' && row.catalogId.length > 0 && !(await load()).has(row.catalogId)) {
            throw new Error('unknown catalog model')
          }
          setAlias(row.id, row.catalogId)
          res.writeHead(204)
          res.end()
        } catch {
          res.writeHead(400)
          res.end()
        }
      },
    }))
  })

  ctx.inject(['settings'], (settingsCtx) => {
    const settings = settingsCtx.settings!
    const filterCompat = createCompatFilter(settings, message => settingsCtx.logger.warn(message))
    settingsCtx.effect(() => {
      headerSettings = settings
      return () => { if (headerSettings === settings) headerSettings = undefined }
    })
    // Shared waterfall covers direct streams AND registration-bound prepareCall streams.
    settingsCtx.on('llm/stream', (options, next) =>
      rewrite.stream(userAgentTarget(settings.get(NS), options.provider), next))
    settingsCtx.effect(() => {
      const original = settings.mutate
      const pending = new AbortController()
      let active = true
      // Keep the Host's call-order guarantee while enrichment awaits the network.
      let writes = Promise.resolve()
      const mutate: Mutate = (ns, ops, expectedRevision) => {
        if (!active || ns !== NS) return original.call(settings, ns, ops, expectedRevision)
        const result = writes.then(async () => {
          pending.signal.throwIfAborted()
          const hasModels = ops.some(op => op.op === 'set' && op.path?.[0] === 'providers'
            && ((op.path.length === 2 && op.value !== null && typeof op.value === 'object'
              && Array.isArray((op.value as { models?: unknown }).models))
              || (op.path.length === 3 && op.path[2] === 'models' && Array.isArray(op.value))))
          const index = hasModels ? await optionalIndex(pending.signal) : undefined
          pending.signal.throwIfAborted()
          const next = index === undefined ? ops : enrichOps(ops, settings.get(NS), index, filterCompat)
          return original.call(settings, ns, next, expectedRevision)
        })
        writes = result.catch(() => { /* A rejected write must not poison the next queued edit. */ })
        return result
      }
      settings.mutate = mutate
      return () => {
        active = false
        pending.abort()
        if (settings.mutate === mutate) settings.mutate = original
      }
    })
  })
}
