import { describe, expect, it } from 'vitest'
import type { IncomingMessage } from 'node:http'
import { assertRequestOrigin, resolveDiscoveryTarget } from '../src/web-api.ts'
import type { RelayConfig } from '../src/shared/types.ts'

const config: RelayConfig = {
  providers: {
    'relay-example': {
      displayName: 'Example',
      baseURL: 'https://relay.example/v1',
      apiKeyEnv: 'RELAY_EXAMPLE_API_KEY',
      fallbackProtocol: 'openai-completions',
      modelIds: ['gpt-test'],
      modelMappings: {},
      protocolOverrides: {},
      excludedModels: [],
      headers: {},
      streamIdleTimeoutMs: 300_000,
    },
  },
}

function request(headers: Record<string, string | undefined>): IncomingMessage {
  return { headers } as IncomingMessage
}

describe('relay web API guards', () => {
  it('requires Host, and Origin on mutating requests', () => {
    expect(() => assertRequestOrigin(request({}), 'GET')).toThrow(/Host/)
    expect(() => assertRequestOrigin(request({ host: '127.0.0.1:3080' }), 'GET')).not.toThrow()
    expect(() => assertRequestOrigin(request({ host: '127.0.0.1:3080' }), 'POST')).toThrow(/Origin/)
    expect(() => assertRequestOrigin(request({
      host: '127.0.0.1:3080',
      origin: 'https://evil.example',
    }), 'POST')).toThrow(/Cross-origin/)
    expect(() => assertRequestOrigin(request({
      host: '127.0.0.1:3080',
      origin: 'http://127.0.0.1:3080',
    }), 'POST')).not.toThrow()
  })

  it('discovers existing providers only at the stored Base URL', () => {
    expect(resolveDiscoveryTarget({
      provider: 'relay-example',
      baseURL: 'http://169.254.169.254/',
      protocol: 'openai-completions',
    }, config)).toEqual({
      providerId: 'relay-example',
      baseURL: 'https://relay.example/v1',
      protocol: 'openai-completions',
      useStoredKey: true,
    })
    expect(resolveDiscoveryTarget({
      baseURL: 'https://new.example/v1',
      protocol: 'anthropic-messages',
      apiKey: 'typed',
    }, config)).toEqual({
      baseURL: 'https://new.example/v1',
      protocol: 'anthropic-messages',
      apiKey: 'typed',
      useStoredKey: false,
    })
    expect(() => resolveDiscoveryTarget({
      provider: 'missing',
      protocol: 'openai-completions',
    }, config)).toThrow(/Unknown provider/)
  })

  it('carries the stored extra headers into discovery', () => {
    const headers = { 'X-Custom': 'value' }
    const stored: RelayConfig = {
      providers: { 'relay-example': { ...config.providers['relay-example']!, headers } },
    }
    expect(resolveDiscoveryTarget({ provider: 'relay-example', protocol: 'openai-completions' }, stored))
      .toEqual({
        providerId: 'relay-example',
        baseURL: 'https://relay.example/v1',
        protocol: 'openai-completions',
        headers,
        useStoredKey: true,
      })
  })
})
