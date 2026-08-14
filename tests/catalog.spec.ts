import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const payload = {
  openai: {
    'future-model': {
      id: 'future-model',
      name: 'Future Model',
      api: 'openai-responses',
      provider: 'openai',
      reasoning: true,
      input: ['text', 'image'],
      cost: { input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0 },
      thinkingLevelMap: { low: 'low', high: 'high' },
      compat: { supportsStrictMode: true },
      contextWindow: 500_000,
      maxTokens: 100_000,
    },
  },
}

describe('pi.dev model catalog', () => {
  it('keeps the bundled snapshot when pi.dev is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    vi.resetModules()
    const { currentOfficialCatalog, refreshOfficialCatalog } = await import('../src/catalog.ts')
    await expect(refreshOfficialCatalog()).rejects.toThrow(/503/)
    expect(currentOfficialCatalog()).toMatchObject({ source: 'bundled' })
    expect(currentOfficialCatalog().models.length).toBeGreaterThan(0)
  })

  it('parses metadata and revalidates cached responses with ETag', async () => {
    let now = 1_000
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(payload), {
        headers: {
          etag: '"catalog-1"',
          'x-pi-model-catalog-revision': 'sha256-test',
          'x-pi-model-catalog-minimum-version': '0.80.7',
        },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 304 }))
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
    const { refreshOfficialCatalog } = await import('../src/catalog.ts')

    const first = await refreshOfficialCatalog()
    expect(first).toMatchObject({
      source: 'remote',
      revision: 'sha256-test',
      minimumVersion: '0.80.7',
      models: [{ id: 'future-model', api: 'openai-responses', contextWindow: 500_000, compat: { supportsStrictMode: true } }],
    })

    now = 62_000
    await refreshOfficialCatalog()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ headers: { 'if-none-match': '"catalog-1"' } })
  })
})
