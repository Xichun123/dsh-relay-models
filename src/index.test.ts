import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { test } from 'node:test'
import { apply } from './index.ts'
import { resetAliases } from './catalog.ts'
import type { DiscoveredModel, PathOp } from './enrich.ts'

const CATALOG = {
  anthropic: {
    'claude-test': {
      id: 'claude-test', name: 'Claude Test', api: 'anthropic-messages', provider: 'anthropic',
      input: ['text', 'image'], contextWindow: 200000, maxTokens: 64000, reasoning: true,
      compat: { forceAdaptiveThinking: true },
    },
  },
}
const reply = (): Response => Response.json(CATALOG)
type Discover = Parameters<typeof apply>[0]['llm']['discoverModels']
type Settings = NonNullable<Parameters<typeof apply>[0]['settings']>
type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>

function context(options: { discover?: Discover; settings?: Settings; web?: boolean } = {}) {
  const warnings: string[] = []
  const disposers: (() => void)[] = []
  const routes = new Map<string, Handler>()
  const llm = { discoverModels: options.discover ?? (async (): Promise<DiscoveredModel[]> => [{ id: 'claude-test' }]) }
  const original = llm.discoverModels
  const ctx: Parameters<typeof apply>[0] = {
    llm, settings: options.settings,
    logger: { warn: (message) => { warnings.push(message) } },
    webServer: options.web ? {
      register(route) { routes.set(route.path, route.handler); return () => { routes.delete(route.path) } },
    } : undefined,
    inject(names, callback) {
      if (names.every(name => (ctx as unknown as Record<string, unknown>)[name] !== undefined)) callback(ctx)
    },
    effect(callback) { const dispose = callback(); if (dispose !== undefined) disposers.push(dispose) },
    on() { return () => {} },
  }
  apply(ctx)
  return { llm, original, warnings, routes, dispose: () => { for (const dispose of disposers.reverse()) dispose() } }
}

test('native Anthropic discovery owns the draft, credential, signal and model metadata', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => reply())
  const request = { provider: 'relay', baseURL: 'https://relay.test/v1', api: 'anthropic-messages', apiKey: 'typed' }
  const signal = new AbortController().signal
  const host = context({ discover: async function(ns, draft, abort) {
    assert.equal(this, host.llm)
    assert.equal(ns, 'llm-pi-ai')
    assert.equal(draft, request)
    assert.equal(abort, signal)
    return [{ id: 'claude-test', name: 'Relay Name', contextWindow: 1234 }]
  } })
  t.after(host.dispose)
  assert.deepEqual(await host.llm.discoverModels('llm-pi-ai', request, signal), [
    { id: 'claude-test', name: 'Relay Name', contextWindow: 1234, maxTokens: 64000 },
  ])
  assert.equal(fetch.mock.callCount(), 1)
})

test('native errors are preserved without fallback requests, including authentication and cancellation', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => reply())
  for (const code of ['INVALID_CREDENTIAL', 'DISCOVERY_FAILED', 'ABORTED', 'DISCOVERY_UNSUPPORTED']) {
    const error = Object.assign(new Error(code), { code })
    const host = context({ discover: async () => { throw error } })
    t.after(host.dispose)
    await assert.rejects(host.llm.discoverModels('llm-pi-ai', { api: 'anthropic-messages' }), actual => actual === error)
  }
  assert.equal(fetch.mock.callCount(), 0)
})

test('other namespaces and empty listings do not load the catalog', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => reply())
  const models = [{ id: 'claude-test' }]
  const host = context({ discover: async ns => ns === 'llm-pi-ai' ? [] : models })
  t.after(host.dispose)
  assert.equal(await host.llm.discoverModels('llm-other', {}), models)
  assert.deepEqual(await host.llm.discoverModels('llm-pi-ai', {}), [])
  assert.equal(fetch.mock.callCount(), 0)
})

test('catalog failure leaves native discovery intact and the next request retries', async (t) => {
  let attempts = 0
  t.mock.method(globalThis, 'fetch', async () => ++attempts === 1 ? new Response('', { status: 503 }) : reply())
  const host = context()
  t.after(host.dispose)
  assert.deepEqual(await host.llm.discoverModels('llm-pi-ai', {}), [{ id: 'claude-test' }])
  assert.match(host.warnings.join('\n'), /catalog unavailable/)
  assert.equal((await host.llm.discoverModels('llm-pi-ai', {}))[0]?.maxTokens, 64000)
  assert.equal(attempts, 2)
})

test('caller abort rejects while enrichment is waiting, without a fallback result', async (t) => {
  let started!: () => void
  const ready = new Promise<void>(resolve => { started = resolve })
  t.mock.method(globalThis, 'fetch', (_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    started()
  }))
  const host = context()
  t.after(host.dispose)
  const controller = new AbortController()
  const request = host.llm.discoverModels('llm-pi-ai', {}, controller.signal)
  const rejected = assert.rejects(request)
  await ready
  controller.abort()
  await rejected
  assert.deepEqual(host.warnings, [])
})

