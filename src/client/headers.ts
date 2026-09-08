const MARK = 'data-dsh-relay-headers'
const NS = 'llm-pi-ai'
const PROTOCOL = 'select[aria-label="API protocol"], select[aria-label="API 协议"]'
const CATALOG = 'section[aria-label="Models"], section[aria-label="模型目录"]'

type Result<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } }
interface Namespace {
  ns: string
  revision: number
  user?: unknown
  value: unknown
}

/** Structural faces of the two declared Remote namespaces; no client runtime is bundled. */
export interface HeadersRemote {
  settings: {
    describe(): Promise<Result<{ writable: boolean; namespaces: Namespace[] }>>
    mutate(ns: string, ops: { op: 'set' | 'unset'; path: string[]; value?: Record<string, string> }[], revision: number): Promise<Result<Namespace>>
  }
  llm: {
    listConfigurableProviders(): Promise<Result<{
      provider: string
      settingsNs: string
      settingsPath: string[]
      declared?: boolean
    }[]>>
  }
}

function text(en: string, zh: string): string {
  return document.documentElement.lang.startsWith('zh') ? zh : en
}

function profile(source: unknown, route: string): Record<string, unknown> | undefined {
  if (source === null || typeof source !== 'object') return
  const providers = (source as { providers?: Record<string, unknown> }).providers
  const value = providers?.[route]
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function parseHeaders(input: string): Record<string, string> | undefined {
  if (input.trim() === '') return undefined
  const value: unknown = JSON.parse(input)
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || Object.values(value).some(item => typeof item !== 'string')) {
    throw new Error(text('Headers must be a JSON object with string values.', 'Headers 必须是字符串值的 JSON 对象。'))
  }
  // The validated flat object has alternating key/value string tokens. Check before
  // JSON.parse's duplicate-key collapse, including escaped and case-variant names.
  const tokens = input.match(/"(?:[^"\\]|\\.)*"/g) ?? []
  const seen = new Set<string>()
  for (let i = 0; i < tokens.length; i += 2) {
    const name = (JSON.parse(tokens[i]!) as string).toLowerCase()
    if (seen.has(name)) throw new Error(text('Duplicate header name (case-insensitive).', 'Header 名称重复（不区分大小写）。'))
    seen.add(name)
  }
  const headers = new Headers()
  for (const [name, entry] of Object.entries(value) as [string, string][]) {
    // Fetch trims leading/trailing CRLF; reject it instead of silently accepting it.
    if (/[\u0000-\u0008\u000a-\u001f\u007f]/.test(entry)) throw new Error(text('Invalid HTTP header value.', 'HTTP Header 值非法。'))
    try { headers.set(name, entry) } catch {
      throw new Error(text('Invalid HTTP header name or value.', 'HTTP Header 名称或值非法。'))
    }
  }
  return value as Record<string, string>
}

/** Add headers only to alpha.1 custom-provider editors; creation has no stored route yet. */
export function syncHeaders(remote: HeadersRemote, signal: AbortSignal, alreadyOpen = false): void {
  for (const protocol of document.querySelectorAll<HTMLSelectElement>(PROTOCOL)) {
    const field = protocol.parentElement
    if (field === null || field.nextElementSibling?.hasAttribute(MARK)) continue
    const details = protocol.closest('details')
    const editor = details?.parentElement
    const box = document.createElement('div')
    box.setAttribute(MARK, '')
    box.style.cssText = 'display:flex;flex-direction:column;gap:8px;min-width:0'
    if (editor === null || editor === undefined) {
      // CustomProviderCard's route input distinguishes creation from unrelated selects.
      if (field.parentElement?.querySelector('input[aria-label="Provider ID"], input[aria-label="提供方 ID"]') == null) continue
      box.textContent = text('Headers: create the provider first, then open Edit.', 'Headers：请先创建提供方，再打开编辑填写。')
      field.after(box)
      continue
    }
    // ProviderEditor prints the exact route last; the title alone is used only
    // when it equals the route. Never look up a provider by its display name.
    const route = editor.firstElementChild?.lastElementChild?.textContent ?? ''
    if (route === '') continue
    field.after(box)
    mountHeaders(remote, signal, editor, protocol, box, route, alreadyOpen)
  }
}

