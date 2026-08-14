import { describe, expect, it } from 'vitest'
import { buildRelayProvider, materializeModels, OFFICIAL_SUMMARIES } from '../src/materialize.ts'
import type { RelayProviderConfig } from '../src/shared/types.ts'

function config(): RelayProviderConfig {
  const openai = OFFICIAL_SUMMARIES.find(model => model.provider === 'openai' && model.api === 'openai-responses')!
  const anthropic = OFFICIAL_SUMMARIES.find(model => model.provider === 'anthropic' && model.api === 'anthropic-messages')!
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
    const models = materializeModels('relay-test', config())
    expect(models.map(model => model.api)).toEqual(['openai-responses', 'anthropic-messages', 'openai-completions'])
    expect(models[1]?.baseUrl).toBe('https://relay.test')
    expect(models[2]?.baseUrl).toBe('https://relay.test/v1')
    expect(models.every(model => model.provider === 'relay-test')).toBe(true)

    const provider = buildRelayProvider('relay-test', config())
    expect(provider.getModels().map(model => model.id)).toEqual(models.map(model => model.id))
  })

  it('removes excluded models before registration', () => {
    const next = config()
    next.excludedModels = ['fallback']
    expect(materializeModels('relay-test', next).some(model => model.id === 'fallback')).toBe(false)
  })
})