test('disposal restores exact methods and does not clobber a later wrapper', async () => {
  const settings: Settings = { get: () => ({}), mutate: async () => {} }
  const mutate = settings.mutate
  const host = context({ settings, web: true })
  assert.equal(host.routes.size, 2)
  host.dispose()
  assert.equal(host.llm.discoverModels, host.original)
  assert.equal(settings.mutate, mutate)
  assert.equal(host.routes.size, 0)

  const second = context()
  const wrapped = second.llm.discoverModels
  const later: Discover = (...args) => wrapped(...args)
  second.llm.discoverModels = later
  second.dispose()
  assert.equal(second.llm.discoverModels, later)
  assert.deepEqual(await later('llm-pi-ai', {}), [{ id: 'claude-test' }])
})

test('model writes preserve order, revision arguments and recovery after a rejected write', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => reply())
  const writes: { ops: readonly PathOp[]; revision?: number }[] = []
  const failure = new Error('conflict')
  const settings: Settings = {
    get: () => ({ providers: { relay: { api: 'anthropic-messages' } } }),
    async mutate(_ns, ops, revision) {
      assert.equal(this, settings)
      writes.push({ ops, revision })
      if (revision === 1) throw failure
    },
  }
  const host = context({ settings })
  t.after(host.dispose)
  const models: PathOp[] = [{ op: 'set', path: ['providers', 'relay', 'models'], value: [{ id: 'claude-test' }] }]
  const first = assert.rejects(settings.mutate('llm-pi-ai', models, 1), error => error === failure)
  const second = settings.mutate('llm-pi-ai', [{ op: 'unset', path: ['providers', 'relay'] }], 2)
  await Promise.all([first, second])
  assert.deepEqual(writes.map(write => write.revision), [1, 2])
  assert.deepEqual((writes[0]!.ops[0]!.value as Record<string, unknown>[])[0]?.input, ['text', 'image'])
  assert.deepEqual(models[0]!.value, [{ id: 'claude-test' }])
})

test('disposal rejects enrichment and queued writes before they reach settings', async (t) => {
  let started!: () => void
  const ready = new Promise<void>(resolve => { started = resolve })
  t.mock.method(globalThis, 'fetch', (_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    started()
  }))
  let written = 0
  const settings: Settings = { get: () => ({}), mutate: async () => { written++ } }
  const host = context({ settings })
  const first = assert.rejects(settings.mutate('llm-pi-ai', [
    { op: 'set', path: ['providers', 'relay', 'models'], value: [{ id: 'claude-test' }] },
  ]))
  const second = assert.rejects(settings.mutate('llm-pi-ai', [
    { op: 'unset', path: ['providers', 'relay'] },
  ]))
  await ready
  host.dispose()
  await Promise.all([first, second])
  assert.equal(written, 0)
})

test('non-model edits and other namespaces skip catalog fetching', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => reply())
  const ops: PathOp[] = [{ op: 'set', path: ['providers', 'relay', 'baseURL'], value: 'https://relay.test' }]
  const settings: Settings = { get: () => ({}), mutate: async (_ns, actual) => { assert.equal(actual, ops) } }
  const host = context({ settings })
  t.after(host.dispose)
  await settings.mutate('llm-pi-ai', ops)
  await settings.mutate('llm-other', ops)
  assert.equal(fetch.mock.callCount(), 0)
})

test('web routes validate alias JSON, content type and body size, and unregister on disposal', async (t) => {
  resetAliases()
  t.after(resetAliases)
  const realFetch = globalThis.fetch
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => String(input).startsWith('https://pi.dev/') ? reply() : realFetch(input, init))
  const host = context({ web: true })
  t.after(host.dispose)
  const server = createServer((req, res) => {
    const route = host.routes.get(req.url ?? '')
    if (route === undefined) { res.writeHead(404); res.end(); return }
    void route(req, res)
  })
  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve) })
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${String(address.port)}/dsh-relay-models`
  const post = (body: unknown) => fetch(`${base}/alias`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  assert.equal((await fetch(`${base}/catalog`, { method: 'POST' })).status, 405)
  assert.equal((await fetch(`${base}/alias`)).status, 405)
  assert.equal((await fetch(`${base}/alias`, { method: 'POST', body: '{}' })).status, 415)
  assert.equal((await post({ id: 'relay-model', catalogId: 42 })).status, 400)
  assert.equal((await post({ id: 'relay-model', catalogId: 'absent' })).status, 400)
  assert.equal((await post({ id: 'a'.repeat(4097) })).status, 400)
  assert.equal((await post({ id: 'relay-model', catalogId: 'claude-test' })).status, 204)
  const body = await (await fetch(`${base}/catalog`)).json() as { aliases: Record<string, string> }
  assert.deepEqual(body.aliases, { 'relay-model': 'claude-test' })
})
