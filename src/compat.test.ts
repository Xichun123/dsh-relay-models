import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCompatFilter, isCompatJson } from './compat.ts'

type Compat = Record<string, unknown>
type Rules = Record<string, (value: unknown, api: string) => boolean>
type Section = {
  providers: Record<string, {
    api: string
    baseURL: string
    models: Array<{ id: string; input: string[]; contextWindow: number; maxTokens: number; compat: Compat }>
  }>
}

const responses = 'openai-responses'
const completions = 'openai-completions'
const boolean = (value: unknown) => typeof value === 'boolean'

// A callable Host-like schema, not a second schema library or installed Host copy.
function registration(rules: Rules, combined: (compat: Compat) => boolean = () => true) {
  const schemaInputs: Section[] = []
  const schemaOutputs: Section[] = []
  const validations: Array<{ section: Section; receiver: unknown }> = []
  const schema = Object.assign((section: Section) => {
    schemaInputs.push(section)
    const parsed = structuredClone(section)
    schemaOutputs.push(parsed)
    return parsed
  }, { dict: { providers: { inner: { dict: { models: { inner: { dict: { compat: { dict: rules } } } } } } } } })
  const live = {
    schema,
    validate(this: unknown, section: Section): void {
      validations.push({ section, receiver: this })
      const provider = Object.values(section.providers)[0]!
      if (![responses, completions, 'anthropic-messages'].includes(provider.api)) throw new Error('unsupported api')
      const compat = provider.models[0]!.compat
      for (const [key, value] of Object.entries(compat)) {
        if (!Object.hasOwn(rules, key) || !rules[key]!(value, provider.api)) throw new Error(`invalid ${key}`)
      }
      if (!combined(compat)) throw new Error('invalid combination')
    },
  }
  return { live, schemaInputs, schemaOutputs, validations }
}

function fixture(live: unknown) {
  const warnings: string[] = []
  let mutations = 0
  const settings = {
    registrations: new Map<string, unknown>([['llm-pi-ai', live]]),
    mutate() { mutations++; throw new Error('settings must not be mutated') },
  }
  return {
    settings,
    warnings,
    mutations: () => mutations,
    filter: createCompatFilter(settings, message => warnings.push(message)),
  }
}

test('empty inputs do not probe the Host or warn', () => {
  const host = registration({ futureFlag: boolean })
  const { filter, warnings } = fixture(host.live)
  assert.equal(filter(undefined, responses), undefined)
  assert.equal(filter({}, responses), undefined)
  assert.equal(filter({ futureFlag: true }, undefined), undefined)
  assert.equal(host.schemaInputs.length, 0)
  assert.deepEqual(warnings, [])
})

test('live registration automatically adds/removes keys and changes values and protocol eligibility', () => {
  const raw = { retiredFlag: true, futureFlag: false, format: 'new-format', unknownFlag: true }
  const first = registration({ retiredFlag: boolean, format: value => value === 'old-format' })
  const { filter, settings } = fixture(first.live)
  assert.deepEqual(filter(raw, responses), { retiredFlag: true })

  const second = registration({
    futureFlag: (value, api) => boolean(value) && api === responses,
    format: value => value === 'new-format',
  })
  settings.registrations.set('llm-pi-ai', second.live)
  assert.deepEqual(filter(raw, responses), { futureFlag: false, format: 'new-format' })
  assert.deepEqual(filter(raw, completions), { format: 'new-format' })
  assert.deepEqual(filter(raw, responses), { futureFlag: false, format: 'new-format' })
})

