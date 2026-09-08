import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const source = process.env.DSH_SOURCE
if (!source) throw new Error('Set DSH_SOURCE to the dsh-v0.1.3-alpha.2 source checkout')
const root = resolve(source)
if (process.env.DSH_RELAY_SMOKE_CHILD !== '1') {
  const require = createRequire(resolve(root, 'package.json'))
  const result = spawnSync(process.execPath, [
    '--import', pathToFileURL(require.resolve('tsx/esm')).href, fileURLToPath(import.meta.url),
  ], {
    cwd: root,
    env: { ...process.env, DSH_SOURCE: root, DSH_RELAY_SMOKE_CHILD: '1', TSX_DISABLE_CACHE: '1', TSX_TSCONFIG_PATH: resolve(root, 'tsconfig.base.json') },
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  process.exit(result.status ?? 1)
}

const fromSource = path => import(pathToFileURL(resolve(root, path)).href)
const { Context } = await fromSource('vendor/cordis/src/index.ts')
const { default: Llm } = await fromSource('packages/llm/llm/src/index.ts')
const { SettingsProvider } = await fromSource('packages/settings/settings/src/index.ts')
const { Config, resolveProfiles } = await fromSource('packages/llm/llm-pi-ai/src/config.ts')
const { discoverModels } = await fromSource('packages/llm/llm-pi-ai/src/discovery.ts')
const plugin = await import('../lib/index.js')

class MemorySettings extends SettingsProvider {
  doc = {}
  get writable() { return true }
  async load() { return structuredClone(this.doc) }
  async persist(ns, section) { this.doc[ns] = structuredClone(section) }
}

const nativeFetch = globalThis.fetch
const probes = []
let status = 200
let displayName = 'Native Name'
const completionsCompat = {
  thinkingTokenBudgetField: 'thinking_budget', vllmPriority: -2,
  chatTemplateKwargs: { budget: { $var: 'thinking.budget', omitWhenOff: true } },
  chatTemplateArgs: { budget: { $var: 'thinking.budget' } },
}
const responsesCompat = { supportsMaxOutputTokens: false }
const catalog = { openai: { 'compat-test': {
  id: 'compat-test', name: 'Compat Test', contextWindow: 8192, maxTokens: 64,
  compat: { ...completionsCompat, ...responsesCompat, supportsMidConvoEffort: true, allowedFallbackModels: ['other'] },
} }, anthropic: { 'relay-test': {
  id: 'relay-test', name: 'Catalog Test', provider: 'anthropic', api: 'anthropic-messages',
  contextWindow: 200000, maxTokens: 64000, input: ['text', 'image'], reasoning: true,
  compat: { supportsStrictTools: true },
} } }
globalThis.fetch = async (input, init) => {
  const url = String(input)
  if (url === 'https://pi.dev/api/models') return Response.json(catalog)
  assert.equal(url, 'https://relay.test/v1/models?limit=1000')
  probes.push(new Headers(init?.headers))
  return Response.json({ data: [{ id: 'relay-test', display_name: displayName }] }, { status })
}

const ctx = new Context()
const fibers = []
try {
  fibers.push(ctx.plugin(Llm))
  await fibers.at(-1)
  fibers.push(ctx.plugin(MemorySettings))
  await fibers.at(-1)
  fibers.push(ctx.plugin({
    name: 'relay-smoke-owner', inject: ['llm', 'settings'],
    apply(owner) {
      owner.settings.register('llm-pi-ai', Config)
      owner.llm.registerModelDiscovery('llm-pi-ai', (request, signal) => discoverModels({ ...request, signal }, () => ({
        headers: { 'x-tenant': 'smoke' }, resolveApiKey: async () => 'stored-test-key',
      })))
    },
  }))
  await fibers.at(-1)
  fibers.push(ctx.plugin(plugin))
  await fibers.at(-1)

  const draft = { provider: 'custom-relay', baseURL: 'https://relay.test/v1', api: 'anthropic-messages' }
  assert.deepEqual(await ctx.llm.discoverModels('llm-pi-ai', draft), [
    { id: 'relay-test', name: 'Native Name', contextWindow: 200000, maxTokens: 64000 },
  ])
  assert.equal(probes[0].get('x-api-key'), 'stored-test-key')
  assert.equal(probes[0].get('anthropic-version'), '2023-06-01')
  assert.equal(probes[0].get('x-tenant'), 'smoke')
  await ctx.llm.discoverModels('llm-pi-ai', { ...draft, apiKey: 'typed-test-key' })
  displayName = undefined
  assert.deepEqual(await ctx.llm.discoverModels('llm-pi-ai', draft), [
    { id: 'relay-test', name: 'Catalog Test', contextWindow: 200000, maxTokens: 64000 },
  ])
  assert.equal(probes[1].get('x-api-key'), 'typed-test-key')
  status = 401
  const count = probes.length
  await assert.rejects(ctx.llm.discoverModels('llm-pi-ai', draft), error => error.code === 'DISCOVERY_FAILED')
  assert.equal(probes.length, count + 1, 'no plugin fallback after native authentication refusal')
  status = 200

  await ctx.settings.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'relay'], value: {
    api: 'anthropic-messages', baseURL: 'https://relay.test', models: [{ id: 'relay-test', name: 'relay-test' }],
  } }], 0)
  const model = ctx.settings.get('llm-pi-ai').providers.relay.models[0]
  assert.equal(model.id, 'relay-test')
  assert.equal(model.name, 'Catalog Test')
  assert.deepEqual(model.input, ['text', 'image'])
  assert.equal(model.contextWindow, 200000)
  assert.equal(model.maxTokens, 64000)
  assert.equal(model.reasoningEfforts.high, 'high')
  assert.equal(model.compat.supportsStrictTools, true)
  await assert.rejects(ctx.settings.mutate('llm-pi-ai', [], 0), /revision|changed|conflict/i)

  for (const [api, expected] of [
    ['openai-completions', completionsCompat], ['openai-responses', responsesCompat], ['anthropic-messages', undefined],
  ]) {
    await ctx.settings.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'compat'], value: {
      api, baseURL: 'https://relay.test/v1', models: [{ id: 'compat-test' }],
    } }])
    const section = ctx.settings.get('llm-pi-ai')
    // Native schema materializes empty template dictionaries even when not configured.
    const expectedStored = Config({ providers: { compat: { models: [{ id: 'compat-test', compat: expected }] } } }).providers.compat.models[0].compat
    assert.deepEqual(section.providers.compat.models[0].compat, expectedStored, 'persist protocol-filtered alpha.2 fields')
    const resolved = resolveProfiles(section.providers).get('compat').piProvider.getModels()[0]
    assert.deepEqual(resolved.compat, expected, 'native adapter accepts and retains enriched alpha.2 fields')
  }

  await fibers.pop().dispose()
  assert.deepEqual(await ctx.llm.discoverModels('llm-pi-ai', draft), [{ id: 'relay-test', name: 'relay-test' }])
  console.log('Harness source smoke passed: native Anthropic discovery, credentials, errors, schema writes, revisions, Cordis disposal')
} finally {
  for (const fiber of fibers.reverse()) await fiber.dispose()
  globalThis.fetch = nativeFetch
}

