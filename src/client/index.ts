import { removeHeaders, syncHeaders } from './headers.ts'
import type { HeadersRemote } from './headers.ts'
import { createProviderSorting } from './provider-order.ts'

export const inject = ['remote', 'remote.settings', 'remote.llm']

interface CatalogChoice {
  id: string
  name: string
  provider: string
}

const MARK = 'data-dsh-relay'
const ID_SELECTOR = 'input[aria-label^="模型 ID "], input[aria-label^="Model ID "]'
const NAME_SELECTOR = 'input[aria-label^="显示名称 "], input[aria-label^="Display name "]'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function autoMatched(id: string, ids: Set<string>): boolean {
  if (ids.has(id)) return true
  const slash = id.lastIndexOf('/')
  return slash >= 0 && ids.has(id.slice(slash + 1))
}

function isIdInput(node: EventTarget | null): node is HTMLInputElement {
  if (!(node instanceof HTMLInputElement)) return false
  // alpha.1 pi-ai entries are direct catalog children; DeepSeek adds a modelList wrapper.
  return node.matches(ID_SELECTOR)
    && node.parentElement?.parentElement?.parentElement?.matches('section[aria-label="Models"], section[aria-label="模型目录"]') === true
}

function zh(): boolean {
  return typeof document !== 'undefined' && document.documentElement.lang.startsWith('zh')
}

function setReactInput(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function paintSelect(select: HTMLSelectElement, choices: readonly CatalogChoice[]): void {
  if (select.dataset.dshPainted === '1') return
  const groups = new Map<string, CatalogChoice[]>()
  for (const choice of choices) {
    const list = groups.get(choice.provider) ?? []
    list.push(choice)
    groups.set(choice.provider, list)
  }
  const none = document.createElement('option')
  none.value = ''
  none.textContent = zh() ? '不补全' : 'Skip'
  select.append(none)
  for (const [provider, list] of groups) {
    const group = document.createElement('optgroup')
    group.label = provider
    for (const choice of list) {
      const option = document.createElement('option')
      option.value = choice.id
      option.textContent = `${choice.id} — ${choice.name}`
      group.append(option)
    }
    select.append(group)
  }
  select.dataset.dshPainted = '1'
}

function sync(choices: readonly CatalogChoice[], aliases: Record<string, string>, signal: AbortSignal): void {
  if (choices.length === 0) return
  const ids = new Set(choices.map(choice => choice.id))
  const seen = new Set<HTMLElement>()
  for (const input of document.querySelectorAll(ID_SELECTOR)) {
    if (!isIdInput(input)) continue
    const entry = input.parentElement?.parentElement
    if (!(entry instanceof HTMLElement)) continue
    const id = input.value.trim()
    let box = entry.querySelector<HTMLElement>(`[${MARK}]`)
    if (id.length === 0 || autoMatched(id, ids)) {
      box?.remove()
      continue
    }
    seen.add(entry)
    if (box == null) {
      box = document.createElement('div')
      box.setAttribute(MARK, '')
      box.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding:0 0 8px;min-width:0'
      const label = document.createElement('span')
      label.style.cssText = 'font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)'
      label.textContent = zh() ? '未匹配：从 pi.dev 选一条补全能力' : 'Unmatched: pick a pi.dev model to fill capabilities'
      const select = document.createElement('select')
      select.style.cssText = 'font-size:13px;line-height:20px;padding:4px 8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-primary);color:var(--dsw-alias-label-primary)'
      const error = document.createElement('span')
      error.setAttribute('role', 'alert')
      error.style.cssText = 'font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary)'
      select.addEventListener('change', async () => {
        const modelId = input.value.trim()
        if (signal.aborted || input.disabled || select.disabled || modelId.length === 0) return
        const catalogId = select.value
        const nameInput = entry.querySelector(NAME_SELECTOR)
        const originalName = nameInput instanceof HTMLInputElement ? nameInput.value : undefined
        select.dataset.dshPending = '1'
        select.disabled = true
        error.textContent = ''
        try {
          const response = await fetch('/dsh-relay-models/alias', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: modelId, catalogId }),
            signal,
          })
          if (signal.aborted) return
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          if (catalogId.length === 0) delete aliases[modelId]
          else aliases[modelId] = catalogId
          const choice = choices.find(item => item.id === catalogId)
          if (select.isConnected && input.value.trim() === modelId && choice !== undefined
            && nameInput instanceof HTMLInputElement && !nameInput.disabled
            && nameInput.value === originalName && nameInput.value !== choice.name) {
            setReactInput(nameInput, choice.name)
          }
        } catch {
          if (!signal.aborted && select.isConnected && input.value.trim() === modelId) {
            error.textContent = zh() ? '保存失败，请重试。' : 'Could not save. Please try again.'
          }
        } finally {
          if (!signal.aborted && select.isConnected) {
            delete select.dataset.dshPending
            select.disabled = input.disabled
            select.value = aliases[input.value.trim()] ?? ''
          }
        }
      }, { signal })
      paintSelect(select, choices)
      box.append(label, select, error)
      input.parentElement?.after(box)
    }
    if (box.dataset.dshModelId !== id) {
      box.dataset.dshModelId = id
      const error = box.querySelector('[role="alert"]')
      if (error !== null) error.textContent = ''
    }
    const select = box.querySelector('select')
    if (select instanceof HTMLSelectElement) {
      select.setAttribute('aria-label', zh() ? `补全能力 ${id}` : `Fill capabilities ${id}`)
      if (select.dataset.dshPending !== '1') {
        select.value = aliases[id] ?? ''
        select.disabled = input.disabled
      }
    }
  }
  for (const stale of document.querySelectorAll(`[${MARK}]`)) {
    const parent = stale.parentElement
    if (parent instanceof HTMLElement && !seen.has(parent)) stale.remove()
  }
}

export function apply(ctx: { remote: HeadersRemote; effect: (setup: () => () => void) => unknown }): void {
  ctx.effect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const syncProviderSorting = createProviderSorting(signal)
    let choices: CatalogChoice[] = []
    let aliases: Record<string, string> = {}
    let scheduled = false
    const observer = new MutationObserver(() => { schedule() })
    const observe = (): void => {
      if (!signal.aborted) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label'] })
    }
    const schedule = (): void => {
      if (signal.aborted || scheduled) return
      scheduled = true
      queueMicrotask(() => {
        scheduled = false
        if (signal.aborted) return
        observer.disconnect()
        try {
          sync(choices, aliases, signal)
          syncHeaders(ctx.remote, signal)
          syncProviderSorting()
        } finally {
          observe()
        }
      })
    }

    void fetch('/dsh-relay-models/catalog', { signal })
      .then(async response => response.ok ? await response.json() as unknown : [])
      .then((body) => {
        if (signal.aborted) return
        const rows = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.choices) ? body.choices : []
        if (isRecord(body) && isRecord(body.aliases)) {
          aliases = Object.fromEntries(Object.entries(body.aliases).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
        }
        choices = rows.filter((row): row is CatalogChoice =>
          isRecord(row) && typeof row.id === 'string' && typeof row.name === 'string' && typeof row.provider === 'string')
        schedule()
      })
      .catch(() => {})

    const onInput = (event: Event): void => { if (isIdInput(event.target)) schedule() }
    syncHeaders(ctx.remote, signal, true)
    syncProviderSorting()
    observe()
    document.addEventListener('input', onInput, true)
    return () => {
      controller.abort()
      observer.disconnect()
      document.removeEventListener('input', onInput, true)
      for (const box of document.querySelectorAll(`[${MARK}]`)) box.remove()
      removeHeaders()
    }
  })
}