for (const replacement of ['registration', 'schema', 'validate'] as const) {
  test(`${replacement} identity replacement invalidates positive and negative cached results`, () => {
    let accepted = 'old'
    const host = registration({ format: value => value === accepted })
    const state = fixture(host.live)
    const raw = { format: 'new' }
    let current = host.live
    const replace = () => {
      if (replacement === 'registration') {
        current = { ...current }
        state.settings.registrations.set('llm-pi-ai', current)
      } else if (replacement === 'schema') {
        const previous = current.schema
        current.schema = Object.assign((section: Section) => previous(section), { dict: previous.dict })
      } else {
        const previous = current.validate
        current.validate = function (section: Section) { previous.call(this, section) }
      }
    }
    assert.equal(state.filter(raw, responses), undefined)
    const initialCalls = host.schemaInputs.length
    assert.equal(state.filter(raw, responses), undefined)
    assert.equal(host.schemaInputs.length, initialCalls, 'negative result is cached')

    accepted = 'new'
    replace()
    assert.deepEqual(state.filter(raw, responses), raw)
    const positiveCalls = host.schemaInputs.length
    assert.ok(positiveCalls > initialCalls)
    assert.deepEqual(state.filter(raw, responses), raw)
    assert.equal(host.schemaInputs.length, positiveCalls, 'positive result is cached')

    accepted = 'old'
    replace()
    assert.equal(state.filter(raw, responses), undefined)
    assert.ok(host.schemaInputs.length > positiveCalls)
  })
}

test('protocol rejection uses the Host validator, not a responses suffix heuristic', () => {
  const host = registration({ onlyResponses: (value, api) => boolean(value) && api === responses })
  const { filter, warnings } = fixture(host.live)
  const raw = { onlyResponses: true }
  assert.deepEqual(filter(raw, responses), raw)
  for (const api of [completions, 'anthropic-messages', 'xxx-responses', 'unknown', '']) {
    assert.equal(filter(raw, api), undefined, api)
    assert.equal(filter(raw, api), undefined, api)
  }
  assert.equal(warnings.length, 3, 'unsupported protocol warnings are deduplicated per reason')
  assert.deepEqual(filter(raw, responses), raw)
})

test('malformed Host fields are discarded while independently valid siblings survive', () => {
  const host = registration({
    enabled: boolean,
    mode: value => value === 'future-mode',
    priority: value => typeof value === 'number' && Number.isInteger(value),
    nested: value => typeof value === 'object' && value !== null && !Array.isArray(value)
      && typeof (value as Compat).value === 'string',
    zero: value => value === 0,
    emptyList: Array.isArray,
    emptyObject: () => true,
    absent: () => true,
  })
  const { filter } = fixture(host.live)
  assert.deepEqual(filter({
    enabled: 'false', mode: 'retired-mode', priority: 1.5, nested: { value: 5 },
    zero: 0, emptyList: [], emptyObject: {}, absent: null, unknown: 'discard',
  }, responses), { zero: 0, emptyList: [] })
  assert.deepEqual(filter({ enabled: false, mode: 'future-mode', priority: 0, nested: { value: 'ok' } }, responses), {
    enabled: false, mode: 'future-mode', priority: 0, nested: { value: 'ok' },
  })
})

test('schema and validator inspect only detached synthetic settings, never mutate or fetch', t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('network must not be used') })
  const host = registration({ nested: () => true })
  const state = fixture(host.live)
  const raw = { nested: { values: ['catalog'] } }
  const before = structuredClone(raw)
  assert.deepEqual(state.filter(raw, responses), before)
  assert.ok(host.schemaInputs.length >= 3)
  assert.equal(host.schemaOutputs.length, host.validations.length)
  for (const [index, section] of host.schemaInputs.entries()) {
    assert.notEqual(section, state.settings)
    assert.deepEqual(Object.keys(section), ['providers'])
    assert.deepEqual(Object.keys(section.providers), ['dsh-relay-compat-probe'])
    const provider = section.providers['dsh-relay-compat-probe']!
    assert.equal(provider.api, responses)
    assert.equal(provider.baseURL, 'https://dsh-relay-models.invalid/v1')
    assert.equal(provider.models.length, 1)
    const model = provider.models[0]!
    assert.equal(model.id, 'dsh-relay-compat-probe')
    assert.deepEqual(model.input, ['text'])
    assert.equal(model.contextWindow, 8192)
    assert.equal(model.maxTokens, 64)
    assert.notEqual(model.compat, raw)
    if (model.compat.nested) {
      assert.notEqual(model.compat.nested, raw.nested)
      ;(model.compat.nested as typeof raw.nested).values.push('schema mutation')
    }
    assert.notEqual(host.schemaOutputs[index], section)
    assert.equal(host.validations[index]!.section, host.schemaOutputs[index], 'validate receives the schema result')
    assert.equal(host.validations[index]!.receiver, host.live)
  }
  assert.deepEqual(raw, before)
  assert.equal(state.mutations(), 0)
  assert.equal(fetch.mock.callCount(), 0)
  assert.deepEqual(state.warnings, [])
})

