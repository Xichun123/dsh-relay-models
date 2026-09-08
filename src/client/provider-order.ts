const KEY = 'dsh-relay-models:provider-order:v1'
const HANDLE = 'data-dsh-relay-provider-handle'
const DRAGGING = 'data-dsh-relay-provider-dragging'
const DROP = 'data-dsh-relay-provider-drop'
const HINT = 'dsh-relay-provider-order-hint'

interface OrderedRow {
  element: HTMLElement
  id: string
}

interface Row extends OrderedRow {
  element: HTMLLIElement
  head: HTMLElement
  label: string
}

function text(en: string, zh: string): string {
  return document.documentElement.lang.startsWith('zh') ? zh : en
}

/** alpha.1's providerTargetLabel includes the exact route, even for duplicate names. */
function readRows(list: HTMLUListElement): Row[] {
  const rows: Row[] = []
  for (const element of list.children) {
    if (!(element instanceof HTMLLIElement)) return []
    const head = element.firstElementChild
    const name = head?.querySelector(':scope > span:first-of-type > span:first-child')?.textContent
    const edit = head?.querySelector(':scope > span > button[aria-label^="Edit "], :scope > span > button[aria-label^="编辑 "]')
    const label = edit?.getAttribute('aria-label')?.replace(/^(?:Edit|编辑) /, '')
    if (!(head instanceof HTMLElement) || !name || !label) return []
    const id = label === name ? label
      : label.startsWith(`${name} (`) && label.endsWith(')') ? label.slice(name.length + 2, -1) : ''
    if (!id || rows.some(row => row.id === id)) return []
    rows.push({ element, head, id, label })
  }
  return rows
}

function readOrder(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(value) && value.every(id => typeof id === 'string' && id.length > 0)
      ? [...new Set(value as string[])] : []
  } catch { return [] }
}

/** Keep React-owned rows in their original parent; never clone or replace an editor. */
function arrange(list: HTMLElement, rows: OrderedRow[], order: string[]): void {
  const rank = new Map(order.map((id, index) => [id, index]))
  const sorted = [...rows].sort((a, b) => (rank.get(a.id) ?? order.length) - (rank.get(b.id) ?? order.length))
  const focused = document.activeElement
  const selection = (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)
    && focused.selectionStart !== null ? [focused.selectionStart, focused.selectionEnd, focused.selectionDirection] as const : undefined
  // moveBefore preserves focus/composition in supporting browsers; older ones need refocusing.
  const move = (list as HTMLElement & { moveBefore?: (node: Node, child: Node | null) => void }).moveBefore
  let next = list.firstElementChild
  for (const row of sorted) {
    if (row.element !== next) {
      if (move !== undefined) move.call(list, row.element, next)
      else if (row.element.contains(focused)) {
        // Keep the focused subtree attached: ModelSelect closes on a removal-induced blur.
        while (next !== null && next !== row.element) {
          const displaced = next
          next = next.nextElementSibling
          list.append(displaced)
        }
      } else list.insertBefore(row.element, next)
    }
    next = row.element.nextElementSibling
  }
  if (focused instanceof HTMLElement && list.contains(focused) && document.activeElement !== focused) {
    focused.focus({ preventScroll: true })
    if (selection !== undefined && (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)) {
      focused.setSelectionRange(selection[0], selection[1], selection[2] ?? undefined)
    }
  }
}

const MODEL_MENU = '[role="menu"][aria-label="Model and reasoning effort"], [role="menu"][aria-label="模型与推理等级"]'

/** alpha.2 ties menu and group heading IDs to the same useId; provider IDs stay opaque. */
function modelRows(menu: HTMLElement): { list: HTMLElement; rows: OrderedRow[] } | undefined {
  if (!menu.id.endsWith('-menu')) return undefined
  const trigger = menu.parentElement?.querySelector('button[aria-haspopup="menu"]')
  if (trigger?.getAttribute('aria-controls') !== menu.id) return undefined
  const list = menu.querySelector('section[role="group"]')?.parentElement
  if (!(list instanceof HTMLElement) || list.parentElement !== menu) return undefined
  const prefix = `${menu.id.slice(0, -5)}-`
  const rows: OrderedRow[] = []
  for (const element of list.children) {
    const heading = element.firstElementChild
    if (!(element instanceof HTMLElement) || !element.matches('section[role="group"]')
      || !heading?.id.startsWith(prefix) || element.getAttribute('aria-labelledby') !== heading.id
      || !element.querySelector(':scope > button[role="menuitemradio"]')) return undefined
    const id = heading.id.slice(prefix.length)
    if (!id || rows.some(row => row.id === id)) return undefined
    rows.push({ element, id })
  }
  return rows.length > 0 ? { list, rows } : undefined
}

