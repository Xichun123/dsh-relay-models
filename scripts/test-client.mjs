import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

if (!process.env.DSH_SOURCE) throw new Error('Set DSH_SOURCE to a Harness checkout with its jsdom dependency installed')
const require = createRequire(resolve(process.env.DSH_SOURCE, 'package.json'))
const { JSDOM } = require('jsdom')
const bundle = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')
const markup = `<section aria-label="Models" id="pi"><div><div>
  <input aria-label="Model ID 1" value="relay-model"><input aria-label="Display name 1" value="Original">
</div></div></section><section aria-label="Models" id="deepseek"><div><div><div>
  <input aria-label="Model ID 1" value="other-model"><input aria-label="Display name 1" value="Other">
</div></div></div></section>`
const choices = [{ id: 'catalog-model', name: 'Catalog Name', provider: 'anthropic' }]
const settle = async () => { await new Promise(setImmediate); await new Promise(setImmediate) }

function setup({ delayedCatalog = false, failedCatalog = false, initialMarkup = markup, storedOrder, remote = {
  settings: { describe: async () => ({ ok: true, value: { writable: true, namespaces: [] } }), mutate: async () => { throw new Error('unexpected settings write') } },
  llm: { listConfigurableProviders: async () => ({ ok: true, value: [] }) },
} } = {}) {
  const dom = new JSDOM(initialMarkup, { url: 'https://harness.test', runScripts: 'outside-only' })
  const { window } = dom
  if (storedOrder !== undefined) window.localStorage.setItem('dsh-relay-models:provider-order:v1', storedOrder)
  window.Headers = Headers
  let client
  let dispose
  let observed = 0
  const signals = []
  const posts = []
  const listeners = new Set()
  let catalogReady
  let postReady
  const observer = window.MutationObserver
  window.MutationObserver = class extends observer {
    observe(...args) { observed++; return super.observe(...args) }
  }
  const add = window.document.addEventListener.bind(window.document)
  const remove = window.document.removeEventListener.bind(window.document)
  window.document.addEventListener = (type, listener, options) => {
    if (type === 'input') listeners.add(listener)
    add(type, listener, options)
  }
  window.document.removeEventListener = (type, listener, options) => {
    if (type === 'input') listeners.delete(listener)
    remove(type, listener, options)
  }
  window.fetch = async (url, init) => {
    signals.push(init.signal)
    if (url.endsWith('/catalog')) {
      if (delayedCatalog) await new Promise(resolve => { catalogReady = resolve })
      if (failedCatalog) throw new Error('catalog unavailable')
      return { ok: true, json: async () => ({ choices, aliases: {} }) }
    }
    posts.push(JSON.parse(init.body))
    return new Promise((resolve, reject) => { postReady = { resolve, reject } })
  }
  window.__ModuleLoader__ = { load({ id, factory }) {
    assert.equal(id, 'dsh-relay-models')
    client = factory(() => { throw new Error('unexpected client runtime dependency') })
  } }
  window.eval(bundle)
  assert.deepEqual(Array.from(client.inject), ['remote', 'remote.settings', 'remote.llm'])
  client.apply({ remote, effect(setup) { dispose = setup() } })
  return {
    window, posts, signals, listeners, get observed() { return observed },
    releaseCatalog: () => catalogReady(),
    reply: status => postReady.resolve({ ok: status < 400, status }),
    fail: () => postReady.reject(new Error('offline')),
    dispose: () => dispose(), close: () => dom.window.close(),
  }
}

const app = setup()
try {
  await settle()
  const { window } = app
  const doc = window.document
  assert.equal(doc.querySelectorAll('#pi [data-dsh-relay]').length, 1)
  assert.equal(doc.querySelectorAll('#deepseek [data-dsh-relay]').length, 0)
  const select = doc.querySelector('select')
  const name = doc.querySelector('#pi input[aria-label^="Display name"]')
  const choose = () => { select.value = 'catalog-model'; select.dispatchEvent(new window.Event('change', { bubbles: true })) }
  choose()
  assert.equal(select.disabled, true)
  assert.equal(name.value, 'Original', 'do not update React input before POST success')
  choose()
  assert.equal(app.posts.length, 1)
  app.reply(400)
  await settle()
  assert.equal(select.value, '')
  assert.equal(name.value, 'Original')
  assert.match(doc.querySelector('[role="alert"]').textContent, /Could not save/)

  choose()
  app.fail()
  await settle()
  assert.equal(select.disabled, false)
  assert.equal(name.value, 'Original')
  let events = 0
  name.addEventListener('input', () => { events++ })
  choose()
  app.reply(204)
  await settle()
  assert.equal(name.value, 'Catalog Name')
  assert.equal(events, 1)
  assert.equal(select.value, 'catalog-model')

  choose()
  app.dispose()
  const observed = app.observed
  assert.ok(app.signals.every(signal => signal.aborted))
  assert.equal(app.listeners.size, 0)
  app.reply(204)
  doc.querySelector('#pi input').dispatchEvent(new window.Event('input', { bubbles: true }))
  await settle()
  assert.equal(app.observed, observed, 'disposed callbacks must not restart observation')
  assert.equal(doc.querySelectorAll('[data-dsh-relay]').length, 0)
} finally { app.dispose(); app.close() }