test('raw input and every returned result are isolated from output cache mutations', () => {
  const host = registration({ nested: () => true })
  const { filter } = fixture(host.live)
  const raw = { nested: { values: ['catalog'] } }
  const before = structuredClone(raw)
  const first = filter(raw, responses)!
  ;(first.nested as typeof raw.nested).values.push('caller edit')
  first.extra = true
  assert.deepEqual(raw, before, 'the initial result must not share nested references with raw input')
  const calls = host.schemaInputs.length
  const second = filter(raw, responses)!
  assert.deepEqual(second, before)
  assert.notEqual(second, first)
  ;(second.nested as typeof raw.nested).values.push('cached caller edit')
  Reflect.deleteProperty(second, 'nested')
  assert.deepEqual(filter(raw, responses), before)
  assert.equal(host.schemaInputs.length, calls, 'cache hits return independent copies without reprobes')
  assert.deepEqual(raw, before)
})

test('coupled fields use the complete block before rejecting invalid singletons', () => {
  const host = registration({ left: boolean, right: boolean }, compat =>
    Object.hasOwn(compat, 'left') === Object.hasOwn(compat, 'right'))
  const { filter } = fixture(host.live)
  assert.deepEqual(filter({ left: true, right: false }, responses), { left: true, right: false })
  assert.equal(host.schemaInputs.length, 3, 'baseline, unknown-key safety probe, and full block only')
  assert.equal(filter({ left: true }, responses), undefined)
})

test('individually valid fields that form an invalid combined subset fail closed', () => {
  const host = registration({ left: boolean, right: boolean, malformed: boolean }, compat =>
    !(Object.hasOwn(compat, 'left') && Object.hasOwn(compat, 'right')))
  const { filter } = fixture(host.live)
  assert.equal(filter({ left: true, right: false, malformed: 'wrong type' }, responses), undefined)
  const last = host.schemaInputs.at(-1)!.providers['dsh-relay-compat-probe']!.models[0]!.compat
  assert.deepEqual(last, { left: true, right: false }, 'the recovered subset must be validated as a whole')
})

test('missing registration warns once, recovers on registration, and never serves stale cached data after removal', () => {
  const state = fixture(undefined)
  const raw = { futureFlag: true }
  assert.equal(state.filter(raw, responses), undefined)
  assert.equal(state.filter(raw, responses), undefined)
  assert.equal(state.warnings.length, 1)
  state.settings.registrations.set('llm-pi-ai', registration({ futureFlag: boolean }).live)
  assert.deepEqual(state.filter(raw, responses), raw)
  state.settings.registrations.delete('llm-pi-ai')
  assert.equal(state.filter(raw, responses), undefined)
  assert.equal(state.filter(raw, responses), undefined)
  assert.equal(state.warnings.length, 2, 'a new unavailable generation can warn again')
})

