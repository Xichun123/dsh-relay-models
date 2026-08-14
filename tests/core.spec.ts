import { describe, expect, it } from 'vitest'
import {
  baseURLForProtocol,
  inferProtocol,
  modelsEndpoints,
  parseModelIds,
  relayCredentialRef,
  relayModelStatuses,
  suggestOfficialCandidates,
  updateExcludedModels,
  validateProviderId,
} from '../src/shared/core.ts'
import type { OfficialModelSummary, RelayProviderConfig } from '../src/shared/types.ts'

const catalog: OfficialModelSummary[] = [
  { provider: 'openai', id: 'gpt-5.4', name: 'GPT-5.4', api: 'openai-responses', contextWindow: 1_000_000, maxTokens: 128_000, reasoning: true, input: ['text', 'image'] },
  { provider: 'anthropic', id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', api: 'anthropic-messages', contextWindow: 200_000, maxTokens: 64_000, reasoning: true, input: ['text', 'image'] },
]

function config(overrides: Partial<RelayProviderConfig> = {}): RelayProviderConfig {
  return {
    displayName: 'Relay',
    baseURL: 'https://relay.test/v1',
    apiKeyEnv: 'RELAY_API_KEY',
    fallbackProtocol: 'openai-completions',
    modelIds: ['gpt-5.4', 'claude-alias', 'unknown'],
    modelMappings: { 'claude-alias': { provider: 'anthropic', id: 'claude-sonnet-4-6' } },
    protocolOverrides: {},
    excludedModels: [],
    ...overrides,
  }
}

describe('relay core', () => {
  it('normalizes provider ids and protocol base URLs', () => {
    expect(validateProviderId('relay-example')).toBe('relay-example')
    expect(relayCredentialRef('relay-example')).toBe('RELAY_EXAMPLE_API_KEY')
    expect(() => validateProviderId('Relay Example')).toThrow(/Provider ID/)
    expect(baseURLForProtocol('https://relay.test/v1/', 'anthropic-messages')).toBe('https://relay.test')
    expect(baseURLForProtocol('https://relay.test/v1/', 'openai-responses')).toBe('https://relay.test/v1')
  })

  it('discovers common model-list shapes and endpoint fallbacks', () => {
    expect(parseModelIds({ data: [{ id: 'a' }, { id: 'a' }, { id: 'b' }] })).toEqual(['a', 'b'])
    expect(parseModelIds({ models: ['x', 'y'] })).toEqual(['x', 'y'])
    expect(modelsEndpoints('https://relay.test')).toEqual(['https://relay.test/models', 'https://relay.test/v1/models'])
    expect(modelsEndpoints('https://relay.test/v1')).toEqual(['https://relay.test/v1/models'])
  })

  it('matches metadata, applies mappings, overrides, and exclusions', () => {
    const statuses = relayModelStatuses(config({
      protocolOverrides: { 'claude-alias': 'openai-completions' },
      excludedModels: ['unknown'],
    }), catalog)
    expect(statuses).toEqual([
      { id: 'gpt-5.4', protocol: 'openai-responses', excluded: false, metadataSource: { provider: 'openai', id: 'gpt-5.4' }, candidates: [] },
      { id: 'claude-alias', protocol: 'openai-completions', excluded: false, metadataSource: { provider: 'anthropic', id: 'claude-sonnet-4-6' }, candidates: [] },
      expect.objectContaining({ id: 'unknown', protocol: 'openai-completions', excluded: true }),
    ])
  })

  it('suggests close official candidates and updates exclusions', () => {
    expect(suggestOfficialCandidates('claude-sonnet-4.6', catalog)[0]).toMatchObject({ provider: 'anthropic', id: 'claude-sonnet-4-6' })
    expect(updateExcludedModels(['a'], ['b'], true)).toEqual(['a', 'b'])
    expect(updateExcludedModels(['a', 'b'], ['a'], false)).toEqual(['b'])
    expect(inferProtocol(undefined, 'openai-completions')).toBe('openai-completions')
  })
})