const late = setup({ delayedCatalog: true })
try {
  late.dispose()
  const observed = late.observed
  late.releaseCatalog()
  await settle()
  assert.equal(late.observed, observed)
  assert.equal(late.window.document.querySelectorAll('[data-dsh-relay]').length, 0)
} finally { late.close() }

// Match ProviderEditor's public DOM: the second header span is the route, not
// the display name shared by multiple providers in this fixture.
const editorMarkup = `<div id="editor"><div><span>Same name</span><span>relay</span></div>
  <div><input type="password" aria-label="API key"></div>
  <details open><summary>Custom settings</summary><div>
    <div><input aria-label="Display name" value="Same name"></div>
    <div><input aria-label="Base URL" value="https://relay.test/v1"></div>
    <div id="protocol"><select aria-label="API protocol"><option>openai-responses</option></select></div>
    <section aria-label="Models"><div><button id="reset">Restore defaults</button></div>
      <div><div><input aria-label="Model ID 1" value="catalog-model"><input aria-label="Display name 1" value="Catalog Name"></div></div>
    </section>
  </div></details><div><button>Cancel</button><button>Apply</button></div></div>`

function headerApp({ writable = true, alreadyOpen = false, validDirectory = true, deferredLoad = false } = {}) {
  const writes = []
  const section = { providers: {
    relay: { baseURL: 'https://relay.test/v1', headers: { 'User-Agent': 'old-agent', 'X-Tenant': 'old' } },
    other: { displayName: 'Same name', headers: { 'User-Agent': 'wrong-route' } },
  } }
  const view = { ns: 'llm-pi-ai', revision: 7, value: section, user: section }
  let writeReady
  let loadReady
  const remote = {
    settings: {
      describe: async () => {
        if (deferredLoad) await new Promise(resolve => { loadReady = resolve })
        return { ok: true, value: { writable, namespaces: [view] } }
      },
      mutate: async (ns, ops, revision) => {
        writes.push(JSON.parse(JSON.stringify({ ns, ops, revision })))
        return new Promise((resolve, reject) => { writeReady = { resolve, reject } })
      },
    },
    llm: { listConfigurableProviders: async () => ({ ok: true, value: ['relay', 'other'].map(provider => ({
      provider, displayName: 'Same name', settingsNs: validDirectory ? 'llm-pi-ai' : 'llm-other',
      settingsPath: ['providers', provider], declared: true,
    })) }) },
  }
  const app = setup({ failedCatalog: true, initialMarkup: alreadyOpen ? editorMarkup : '', remote })
  if (!alreadyOpen) app.window.document.body.innerHTML = editorMarkup
  return {
    ...app, writes,
    releaseLoad: () => loadReady(),
    succeed: () => writeReady.resolve({ ok: true, value: { ...view, revision: 8 } }),
    refuse: (code = 'settings/conflict') => writeReady.resolve({ ok: false, error: { code, message: 'write refused' } }),
    failWrite: () => writeReady.reject(new Error('offline')),
    controls: () => {
      const box = app.window.document.querySelector('[data-dsh-relay-headers]')
      return { box, input: box.querySelector('textarea'), save: box.querySelector('button'), status: box.querySelector('[role="status"]') }
    },
  }
}