// Real pi-ai SDKs send to a local HTTP stand-in; no real credentials or provider traffic.
const { PiAiAdapter } = await fromSource('packages/llm/llm-pi-ai/src/adapter.ts')
const { memoryAuth } = await fromSource('packages/llm/llm-pi-ai/tests/auth-double.ts')
const wireRequests = []
const server = createServer((req, res) => {
  let body = ''
  req.on('data', chunk => { body += chunk })
  req.on('end', () => {
    wireRequests.push({ path: req.url, headers: req.headers, body })
    res.writeHead(req.method === 'GET' ? 200 : 401, { 'content-type': 'application/json' })
    res.end(JSON.stringify(req.method === 'GET'
      ? { data: [{ id: 'unlisted-wire-model' }] }
      : { error: { message: 'intentional keyless wire test', type: 'authentication_error' } }))
  })
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const wire = new Context()
const wireFibers = []
let wirePlugin
try {
  wireFibers.push(wire.plugin(Llm))
  await wireFibers.at(-1)
  wireFibers.push(wire.plugin(MemorySettings))
  await wireFibers.at(-1)
  wireFibers.push(wire.plugin({
    name: 'wire-test-owner', inject: ['llm', 'settings'],
    apply(owner) {
      owner.settings.register('llm-pi-ai', Config)
      const profiles = () => resolveProfiles(owner.settings.get('llm-pi-ai').providers)
      owner.llm.registerAdapter(['a', 'b', 'chat', 'messages', 'plain'], new PiAiAdapter({
        profiles, resolveApiKey: async () => 'wire-test-key', auth: memoryAuth(),
      }))
      owner.llm.registerModelDiscovery('llm-pi-ai', (request, signal) => discoverModels({ ...request, signal }, () => ({
        headers: profiles().get(request.provider)?.headers, resolveApiKey: async () => 'wire-test-key',
      })))
    },
  }))
  await wireFibers.at(-1)
  const providers = Object.fromEntries([
    ['a', 'openai-responses'], ['b', 'openai-responses'], ['chat', 'openai-completions'],
    ['messages', 'anthropic-messages'], ['plain', 'openai-responses'],
  ].map(([provider, api]) => [provider, {
    api, baseURL: api === 'anthropic-messages' ? base : `${base}/v1`,
    headers: { 'x-tenant': provider, ...(provider === 'plain' ? {} : { 'User-Agent': `${provider}/test` }) },
    models: [{ id: 'unlisted-wire-model', input: ['text'], contextWindow: 8192, maxTokens: 64 }],
    transport: 'sse', timeoutMs: 5000,
  }]))
  await wire.settings.mutate('llm-pi-ai', [{ op: 'set', path: ['providers'], value: providers }])
  // Catalog enrichment stays offline too, while provider calls use native Node fetch.
  globalThis.fetch = (input, init) => String(input) === 'https://pi.dev/api/models'
    ? Promise.resolve(Response.json(catalog)) : nativeFetch(input, init)
  const beforePlugin = globalThis.fetch
  wirePlugin = wire.plugin(plugin)
  await wirePlugin
  const consume = async (provider, prepared = false) => {
    const config = { provider, model: 'unlisted-wire-model' }
    const call = prepared ? await wire.llm.prepareCall(config) : undefined
    const stream = call ? call.stream({ ...call.config, messages: [] }) : wire.llm.stream({ ...config, messages: [] })
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    assert.equal(chunks.at(-1)?.reason?.kind, 'error', 'preserve SDK refusal as native finish chunk')
  }
  await Promise.all([consume('a', true), consume('b'), consume('chat', true), consume('messages'), consume('plain')])
  assert.equal(wireRequests.length, 5)
  for (const sent of wireRequests) {
    const provider = sent.headers['x-tenant']
    assert.equal(JSON.parse(sent.body).model, 'unlisted-wire-model')
    if (provider === 'plain') assert.match(sent.headers['user-agent'], /^deepseek-harness\//)
    else assert.equal(sent.headers['user-agent'], `${provider}/test`)
    // SDK-owned query parameters (Anthropic's beta=true) do not change the endpoint path.
    assert.equal(new URL(sent.path, base).pathname, provider === 'chat' ? '/v1/chat/completions' : provider === 'messages' ? '/v1/messages' : '/v1/responses')
    assert.equal(sent.headers[provider === 'messages' ? 'x-api-key' : 'authorization'],
      provider === 'messages' ? 'wire-test-key' : 'Bearer wire-test-key')
  }
  const discover = provider => wire.llm.discoverModels('llm-pi-ai', {
    provider, api: providers[provider].api, baseURL: `${base}/edited/v1`,
  })
  await Promise.all([discover('a'), discover('messages')])
  for (const sent of wireRequests.slice(-2)) assert.match(sent.path, /^\/edited\/v1\/models/)
  assert.deepEqual(wireRequests.slice(-2).map(sent => sent.headers['user-agent']).sort(), ['a/test', 'messages/test'])
  await wire.settings.mutate('llm-pi-ai', [{ op: 'set', path: ['providers', 'a', 'headers', 'User-Agent'], value: 'changed/2' }])
  await consume('a', true)
  assert.equal(wireRequests.at(-1).headers['user-agent'], 'changed/2')
  await wire.settings.mutate('llm-pi-ai', [{ op: 'unset', path: ['providers', 'a', 'headers', 'User-Agent'] }])
  await consume('a')
  assert.match(wireRequests.at(-1).headers['user-agent'], /^deepseek-harness\//)
  await wirePlugin.dispose()
  assert.equal(globalThis.fetch, beforePlugin)
  await consume('b', true)
  assert.match(wireRequests.at(-1).headers['user-agent'], /^deepseek-harness\//)
  console.log('Wire smoke passed: native Responses/Completions/Anthropic, prepared/direct streams, concurrent routes, discovery draft URL, live settings and unload')
} finally {
  await wirePlugin?.dispose()
  for (const fiber of wireFibers.reverse()) await fiber.dispose()
  globalThis.fetch = nativeFetch
  server.closeAllConnections()
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
}
