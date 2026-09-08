import { AsyncLocalStorage } from 'node:async_hooks'

interface ProviderHeaders {
  baseURL?: string
  headers?: Record<string, string>
}

interface UserAgentTarget {
  base: URL
  userAgent: string
}

/** Read only this route's UA; an explicit endpoint keeps OAuth and unrelated fetches out of scope. */
export function userAgentTarget(section: unknown, provider: string | undefined, baseURL?: string): UserAgentTarget | undefined {
  if (provider === undefined) return undefined
  const profile = (section as { providers?: Record<string, ProviderHeaders> } | undefined)?.providers?.[provider]
  if (profile === undefined) return undefined
  const entries = Object.entries(profile.headers ?? {}).filter(([name]) => name.toLowerCase() === 'user-agent')
  if (entries.length === 0) return undefined
  if (entries.length > 1) throw new Error('dsh-relay-models: configure User-Agent only once (case-insensitive)')
  const endpoint = baseURL ?? profile.baseURL
  if (endpoint === undefined) return undefined
  let base: URL
  try { base = new URL(endpoint) } catch {
    // Leave malformed endpoints to the adapter's native error handling.
    return undefined
  }
  if (base.protocol !== 'https:' && base.protocol !== 'http:') return undefined
  return { base, userAgent: new Headers(entries).get('user-agent')! }
}

function matches(input: string | URL | Request, base: URL): boolean {
  let url: URL
  try { url = new URL(input instanceof Request ? input.url : input) } catch { return false }
  const path = base.pathname.replace(/\/+$/, '')
  return url.origin === base.origin && (url.pathname === path || url.pathname.startsWith(`${path}/`))
}

/** Last-mile UA override, inspired by dsh-fetch-header-rewrite; no global URL rules or extra headers. */
export function createUserAgentRewrite() {
  const scope = new AsyncLocalStorage<UserAgentTarget | undefined>()
  let active = false
  const run = <T>(target: UserAgentTarget | undefined, callback: () => T): T =>
    active ? scope.run(target, callback) : callback()

  return {
    run,
    install(): () => void {
      const original = globalThis.fetch
      active = true
      const wrapped: typeof fetch = (input, init) => {
        const target = active ? scope.getStore() : undefined
        if (target === undefined || !matches(input, target.base)) return original(input, init)
        // Fetch init.headers replaces Request.headers; never resurrect a removed credential.
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
        headers.set('user-agent', target.userAgent)
        return original(input, { ...init, headers })
      }
      globalThis.fetch = wrapped
      return () => {
        active = false
        scope.disable()
        // A later plugin may still delegate through this now-inert wrapper.
        if (globalThis.fetch === wrapped) globalThis.fetch = original
      }
    },
    stream<T>(target: UserAgentTarget | undefined, next: () => AsyncIterable<T>): AsyncIterable<T> {
      const source = run(target, next)
      return {
        [Symbol.asyncIterator]() {
          const iterator = run(target, () => source[Symbol.asyncIterator]())
          // Async generators do not execute in the context where they were constructed.
          return {
            next: (...args) => run(target, () => iterator.next(...args)),
            ...iterator.return === undefined ? {} : {
              return: (value?: unknown) => run(target, () => iterator.return!(value)),
            },
            ...iterator.throw === undefined ? {} : {
              throw: (error?: unknown) => run(target, () => iterator.throw!(error)),
            },
          }
        },
      }
    },
  }
}