for (const failure of ['missing validator', 'no-op validator', 'async validator', 'promise validator', 'missing schema', 'unknown schema'] as const) {
  test(`${failure} fails closed with one warning and recovers after live replacement`, async () => {
    const host = registration({ futureFlag: boolean })
    const live: { schema?: unknown; validate?: unknown } = { ...host.live }
    if (failure === 'missing validator') delete live.validate
    if (failure === 'no-op validator') live.validate = () => undefined
    if (failure === 'async validator') live.validate = async () => { throw new Error('async rejection') }
    if (failure === 'promise validator') live.validate = () => Promise.reject(new Error('promise rejection'))
    if (failure === 'missing schema') delete live.schema
    if (failure === 'unknown schema') live.schema = (section: Section) => section
    const state = fixture(live)
    const raw = { futureFlag: true }
    assert.equal(state.filter(raw, responses), undefined)
    assert.equal(state.filter(raw, responses), undefined)
    assert.equal(state.warnings.length, 1)
    assert.match(state.warnings[0]!, /Host compat rules unavailable.*skipping catalog compat enrichment/)
    live.schema = host.live.schema
    live.validate = host.live.validate
    assert.deepEqual(state.filter(raw, responses), raw)
    assert.equal(state.warnings.length, 1)
    await Promise.resolve() // Rejected promise validators must be handled, not leak an unhandled rejection.
  })
}

test('unknown schema fails closed and recovers when its shape becomes readable', () => {
  const host = registration({ futureFlag: boolean })
  const dict = host.live.schema.dict
  Reflect.deleteProperty(host.live.schema, 'dict')
  const { filter, warnings } = fixture(host.live)
  const raw = { futureFlag: true }
  assert.equal(filter(raw, responses), undefined)
  assert.equal(filter(raw, responses), undefined)
  assert.equal(warnings.length, 1)
  host.live.schema.dict = dict
  assert.deepEqual(filter(raw, responses), raw)
})

test('unreadable registration and an unknown-probe name collision fail closed', () => {
  const warnings: string[] = []
  const filter = createCompatFilter({ get registrations() { throw new Error('private seam changed') } }, message => warnings.push(message))
  assert.equal(filter({ futureFlag: true }, responses), undefined)
  assert.equal(filter({ futureFlag: true }, responses), undefined)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0]!, /could not read live namespace registration/)

  const state = fixture(registration({ futureFlag: boolean, __dsh_relay_unknown_compat__: boolean }).live)
  assert.equal(state.filter({ futureFlag: true }, responses), undefined)
  assert.equal(state.warnings.length, 1)
})

test('generic JSON guard allows future vocabulary but rejects prototype keys and non-JSON values', () => {
  for (const value of [null, true, false, 'future-format', 0, -3.5, [], {}, { arbitraryFutureField: ['x', 0, false, null, { enabled: true }] }]) {
    assert.equal(isCompatJson(value), true)
  }
  for (const value of [undefined, NaN, Infinity, -Infinity, 1n, Symbol('x'), () => true, new Date(), new Map(), new Set()]) {
    assert.equal(isCompatJson(value), false)
    assert.equal(isCompatJson({ nested: [value] }), false)
  }
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const value = JSON.parse(`{"${key}": {"polluted": true}}`)
    assert.equal(isCompatJson(value), false, key)
    assert.equal(isCompatJson({ nested: [value] }), false, `nested ${key}`)
  }
})

test('generic JSON guard rejects cycles and excessive nesting before probing the Host', () => {
  let value: unknown = 'leaf'
  for (let depth = 0; depth < 20; depth++) value = { nested: value }
  assert.equal(isCompatJson(value), true)
  assert.equal(isCompatJson({ nested: value }), false)
  const cyclic: Compat = {}
  cyclic.self = cyclic
  assert.equal(isCompatJson(cyclic), false)
  const cyclicArray: unknown[] = []
  cyclicArray.push(cyclicArray)
  assert.equal(isCompatJson(cyclicArray), false)

  const host = registration({ nested: () => true })
  const { filter, warnings } = fixture(host.live)
  for (const raw of [{ nested: value }, cyclic, { nested: NaN }, JSON.parse('{"__proto__":true}')]) {
    assert.equal(filter(raw, responses), undefined)
  }
  assert.equal(host.schemaInputs.length, 0)
  assert.deepEqual(warnings, [])
})
