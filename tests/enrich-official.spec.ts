import { describe, expect, it } from 'vitest'
import { BUNDLED_MODELS } from '../src/catalog.ts'
import {
  OPENAI_COMPLETIONS_GATEWAY_COMPAT,
  enrichOfficialProviders,
  matchOfficialForGateway,
} from '../src/enrich-official.ts'

describe('matchOfficialForGateway', () => {
  it('matches a vendor-prefixed id without confusing gpt-4 with gpt-4o', () => {
    const openai = BUNDLED_MODELS.find(model => model.provider === 'openai' && model.api === 'openai-responses')
    expect(openai).toBeDefined()
    const hit = matchOfficialForGateway(`openai/${openai!.id}`, BUNDLED_MODELS, 'openai-responses')
    expect(hit).toMatchObject({ provider: openai!.provider, id: openai!.id })
    expect(matchOfficialForGateway('gpt-4', BUNDLED_MODELS.filter(model => model.id.includes('gpt-4o')), 'openai-responses'))
      .toBeUndefined()
  })
})

describe('enrichOfficialProviders', () => {
  it('fills context, reasoning efforts, and gateway compat on a custom openai-completions route', () => {
    const source = BUNDLED_MODELS.find(model => model.reasoning && model.thinkingLevelMap && model.api === 'openai-completions')
      ?? BUNDLED_MODELS.find(model => model.reasoning && model.thinkingLevelMap)
    expect(source).toBeDefined()
    const { providers, changed, notes } = enrichOfficialProviders({
      'acme-gateway': {
        displayName: 'Acme',
        api: 'openai-completions',
        baseURL: 'https://gateway.acme.example/v1',
        models: [{ id: source!.id }],
      },
    }, BUNDLED_MODELS)
    expect(changed).toBe(true)
    const route = providers['acme-gateway']
    expect(route?.compat).toMatchObject(OPENAI_COMPLETIONS_GATEWAY_COMPAT)
    const model = route?.models?.[0]
    expect(model?.contextWindow).toBe(source!.contextWindow)
    expect(model?.reasoningEfforts === false || (model?.reasoningEfforts && Object.keys(model.reasoningEfforts).length > 0)).toBe(true)
    expect(notes.some(note => note.includes(source!.id))).toBe(true)
  })

  it('does not overwrite fields the user already set', () => {
    const source = BUNDLED_MODELS.find(model => model.contextWindow > 1000)!
    const { providers } = enrichOfficialProviders({
      'acme-gateway': {
        api: 'openai-completions',
        baseURL: 'https://gateway.acme.example/v1',
        compat: { supportsDeveloperRole: true, maxTokensField: 'max_completion_tokens', supportsStore: false },
        models: [{ id: source.id, contextWindow: 12345, reasoningEfforts: false }],
      },
    }, BUNDLED_MODELS)
    const model = providers['acme-gateway']?.models?.[0]
    expect(model?.contextWindow).toBe(12345)
    expect(model?.reasoningEfforts).toBe(false)
    expect(providers['acme-gateway']?.compat).toMatchObject({
      supportsDeveloperRole: true,
      maxTokensField: 'max_completion_tokens',
    })
  })

  it('leaves catalog routes that list no models alone', () => {
    const original = { openai: { apiKeyEnv: 'OPENAI_API_KEY' } }
    const { changed, providers } = enrichOfficialProviders(original, BUNDLED_MODELS)
    expect(changed).toBe(false)
    expect(providers).toBe(original)
  })
})
