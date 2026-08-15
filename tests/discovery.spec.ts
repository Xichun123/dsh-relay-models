import { afterEach, describe, expect, it, vi } from 'vitest'
import { discoverRelayModels } from '../src/discovery.ts'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('relay model discovery', () => {
  it('sends harness attribution and does not invent Claude or Codex clients', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: 'm1' }] }), {
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(discoverRelayModels({
      baseURL: 'https://relay.example/v1',
      api: 'openai-completions',
      apiKey: 'sk-test',
    })).resolves.toEqual([{ id: 'm1' }])
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers.authorization).toBe('Bearer sk-test')
    expect(headers['user-agent']).toMatch(/deepseek-harness\//)
    expect(headers['user-agent']).not.toMatch(/claude-cli|codex_cli/)
    expect(headers['x-app']).toBeUndefined()
  })
})
