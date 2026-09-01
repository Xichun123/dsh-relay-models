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
import type { RelayServiceTier } from '../src/shared/types.ts'

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

/** A resolver answering no tier for any session. */
const noTier = (): undefined => undefined

/** A resolver answering one fixed tier, recording the sessionId it was asked about. */
function fixedTier(tier: RelayServiceTier, seen?: (string | undefined)[]) {
  return (options: StreamOptions | undefined): RelayServiceTier => {
    seen?.push(options?.sessionId)
    return tier
  }
}

describe('codex account id extraction', () => {
  it('reads the claim pi-ai reads', () => {
    expect(codexAccountId(chatgptToken('acct_123'))).toBe('acct_123')
    expect(codexAccountId(syntheticCodexToken('relay-cliproxy'))).toBe('relay-cliproxy')
  })

  it('reports no account id for a key pi-ai could not decode either', () => {
    expect(codexAccountId('sk-xxx')).toBeUndefined()
    expect(codexAccountId('one.two')).toBeUndefined()
    expect(codexAccountId('not.base64.sig')).toBeUndefined()
    expect(codexAccountId(chatgptToken(''))).toBeUndefined()
    expect(codexAccountId(chatgptToken(42))).toBeUndefined()
    expect(codexAccountId([btoa('{}'), btoa('{}'), 'sig'].join('.'))).toBeUndefined()
  })
})

describe('codex relay stream options', () => {
  it('moves a relay key to the sidecar header and hands pi-ai a token it can read', () => {
    const options = codexRelayStreamOptions<StreamOptions>('relay-cliproxy', noTier, { apiKey: 'sk-xxx' })
    expect(codexAccountId(options.apiKey!)).toBe('relay-cliproxy')
    expect(options.headers).toEqual({ [CODEX_RELAY_KEY_HEADER]: 'sk-xxx' })
  })

  it('keeps a key that already carries the claim exactly where pi-ai expects it', () => {
    const token = chatgptToken('acct_123')
    const options = codexRelayStreamOptions<StreamOptions>('relay-cliproxy', noTier, { apiKey: token, headers: { 'x-trace': '1' } })
    expect(options).toEqual({ apiKey: token, headers: { 'x-trace': '1' } })
  })

  it('preserves configured headers and unrelated options', () => {
    const options = codexRelayStreamOptions<StreamOptions>('relay-cliproxy', noTier, {
      apiKey: 'sk-xxx',
      transport: 'websocket',
      headers: { 'x-trace': '1' },
    })
    expect(options.transport).toBe('websocket')
    expect(options.headers).toEqual({ 'x-trace': '1', [CODEX_RELAY_KEY_HEADER]: 'sk-xxx' })
  })

  it('mints a token for a keyless relay without inventing a key to sidecar', () => {
    const options = codexRelayStreamOptions<StreamOptions>('relay-local', noTier, {})
    expect(codexAccountId(options.apiKey!)).toBe('relay-local')
    expect(options.headers).toBeUndefined()
    expect(codexAccountId(codexRelayStreamOptions<StreamOptions>('relay-local', noTier, undefined).apiKey!)).toBe('relay-local')
  })

  it('sends no service_tier unless the session chose one', () => {
    const off = codexRelayStreamOptions<StreamOptions>('relay-cliproxy', noTier, { apiKey: 'sk-xxx', sessionId: 's1' })
    expect('serviceTier' in off).toBe(false)
    const fast = codexRelayStreamOptions<StreamOptions>('relay-cliproxy', fixedTier('priority'), { apiKey: 'sk-xxx', sessionId: 's1' })
    expect(fast).toMatchObject({ serviceTier: 'priority' })
    expect(fast.headers).toEqual({ [CODEX_RELAY_KEY_HEADER]: 'sk-xxx' })
  })

  it('resolves the tier from the calling session id', () => {
    const seen: (string | undefined)[] = []
    const fast = codexRelayStreamOptions<StreamOptions>('relay-cliproxy', fixedTier('priority', seen), { apiKey: 'sk-xxx', sessionId: 's1' })
    expect(fast).toMatchObject({ serviceTier: 'priority' })
    expect(seen).toEqual(['s1'])
  })

  it('carries the tier for a real ChatGPT token too, and yields to an explicit one', () => {
    const token = chatgptToken('acct_123')
    expect(codexRelayStreamOptions<StreamOptions>('relay-cliproxy', fixedTier('priority'), { apiKey: token }))
      .toEqual({ apiKey: token, serviceTier: 'priority' })
    const explicit = codexRelayStreamOptions<StreamOptions>(
      'relay-cliproxy',
      fixedTier('priority'),
      // `flex` is a tier the Speed menu never offers, so it can only have come
      // from the caller — which is exactly what must survive.
      { apiKey: 'sk-xxx', serviceTier: 'flex' } as StreamOptions,
    )
    expect(explicit).toMatchObject({ serviceTier: 'flex' })
  })
})

describe('codex relay api', () => {
  it('rewrites both stream and streamSimple', () => {
    const { calls, base } = recorder()
    const api = codexRelayApi('relay-cliproxy', fixedTier('priority'), base)
    api.stream(model, context, { apiKey: 'sk-xxx', sessionId: 's1' })
    api.streamSimple(model, context, { apiKey: 'sk-xxx', sessionId: 's1' })
    expect(calls).toHaveLength(2)
    for (const seen of calls) {
      expect(codexAccountId(seen!.apiKey!)).toBe('relay-cliproxy')
      expect(seen!.headers).toEqual({ [CODEX_RELAY_KEY_HEADER]: 'sk-xxx' })
      expect(seen).toMatchObject({ serviceTier: 'priority' })
    }
  })

  it('restores service_tier after pi-ai streamSimple rebuilds its options', async () => {
    const { calls, base } = recorder()
    const api = codexRelayApi('relay-cliproxy', fixedTier('priority'), base)
    api.streamSimple(model, context, {
      apiKey: 'sk-xxx',
      sessionId: 's1',
      onPayload: payload => ({ ...(payload as Record<string, unknown>), marker: 'kept' }),
    })

    const payload = await calls[0]!.onPayload!({ model: model.id }, model)
    expect(payload).toEqual({ model: model.id, marker: 'kept', service_tier: 'priority' })

    api.streamSimple(model, context, { apiKey: 'sk-xxx', onPayload: () => null })
    await expect(calls[1]!.onPayload!({ model: model.id }, model)).resolves.toBeNull()
  })
})
