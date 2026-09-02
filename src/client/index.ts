export const inject: string[] = []

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
  const label = node.getAttribute('aria-label') ?? ''
  return label.startsWith('模型 ID ') || label.startsWith('Model ID ')
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

function sync(choices: readonly CatalogChoice[], aliases: Record<string, string>): void {
  if (choices.length === 0) return
  const ids = new Set(choices.map(choice => choice.id))
  const seen = new Set<HTMLElement>()
  for (const input of document.querySelectorAll(ID_SELECTOR)) {
    if (!(input instanceof HTMLInputElement)) continue
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
      select.addEventListener('change', () => {
        const modelId = input.value.trim()
        if (modelId.length === 0) return
        const catalogId = select.value
        if (catalogId.length === 0) delete aliases[modelId]
        else aliases[modelId] = catalogId
        const choice = choices.find(item => item.id === catalogId)
        const nameInput = entry.querySelector(NAME_SELECTOR)
        if (choice !== undefined && nameInput instanceof HTMLInputElement && nameInput.value !== choice.name) {
          setReactInput(nameInput, choice.name)
        }
        void fetch('/dsh-relay-models/alias', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: modelId, catalogId }),
        })
      })
      paintSelect(select, choices)
      box.append(label, select)
      input.parentElement?.after(box)
    }
    const select = box.querySelector('select')
    if (select instanceof HTMLSelectElement) select.value = aliases[id] ?? ''
  }
  for (const stale of document.querySelectorAll(`[${MARK}]`)) {
    const parent = stale.parentElement
    if (parent instanceof HTMLElement && !seen.has(parent)) stale.remove()
  }
}

export function apply(): void {
  let choices: CatalogChoice[] = []
  let aliases: Record<string, string> = {}
  let scheduled = false
  const observer = new MutationObserver(() => { schedule() })
  const observe = (): void => {
    observer.observe(document.body, { childList: true, subtree: true })
  }
  const schedule = (): void => {
    if (scheduled || choices.length === 0) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      observer.disconnect()
      try {
        sync(choices, aliases)
      } finally {
        observe()
      }
    })
  }

  void fetch('/dsh-relay-models/catalog')
    .then(async response => response.ok ? await response.json() as unknown : [])
    .then((body) => {
      const rows = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.choices) ? body.choices : []
      if (isRecord(body) && isRecord(body.aliases)) {
        aliases = Object.fromEntries(Object.entries(body.aliases).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
      }
      choices = rows.filter((row): row is CatalogChoice =>
        isRecord(row) && typeof row.id === 'string' && typeof row.name === 'string' && typeof row.provider === 'string')
      schedule()
    })
    .catch(() => {})

  observe()
  document.addEventListener('input', (event) => { if (isIdInput(event.target)) schedule() }, true)
}
