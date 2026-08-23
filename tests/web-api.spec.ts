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

  it('refuses a DNS-rebound Host whose Origin agrees with it', () => {
    // The socket reached this server; only Host says otherwise, and a rebound
    // page can make Host and Origin agree on the attacker's own domain.
    const rebound = request({ host: 'evil.example', origin: 'http://evil.example' })
    expect(() => assertRequestOrigin(rebound, 'POST')).toThrow(/refuse Host "evil.example"/)
    expect(() => assertRequestOrigin(rebound, 'GET')).toThrow(/refuse Host/)
    expect(() => assertRequestOrigin(request({ host: 'localhost:3080' }), 'GET')).not.toThrow()
    expect(() => assertRequestOrigin(request({ host: '[::1]:3080' }), 'GET')).not.toThrow()
    expect(() => assertRequestOrigin(request({ host: '127.9.9.9' }), 'GET')).not.toThrow()
  })

  it('serves a declared trusted authority, exactly as declared', () => {
    const proxied = request({ host: 'harness.internal', origin: 'https://harness.internal' })
    expect(() => assertRequestOrigin(proxied, 'POST')).toThrow(/refuse Host/)
    expect(() => assertRequestOrigin(proxied, 'POST', ['harness.internal'])).not.toThrow()
    // A port-less entry matches any port; a ported entry only its own.
    expect(() => assertRequestOrigin(request({ host: 'harness.internal:8443', origin: 'https://harness.internal:8443' }), 'POST', ['harness.internal'])).not.toThrow()
    expect(() => assertRequestOrigin(request({ host: 'harness.internal:8443', origin: 'https://harness.internal:8443' }), 'POST', ['harness.internal:3080'])).toThrow(/refuse Host/)
    // An entry that is not a bare authority would otherwise authorize the host it embeds.
    expect(() => assertRequestOrigin(proxied, 'POST', ['harness.internal/anything'])).toThrow(/refuse Host/)
    expect(() => assertRequestOrigin(proxied, 'POST', ['user@harness.internal'])).toThrow(/refuse Host/)
  })

  it('refuses a request a browser labels cross-site, whatever Origin says', () => {
    expect(() => assertRequestOrigin(request({
      host: '127.0.0.1:3080',
      origin: 'http://127.0.0.1:3080',
      'sec-fetch-site': 'cross-site',
    }), 'POST')).toThrow(/Cross-site/)
    expect(() => assertRequestOrigin(request({
      host: '127.0.0.1:3080',
      origin: 'http://127.0.0.1:3080',
      'sec-fetch-site': 'same-origin',
    }), 'POST')).not.toThrow()
  })

  it('refuses an opaque Origin', () => {
    expect(() => assertRequestOrigin(request({ host: '127.0.0.1:3080', origin: 'null' }), 'POST'))
      .toThrow(/Cross-origin/)
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