const headers = headerApp()
try {
  await settle()
  const { box, input, save, status } = headers.controls()
  const doc = headers.window.document
  assert.equal(doc.querySelector('#protocol').nextElementSibling, box, 'insert immediately below API protocol')
  assert.deepEqual(JSON.parse(input.value), { 'User-Agent': 'old-agent', 'X-Tenant': 'old' })
  assert.equal(save.disabled, false, 'catalog failure must not disable Headers')
  const nativeApply = doc.querySelector('#editor > div:last-child > button:last-child')
  let applied = 0
  nativeApply.addEventListener('click', () => { applied++ })
  nativeApply.click()
  assert.equal(applied, 1, 'unchanged Headers do not block native Apply')
  input.value = '{"User-Agent":"unsaved"}'
  input.dispatchEvent(new headers.window.Event('input', { bubbles: true }))
  nativeApply.click()
  assert.equal(applied, 1, 'native Apply must not discard a Headers draft')
  assert.match(status.textContent, /unsaved edits/)
  const discard = box.querySelectorAll('button')[1]
  discard.click()
  assert.deepEqual(JSON.parse(input.value), { 'User-Agent': 'old-agent', 'X-Tenant': 'old' })
  nativeApply.click()
  assert.equal(applied, 2, 'explicit discard unblocks native Apply')
  for (const invalid of ['{', '[]', 'null', '"header"', '{"X":1}', '{"X":{}}',
    '{"X":"1","x":"2"}', '{"X":"1","X":"2"}', '{"X":"1","\\u0078":"2"}',
    '{"bad name":"x"}', '{"X":"\\r\\nx"}', '{"X":"x\\n"}', '{"X":"\\u0001"}', '{"X":"\\u007f"}', '{"X":"中文"}']) {
    input.value = invalid
    save.click()
    assert.equal(headers.writes.length, 0, invalid)
    assert.equal(input.getAttribute('aria-invalid'), 'true', invalid)
    assert.equal(input.value, invalid)
  }
  input.value = '{"User-Agent":"custom/1.0","X-Tenant":"new"}'
  input.dispatchEvent(new headers.window.Event('input', { bubbles: true }))
  save.click()
  save.click()
  assert.equal(headers.writes.length, 1, 'duplicate submit must not write twice')
  assert.deepEqual(headers.writes[0], {
    ns: 'llm-pi-ai', revision: 7,
    ops: [{ op: 'set', path: ['providers', 'relay', 'headers'], value: { 'User-Agent': 'custom/1.0', 'X-Tenant': 'new' } }],
  })
  headers.refuse()
  await settle()
  assert.equal(input.value, '{"User-Agent":"custom/1.0","X-Tenant":"new"}')
  assert.match(status.textContent, /draft is kept/)
  assert.equal(save.disabled, false)
  save.click()
  headers.failWrite()
  await settle()
  assert.match(status.textContent, /draft is kept/)
  assert.equal(input.value, '{"User-Agent":"custom/1.0","X-Tenant":"new"}')
  save.click()
  headers.succeed()
  await settle()
  assert.match(status.textContent, /saved.*reopen/)
  assert.equal(save.disabled, true)
  nativeApply.click()
  assert.equal(applied, 2, 'saved Headers require remount before native Apply uses a new revision')
  assert.equal(doc.querySelector('input[aria-label="Base URL"]').value, 'https://relay.test/v1')
  assert.equal(doc.querySelector('#editor').isConnected, true, 'never close or replace the native editor')
} finally { headers.dispose(); headers.close() }

const unset = headerApp()
try {
  await settle()
  const { input, save } = unset.controls()
  input.value = ' \n '
  save.click()
  assert.deepEqual(unset.writes[0].ops, [{ op: 'unset', path: ['providers', 'relay', 'headers'] }])
  const observed = unset.observed
  unset.dispose()
  unset.succeed()
  await settle()
  assert.equal(unset.observed, observed)
  assert.equal(unset.window.document.querySelector('[data-dsh-relay-headers]'), null)
  save.dispatchEvent(new unset.window.Event('click', { bubbles: true }))
  assert.equal(unset.writes.length, 1, 'disposal removes even detached button handlers')
} finally { unset.close() }

for (const target of ['input[aria-label="Base URL"]', 'input[aria-label="API key"]', '#reset']) {
  const dirty = headerApp()
  try {
    await settle()
    const native = dirty.window.document.querySelector(target)
    if (native.tagName === 'BUTTON') native.click()
    else {
      native.value = 'unsaved edit'
      native.dispatchEvent(new dirty.window.Event('input', { bubbles: true }))
    }
    const { input, save, status } = dirty.controls()
    input.value = '{"User-Agent":"do-not-save"}'
    save.click()
    assert.equal(dirty.writes.length, 0)
    assert.match(status.textContent, /Other fields were edited/)
    if (native.tagName === 'INPUT') assert.equal(native.value, 'unsaved edit')
  } finally { dirty.dispose(); dirty.close() }
}

for (const options of [{ writable: false }, { alreadyOpen: true }, { validDirectory: false }]) {
  const guarded = headerApp(options)
  try {
    await settle()
    const { save, status } = guarded.controls()
    save.dispatchEvent(new guarded.window.Event('click', { bubbles: true }))
    assert.equal(guarded.writes.length, 0)
    if (options.writable === false) assert.equal(save.disabled, true)
    if (options.alreadyOpen) assert.match(status.textContent, /reopen/)
    if (options.validDirectory === false) assert.equal(save.hidden, true)
  } finally { guarded.dispose(); guarded.close() }
}

