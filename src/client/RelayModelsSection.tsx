import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  RELAY_PROTOCOLS,
  RELAY_TRANSPORTS,
  assertUnreservedProviderId,
  formatHeaderLines,
  parseHeaderLines,
  relayCredentialRef,
  relayModelStatuses,
  suggestProviderIdentity,
  updateExcludedModels,
} from '../shared/core.ts'
import type {
  OfficialCatalogSnapshot,
  OfficialModelSummary,
  RelayModelStatus,
  RelayProtocol,
  RelayProviderConfig,
  RelayTransport,
} from '../shared/types.ts'
import { peekRelayPage, type RelayPageApi, type RelayPageSnapshot } from './api.ts'

interface Props {
  api: RelayPageApi
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function protocolLabel(protocol: RelayProtocol | undefined): string {
  if (protocol === 'anthropic-messages') return 'Anthropic Messages'
  if (protocol === 'openai-codex-responses') return 'Codex Responses（WS）'
  if (protocol === 'openai-responses') return 'OpenAI Responses'
  if (protocol === 'openai-completions') return 'OpenAI Chat Completions'
  return '不支持（需手动覆盖）'
}

function transportLabel(transport: RelayTransport): string {
  if (transport === 'websocket') return 'WebSocket'
  if (transport === 'websocket-cached') return 'WebSocket 缓存会话'
  if (transport === 'sse') return 'SSE'
  return '自动（先 WS，失败回 SSE）'
}

function officialModel(
  reference: { provider: string; id: string },
  catalog: readonly OfficialModelSummary[],
): OfficialModelSummary | undefined {
  return catalog.find(model => model.provider === reference.provider && model.id === reference.id)
}

function AddProvider({
  api,
  snapshot,
  onDone,
}: {
  api: RelayPageApi
  snapshot: RelayPageSnapshot
  onDone: () => Promise<void>
}): ReactNode {
  const [open, setOpen] = useState(false)
  const [route, setRoute] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [baseURL, setBaseURL] = useState('')
  const [protocol, setProtocol] = useState<RelayProtocol>('openai-completions')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const suggest = (): void => {
    try {
      const value = suggestProviderIdentity(baseURL, new Set(Object.keys(snapshot.config.providers)))
      setRoute(value.id)
      if (!displayName) setDisplayName(value.name)
      setError(undefined)
    } catch (cause) {
      setError(messageOf(cause))
    }
  }

  const add = async (): Promise<void> => {
    setBusy(true)
    setError(undefined)
    try {
      const id = assertUnreservedProviderId(route)
      if (snapshot.config.providers[id]) throw new Error(`Provider ${id} already exists`)
      if (!displayName.trim()) throw new Error('请输入显示名称')
      if (!apiKey.trim()) throw new Error('请输入 API Key')
      const modelIds = await api.discover({ baseURL, protocol, apiKey: apiKey.trim() })
      if (modelIds.length === 0) throw new Error('端点没有返回模型')
      const ref = relayCredentialRef(id)
      const provider: RelayProviderConfig = {
        displayName: displayName.trim(),
        baseURL: baseURL.trim(),
        apiKeyEnv: ref,
        fallbackProtocol: protocol,
        modelIds,
        modelMappings: {},
        protocolOverrides: {},
        excludedModels: [],
        headers: {},
        streamIdleTimeoutMs: DEFAULT_STREAM_IDLE_TIMEOUT_MS,
        syncedAt: Date.now(),
      }
      await api.setProvider(id, provider, snapshot.revision, apiKey.trim())
      await onDone()
      setOpen(false)
      setRoute('')
      setDisplayName('')
      setBaseURL('')
      setApiKey('')
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="drm-icon-button"
        disabled={!snapshot.writable}
        aria-label="添加中转站"
        title="添加中转站"
        onClick={() => { setOpen(true) }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path fill="currentColor" d="M8 3a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5A.75.75 0 0 1 8 3z" />
        </svg>
      </button>
    )
  }
  return (
    <div className="drm-add">
      <div className="drm-grid">
        <label className="drm-field"><span className="drm-label">Provider ID</span><input className="drm-input" value={route} placeholder="relay-example" onChange={event => { setRoute(event.target.value) }} /></label>
        <label className="drm-field"><span className="drm-label">显示名称</span><input className="drm-input" value={displayName} placeholder="Example Relay" onChange={event => { setDisplayName(event.target.value) }} /></label>
        <label className="drm-field wide"><span className="drm-label">Base URL</span><div className="drm-actions"><input className="drm-input" value={baseURL} placeholder="https://gateway.example/v1" onChange={event => { setBaseURL(event.target.value) }} /><button className="drm-button" disabled={!baseURL} onClick={suggest}>生成名称</button></div></label>
        <label className="drm-field"><span className="drm-label">未匹配模型的默认协议</span><select className="drm-select" value={protocol} onChange={event => { setProtocol(event.target.value as RelayProtocol) }}>{RELAY_PROTOCOLS.map(value => <option key={value} value={value}>{protocolLabel(value)}</option>)}</select></label>
        <label className="drm-field"><span className="drm-label">API Key</span><input className="drm-input" type="password" autoComplete="off" value={apiKey} onChange={event => { setApiKey(event.target.value) }} /></label>
      </div>
      {error ? <div className="drm-error">{error}</div> : null}
      <div className="drm-actions"><button className="drm-button primary" disabled={busy} onClick={() => { void add() }}>{busy ? '正在发现模型…' : '发现模型并添加'}</button><button className="drm-button" disabled={busy} onClick={() => { setOpen(false); setError(undefined) }}>取消</button></div>
    </div>
  )
}

function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}): ReactNode {
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, open])
  if (!open) return null
  return createPortal(
    <div className="drm-overlay" onMouseDown={onClose}>
      <div className="drm-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={event => { event.stopPropagation() }}>
        <div className="drm-dialog-head">
          <h3 className="drm-dialog-title" id={titleId}>{title}</h3>
          <span className="drm-spacer" />
          <button type="button" className="drm-button" onClick={onClose}>关闭</button>
        </div>
        <div className="drm-dialog-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

type ModelFilter = 'all' | 'active' | 'unmatched' | 'unsupported' | 'excluded'

function matchesFilter(status: RelayModelStatus, filter: ModelFilter): boolean {
  if (filter === 'active') return !status.excluded && status.supported
  if (filter === 'unmatched') return !status.excluded && !status.metadataSource
  if (filter === 'unsupported') return !status.excluded && !status.supported
  if (filter === 'excluded') return status.excluded
  return true
}

function matchesQuery(status: RelayModelStatus, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return status.id.toLowerCase().includes(needle)
    || (status.metadataSource?.provider.toLowerCase().includes(needle) ?? false)
    || (status.metadataSource?.id.toLowerCase().includes(needle) ?? false)
}

function MappingEditor({
  status,
  catalog,
  onMap,
  onClose,
}: {
  status: RelayModelStatus
  catalog: readonly OfficialModelSummary[]
  onMap: (model: OfficialModelSummary) => Promise<void>
  onClose: () => void
}): ReactNode {
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    if (!query.trim()) {
      return status.candidates.map(candidate => officialModel(candidate, catalog)).filter((model): model is OfficialModelSummary => model !== undefined)
    }
    const needle = query.trim().toLowerCase()
    return catalog.filter(model =>
      model.id.toLowerCase().includes(needle)
      || model.name.toLowerCase().includes(needle)
      || model.provider.toLowerCase().includes(needle),
    ).slice(0, 30)
  }, [catalog, query, status])
  return (
    <div className="drm-map">
      <div className="drm-actions"><input className="drm-input" autoFocus value={query} placeholder="搜索官方 Provider、模型 ID 或名称" onChange={event => { setQuery(event.target.value) }} /><button className="drm-button" onClick={onClose}>关闭</button></div>
      <div className="drm-candidates">
        {results.length === 0 ? <span className="drm-muted">没有候选；输入关键词搜索完整目录。</span> : results.map(model => (
          <button key={`${model.provider}/${model.id}`} className="drm-candidate" onClick={() => { void onMap(model) }}>
            <span className="drm-candidate-name"><strong>{model.name}</strong><br /><span className="drm-route">{model.provider}/{model.id}</span></span>
            <span className="drm-pill">{model.api}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ModelManager({
  provider,
  catalog,
  statuses,
  busy,
  error,
  notice,
  onSave,
}: {
  provider: RelayProviderConfig
  catalog: readonly OfficialModelSummary[]
  statuses: readonly RelayModelStatus[]
  busy: boolean
  error?: string
  notice?: string
  onSave: (next: RelayProviderConfig, success?: string) => Promise<void>
}): ReactNode {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ModelFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [batchProtocol, setBatchProtocol] = useState<RelayProtocol | ''>('')
  const [mappingModel, setMappingModel] = useState<string>()

  const counts = useMemo(() => ({
    all: statuses.length,
    active: statuses.filter(status => matchesFilter(status, 'active')).length,
    unmatched: statuses.filter(status => matchesFilter(status, 'unmatched')).length,
    unsupported: statuses.filter(status => matchesFilter(status, 'unsupported')).length,
    excluded: statuses.filter(status => matchesFilter(status, 'excluded')).length,
  }), [statuses])

  const visible = useMemo(
    () => statuses.filter(status => matchesFilter(status, filter) && matchesQuery(status, query)),
    [filter, query, statuses],
  )
  const visibleIds = useMemo(() => visible.map(status => status.id), [visible])
  const selectedVisible = visibleIds.filter(id => selected.has(id))
  const allVisibleSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length

  const toggle = (id: string, on: boolean): void => {
    setSelected(current => {
      const next = new Set(current)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const toggleVisible = (on: boolean): void => {
    setSelected(current => {
      const next = new Set(current)
      for (const id of visibleIds) on ? next.add(id) : next.delete(id)
      return next
    })
  }

  const selectedIds = selectedVisible
  const filters: { id: ModelFilter; label: string; count: number }[] = [
    { id: 'all', label: '全部', count: counts.all },
    { id: 'active', label: '可用', count: counts.active },
    { id: 'unmatched', label: '未匹配', count: counts.unmatched },
    { id: 'unsupported', label: '需覆盖', count: counts.unsupported },
    { id: 'excluded', label: '已排除', count: counts.excluded },
  ]

  return (
    <>
      {error ? <div className="drm-error">{error}</div> : null}
      {notice ? <div className="drm-success">{notice}</div> : null}
      <div className="drm-toolbar">
        <input
          className="drm-input drm-search"
          value={query}
          placeholder="筛选模型 ID 或官方来源"
          onChange={event => { setQuery(event.target.value) }}
        />
        <div className="drm-filters">
          {filters.filter(item => item.id === 'all' || item.count > 0).map(item => (
            <button
              key={item.id}
              type="button"
              className={`drm-chip${filter === item.id ? ' active' : ''}`}
              onClick={() => { setFilter(item.id) }}
            >
              {item.label} {item.count}
            </button>
          ))}
        </div>
      </div>
      {selectedIds.length > 0 ? (
        <div className="drm-batch">
          <span>已选 {selectedIds.length} 个</span>
          <button className="drm-button" disabled={busy} onClick={() => {
            void onSave({ ...provider, excludedModels: updateExcludedModels(provider.excludedModels, selectedIds, true) }, `已排除 ${selectedIds.length} 个模型`)
            setSelected(new Set())
          }}>排除</button>
          <button className="drm-button" disabled={busy} onClick={() => {
            void onSave({ ...provider, excludedModels: updateExcludedModels(provider.excludedModels, selectedIds, false) }, `已恢复 ${selectedIds.length} 个模型`)
            setSelected(new Set())
          }}>恢复</button>
          <select className="drm-select drm-batch-select" value={batchProtocol} onChange={event => { setBatchProtocol(event.target.value as RelayProtocol | '') }}>
            <option value="">恢复自动协议</option>
            {RELAY_PROTOCOLS.map(value => <option key={value} value={value}>{protocolLabel(value)}</option>)}
          </select>
          <button className="drm-button" disabled={busy} onClick={() => {
            const overrides = { ...provider.protocolOverrides }
            for (const id of selectedIds) {
              if (batchProtocol) overrides[id] = batchProtocol
              else delete overrides[id]
            }
            void onSave({ ...provider, protocolOverrides: overrides }, batchProtocol ? `已为 ${selectedIds.length} 个模型设置协议` : `已为 ${selectedIds.length} 个模型恢复自动协议`)
            setSelected(new Set())
          }}>应用协议</button>
          <button className="drm-link" onClick={() => { setSelected(new Set()) }}>取消选择</button>
        </div>
      ) : null}
      <div className="drm-muted">{query.trim() || filter !== 'all' ? `显示 ${visible.length} / ${statuses.length}` : `${statuses.length} 个模型`}</div>
      <div className="drm-models"><table className="drm-table"><thead><tr>
        <th className="drm-check"><input type="checkbox" checked={allVisibleSelected} disabled={visibleIds.length === 0} onChange={event => { toggleVisible(event.target.checked) }} aria-label="选择当前列表" /></th>
        <th>远端模型</th><th>元数据来源</th><th>实际协议</th><th>操作</th>
      </tr></thead><tbody>
        {visible.length === 0 ? <tr><td colSpan={5}><span className="drm-muted">没有符合条件的模型。</span></td></tr> : visible.map(status => {
          const mapping = provider.modelMappings[status.id]
          const source = status.metadataSource
          return [
            <tr key={status.id}>
              <td className="drm-check"><input type="checkbox" checked={selected.has(status.id)} onChange={event => { toggle(status.id, event.target.checked) }} aria-label={`选择 ${status.id}`} /></td>
              <td><span className="drm-model-id">{status.id}</span>{status.excluded ? <span className="drm-pill warn">已排除</span> : null}</td>
              <td>{source ? <span>{source.provider}/{source.id}{mapping ? <span className="drm-pill">人工</span> : null}{!status.supported ? <span className="drm-pill warn">{status.officialApi} 需覆盖</span> : null}</span> : <span className="drm-muted">未匹配</span>}</td>
              <td><select className="drm-select" value={provider.protocolOverrides[status.id] ?? ''} disabled={busy} onChange={event => {
                const value = event.target.value as RelayProtocol | ''
                const overrides = { ...provider.protocolOverrides }
                if (value) overrides[status.id] = value
                else delete overrides[status.id]
                void onSave({ ...provider, protocolOverrides: overrides }, value ? '协议覆盖已保存' : '协议已恢复自动选择')
              }}><option value="">自动：{status.supported ? protocolLabel(status.protocol) : `不支持 ${status.officialApi ?? ''}`}</option>{RELAY_PROTOCOLS.map(value => <option key={value} value={value}>{protocolLabel(value)}</option>)}</select></td>
              <td><div className="drm-actions">{mapping ? <button className="drm-link" disabled={busy} onClick={() => {
                const mappings = { ...provider.modelMappings }; delete mappings[status.id]
                void onSave({ ...provider, modelMappings: mappings }, '人工映射已取消')
              }}>取消映射</button> : <button className="drm-link" onClick={() => { setMappingModel(status.id) }}>人工映射</button>}<button className="drm-link" disabled={busy} onClick={() => { void onSave({ ...provider, excludedModels: updateExcludedModels(provider.excludedModels, [status.id], !status.excluded) }, status.excluded ? '模型已恢复' : '模型已排除') }}>{status.excluded ? '恢复' : '排除'}</button></div></td>
            </tr>,
            mappingModel === status.id ? <tr key={`${status.id}:mapping`}><td colSpan={5}><MappingEditor status={status} catalog={catalog} onClose={() => { setMappingModel(undefined) }} onMap={async model => {
              await onSave({ ...provider, modelMappings: { ...provider.modelMappings, [status.id]: { provider: model.provider, id: model.id } } }, '人工映射已保存')
              setMappingModel(undefined)
            }} /></td></tr> : null,
          ]
        })}
      </tbody></table></div>
    </>
  )
}

function ProviderCard({
  route,
  provider,
  snapshot,
  catalog,
  api,
  onReload,
}: {
  route: string
  provider: RelayProviderConfig
  snapshot: RelayPageSnapshot
  catalog: readonly OfficialModelSummary[]
  api: RelayPageApi
  onReload: () => Promise<void>
}): ReactNode {
  const [connectionOpen, setConnectionOpen] = useState(false)
  const [modelsOpen, setModelsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [baseURL, setBaseURL] = useState(provider.baseURL)
  const [fallback, setFallback] = useState(provider.fallbackProtocol)
  const [transport, setTransport] = useState<RelayTransport>(provider.transport ?? 'auto')
  const [headersDraft, setHeadersDraft] = useState(formatHeaderLines(provider.headers ?? {}))
  const [keyDraft, setKeyDraft] = useState('')
  useEffect(() => {
    setBaseURL(provider.baseURL)
    setFallback(provider.fallbackProtocol)
    setTransport(provider.transport ?? 'auto')
    setHeadersDraft(formatHeaderLines(provider.headers ?? {}))
  }, [provider])

  const statuses = useMemo(() => relayModelStatuses(provider, catalog), [catalog, provider])
  const included = statuses.filter(status => !status.excluded)
  const active = included.filter(status => status.supported)
  const matched = included.filter(status => status.metadataSource)
  const unsupported = included.filter(status => !status.supported)
  const credential = snapshot.credentials[provider.apiKeyEnv]

  const run = async (task: () => Promise<void>, success?: string): Promise<void> => {
    setBusy(true)
    setError(undefined)
    setNotice(undefined)
    try {
      await task()
      await onReload()
      if (success) setNotice(success)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  const save = async (next: RelayProviderConfig, success?: string): Promise<void> => run(
    async () => { await api.setProvider(route, next, snapshot.revision) },
    success,
  )

  const sync = (): Promise<void> => run(async () => {
    const ids = await api.discover({ provider: route, baseURL: provider.baseURL, protocol: provider.fallbackProtocol })
    await api.setProvider(route, { ...provider, modelIds: ids, syncedAt: Date.now() }, snapshot.revision)
  }, '模型列表已同步')

  const saveConnection = (): Promise<void> => run(async () => {
    const next = {
      ...provider,
      baseURL: baseURL.trim(),
      fallbackProtocol: fallback,
      transport,
      headers: parseHeaderLines(headersDraft),
      streamIdleTimeoutMs: provider.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS,
    }
    await api.setProvider(route, next, snapshot.revision, keyDraft.trim() || undefined)
    setKeyDraft('')
  }, '连接设置已保存')

  const remove = (): Promise<void> => run(async () => {
    await api.removeProvider(route, snapshot.revision)
  })

  return (
    <article className="drm-card">
      <div className="drm-card-head">
        <span className="drm-card-title">{provider.displayName}</span><span className="drm-route">{route}</span>
        <span className="drm-spacer" />
        <span className={`drm-pill ${credential ? '' : 'warn'}`}>{credential ? '密钥已配置' : '缺少密钥'}</span>
        <div className="drm-actions">
          <button className="drm-button" disabled={busy} onClick={() => { void sync() }}>同步</button>
          <button className="drm-button" onClick={() => { setConnectionOpen(value => !value) }}>{connectionOpen ? '收起连接' : '连接'}</button>
          <button className="drm-button" onClick={() => { setModelsOpen(true) }}>模型</button>
          <button className="drm-button danger" onClick={() => { setConfirmDelete(true) }}>删除</button>
        </div>
      </div>
      <div className="drm-summary"><span>{active.length} 个可用模型</span><span>{matched.length} 个匹配官方元数据</span><span>{included.length - matched.length} 个未匹配</span>{unsupported.length > 0 ? <span>{unsupported.length} 个协议需覆盖</span> : null}<span>{statuses.filter(status => status.excluded).length} 个已排除</span>{provider.syncedAt ? <span>同步于 {new Date(provider.syncedAt).toLocaleString()}</span> : null}</div>
      {confirmDelete ? <div className="drm-confirm"><span>删除 Provider、配置和托管密钥？</span><button className="drm-button danger" disabled={busy} onClick={() => { void remove() }}>确认删除</button><button className="drm-button" onClick={() => { setConfirmDelete(false) }}>取消</button></div> : null}
      {error && !modelsOpen ? <div className="drm-error">{error}</div> : null}{notice && !modelsOpen ? <div className="drm-success">{notice}</div> : null}
      {connectionOpen ? (
        <>
          <div className="drm-grid">
            <label className="drm-field wide"><span className="drm-label">Base URL</span><input className="drm-input" value={baseURL} onChange={event => { setBaseURL(event.target.value) }} /></label>
            <label className="drm-field"><span className="drm-label">默认协议</span><select className="drm-select" value={fallback} onChange={event => { setFallback(event.target.value as RelayProtocol) }}>{RELAY_PROTOCOLS.map(value => <option key={value} value={value}>{protocolLabel(value)}</option>)}</select></label>
            <label className="drm-field"><span className="drm-label">Codex 传输</span><select className="drm-select" value={transport} onChange={event => { setTransport(event.target.value as RelayTransport) }}>{RELAY_TRANSPORTS.map(value => <option key={value} value={value}>{transportLabel(value)}</option>)}</select></label>
            <label className="drm-field"><span className="drm-label">替换 API Key（留空则保留）</span><input className="drm-input" type="password" autoComplete="off" value={keyDraft} onChange={event => { setKeyDraft(event.target.value) }} /></label>
            <label className="drm-field wide"><span className="drm-label">额外请求头（每行 Name: value；不要放密钥。User-Agent 由 DSH 覆盖）</span><textarea className="drm-input" style={{ height: 72, padding: '8px 10px' }} value={headersDraft} placeholder="X-Custom: value" onChange={event => { setHeadersDraft(event.target.value) }} /></label>
          </div>
          <div className="drm-actions"><button className="drm-button primary" disabled={busy} onClick={() => { void saveConnection() }}>保存连接设置</button></div>
        </>
      ) : null}
      <Dialog open={modelsOpen} title={`${provider.displayName} · 模型`} onClose={() => { setModelsOpen(false) }}>
        <ModelManager provider={provider} catalog={catalog} statuses={statuses} busy={busy} error={error} notice={notice} onSave={save} />
      </Dialog>
    </article>
  )
}

export function RelayModelsSection({ api }: Props): ReactNode {
  const [snapshot, setSnapshot] = useState(() => peekRelayPage())
  const [catalog, setCatalog] = useState(() => peekRelayPage()?.catalog)
  const [error, setError] = useState<string>()
  const applySnapshot = (next: RelayPageSnapshot): void => {
    setSnapshot(next)
    setCatalog(next.catalog)
  }
  const reload = useCallback(async () => {
    try {
      applySnapshot(await api.load())
      setError(undefined)
    } catch (cause) {
      setError(messageOf(cause))
    }
  }, [api])
  const initialize = useCallback(async () => {
    try {
      applySnapshot(await api.load())
      setError(undefined)
      void api.catalog().then(setCatalog).catch(() => undefined)
    } catch (cause) {
      setError(messageOf(cause))
    }
  }, [api])
  useEffect(() => { void initialize() }, [initialize])

  return (
    <section className="drm-section">
      <div className="drm-head"><h2 className="drm-title">中转模型</h2>{snapshot ? <AddProvider api={api} snapshot={snapshot} onDone={reload} /> : null}</div>
      {error ? <div className="drm-error">{error}<div><button className="drm-button" onClick={() => { void initialize() }}>重试</button></div></div> : null}
      {snapshot && Object.keys(snapshot.config.providers).length === 0 ? <div className="drm-empty">还没有中转站。点击右上角 + 开始。</div> : null}
      {snapshot && catalog ? Object.entries(snapshot.config.providers).map(([route, provider]) => <ProviderCard key={route} route={route} provider={provider} snapshot={snapshot} catalog={catalog.models} api={api} onReload={reload} />) : null}
    </section>
  )
}
