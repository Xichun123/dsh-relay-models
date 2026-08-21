import { describe, expect, it } from 'vitest'
import {
  assertSafeHeaders,
  assertUnreservedProviderId,
  baseURLForProtocol,
  inferProtocol,
  modelsEndpoints,
  parseHeaderLines,
  parseModelIds,
  relayCredentialRef,
  relayModelStatuses,
  suggestOfficialCandidates,
  updateExcludedModels,
  validateProviderId,
} from '../src/shared/core.ts'
import type { OfficialModelSummary, RelayProviderConfig } from '../src/shared/types.ts'

const cost = { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0 }
const catalog: OfficialModelSummary[] = [
  { provider: 'openai', id: 'gpt-5.4', name: 'GPT-5.4', api: 'openai-responses', contextWindow: 1_000_000, maxTokens: 128_000, reasoning: true, input: ['text', 'image'], cost },
  { provider: 'anthropic', id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', api: 'anthropic-messages', contextWindow: 200_000, maxTokens: 64_000, reasoning: true, input: ['text', 'image'], cost },
  { provider: 'amazon-bedrock', id: 'bedrock-only', name: 'Bedrock only', api: 'bedrock-converse-stream', contextWindow: 128_000, maxTokens: 8_192, reasoning: false, input: ['text'], cost },
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
    headers: {},
    streamIdleTimeoutMs: 300_000,
    ...overrides,
  }
}

describe('relay core', () => {
  it('normalizes provider ids and protocol base URLs', () => {
    expect(validateProviderId('relay-example')).toBe('relay-example')
    expect(relayCredentialRef('relay-example')).toBe('RELAY_EXAMPLE_API_KEY')
    expect(() => validateProviderId('Relay Example')).toThrow(/Provider ID/)
    expect(() => assertUnreservedProviderId('openai')).toThrow(/reserved/)
    expect(assertUnreservedProviderId('relay-example')).toBe('relay-example')
    expect(baseURLForProtocol('https://relay.test/v1/', 'anthropic-messages')).toBe('https://relay.test')
    expect(baseURLForProtocol('https://relay.test/v1/', 'openai-responses')).toBe('https://relay.test/v1')
    expect(baseURLForProtocol('https://relay.test/v1/', 'openai-codex-responses')).toBe('https://relay.test/backend-api')
    expect(baseURLForProtocol('https://relay.test/backend-api', 'openai-codex-responses')).toBe('https://relay.test/backend-api')
    expect(baseURLForProtocol('https://relay.test/backend-api/codex/responses', 'openai-codex-responses')).toBe('https://relay.test/backend-api/codex/responses')
  })

  it('rejects credential-bearing extra headers', () => {
    expect(() => assertSafeHeaders({ Authorization: 'Bearer secret' })).toThrow(/credentials/)
    expect(parseHeaderLines('X-Custom: yes\nX-Trace=abc')).toEqual({ 'X-Custom': 'yes', 'X-Trace': 'abc' })
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
      { id: 'gpt-5.4', protocol: 'openai-responses', officialApi: 'openai-responses', supported: true, excluded: false, metadataSource: { provider: 'openai', id: 'gpt-5.4' }, candidates: [] },
      { id: 'claude-alias', protocol: 'openai-completions', officialApi: 'anthropic-messages', supported: true, excluded: false, metadataSource: { provider: 'anthropic', id: 'claude-sonnet-4-6' }, candidates: [] },
      expect.objectContaining({ id: 'unknown', protocol: 'openai-completions', supported: true, excluded: true }),
    ])
  })

  it('suggests close official candidates and updates exclusions', () => {
    expect(suggestOfficialCandidates('claude-sonnet-4.6', catalog)[0]).toMatchObject({ provider: 'anthropic', id: 'claude-sonnet-4-6' })
    expect(updateExcludedModels(['a'], ['b'], true)).toEqual(['a', 'b'])
    expect(updateExcludedModels(['a', 'b'], ['a'], false)).toEqual(['b'])
    expect(inferProtocol(undefined, 'openai-completions')).toBe('openai-completions')
    expect(inferProtocol({
      provider: 'openai-codex', id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', api: 'openai-codex-responses',
      contextWindow: 272_000, maxTokens: 128_000, reasoning: true, input: ['text', 'image'], cost,
    }, 'openai-completions')).toBe('openai-codex-responses')
    expect(relayModelStatuses(config({ modelIds: ['bedrock-only'] }), catalog)[0]).toMatchObject({
      id: 'bedrock-only', officialApi: 'bedrock-converse-stream', supported: false,
    })
  })
})