function mountHeaders(
  remote: HeadersRemote, signal: AbortSignal, editor: HTMLElement,
  protocol: HTMLSelectElement, box: HTMLElement, route: string, alreadyOpen: boolean,
): void {
  const label = document.createElement('label')
  label.textContent = 'Headers (JSON)'
  label.style.cssText = 'display:flex;flex-direction:column;gap:8px;font-size:13px'
  const input = document.createElement('textarea')
  input.rows = 4
  input.spellcheck = false
  input.autocomplete = 'off'
  input.setAttribute('aria-label', `Headers ${route}`)
  input.placeholder = '{\n  "User-Agent": "claude-cli/2.1.263 (external, cli)"\n}'
  input.style.cssText = 'box-sizing:border-box;width:100%;resize:vertical;padding:8px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-primary);color:var(--dsw-alias-label-primary);font:13px/1.5 monospace'
  label.append(input)
  const hint = document.createElement('span')
  hint.style.cssText = 'font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)'
  hint.textContent = text(
    'Save Headers separately; Apply below does not save this field. Save other edits first and reopen. Blank restores inheritance. UA rewriting requires a saved Base URL.',
    'Headers 单独保存，下方“保存”不会提交此字段。请先保存其他编辑并重新打开。留空恢复继承；UA 覆写需已保存 API 地址。',
  )
  const button = document.createElement('button')
  button.type = 'button'
  button.style.cssText = 'align-self:flex-start;padding:6px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-primary);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer'
  const discard = document.createElement('button')
  discard.type = 'button'
  discard.style.cssText = button.style.cssText
  discard.textContent = text('Discard Headers edits', '放弃 Headers 修改')
  const status = document.createElement('span')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  status.style.cssText = 'font-size:12px;line-height:18px'
  box.append(label, hint, button, discard, status)
  let loadedHeaders = ''
  let namespace: Namespace | undefined
  let writable = false
  let busy = false
  let saved = false
  // ponytail: without a native draft slot, any native edit requires a remount;
  // an editor open before plugin load may already hold hidden model edits.
  let nativeDirty = alreadyOpen
  const alive = (): boolean => !signal.aborted && box.isConnected
  const reopen = (): string => text('Close and reopen this editor before continuing.', '请关闭并重新打开此编辑器后继续。')
  const render = (): void => {
    input.disabled = busy || namespace === undefined || !writable || saved
    button.disabled = busy || saved || (namespace !== undefined && !writable)
    discard.hidden = saved || input.value === loadedHeaders
    discard.disabled = busy || namespace === undefined || !writable
    button.textContent = busy ? text('Loading…', '处理中…')
      : namespace === undefined ? text('Retry loading Headers', '重新加载 Headers') : text('Save Headers', '保存 Headers')
  }
  const changed = (event: Event): void => {
    if (event.target instanceof Node && !box.contains(event.target)) nativeDirty = true
  }
  editor.addEventListener('input', changed, { capture: true, signal })
  editor.addEventListener('change', changed, { capture: true, signal })
  editor.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('button') : null
    const actions = editor.lastElementChild
    if (target !== null && target.parentElement === actions && target === actions?.lastElementChild
      && (busy || saved || input.value !== loadedHeaders)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      status.textContent = saved ? reopen() : busy ? text('Wait for Headers to finish saving.', '请等待 Headers 操作完成。') : text(
        'Headers have unsaved edits. Save Headers first, or copy the draft and discard Headers edits before applying other fields.',
        'Headers 尚未保存。请先保存 Headers；若其他字段也有修改，请先复制 Headers 草稿并放弃其修改，再保存其他字段。',
      )
      return
    }
    // Model add/delete/reset/adoption can change React state without an input event.
    // Fetch is conservative too: its adoption dialog may be rendered in a portal.
    if (target?.closest(CATALOG) && !target.hasAttribute('aria-expanded')) nativeDirty = true
  }, { capture: true, signal })

  const load = async (): Promise<void> => {
    busy = true
    render()
    try {
      const [described, directory] = await Promise.all([
        remote.settings.describe(), remote.llm.listConfigurableProviders(),
      ])
      if (!alive()) return
      if (!described.ok) throw new Error(described.error.message)
      if (!directory.ok) throw new Error(directory.error.message)
      const entry = directory.value.find(item => item.provider === route && item.settingsNs === NS
        && item.declared === true && item.settingsPath.length === 2
        && item.settingsPath[0] === 'providers' && item.settingsPath[1] === route)
      const view = described.value.namespaces.find(item => item.ns === NS)
      if (entry === undefined || view === undefined || profile(view.value, route) === undefined) {
        input.hidden = true
        button.hidden = true
        status.textContent = text('Headers are available after this custom provider has been created.', '请先创建此自定义提供方，再编辑 Headers。')
        return
      }
      namespace = view
      writable = described.value.writable
      const stored = profile(view.user, route)?.headers
      loadedHeaders = stored === undefined ? '' : JSON.stringify(stored, null, 2)
      input.value = loadedHeaders
      status.textContent = !writable ? text('Settings are read-only.', '设置为只读。') : alreadyOpen ? reopen() : ''
    } catch (error) {
      if (alive()) status.textContent = text('Could not load Headers: ', '无法加载 Headers：') + String(error instanceof Error ? error.message : error)
    } finally {
      busy = false
      if (alive()) render()
    }
  }

  input.addEventListener('input', render, { signal })
  discard.addEventListener('click', () => {
    if (!alive() || busy || saved) return
    input.value = loadedHeaders
    input.removeAttribute('aria-invalid')
    status.textContent = ''
    render()
  }, { signal })
  button.addEventListener('click', () => {
    if (!alive() || busy || saved) return
    if (namespace === undefined) { void load(); return }
    if (!writable || protocol.disabled) {
      status.textContent = text('The provider editor is read-only or busy.', '提供方编辑器为只读或正在保存。')
      return
    }
    if (nativeDirty) {
      status.textContent = alreadyOpen ? reopen() : text(
        'Other fields were edited. Copy your Headers draft and discard Headers edits; apply other fields, then reopen to save Headers.',
        '其他字段已编辑。请先复制 Headers 草稿并放弃其修改，用下方“保存”提交其他字段，再重新打开保存 Headers。',
      )
      return
    }
    let headers: Record<string, string> | undefined
    try { headers = parseHeaders(input.value) } catch (error) {
      status.textContent = error instanceof SyntaxError ? text('Headers must be valid JSON.', 'Headers 必须是有效 JSON。') : String(error instanceof Error ? error.message : error)
      input.setAttribute('aria-invalid', 'true')
      return
    }
    input.removeAttribute('aria-invalid')
    busy = true
    status.textContent = ''
    render()
    const op = headers === undefined
      ? { op: 'unset' as const, path: ['providers', route, 'headers'] }
      : { op: 'set' as const, path: ['providers', route, 'headers'], value: headers }
    void remote.settings.mutate(NS, [op], namespace.revision).then(result => {
      if (!alive()) return
      if (!result.ok) {
        status.textContent = result.error.code === 'settings/conflict'
          ? text('Settings changed elsewhere. Your Headers draft is kept; copy it before reopening this editor.', '配置已在其他位置修改。Headers 草稿已保留；请复制草稿后重新打开编辑器。')
          : result.error.message
        return
      }
      saved = true
      status.textContent = text('Headers saved. ', 'Headers 已保存。') + reopen()
    }).catch(() => {
      if (alive()) status.textContent = text('Could not save Headers. Your draft is kept; retry or reopen to check the stored value.', 'Headers 保存失败，草稿已保留；请重试，或重新打开检查已保存值。')
    }).finally(() => {
      busy = false
      if (alive()) render()
    })
  }, { signal })
  void load()
}

/** Remove owned DOM after the shared client lifetime aborts its listeners. */
export function removeHeaders(): void {
  for (const box of document.querySelectorAll(`[${MARK}]`)) box.remove()
}