/** Browser-only view preference: no settings revision or provider configuration writes. */
export function createProviderSorting(signal: AbortSignal): () => void {
  let order = readOrder()
  let list: HTMLUListElement | undefined
  let original: string[] = []
  const modelLists = new Map<HTMLElement, { menu: HTMLElement; original: string[] }>()
  const syncModels = (): void => {
    const seen = new Set<HTMLElement>()
    for (const menu of document.querySelectorAll<HTMLElement>(MODEL_MENU)) {
      const found = modelRows(menu)
      if (found === undefined) continue
      const { list, rows } = found
      seen.add(list)
      const baseline = modelLists.get(list) ?? { menu, original: [] }
      for (const row of rows) if (!baseline.original.includes(row.id)) baseline.original.push(row.id)
      modelLists.set(list, baseline)
      arrange(list, rows, [...order, ...baseline.original.filter(id => !order.includes(id))])
    }
    for (const list of modelLists.keys()) if (!seen.has(list)) modelLists.delete(list)
  }
  let hintLocale: string | undefined
  const handles = new Map<HTMLLIElement, HTMLButtonElement>()
  let dragged: HTMLLIElement | undefined
  let indicator: HTMLLIElement | undefined
  const hint = document.createElement('p')
  hint.id = HINT
  hint.setAttribute('role', 'status')
  hint.setAttribute('aria-live', 'polite')
  hint.style.cssText = 'margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)'
  const style = document.createElement('style')
  style.textContent = `
    button[${HANDLE}] { display:inline-flex;align-items:center;justify-content:center;flex:none;width:24px;height:28px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);font:20px/1 sans-serif;cursor:grab; }
    button[${HANDLE}]:hover { background:var(--dsw-alias-interactive-bg-hover); }
    button[${HANDLE}]:focus-visible { outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px; }
    li[${DRAGGING}] { opacity:0.5; }
    li[${DROP}="before"] { box-shadow:0 -3px 0 var(--dsw-alias-brand-primary); }
    li[${DROP}="after"] { box-shadow:0 3px 0 var(--dsw-alias-brand-primary); }
  `
  document.head.append(style)

  const clearIndicator = (): void => { indicator?.removeAttribute(DROP); indicator = undefined }
  const endDrag = (): void => {
    dragged?.removeAttribute(DRAGGING)
    dragged = undefined
    clearIndicator()
  }
  const detach = (): void => {
    endDrag()
    if (list !== undefined) arrange(list, readRows(list), original)
    for (const [row, handle] of handles) {
      if (document.activeElement === handle) row.querySelector<HTMLButtonElement>('button[aria-label^="Edit "], button[aria-label^="编辑 "]')?.focus({ preventScroll: true })
      handle.remove()
    }
    handles.clear()
    hint.remove()
    list = undefined
    original = []
  }
  const rowAt = (target: EventTarget | null): HTMLLIElement | undefined => {
    const row = target instanceof Element ? target.closest('li') : null
    return row instanceof HTMLLIElement && row.parentElement === list && handles.has(row) ? row : undefined
  }
  const handleAt = (target: EventTarget | null): HTMLLIElement | undefined => {
    const row = rowAt(target)
    return row !== undefined && target instanceof Element && target.closest(`button[${HANDLE}]`) === handles.get(row) ? row : undefined
  }

  const sync = (): void => {
    if (signal.aborted) return
    syncModels()
    // Only the Settings dialog's top-level provider rows, never model discovery lists.
    const candidates = [...document.querySelectorAll<HTMLUListElement>('[role="dialog"] ul')]
    const found = candidates.find(candidate => {
      const title = candidate.parentElement?.querySelector(':scope > h2')?.textContent
      return (title === 'Models' || title === '模型') && readRows(candidate).length > 0
    })
    if (found !== list) {
      detach()
      list = found
      hintLocale = undefined
    }
    if (hintLocale !== document.documentElement.lang) {
      hintLocale = document.documentElement.lang
      hint.textContent = text(
        'Drag the handles to reorder, or focus a handle and use ↑ / ↓. Saved only in this browser.',
        '拖动手柄排序，或聚焦手柄后使用 ↑ / ↓。顺序仅保存在当前浏览器。',
      )
    }
    if (list === undefined) return
    const rows = readRows(list)
    for (const [element, handle] of handles) {
      if (!rows.some(row => row.element === element)) {
        if (element === dragged) endDrag()
        handle.remove()
        handles.delete(element)
      }
    }
    for (const [index, row] of rows.entries()) {
      if (!original.includes(row.id)) {
        const following = rows.slice(index + 1).find(item => original.includes(item.id))
        original.splice(following === undefined ? original.length : original.indexOf(following.id), 0, row.id)
      }
      let handle = handles.get(row.element)
      if (handle === undefined) {
        handle = document.createElement('button')
        handle.type = 'button'
        handle.draggable = true
        handle.setAttribute(HANDLE, '')
        handle.setAttribute('aria-describedby', HINT)
        handle.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown')
        handle.textContent = '⠿'
        handles.set(row.element, handle)
      }
      handle.setAttribute('aria-label', text(`Reorder ${row.label}`, `调整顺序 ${row.label}`))
      handle.title = text('Drag to reorder, or use ↑ / ↓', '拖动排序，或使用 ↑ / ↓')
      if (handle.parentElement !== row.head) row.head.prepend(handle)
    }
    if (hint.nextElementSibling !== list) list.before(hint)
    // ponytail: reorder siblings in-place because alpha.1 exposes no row-order hook;
    // switch to a native ordering API when one exists. DOM and keyboard order agree.
    arrange(list, rows, [...order, ...original.filter(id => !order.includes(id))])
  }

  const save = (rows: Row[], ids: string[], moved: HTMLLIElement): void => {
    if (list === undefined || ids.every((id, index) => id === rows[index]?.id)) return
    try { localStorage.setItem(KEY, JSON.stringify(ids)) } catch {
      hint.textContent = text('Could not save the order in this browser; order unchanged.', '浏览器无法保存排序，顺序未改变。')
      return
    }
    order = ids
    arrange(list, rows, order)
    syncModels()
    const row = rows.find(item => item.element === moved)!
    hint.textContent = text(
      `Order saved in this browser. ${row.label}: ${ids.indexOf(row.id) + 1} of ${ids.length}.`,
      `顺序已保存在当前浏览器。${row.label}：第 ${ids.indexOf(row.id) + 1} 位，共 ${ids.length} 位。`,
    )
  }

  document.addEventListener('dragstart', event => {
    const row = handleAt(event.target)
    if (row === undefined || event.dataTransfer === null) return
    endDrag()
    dragged = row
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-dsh-relay-provider', readRows(list!).find(item => item.element === row)!.id)
    event.dataTransfer.setDragImage?.(row, 16, 16)
    row.setAttribute(DRAGGING, '')
  }, { signal })
  document.addEventListener('dragover', event => {
    const target = rowAt(event.target)
    if (dragged === undefined || dragged.parentElement !== list || target === undefined) return
    event.preventDefault()
    if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'move'
    clearIndicator()
    if (target === dragged) return
    const rect = target.getBoundingClientRect()
    target.setAttribute(DROP, event.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
    indicator = target
  }, { signal })
  document.addEventListener('drop', event => {
    if (dragged === undefined) return
    // A sorting drag must never insert its payload into another native draft.
    event.preventDefault()
    const target = rowAt(event.target)
    if (dragged.parentElement !== list || target === undefined || list === undefined) { endDrag(); return }
    const rows = readRows(list)
    const moved = rows.find(row => row.element === dragged)
    const destination = rows.find(row => row.element === target)
    if (moved !== undefined && destination !== undefined && moved !== destination) {
      const ids = rows.filter(row => row !== moved).map(row => row.id)
      const rect = target.getBoundingClientRect()
      const after = event.clientY >= rect.top + rect.height / 2
      ids.splice(ids.indexOf(destination.id) + Number(after), 0, moved.id)
      save(rows, ids, moved.element)
    }
    endDrag()
  }, { signal })
  document.addEventListener('dragend', endDrag, { signal })
  document.addEventListener('dragleave', event => {
    if (!(event.relatedTarget instanceof Node) || !list?.contains(event.relatedTarget)) clearIndicator()
  }, { signal })
  document.addEventListener('keydown', event => {
    const element = handleAt(event.target)
    if (element === undefined || list === undefined || !['ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    event.stopPropagation()
    const rows = readRows(list)
    const index = rows.findIndex(row => row.element === element)
    const to = index + (event.key === 'ArrowUp' ? -1 : 1)
    if (index < 0 || to < 0 || to >= rows.length) return
    const ids = rows.map(row => row.id)
    const [id] = ids.splice(index, 1)
    ids.splice(to, 0, id!)
    save(rows, ids, element)
  }, { signal })
  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return
    order = readOrder()
    sync()
  }, { signal })
  document.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key) || !(event.target instanceof Node)) return
    for (const { menu } of modelLists.values()) {
      if (!menu.isConnected || !menu.parentElement?.contains(event.target) || modelRows(menu) === undefined) continue
      // Native React itemRefs still use catalog order; arrow keys must follow the visible order.
      const items = [...menu.querySelectorAll<HTMLButtonElement>('button[role="menuitemradio"]')].filter(item => !item.disabled)
      if (items.length === 0) return
      event.preventDefault()
      event.stopPropagation()
      const active = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement))
      items[(active + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
      return
    }
  }, { capture: true, signal })
  signal.addEventListener('abort', () => {
    detach()
    for (const [list, { menu, original }] of modelLists) {
      const found = modelRows(menu)
      if (found?.list === list) arrange(list, found.rows, original)
    }
    modelLists.clear()
    style.remove()
  }, { once: true })
  return sync
}