const delayed = headerApp({ deferredLoad: true })
try {
  await settle()
  delayed.dispose()
  const observed = delayed.observed
  delayed.releaseLoad()
  await settle()
  assert.equal(delayed.observed, observed)
  assert.equal(delayed.window.document.querySelector('[data-dsh-relay-headers]'), null)
} finally { delayed.close() }

const create = setup({ failedCatalog: true, initialMarkup: '' })
try {
  create.window.document.body.innerHTML = '<div><input aria-label="Provider ID"><div><select aria-label="API protocol"></select></div></div>'
  await settle()
  const box = create.window.document.querySelector('[data-dsh-relay-headers]')
  assert.match(box.textContent, /create the provider first/)
  assert.equal(box.querySelector('button'), null)
} finally { create.dispose(); create.close() }

const orderKey = 'dsh-relay-models:provider-order:v1'
const handleSelector = '[data-dsh-relay-provider-handle]'
const providerMarkup = `<div role="dialog"><h2>Models</h2><ul>${['a', 'b', 'c'].map(id => `<li data-route="${id}"><div>
  <span><span>Same name</span></span><span><button aria-label="Edit Same name (${id})">Edit</button></span>
  </div></li>`).join('')}</ul></div>`
const visibleOrder = app => [...app.window.document.querySelectorAll('li[data-route]')].map(row => row.dataset.route)
const handleFor = (app, id) => app.window.document.querySelector(`li[data-route="${id}"] ${handleSelector}`)
const arrow = (app, id, key) => handleFor(app, id).dispatchEvent(new app.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
function dragEvent(app, type, target, y = 0) {
  const event = new app.window.Event(type, { bubbles: true, cancelable: true })
  Object.defineProperties(event, {
    clientY: { value: y },
    dataTransfer: { value: { types: [], setData(type) { this.types.push(type) }, setDragImage() {} } },
  })
  target.dispatchEvent(event)
  return event
}
const modelMarkup = `<div><button aria-haspopup="menu" aria-controls="picker-menu">Select model</button>
  <div role="menu" aria-label="Model and reasoning effort" id="picker-menu"><div>${['a', 'b', 'c'].map(id => `
    <section role="group" aria-labelledby="picker-${id}"><div id="picker-${id}">Same name</div>
      <button role="menuitemradio" aria-checked="${id === 'b'}">Model ${id}</button></section>`).join('')}
  </div></div></div>`
const groupOrder = app => [...app.window.document.querySelectorAll('[role="menu"] section[role="group"]')].map(row => row.getAttribute('aria-labelledby').replace(/^.*?-/, ''))
let persistedOrder
const sorting = setup({ failedCatalog: true, initialMarkup: providerMarkup + modelMarkup })
try {
  await settle()
  const doc = sorting.window.document
  assert.equal(doc.querySelectorAll(handleSelector).length, 3, 'sorting is independent of model catalog and Headers loading')
  assert.deepEqual(visibleOrder(sorting), ['a', 'b', 'c'])
  const b = doc.querySelector('[data-route="b"]')
  b.getBoundingClientRect = () => ({ top: 100, height: 40 })
  assert.equal(dragEvent(sorting, 'dragover', b, 110).defaultPrevented, false, 'do not intercept external drags')
  dragEvent(sorting, 'dragstart', handleFor(sorting, 'c'))
  assert.equal(dragEvent(sorting, 'dragover', b, 110).defaultPrevented, true)
  assert.equal(b.getAttribute('data-dsh-relay-provider-drop'), 'before')
  dragEvent(sorting, 'drop', b, 110)
  assert.deepEqual(visibleOrder(sorting), ['a', 'c', 'b'], 'drop before the upper half')
  assert.equal(doc.querySelector('[data-dsh-relay-provider-drop]'), null)
  dragEvent(sorting, 'dragstart', handleFor(sorting, 'a'))
  dragEvent(sorting, 'drop', b, 140)
  assert.deepEqual(visibleOrder(sorting), ['c', 'b', 'a'], 'drop after the lower half')
  handleFor(sorting, 'a').focus()
  arrow(sorting, 'a', 'ArrowUp')
  assert.deepEqual(visibleOrder(sorting), ['c', 'a', 'b'])
  assert.deepEqual(groupOrder(sorting), ['c', 'a', 'b'], 'settings saves immediately reorder open composer groups with duplicate display names')
  assert.equal(doc.querySelector('[aria-checked="true"]').textContent, 'Model b', 'sorting never changes the selected model')
  assert.equal(doc.activeElement, handleFor(sorting, 'a'), 'keyboard reordering preserves focus')
  persistedOrder = sorting.window.localStorage.getItem(orderKey)
  assert.deepEqual(JSON.parse(persistedOrder), ['c', 'a', 'b'])
  arrow(sorting, 'c', 'ArrowUp')
  assert.equal(sorting.window.localStorage.getItem(orderKey), persistedOrder, 'boundary movement does not rewrite storage')
  dragEvent(sorting, 'dragstart', handleFor(sorting, 'c'))
  dragEvent(sorting, 'dragover', b, 110)
  dragEvent(sorting, 'dragend', handleFor(sorting, 'c'))
  assert.deepEqual(visibleOrder(sorting), ['c', 'a', 'b'], 'canceled drags do not move rows')
  assert.equal(doc.querySelector('[data-dsh-relay-provider-drop], [data-dsh-relay-provider-dragging]'), null)
  const outside = doc.createElement('input')
  outside.value = 'keep native draft'
  doc.querySelector('[role="dialog"]').append(outside)
  const started = dragEvent(sorting, 'dragstart', handleFor(sorting, 'c'))
  assert.deepEqual(started.dataTransfer.types, ['application/x-dsh-relay-provider'], 'never export sortable IDs as droppable text')
  assert.equal(dragEvent(sorting, 'drop', outside).defaultPrevented, true, 'cancel internal drops outside the provider list')
  assert.equal(outside.value, 'keep native draft')
  assert.deepEqual(visibleOrder(sorting), ['c', 'a', 'b'])
  assert.equal(doc.querySelector('[data-dsh-relay-provider-dragging]'), null)
  b.querySelector('div > span > span').firstChild.nodeValue = 'Renamed only'
  b.querySelector('button[aria-label^="Edit "]').setAttribute('aria-label', 'Edit Renamed only (b)')
  await settle()
  assert.equal(handleFor(sorting, 'b').getAttribute('aria-label'), 'Reorder Renamed only (b)', 'pure text/attribute changes update accessible names')
  const originalSet = sorting.window.Storage.prototype.setItem
  sorting.window.Storage.prototype.setItem = () => { throw new Error('quota exceeded') }
  arrow(sorting, 'a', 'ArrowDown')
  assert.deepEqual(visibleOrder(sorting), ['c', 'a', 'b'], 'storage failure leaves the previous order intact')
  assert.deepEqual(groupOrder(sorting), ['c', 'a', 'b'], 'failed save cannot change composer order')
  assert.match(doc.querySelector('#dsh-relay-provider-order-hint').textContent, /Could not save/)
  sorting.window.Storage.prototype.setItem = originalSet
  await settle()
  const observed = sorting.observed
  await settle()
  assert.equal(sorting.observed, observed, 'already-sorted rows do not trigger an observer loop')
  sorting.window.localStorage.removeItem(orderKey)
  sorting.window.dispatchEvent(new sorting.window.StorageEvent('storage', { key: orderKey }))
  assert.deepEqual(visibleOrder(sorting), ['a', 'b', 'c'], 'clearing the preference in another tab restores the native baseline')
  assert.deepEqual(groupOrder(sorting), ['a', 'b', 'c'])
  sorting.window.localStorage.setItem(orderKey, persistedOrder)
  sorting.window.dispatchEvent(new sorting.window.StorageEvent('storage', { key: orderKey }))
  assert.deepEqual(visibleOrder(sorting), ['c', 'a', 'b'])
  const detachedHandle = handleFor(sorting, 'a')
  detachedHandle.focus()
  sorting.dispose()
  assert.equal(doc.activeElement, doc.querySelector('[data-route="a"] button[aria-label^="Edit "]'), 'unload hands focus back to the native edit button')
  assert.deepEqual(visibleOrder(sorting), ['a', 'b', 'c'], 'unloading restores the recorded native order')
  assert.deepEqual(groupOrder(sorting), ['a', 'b', 'c'], 'unload restores the open composer too')
  assert.equal(doc.querySelector(handleSelector), null)
  assert.equal(doc.querySelector('#dsh-relay-provider-order-hint'), null)
  detachedHandle.dispatchEvent(new sorting.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
  assert.equal(sorting.window.localStorage.getItem(orderKey), persistedOrder, 'unloading retains the preference but removes all handlers')
} finally { sorting.dispose(); sorting.close() }

for (const [storedOrder, expected] of [
  [persistedOrder, ['c', 'a', 'b']],
  ['["gone","b","b","a"]', ['b', 'a', 'c']],
  ['{broken', ['a', 'b', 'c']],
  ['[1,"b"]', ['a', 'b', 'c']],
]) {
  const restored = setup({ failedCatalog: true, initialMarkup: providerMarkup, storedOrder })
  try {
    await settle()
    assert.deepEqual(visibleOrder(restored), expected, 'reload restores valid IDs, ignores missing IDs, and tolerates corrupt storage')
    restored.window.document.body.innerHTML = providerMarkup
    await settle()
    assert.deepEqual(visibleOrder(restored), expected, 'closing/reopening settings restores the preference')
    assert.equal(restored.window.document.querySelectorAll(handleSelector).length, 3)
  } finally { restored.dispose(); restored.close() }
}
const removedSource = setup({ initialMarkup: providerMarkup })
try {
  await settle()
  const doc = removedSource.window.document
  const source = doc.querySelector('[data-route="a"]')
  dragEvent(removedSource, 'dragstart', handleFor(removedSource, 'a'))
  source.remove()
  await settle()
  assert.equal(source.hasAttribute('data-dsh-relay-provider-dragging'), false, 'deleting the source cancels an in-progress drag')
  dragEvent(removedSource, 'drop', doc.querySelector('[data-route="b"]'))
  assert.equal(removedSource.window.localStorage.getItem(orderKey), null)
  removedSource.dispose()
  assert.deepEqual(visibleOrder(removedSource), ['b', 'c'], 'cleanup only reorders live siblings')
} finally { removedSource.dispose(); removedSource.close() }
const unrelatedList = setup({ initialMarkup: providerMarkup.replace('<h2>Models</h2>', '<h2>Other settings</h2>') })
try {
  await settle()
  assert.equal(unrelatedList.window.document.querySelector(handleSelector), null, 'never sort similarly-shaped lists outside Models settings')
} finally { unrelatedList.dispose(); unrelatedList.close() }
const setupCard = setup({ initialMarkup: providerMarkup.replace('<ul>', '<ul><li><div>First-run setup card</div></li>') })
try {
  await settle()
  assert.equal(setupCard.window.document.querySelector(handleSelector), null, 'fail closed on an unmapped native row')
} finally { setupCard.dispose(); setupCard.close() }

// Exercise actual keyed React reconciliation, not just a static DOM fixture.
const reactApp = setup({ failedCatalog: true, initialMarkup: '<div id="react-root"></div>', storedOrder: persistedOrder })
const oldWindow = globalThis.window
const oldDocument = globalThis.document
globalThis.window = reactApp.window
globalThis.document = reactApp.window.document
const reactRequire = createRequire(resolve(process.env.DSH_SOURCE, 'packages/client/ui-renderer/package.json'))
const React = reactRequire('react')
const { createRoot } = reactRequire('react-dom/client')
const { flushSync } = reactRequire('react-dom')
const root = createRoot(reactApp.window.document.querySelector('#react-root'))
let providers = ['a', 'b', 'c'].map(id => ({ id, name: 'Same name' }))
let editorMounts = 0
function NativeEditor() {
  const [draft, setDraft] = React.useState('original')
  React.useEffect(() => { editorMounts++ }, [])
  return React.createElement('input', { 'aria-label': 'Native draft', value: draft, onInput: event => setDraft(event.currentTarget.value) })
}
function NativeRow({ id, name }) {
  const [open, setOpen] = React.useState(false)
  const label = id === name ? id : `${name} (${id})`
  return React.createElement('li', { 'data-route': id },
    React.createElement('div', null,
      React.createElement('span', null, React.createElement('span', null, name)),
      React.createElement('span', null,
        React.createElement('button', { 'aria-label': `Edit ${label}`, onClick: () => setOpen(!open) }, 'Edit'),
        React.createElement('button', { 'aria-label': `Delete ${label}`, onClick: () => { providers = providers.filter(row => row.id !== id); renderNative() } }, 'Delete'),
      ),
    ),
    open ? React.createElement(NativeEditor) : null,
  )
}
function renderNative() {
  root.render(React.createElement('div', { role: 'dialog' },
    React.createElement('h2', null, 'Models'),
    React.createElement('ul', null, providers.map(row => React.createElement(NativeRow, { key: row.id, ...row }))),
  ))
}
try {
  flushSync(renderNative)
  await settle()
  assert.deepEqual(visibleOrder(reactApp), ['c', 'a', 'b'])
  const doc = reactApp.window.document
  flushSync(() => doc.querySelector('[data-route="a"] button[aria-label^="Edit "]').click())
  await settle()
  const draft = doc.querySelector('input')
  flushSync(() => { draft.value = 'unsaved draft'; draft.dispatchEvent(new reactApp.window.Event('input', { bubbles: true })) })
  draft.focus()
  draft.setSelectionRange(2, 7)
  arrow(reactApp, 'a', 'ArrowUp')
  assert.deepEqual(visibleOrder(reactApp), ['a', 'c', 'b'])
  assert.equal(doc.activeElement, draft)
  assert.equal(draft.selectionStart, 2)
  assert.equal(draft.selectionEnd, 7)
  for (let i = 0; i < 6; i++) {
    providers = [...providers.map(row => ({ ...row, name: row.id === 'a' ? `Renamed (${i})` : row.name })), { id: `new-${i}`, name: `new-${i}` }]
    flushSync(renderNative)
    await settle()
    assert.equal(visibleOrder(reactApp).at(-1), `new-${i}`, 'new provider appears last')
    assert.equal(handleFor(reactApp, 'a').getAttribute('aria-label'), `Reorder Renamed (${i}) (a)`)
    arrow(reactApp, `new-${i}`, 'ArrowUp')
    flushSync(() => doc.querySelector(`[data-route="new-${i}"] button[aria-label^="Delete "]`).click())
    await settle()
    assert.equal(doc.querySelector('input'), draft, 'React retains the exact editor node through sorting, renaming, additions and deletions')
    assert.equal(draft.value, 'unsaved draft')
    assert.equal(editorMounts, 1, 'sorting must not remount the editor')
    assert.equal(doc.querySelectorAll(handleSelector).length, 3, 'no duplicate handles after native rerenders')
  }
  reactApp.dispose()
  assert.deepEqual(visibleOrder(reactApp), ['a', 'b', 'c'], 'cleanup never resurrects deleted React rows')
  flushSync(() => root.unmount())
} finally {
  reactApp.dispose()
  reactApp.close()
  if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow
  if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument
}

for (const invalidMarkup of [
  modelMarkup.replace('Model and reasoning effort', 'Unrelated menu'),
  modelMarkup.replace('aria-controls="picker-menu"', 'aria-controls="other-menu"'),
  modelMarkup.replace('aria-labelledby="picker-a"', 'aria-labelledby="wrong-heading"'),
]) {
  const guarded = setup({ initialMarkup: invalidMarkup, storedOrder: '["c","a","b"]' })
  try {
    await settle()
    assert.deepEqual([...guarded.window.document.querySelectorAll('[role="menuitemradio"]')].map(button => button.textContent), ['Model a', 'Model b', 'Model c'], 'unrecognized menus remain untouched')
  } finally { guarded.dispose(); guarded.close() }
}

// Render the current Harness ModelSelect itself; only decorative primitives are stubbed.
const { build } = await import('esbuild')
const compiled = await build({
  entryPoints: [resolve(process.env.DSH_SOURCE, 'packages/client/ui-model-selection/src/client/ModelSelect.tsx')],
  bundle: true, platform: 'node', format: 'cjs', write: false, loader: { '.module.css': 'empty' },
  external: ['react', '@deepseek-ai/dsh-client-ui-primitives'], logLevel: 'silent',
})
const compiledModule = { exports: {} }
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(name => {
  if (name === 'react') return React
  if (name === 'react/jsx-runtime') return reactRequire(name)
  if (name === '@deepseek-ai/dsh-client-ui-primitives') return new Proxy({}, { get: () => () => null })
  throw new Error(`unexpected ModelSelect dependency: ${name}`)
}, compiledModule, compiledModule.exports)
const { ModelSelect } = compiledModule.exports
const picker = setup({ failedCatalog: true, initialMarkup: '<div id="picker-root"></div>', storedOrder: '["c","a","b"]' })
globalThis.window = picker.window
globalThis.document = picker.window.document
const oldNode = globalThis.Node
globalThis.Node = picker.window.Node
const pickerRoot = createRoot(picker.window.document.querySelector('#picker-root'))
let pickerState = {
  current: { provider: 'b', model: 'model-b', reasoningEffort: 'high' }, routable: true,
  groups: ['a', 'b', 'c'].map(id => ({ id, name: 'Same name', models: [{ id: `model-${id}`, name: `Model ${id}`, reasoning: {
    efforts: [{ id: 'high', name: 'High' }], defaultEffort: 'high',
  } }] })), failures: [], status: 'ready', error: null,
}
const listeners = new Set()
const selections = []
const props = {
  locked: false, available: true,
  directory: { subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) }, getSnapshot: () => pickerState },
  load() {}, select: async selection => { selections.push(selection); return true },
  t: key => key === 'menu.aria' ? 'Model and reasoning effort' : key,
}
const pickerDoc = picker.window.document
const clickPicker = target => flushSync(() => target.click())
const pickerTrigger = () => pickerDoc.querySelector('button[aria-haspopup="menu"]')
const pickerModels = () => [...pickerDoc.querySelectorAll('section[role="group"] > button')]
const pickerOrder = () => pickerModels().map(button => button.textContent)
const openModels = async () => {
  clickPicker(pickerTrigger())
  clickPicker(pickerDoc.querySelector('[role="menuitem"]'))
  await settle()
}
const pickerKey = (target, key) => flushSync(() => target.dispatchEvent(new picker.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })))
try {
  flushSync(() => pickerRoot.render(React.createElement(ModelSelect, props)))
  await openModels()
  assert.deepEqual(pickerOrder(), ['Model c', 'Model a', 'Model b'], 'real ModelSelect uses saved order without Settings mounted')
  const selected = pickerDoc.querySelector('[aria-checked="true"]')
  assert.equal(selected.textContent, 'Model b')
  flushSync(() => selected.focus())
  pickerKey(selected, 'ArrowDown')
  assert.equal(pickerDoc.activeElement.textContent, 'Model c', 'arrow traversal wraps in visible rather than React ref order')
  pickerKey(pickerDoc.activeElement, 'ArrowUp')
  assert.equal(pickerDoc.activeElement, selected)
  flushSync(() => pickerTrigger().focus())
  pickerKey(pickerTrigger(), 'ArrowUp')
  assert.equal(pickerDoc.activeElement, selected, 'trigger arrow traversal also uses the visible order')

  // Exercise the insertBefore fallback: a native removal-induced blur would close ModelSelect.
  const groupList = selected.parentElement.parentElement
  groupList.moveBefore = undefined
  picker.window.localStorage.setItem(orderKey, '["b","c","a"]')
  flushSync(() => picker.window.dispatchEvent(new picker.window.StorageEvent('storage', { key: orderKey })))
  assert.deepEqual(pickerOrder(), ['Model b', 'Model c', 'Model a'])
  assert.equal(pickerDoc.activeElement, selected, 'fallback moves siblings around the focused group')
  assert.equal(selections.length, 0)

  pickerState = { ...pickerState, groups: [...pickerState.groups.filter(group => group.id !== 'a'), {
    id: 'new-provider/with-hyphens', name: 'Same name', models: [{ id: 'new', name: 'New model' }],
  }] }
  flushSync(() => { for (const listener of listeners) listener() })
  await settle()
  assert.deepEqual(pickerOrder(), ['Model b', 'Model c', 'New model'], 'native add/remove preserves IDs and appends unknown providers')
  assert.equal(pickerDoc.querySelector('[aria-checked="true"]'), selected)
  assert.equal(pickerDoc.activeElement, selected)
  clickPicker(pickerModels()[1])
  await settle()
  assert.deepEqual(selections, [{ provider: 'c', model: 'model-c' }], 'reordered native click still submits the exact provider/model')
  assert.equal(pickerDoc.querySelector('[role="menu"]'), null)
  await openModels()
  assert.deepEqual(pickerOrder(), ['Model b', 'Model c', 'New model'], 'reopened menu reuses saved order')
  pickerKey(pickerTrigger(), 'Escape')
  assert.equal(pickerDoc.querySelector('section[role="group"]'), null)
  clickPicker(pickerDoc.querySelectorAll('[role="menuitem"]')[1])
  assert.equal(pickerDoc.querySelector('[role="menuitemradio"]').textContent, 'High', 'reasoning pane is not sorted')
  pickerKey(pickerTrigger(), 'Escape')
  clickPicker(pickerDoc.querySelector('[role="menuitem"]'))
  await settle()
  flushSync(() => picker.dispose())
  assert.deepEqual(pickerOrder(), ['Model b', 'Model c', 'New model'], 'dispose restores current native group order without resurrecting removals')
  flushSync(() => pickerRoot.unmount())
} finally {
  picker.dispose(); picker.close()
  if (oldWindow === undefined) delete globalThis.window; else globalThis.window = oldWindow
  if (oldDocument === undefined) delete globalThis.document; else globalThis.document = oldDocument
  if (oldNode === undefined) delete globalThis.Node; else globalThis.Node = oldNode
}

console.log('Client bundle smoke passed: catalog/Headers, provider sorting and real Harness ModelSelect order, keyboard, selection, React updates and cleanup')
