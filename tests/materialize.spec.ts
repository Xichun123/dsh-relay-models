import { describe, expect, it } from 'vitest'
import { buildRelayProvider, materializeModels } from '../src/materialize.ts'
import { OFFICIAL_MODELS } from '../src/shared/catalog.generated.ts'
import type { OfficialModelSummary, RelayProviderConfig } from '../src/shared/types.ts'

function config(): RelayProviderConfig {
  const openai = OFFICIAL_MODELS.find(model => model.provider === 'openai' && model.api === 'openai-responses')!
  const anthropic = OFFICIAL_MODELS.find(model => model.provider === 'anthropic' && model.api === 'anthropic-messages')!
  return {
    displayName: 'Relay',
    baseURL: 'https://relay.test/v1',
    apiKeyEnv: 'RELAY_API_KEY',
    fallbackProtocol: 'openai-completions',
    modelIds: [openai.id, 'claude-alias', 'fallback'],
    modelMappings: { 'claude-alias': { provider: anthropic.provider, id: anthropic.id } },
    protocolOverrides: {},
    excludedModels: [],
  }
}

describe('relay provider materialization', () => {
  it('builds one provider with model-specific protocols and endpoints', () => {
    const models = materializeModels('relay-test', config(), OFFICIAL_MODELS)
    expect(models.map(model => model.api)).toEqual(['openai-responses', 'anthropic-messages', 'openai-completions'])
    expect(models[1]?.baseUrl).toBe('https://relay.test')
    expect(models[2]?.baseUrl).toBe('https://relay.test/v1')
    expect(models.every(model => model.provider === 'relay-test')).toBe(true)

    const provider = buildRelayProvider('relay-test', config(), OFFICIAL_MODELS)
    expect(provider.getModels().map(model => model.id)).toEqual(models.map(model => model.id))
  })

  it('removes excluded models before registration', () => {
    const next = config()
    next.excludedModels = ['fallback']
    expect(materializeModels('relay-test', next, OFFICIAL_MODELS).some(model => model.id === 'fallback')).toBe(false)
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
})
