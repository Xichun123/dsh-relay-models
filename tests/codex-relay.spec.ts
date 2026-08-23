import { describe, expect, it } from 'vitest'
import type {
  Api,
  AssistantMessageEventStream,
  Context,
  Model,
  ProviderStreams,
  StreamOptions,
} from '@earendil-works/pi-ai'
import {
  CODEX_RELAY_KEY_HEADER,
  codexAccountId,
  codexRelayApi,
  codexRelayStreamOptions,
  syntheticCodexToken,
} from '../src/codex-relay.ts'

const CLAIM = 'https://api.openai.com/auth'

function chatgptToken(accountId: unknown): string {
  const segment = (value: unknown): string => btoa(JSON.stringify(value))
  return [segment({ alg: 'none' }), segment({ [CLAIM]: { chatgpt_account_id: accountId } }), 'unsigned'].join('.')
}

/** A base recording the options it was delegated, without any network. */
function recorder(): { calls: (StreamOptions | undefined)[]; base: ProviderStreams } {
  const calls: (StreamOptions | undefined)[] = []
  const record = (options: StreamOptions | undefined): AssistantMessageEventStream => {
    calls.push(options)
    // The wrapper returns what it is handed; no test here consumes the stream.
    return undefined as unknown as AssistantMessageEventStream
  }
  return { calls, base: { stream: (_m, _c, options) => record(options), streamSimple: (_m, _c, options) => record(options) } }
}

const model = { id: 'gpt-5.6-sol', provider: 'relay-cliproxy', api: 'openai-codex-responses' } as unknown as Model<Api>
const context: Context = { messages: [] }

describe('codex account id extraction', () => {
  it('reads the claim pi-ai reads', () => {
    expect(codexAccountId(chatgptToken('acct_123'))).toBe('acct_123')
    expect(codexAccountId(syntheticCodexToken('relay-cliproxy'))).toBe('relay-cliproxy')
  })

  it('reports no account id for a key pi-ai could not decode either', () => {
    expect(codexAccountId('sk-relay-plain-key')).toBeUndefined()
    expect(codexAccountId('one.two')).toBeUndefined()
    expect(codexAccountId('not.base64.sig')).toBeUndefined()
    expect(codexAccountId(chatgptToken(''))).toBeUndefined()
    expect(codexAccountId(chatgptToken(42))).toBeUndefined()
    expect(codexAccountId([btoa('{}'), btoa('{}'), 'sig'].join('.'))).toBeUndefined()
  })
})

describe('codex relay stream options', () => {
  it('moves a relay key to the sidecar header and hands pi-ai a token it can read', () => {
    const options = codexRelayStreamOptions<StreamOptions>('relay-cliproxy', { apiKey: 'sk-relay-plain-key' })
    expect(codexAccountId(options.apiKey!)).toBe('relay-cliproxy')
    expect(options.headers).toEqual({ [CODEX_RELAY_KEY_HEADER]: 'sk-relay-plain-key' })
  })

  it('keeps a key that already carries the claim exactly where pi-ai expects it', () => {
    const token = chatgptToken('acct_123')
    const options = codexRelayStreamOptions<StreamOptions>('relay-cliproxy', { apiKey: token, headers: { 'x-trace': '1' } })
    expect(options).toEqual({ apiKey: token, headers: { 'x-trace': '1' } })
  })

  it('preserves configured headers and unrelated options', () => {
    const options = codexRelayStreamOptions<StreamOptions>('relay-cliproxy', {
      apiKey: 'sk-relay-plain-key',
      transport: 'websocket',
      headers: { 'x-trace': '1' },
    })
    expect(options.transport).toBe('websocket')
    expect(options.headers).toEqual({ 'x-trace': '1', [CODEX_RELAY_KEY_HEADER]: 'sk-relay-plain-key' })
  })

  it('mints a token for a keyless relay without inventing a key to sidecar', () => {
    const options = codexRelayStreamOptions<StreamOptions>('relay-local', {})
    expect(codexAccountId(options.apiKey!)).toBe('relay-local')
    expect(options.headers).toBeUndefined()
    expect(codexAccountId(codexRelayStreamOptions<StreamOptions>('relay-local', undefined).apiKey!)).toBe('relay-local')
  })
})

describe('codex relay api', () => {
  it('rewrites both stream and streamSimple', () => {
    const { calls, base } = recorder()
    const api = codexRelayApi('relay-cliproxy', base)
    api.stream(model, context, { apiKey: 'sk-relay-plain-key' })
    api.streamSimple(model, context, { apiKey: 'sk-relay-plain-key' })
    expect(calls).toHaveLength(2)
    for (const seen of calls) {
      expect(codexAccountId(seen!.apiKey!)).toBe('relay-cliproxy')
      expect(seen!.headers).toEqual({ [CODEX_RELAY_KEY_HEADER]: 'sk-relay-plain-key' })
    }
  })
})
