import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Effect } from 'effect'
import { createCatalog, indexCatalog } from './catalog.ts'

const catalog = { openai: { 'test-model': { id: 'test-model', name: 'Test', input: ['text'], contextWindow: 1000 } } }
const reply = (): Response => Response.json(catalog)

test('catalog success is cached per instance and concurrent readers share one fetch', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => reply())
  const cache = createCatalog()
  t.after(cache.dispose)
  const [first, second] = await Promise.all([Effect.runPromise(cache.load), Effect.runPromise(cache.load)])
  assert.equal(first, second)
  assert.equal(await Effect.runPromise(cache.load), first)
  assert.equal(fetch.mock.callCount(), 1)
  const other = createCatalog()
  t.after(other.dispose)
  await Effect.runPromise(other.load)
  assert.equal(fetch.mock.callCount(), 2)
})

test('failed downloads are not cached', async (t) => {
  let attempt = 0
  t.mock.method(globalThis, 'fetch', async () => ++attempt === 1 ? new Response('', { status: 503 }) : reply())
  const cache = createCatalog()
  t.after(cache.dispose)
  await assert.rejects(Effect.runPromise(cache.load), /HTTP 503/)
  assert.ok((await Effect.runPromise(cache.load)).has('test-model'))
  assert.equal(attempt, 2)
})

test('cancelling one caller leaves the shared download and other readers alive', async (t) => {
  let resolve!: (response: Response) => void
  let signal: AbortSignal | null | undefined
  let started!: () => void
  const ready = new Promise<void>(done => { started = done })
  t.mock.method(globalThis, 'fetch', (_input: string | URL | Request, init?: RequestInit) => {
    signal = init?.signal
    started()
    return new Promise<Response>(done => { resolve = done })
  })
  const cache = createCatalog()
  t.after(cache.dispose)
  const controller = new AbortController()
  const first = Effect.runPromise(cache.load, { signal: controller.signal })
  const rejected = assert.rejects(first)
  const second = Effect.runPromise(cache.load)
  await ready
  controller.abort()
  await rejected
  assert.equal(signal?.aborted, false)
  resolve(reply())
  assert.ok((await second).has('test-model'))
})

test('disposal aborts in-flight downloads and prevents another fetch', async (t) => {
  let signal: AbortSignal | null | undefined
  let started!: () => void
  const ready = new Promise<void>(done => { started = done })
  const fetch = t.mock.method(globalThis, 'fetch', (_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    signal = init?.signal
    signal?.addEventListener('abort', () => reject(signal?.reason), { once: true })
    started()
  }))
  const cache = createCatalog()
  const rejected = assert.rejects(Effect.runPromise(cache.load))
  await ready
  cache.dispose()
  await rejected
  assert.equal(signal?.aborted, true)
  await assert.rejects(Effect.runPromise(cache.load), /disposed/)
  assert.equal(fetch.mock.callCount(), 1)
})

test('timeout aborts an unresponsive fetch', async (t) => {
  let signal: AbortSignal | null | undefined
  t.mock.method(globalThis, 'fetch', (_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    signal = init?.signal
    signal?.addEventListener('abort', () => reject(signal?.reason), { once: true })
  }))
  const cache = createCatalog({ timeoutMs: 20 })
  t.after(cache.dispose)
  await assert.rejects(Effect.runPromise(cache.load), /timed out/)
  assert.equal(signal?.aborted, true)
})

test('oversized streaming bodies are cancelled before reading the rest', async (t) => {
  let cancelled = false
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array(4 * 1024 * 1024 + 1)) },
    cancel() { cancelled = true },
  }, { highWaterMark: 0 })
  t.mock.method(globalThis, 'fetch', async () => new Response(stream))
  const cache = createCatalog()
  t.after(cache.dispose)
  await assert.rejects(Effect.runPromise(cache.load), /response too large/)
  assert.equal(cancelled, true)
  assert.equal(stream.locked, false)
})

test('declared oversize and malformed JSON fail without caching', async (t) => {
  const responses = [
    new Response('{}', { headers: { 'content-length': String(9 * 1024 * 1024) } }),
    new Response('<html>'),
    Response.json([]),
    reply(),
  ]
  t.mock.method(globalThis, 'fetch', async () => responses.shift()!)
  const cache = createCatalog()
  t.after(cache.dispose)
  await assert.rejects(Effect.runPromise(cache.load), /too large/)
  await assert.rejects(Effect.runPromise(cache.load))
  await assert.rejects(Effect.runPromise(cache.load), /provider map/)
  assert.ok((await Effect.runPromise(cache.load)).has('test-model'))
})

test('catalog rows do not trust malformed or unknown external fields', () => {
  const index = indexCatalog({ openai: {
    valid: { name: 'Valid', input: ['text', 'image'], reasoning: true, unknown: 'discard' },
    badName: { name: {} },
    badReasoning: { reasoning: 'yes' },
    badCapacity: { maxTokens: -1 },
    badInput: { input: 'image' },
    badMap: { reasoning: true, thinkingLevelMap: { high: {} } },
    badCompat: { compat: [] },
    nonJsonCompat: { compat: { value: Infinity } },
    unsafeCompat: { compat: JSON.parse('{"__proto__":{"polluted":true}}') },
    unsafeNestedCompat: { compat: JSON.parse('{"futureField":{"constructor":{}}}') },
  } })
  assert.deepEqual([...index.keys()], ['valid'])
  assert.deepEqual(index.get('valid'), [{ id: 'valid', name: 'Valid', input: ['text', 'image'], reasoning: true }])
})

test('compat vocabulary and values are retained for the live Host to validate, not frozen at download', () => {
  const compat = {
    futureFlag: true, futureList: ['a', 'b'], futureOptions: { mode: 'new' },
    supportsStrictMode: 'invalid-for-current-host',
  }
  const index = indexCatalog({ openai: { model: { compat } } })
  assert.deepEqual(index.get('model')?.[0]?.compat, compat)
  assert.notEqual(index.get('model')?.[0]?.compat, compat)
  compat.futureOptions.mode = 'changed'
  assert.deepEqual(index.get('model')?.[0]?.compat?.futureOptions, { mode: 'new' })
})
