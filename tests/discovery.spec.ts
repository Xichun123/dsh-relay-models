import { afterEach, describe, expect, it, vi } from 'vitest'
import { discoverRelayModels, type RelayDiscoveryRequest } from '../src/discovery.ts'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function stubFetch(...responses: Response[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn()
  for (const response of responses) fetchMock.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function listing(ids: readonly string[]): Response {
  return new Response(JSON.stringify({ data: ids.map(id => ({ id })) }), {
    headers: { 'content-type': 'application/json' },
  })
}

function refusal(status: number, body: unknown): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function sentHeaders(fetchMock: ReturnType<typeof vi.fn>, call = 0): Record<string, string> {
  return fetchMock.mock.calls[call]?.[1]?.headers as Record<string, string>
}

/** The message discovery refuses with, failing the test when it resolves instead. */
async function refusalMessage(request: RelayDiscoveryRequest): Promise<string> {
  try {
    await discoverRelayModels(request)
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  throw new Error('discovery resolved instead of refusing')
}

const openai = { baseURL: 'https://relay.example/v1', api: 'openai-completions', apiKey: 'sk-test' } as const
const anonymous = { baseURL: 'https://relay.example/v1', api: 'openai-completions' } as const

describe('relay model discovery', () => {
  it('sends harness attribution and does not invent Claude or Codex clients', async () => {
    const fetchMock = stubFetch(listing(['m1']))
    await expect(discoverRelayModels({ ...openai })).resolves.toEqual([{ id: 'm1' }])
    const headers = sentHeaders(fetchMock)
    expect(headers.authorization).toBe('Bearer sk-test')
    expect(headers['user-agent']).toMatch(/deepseek-harness\//)
    expect(headers['user-agent']).not.toMatch(/claude-cli|codex_cli/)
    expect(headers['x-app']).toBeUndefined()
  })

  it('sends the provider headers discovery was given, as the runtime path does', async () => {
    const fetchMock = stubFetch(listing(['m1']))
    await expect(discoverRelayModels({
      ...openai,
      headers: { 'X-Custom': 'value', 'anthropic-version': '2024-01-01' },
    })).resolves.toEqual([{ id: 'm1' }])
    const headers = sentHeaders(fetchMock)
    expect(headers['X-Custom']).toBe('value')
    expect(headers['anthropic-version']).toBe('2024-01-01')
  })

  it('keeps attribution over a configured User-Agent, whatever the relay demands', async () => {
    const fetchMock = stubFetch(listing(['m1']))
    await discoverRelayModels({ ...openai, headers: { 'User-Agent': 'claude-cli/1.0.88 (external, cli)' } })
    const headers = sentHeaders(fetchMock)
    expect(headers['user-agent']).toMatch(/deepseek-harness\//)
    expect(Object.keys(headers).filter(name => name.toLowerCase() === 'user-agent')).toHaveLength(1)
  })

  it('refuses configured headers that carry credentials', async () => {
    const fetchMock = stubFetch(listing(['m1']))
    await expect(discoverRelayModels({ ...openai, headers: { Authorization: 'Bearer leaked' } }))
      .rejects.toThrow(/cannot carry credentials/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['OpenAI-style nested error', { error: { message: 'unauthorized client detected' } }],
    ['string error', { error: 'unauthorized client detected' }],
    ['top-level message', { message: 'unauthorized client detected' }],
    ['gateway detail', { detail: 'unauthorized client detected' }],
  ])('quotes the refusal the relay states as %s instead of blaming the key', async (_form, body) => {
    stubFetch(refusal(401, body))
    expect(await refusalMessage({ ...openai }))
      .toBe('https://relay.example/v1/models answered 401: unauthorized client detected')
  })

  it('prefers the nested error message over the envelope status word', async () => {
    stubFetch(refusal(401, { error: { message: 'unauthorized client detected' }, message: 'UNAUTHENTICATED' }))
    expect(await refusalMessage({ ...openai }))
      .toBe('https://relay.example/v1/models answered 401: unauthorized client detected')
  })

  it('collapses a stated message to one bounded line', async () => {
    const filler = 'x'.repeat(400)
    stubFetch(refusal(400, { error: { message: `first line\n  second ${filler}` } }))
    const message = await refusalMessage({ ...openai })
    const detail = message.slice('https://relay.example/v1/models answered 400: '.length)
    expect(detail).toBe(`first line second ${'x'.repeat(300 - 'first line second '.length)}…`)
    expect(detail).toHaveLength(301)
  })

  it('keeps the API-key hint only when the relay explains nothing', async () => {
    stubFetch(new Response(null, { status: 401 }))
    expect(await refusalMessage({ ...openai }))
      .toBe('https://relay.example/v1/models answered 401; check the API key')
    stubFetch(new Response('<html>Forbidden</html>', { status: 403, headers: { 'content-type': 'text/html' } }))
    expect(await refusalMessage({ ...openai }))
      .toBe('https://relay.example/v1/models answered 403; check the API key')
    stubFetch(refusal(401, { error: { message: 'unauthorized client detected' } }))
    expect(await refusalMessage({ ...openai })).not.toContain('check the API key')
  })

  it('reports a status the key cannot explain without an API-key hint', async () => {
    stubFetch(new Response(null, { status: 500 }))
    expect(await refusalMessage({ ...anonymous })).toBe('https://relay.example/v1/models answered 500')
  })

  it('still falls back to /v1/models after reading a 404 body', async () => {
    const fetchMock = stubFetch(refusal(404, { error: { message: 'no such route' } }), listing(['m1']))
    await expect(discoverRelayModels({ baseURL: 'https://relay.example', api: 'openai-completions' }))
      .resolves.toEqual([{ id: 'm1' }])
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      'https://relay.example/models',
      'https://relay.example/v1/models',
    ])
  })

  it('reports the last endpoint refusal when every candidate is missing', async () => {
    stubFetch(refusal(404, { error: { message: 'no such route' } }), refusal(405, { error: { message: 'GET only' } }))
    expect(await refusalMessage({ baseURL: 'https://relay.example', api: 'openai-completions' }))
      .toBe('https://relay.example/v1/models answered 405: GET only')
  })
})
