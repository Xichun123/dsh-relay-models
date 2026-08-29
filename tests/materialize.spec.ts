import { describe, expect, it } from 'vitest'
import { DEFAULT_CONTEXT_WINDOW, DEFAULT_MAX_TOKENS } from '../src/shared/core.ts'
import { buildRelayProvider, materializeModels } from '../src/materialize.ts'
import { BUNDLED_MODELS } from '../src/catalog.ts'
import type { OfficialModelSummary, RelayProviderConfig } from '../src/shared/types.ts'

function config(): RelayProviderConfig {
  const openai = BUNDLED_MODELS.find(model => model.provider === 'openai' && model.api === 'openai-responses')!
  const anthropic = BUNDLED_MODELS.find(model => model.provider === 'anthropic' && model.api === 'anthropic-messages')!
  return {
    displayName: 'Relay',
    baseURL: 'https://relay.test/v1',
    apiKeyEnv: 'RELAY_API_KEY',
    fallbackProtocol: 'openai-completions',
    modelIds: [openai.id, 'claude-alias', 'fallback'],
    modelMappings: { 'claude-alias': { provider: anthropic.provider, id: anthropic.id } },
    protocolOverrides: {},
    excludedModels: [],
    headers: {},
    streamIdleTimeoutMs: 300_000,
  }
}

describe('relay provider materialization', () => {
  it('builds one provider with model-specific protocols and endpoints', () => {
    const models = materializeModels('relay-test', config(), BUNDLED_MODELS)
    expect(models.map(model => model.api)).toEqual(['openai-responses', 'anthropic-messages', 'openai-completions'])
    expect(models[1]?.baseUrl).toBe('https://relay.test')
    expect(models[2]?.baseUrl).toBe('https://relay.test/v1')
    expect(models[2]).toMatchObject({ contextWindow: DEFAULT_CONTEXT_WINDOW, maxTokens: DEFAULT_MAX_TOKENS })
    expect(models.every(model => model.provider === 'relay-test')).toBe(true)
    expect(models.every(model => model.headers === undefined)).toBe(true)

    const provider = buildRelayProvider('relay-test', config(), BUNDLED_MODELS, () => undefined)
    expect(provider.getModels().map(model => model.id)).toEqual(models.map(model => model.id))
  })

  it('removes excluded models before registration', () => {
    const next = config()
    next.excludedModels = ['fallback']
    expect(materializeModels('relay-test', next, BUNDLED_MODELS).some(model => model.id === 'fallback')).toBe(false)
  })

  it('materializes remote-only metadata and requires overrides for unsupported APIs', () => {
    const cost = { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0 }
    const catalog: OfficialModelSummary[] = [
      { provider: 'openai', id: 'future-model', name: 'Future Model', api: 'openai-responses', contextWindow: 500_000, maxTokens: 100_000, reasoning: true, input: ['text'], cost },
      { provider: 'amazon-bedrock', id: 'bedrock-only', name: 'Bedrock only', api: 'bedrock-converse-stream', contextWindow: 128_000, maxTokens: 8_192, reasoning: false, input: ['text'], cost },
    ]
    const next = { ...config(), modelIds: ['future-model', 'bedrock-only'], modelMappings: {} }
    expect(materializeModels('relay-test', next, catalog)).toMatchObject([
      { id: 'future-model', name: 'Future Model', contextWindow: 500_000, api: 'openai-responses' },
    ])
    next.protocolOverrides = { 'bedrock-only': 'openai-completions' }
    expect(materializeModels('relay-test', next, catalog).map(model => model.id)).toEqual(['future-model', 'bedrock-only'])
  })

  it('keeps Codex catalog matches on openai-codex-responses and rewrites /v1 to /backend-api', () => {
    const codex = BUNDLED_MODELS.find(model => model.provider === 'openai-codex' && model.api === 'openai-codex-responses')
    expect(codex).toBeDefined()
    const next = {
      ...config(),
      modelIds: [codex!.id],
      modelMappings: { [codex!.id]: { provider: 'openai-codex', id: codex!.id } },
    }
    const [model] = materializeModels('relay-test', next, BUNDLED_MODELS)
    expect(model).toMatchObject({
      id: codex!.id,
      api: 'openai-codex-responses',
      baseUrl: 'https://relay.test/backend-api',
    })
    expect(buildRelayProvider('relay-test', next, BUNDLED_MODELS, () => undefined).getModels()[0]?.api).toBe('openai-codex-responses')
  })

  it('drops the official compat switches when an override repoints the protocol', () => {
    const source = BUNDLED_MODELS.find(model => model.api === 'anthropic-messages' && model.compat)
    expect(source).toBeDefined()
    const mapped = { ...config(), modelIds: [source!.id], modelMappings: {}, protocolOverrides: {} }
    // Serving the model on the protocol it was published for keeps them.
    expect(materializeModels('relay-test', mapped, BUNDLED_MODELS)[0]?.compat).toEqual(source!.compat)
    // pi-ai types compat per api, so a repointed model starts from pi-ai's own
    // baseURL detection instead of another protocol's switches.
    const repointed = { ...mapped, protocolOverrides: { [source!.id]: 'openai-completions' as const } }
    const [model] = materializeModels('relay-test', repointed, BUNDLED_MODELS)
    expect(model?.api).toBe('openai-completions')
    expect(model && 'compat' in model).toBe(false)
  })

  it('names the remote id beside the official name only when the two differ', () => {
    const anthropic = BUNDLED_MODELS.find(model => model.provider === 'anthropic' && model.api === 'anthropic-messages')!
    const direct = { ...config(), modelIds: [anthropic.id], modelMappings: {} }
    expect(materializeModels('relay-test', direct, BUNDLED_MODELS)[0]?.name).toBe(anthropic.name)
    const aliased = {
      ...config(),
      modelIds: ['claude-alias'],
      modelMappings: { 'claude-alias': { provider: anthropic.provider, id: anthropic.id } },
    }
    expect(materializeModels('relay-test', aliased, BUNDLED_MODELS)[0]?.name)
      .toBe(`${anthropic.name} (claude-alias)`)
  })
})
