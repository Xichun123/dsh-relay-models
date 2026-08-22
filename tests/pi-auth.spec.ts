import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { relayAuthInjection } from '../src/pi-auth.ts'

afterEach(() => {
  vi.unstubAllEnvs()
})

function contextWith(records: Readonly<Record<string, string>>): Context {
  return {
    credentials: {
      resolve: (ref: string) => {
        const value = records[String(ref)]
        return Promise.resolve(value === undefined ? undefined : { value })
      },
    },
  } as unknown as Context
}

describe('relay pi-ai auth injection', () => {
  it('reports an empty credential plane, because relay keys live in DSH credentials', async () => {
    const { credentials } = relayAuthInjection(contextWith({}))
    await expect(credentials.read('relay-example')).resolves.toBeUndefined()
    await expect(credentials.list()).resolves.toEqual([])
    await expect(credentials.delete('relay-example')).resolves.toBeUndefined()
  })

  it('refuses a write it could not land, and allows a modify that writes nothing', async () => {
    const { credentials } = relayAuthInjection(contextWith({}))
    await expect(credentials.modify('relay-example', () => Promise.resolve({ type: 'api_key', key: 'k' })))
      .rejects.toThrow(/cannot store a pi-ai credential/)
    await expect(credentials.modify('relay-example', () => Promise.resolve(undefined))).resolves.toBeUndefined()
  })

  it('passes the current credential as absent to a modify callback', async () => {
    const { credentials } = relayAuthInjection(contextWith({ RELAY_EXAMPLE_API_KEY: 'stored' }))
    const seen: unknown[] = []
    await credentials.modify('relay-example', current => {
      seen.push(current)
      return Promise.resolve(undefined)
    })
    expect(seen).toEqual([undefined])
  })

  it('answers env from the credentials service before the process environment', async () => {
    vi.stubEnv('RELAY_EXAMPLE_API_KEY', 'from-env')
    const { authContext } = relayAuthInjection(contextWith({ RELAY_EXAMPLE_API_KEY: 'from-credentials' }))
    await expect(authContext.env('RELAY_EXAMPLE_API_KEY')).resolves.toBe('from-credentials')
  })

  it('falls back to the process environment, and to nothing at all', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'from-env')
    const { authContext } = relayAuthInjection(contextWith({}))
    await expect(authContext.env('OPENAI_API_KEY')).resolves.toBe('from-env')
    await expect(authContext.env('NOT_SET_ANYWHERE')).resolves.toBeUndefined()
  })

  it('treats a name outside the reference grammar as not set instead of throwing', async () => {
    vi.stubEnv('aws-profile', 'from-env')
    const { authContext } = relayAuthInjection(contextWith({}))
    await expect(authContext.env('aws-profile')).resolves.toBe('from-env')
  })

  it('reports no local credential file, because relay auth never reads one', async () => {
    const { authContext } = relayAuthInjection(contextWith({}))
    await expect(authContext.fileExists('~/.aws/credentials')).resolves.toBe(false)
  })
})
