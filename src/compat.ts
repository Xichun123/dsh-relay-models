export type CompatFilter = (
  compat: Record<string, unknown> | undefined,
  api: string | undefined,
) => Record<string, unknown> | undefined

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Keep future compat vocabulary, but never pass unsafe/non-JSON data to the Host schema. */
export function isCompatJson(value: unknown, depth = 0): boolean {
  if (depth > 20) return false
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every(item => isCompatJson(item, depth + 1))
  return record(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
    && Object.entries(value).every(([key, item]) =>
      key !== '__proto__' && key !== 'constructor' && key !== 'prototype' && isCompatJson(item, depth + 1))
}

function at(value: unknown, ...path: string[]): unknown {
  for (const key of path) {
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return undefined
    value = Reflect.get(value, key)
  }
  return value
}

/**
 * Use the running namespace's own schema AND protocol validator, never a second
 * installed package or an on-disk source snapshot. No settings writes, credentials,
 * provider registration or model requests take place during these detached checks.
 *
 * ponytail: registrations is a private Host seam until DSH exposes read-only
 * validation. If its shape changes, fail closed instead of parsing bundled JS.
 */
export function createCompatFilter(settings: object, warn: (message: string) => void): CompatFilter {
  let previous: unknown
  let previousSchema: unknown
  let previousValidate: unknown
  let cache = new WeakMap<object, Map<string, Record<string, unknown> | undefined>>()
  const warned = new Set<string>()
  const unavailable = (reason: string): undefined => {
    if (!warned.has(reason)) {
      warned.add(reason)
      warn(`dsh-relay-models: Host compat rules unavailable (${reason}); skipping catalog compat enrichment`)
    }
    return undefined
  }

  return (compat, api) => {
    if (compat === undefined || api === undefined || Object.keys(compat).length === 0) return undefined
    if (!isCompatJson(compat)) return undefined
    try {
      const registrations = at(settings, 'registrations')
      const registration: unknown = registrations instanceof Map ? registrations.get('llm-pi-ai') : undefined
      const schema = at(registration, 'schema')
      const validate = at(registration, 'validate')
      if (registration !== previous || schema !== previousSchema || validate !== previousValidate) {
        previous = registration
        previousSchema = schema
        previousValidate = validate
        cache = new WeakMap()
        warned.clear()
      }
      if (typeof schema !== 'function' || typeof validate !== 'function'
        || schema.constructor.name === 'AsyncFunction' || validate.constructor.name === 'AsyncFunction') {
        return unavailable('missing synchronous namespace schema/validator')
      }
      const fields = at(schema, 'dict', 'providers', 'inner', 'dict', 'models', 'inner', 'dict', 'compat', 'dict')
      if (!record(fields)) return unavailable('unrecognized model compat schema')
      const cached = cache.get(compat)
      if (cached?.has(api)) return structuredClone(cached.get(api))

      const accepts = (value: Record<string, unknown>): boolean => {
        try {
          const section: unknown = schema({ providers: { 'dsh-relay-compat-probe': {
            api, baseURL: 'https://dsh-relay-models.invalid/v1',
            models: [{ id: 'dsh-relay-compat-probe', input: ['text'], contextWindow: 8192, maxTokens: 64,
              compat: structuredClone(value) }],
          } } })
          const result: unknown = validate.call(registration, section)
          // The current Host validator is synchronous and returns void. Do not
          // mistake a future asynchronous check for successful validation.
          if (result instanceof Promise) void result.catch(() => {})
          return result === undefined
        } catch {
          return false
        }
      }
      if (!accepts({})) return unavailable(`baseline rejected for ${api}`)
      // An absent/no-op validator must not turn the schema's union of fields
      // into a protocol allowlist. The Host currently rejects unknown keys.
      if (Object.hasOwn(fields, '__dsh_relay_unknown_compat__')
        || accepts({ __dsh_relay_unknown_compat__: true })) return unavailable('validator did not reject unknown compat')

      const candidates = Object.fromEntries(Object.entries(compat).filter(([key, value]) =>
        Object.hasOwn(fields, key) && value != null && (!record(value) || Object.keys(value).length > 0)))
      let out: Record<string, unknown> | undefined
      if (Object.keys(candidates).length > 0) {
        // Keep coupled fields together when the whole block is accepted. If a
        // field is refused, retain independently accepted fields, then recheck
        // the combination rather than assuming they are valid together.
        if (accepts(candidates)) out = candidates
        else {
          const subset = Object.fromEntries(Object.entries(candidates).filter(([key, value]) => accepts({ [key]: value })))
          if (Object.keys(subset).length > 0 && accepts(subset)) out = subset
        }
      }
      const byApi = cached ?? new Map<string, Record<string, unknown> | undefined>()
      byApi.set(api, structuredClone(out))
      cache.set(compat, byApi)
      return structuredClone(out)
    } catch {
      return unavailable('could not read live namespace registration')
    }
  }
}
