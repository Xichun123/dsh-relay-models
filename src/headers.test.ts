import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createUserAgentRewrite, userAgentTarget } from './headers.ts'

const section = { providers: {
  a: { baseURL: 'https://relay.test/v1/', headers: { 'User-Agent': 'client-a/1', 'x-tenant': 'native-only' } },
  b: { baseURL: 'https://relay.test/v1', headers: { 'USER-AGENT': 'client-b/2' } },
} }
const target = userAgentTarget(section, 'a')

test('UA is opt-in, route-selected and bounded by an explicit HTTP endpoint', () => {
  assert.equal(target?.userAgent, 'client-a/1')
  assert.equal(userAgentTarget(section, 'b')?.userAgent, 'client-b/2')
  assert.equal(userAgentTarget(section, 'missing'), undefined)
  assert.equal(userAgentTarget(undefined, 'a'), undefined)
  assert.equal(userAgentTarget(section, undefined), undefined)
  assert.equal(userAgentTarget({ providers: { a: { headers: { 'user-agent': 'x' } } } }, 'a'), undefined)
  assert.equal(userAgentTarget(section, 'a', 'file:///v1'), undefined)
  assert.equal(userAgentTarget(section, 'a', 'not a URL'), undefined)
  assert.equal(userAgentTarget(section, 'a', 'https://edited.test/api')?.base.origin, 'https://edited.test')
  assert.throws(() => userAgentTarget({ providers: { a: { ...section.providers.a,
    headers: { 'User-Agent': 'a', 'user-agent': 'b' },
  } } }, 'a'), /only once/)
})

test('fetch rewrites only UA, preserving Fetch Request/init precedence, body and cancellation', async (t) => {
  const calls: { input: string | URL | Request; init?: RequestInit }[] = []
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ input, init })
    return new Response('ok')
  })
  const original = globalThis.fetch
  const rewrite = createUserAgentRewrite()
  const dispose = rewrite.install()
  t.after(dispose)
  const controller = new AbortController()
  const body = '{"model":"test"}'
  const init: RequestInit = {
    method: 'POST', body, signal: controller.signal,
    headers: { 'User-Agent': 'dsh/1', authorization: 'Bearer test', 'content-type': 'application/json' },
  }
  for (const input of ['https://relay.test/v1/responses', new URL('https://relay.test/v1/chat/completions'),
    new Request('https://relay.test/v1/messages')]) {
    await rewrite.run(target, () => fetch(input, init))
    const sent = calls.at(-1)!
    assert.equal(sent.input, input)
    assert.equal(sent.init?.body, body)
    assert.equal(sent.init?.signal, controller.signal)
    const headers = new Headers(sent.init?.headers)
    assert.equal(headers.get('user-agent'), 'client-a/1')
    assert.equal(headers.get('authorization'), 'Bearer test')
    assert.equal(headers.get('x-tenant'), null, 'ordinary headers remain adapter-owned')
    assert.equal(new Headers(init.headers).get('user-agent'), 'dsh/1', 'caller input is not mutated')
  }
  const request = new Request('https://relay.test/v1/models', {
    headers: { authorization: 'Bearer request', 'user-agent': 'request-UA' },
  })
  await rewrite.run(target, () => fetch(request))
  assert.equal(new Headers(calls.at(-1)?.init?.headers).get('authorization'), 'Bearer request')
  await rewrite.run(target, () => fetch(request, { headers: {} }))
  assert.equal(new Headers(calls.at(-1)?.init?.headers).get('authorization'), null, 'do not resurrect removed credentials')
  for (const url of ['https://relay.test/v10/responses', 'https://relay.test.evil/v1/models',
    'http://relay.test/v1/models', 'https://relay.test:8443/v1/models', 'https://relay.test/oauth/token',
    'https://pi.dev/api/models']) {
    await rewrite.run(target, () => fetch(url, init))
    assert.equal(calls.at(-1)?.init, init)
  }
  await fetch('https://relay.test/v1/models', init)
  assert.equal(calls.at(-1)?.init, init, 'unscoped requests to the same URL are untouched')
  const wrapped = globalThis.fetch
  globalThis.fetch = (input, init) => wrapped(input, init)
  const later = globalThis.fetch
  dispose()
  assert.equal(globalThis.fetch, later, 'do not clobber another plugin')
  await rewrite.run(target, () => fetch('https://relay.test/v1/models', init))
  assert.equal(calls.at(-1)?.init, init, 'a chained wrapper becomes inert on unload')
  globalThis.fetch = original
})

test('lazy stream reads, concurrent same-URL providers and iterator cleanup keep their own UA', async (t) => {
  const seen: string[] = []
  t.mock.method(globalThis, 'fetch', async (_input: string | URL | Request, init?: RequestInit) => {
    seen.push(new Headers(init?.headers).get('user-agent') ?? 'none')
    return new Response('ok')
  })
  const rewrite = createUserAgentRewrite()
  const original = globalThis.fetch
  const dispose = rewrite.install()
  t.after(dispose)
  const probe = () => fetch('https://relay.test/v1/responses', { headers: { 'user-agent': 'dsh/1' } })
  const make = (provider: string) => rewrite.stream(userAgentTarget(section, provider), () => ({
    async *[Symbol.asyncIterator]() {
      try {
        await Promise.resolve()
        await probe()
        yield 1
        await probe()
        yield 2
      } finally { await probe() }
    },
  }))[Symbol.asyncIterator]()
  const a = make('a')
  const b = make('b')
  const plain = make('missing')
  await Promise.all([a.next(), b.next(), plain.next()])
  assert.deepEqual(seen, ['client-a/1', 'client-b/2', 'dsh/1'])
  await a.next()
  await a.return?.()
  await assert.rejects(b.throw!(new Error('stop')), /stop/)
  await plain.return?.()
  assert.deepEqual(seen.slice(3), ['client-a/1', 'client-a/1', 'client-b/2', 'dsh/1'])
  await rewrite.run(target, async () => {
    const unset = make('missing')
    await unset.next()
    await unset.return?.()
  })
  assert.deepEqual(seen.slice(-2), ['dsh/1', 'dsh/1'], 'nested unconfigured provider clears ambient UA')
  dispose()
  assert.equal(globalThis.fetch, original)
})
