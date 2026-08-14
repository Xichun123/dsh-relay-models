import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  RELAY_PROTOCOLS,
  relayCredentialRef,
  relayModelStatuses,
  suggestProviderIdentity,
  updateExcludedModels,
  validateProviderId,
} from '../shared/core.ts'
import type {
  OfficialCatalogSnapshot,
  OfficialModelSummary,
  RelayModelStatus,
  RelayProtocol,
  RelayProviderConfig,
} from '../shared/types.ts'
import type { RelayPageApi, RelayPageSnapshot } from './api.ts'

interface Props {
  api: RelayPageApi
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function protocolLabel(protocol: RelayProtocol | undefined): string {
  if (protocol === 'anthropic-messages') return 'Anthropic Messages'
  if (protocol === 'openai-responses') return 'OpenAI Responses'
  if (protocol === 'openai-completions') return 'OpenAI Chat Completions'
  return '不支持（需手动覆盖）'
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
      const id = validateProviderId(route)
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
    return <button className="drm-button primary" disabled={!snapshot.writable} onClick={() => { setOpen(true) }}>添加中转站</button>
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
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mappingModel, setMappingModel] = useState<string>()
  const [baseURL, setBaseURL] = useState(provider.baseURL)
  const [fallback, setFallback] = useState(provider.fallbackProtocol)
  const [keyDraft, setKeyDraft] = useState('')
  useEffect(() => { setBaseURL(provider.baseURL); setFallback(provider.fallbackProtocol) }, [provider])

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
    const next = { ...provider, baseURL: baseURL.trim(), fallbackProtocol: fallback }
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
        <div className="drm-actions"><button className="drm-button" disabled={busy} onClick={() => { void sync() }}>同步</button><button className="drm-button" onClick={() => { setExpanded(value => !value) }}>{expanded ? '收起' : '管理'}</button><button className="drm-button danger" onClick={() => { setConfirmDelete(true) }}>删除</button></div>
      </div>
      <div className="drm-summary"><span>{active.length} 个可用模型</span><span>{matched.length} 个匹配官方元数据</span><span>{included.length - matched.length} 个未匹配</span>{unsupported.length > 0 ? <span>{unsupported.length} 个协议需覆盖</span> : null}<span>{statuses.filter(status => status.excluded).length} 个已排除</span>{provider.syncedAt ? <span>同步于 {new Date(provider.syncedAt).toLocaleString()}</span> : null}</div>
      {confirmDelete ? <div className="drm-confirm"><span>删除 Provider、配置和托管密钥？</span><button className="drm-button danger" disabled={busy} onClick={() => { void remove() }}>确认删除</button><button className="drm-button" onClick={() => { setConfirmDelete(false) }}>取消</button></div> : null}
      {error ? <div className="drm-error">{error}</div> : null}{notice ? <div className="drm-success">{notice}</div> : null}
      {expanded ? (
        <>
          <div className="drm-grid">
            <label className="drm-field wide"><span className="drm-label">Base URL</span><input className="drm-input" value={baseURL} onChange={event => { setBaseURL(event.target.value) }} /></label>
            <label className="drm-field"><span className="drm-label">默认协议</span><select className="drm-select" value={fallback} onChange={event => { setFallback(event.target.value as RelayProtocol) }}>{RELAY_PROTOCOLS.map(value => <option key={value} value={value}>{protocolLabel(value)}</option>)}</select></label>
            <label className="drm-field"><span className="drm-label">替换 API Key（留空则保留）</span><input className="drm-input" type="password" autoComplete="off" value={keyDraft} onChange={event => { setKeyDraft(event.target.value) }} /></label>
          </div>
          <div className="drm-actions"><button className="drm-button primary" disabled={busy} onClick={() => { void saveConnection() }}>保存连接设置</button></div>
          <div className="drm-models"><table className="drm-table"><thead><tr><th>远端模型</th><th>元数据来源</th><th>实际协议</th><th>操作</th></tr></thead><tbody>
            {statuses.map(status => {
              const mapping = provider.modelMappings[status.id]
              const source = status.metadataSource
              return [
                <tr key={status.id}>
                  <td><span className="drm-model-id">{status.id}</span>{status.excluded ? <span className="drm-pill warn">已排除</span> : null}</td>
                  <td>{source ? <span>{source.provider}/{source.id}{mapping ? <span className="drm-pill">人工</span> : null}{!status.supported ? <span className="drm-pill warn">{status.officialApi} 需覆盖</span> : null}</span> : <span className="drm-muted">未匹配</span>}</td>
                  <td><select className="drm-select" value={provider.protocolOverrides[status.id] ?? ''} disabled={busy} onChange={event => {
                    const value = event.target.value as RelayProtocol | ''
                    const overrides = { ...provider.protocolOverrides }
                    if (value) overrides[status.id] = value
                    else delete overrides[status.id]
                    void save({ ...provider, protocolOverrides: overrides }, value ? '协议覆盖已保存' : '协议已恢复自动选择')
                  }}><option value="">自动：{status.supported ? protocolLabel(status.protocol) : `不支持 ${status.officialApi ?? ''}`}</option>{RELAY_PROTOCOLS.map(value => <option key={value} value={value}>{protocolLabel(value)}</option>)}</select></td>
                  <td><div className="drm-actions">{mapping ? <button className="drm-link" disabled={busy} onClick={() => {
                    const mappings = { ...provider.modelMappings }; delete mappings[status.id]
                    void save({ ...provider, modelMappings: mappings }, '人工映射已取消')
                  }}>取消映射</button> : <button className="drm-link" onClick={() => { setMappingModel(status.id) }}>人工映射</button>}<button className="drm-link" disabled={busy} onClick={() => { void save({ ...provider, excludedModels: updateExcludedModels(provider.excludedModels, [status.id], !status.excluded) }, status.excluded ? '模型已恢复' : '模型已排除') }}>{status.excluded ? '恢复' : '排除'}</button></div></td>
                </tr>,
                mappingModel === status.id ? <tr key={`${status.id}:mapping`}><td colSpan={4}><MappingEditor status={status} catalog={catalog} onClose={() => { setMappingModel(undefined) }} onMap={async model => {
                  await save({ ...provider, modelMappings: { ...provider.modelMappings, [status.id]: { provider: model.provider, id: model.id } } }, '人工映射已保存')
                  setMappingModel(undefined)
                }} /></td></tr> : null,
              ]
            })}
          </tbody></table></div>
        </>
      ) : null}
    </article>
  )
}

export function RelayModelsSection({ api }: Props): ReactNode {
  const [snapshot, setSnapshot] = useState<RelayPageSnapshot>()
  const [catalog, setCatalog] = useState<OfficialCatalogSnapshot>()
  const [error, setError] = useState<string>()
  const reload = useCallback(async () => {
    try {
      setSnapshot(await api.load())
      setError(undefined)
    } catch (cause) {
      setError(messageOf(cause))
    }
  }, [api])
  const initialize = useCallback(async () => {
    try {
      const [nextSnapshot, nextCatalog] = await Promise.all([api.load(), api.catalog()])
      setSnapshot(nextSnapshot)
      setCatalog(nextCatalog)
      setError(undefined)
    } catch (cause) {
      setError(messageOf(cause))
    }
  }, [api])
  useEffect(() => { void initialize() }, [initialize])

  if ((!snapshot || !catalog) && !error) return <section className="drm-section"><p className="drm-muted">正在加载中转模型配置…</p></section>
  return (
    <section className="drm-section">
      <div className="drm-head"><div className="drm-head-copy"><h2 className="drm-title">中转模型</h2><p className="drm-muted">自动发现中转站模型，匹配 pi 官方元数据，并在同一 Provider 内按模型选择 OpenAI Chat Completions、OpenAI Responses 或 Anthropic Messages。此插件不会向 Agent 注册工具，也不会添加任何上下文。</p>{catalog ? <p className="drm-muted">官方目录：{catalog.source === 'remote' ? 'pi.dev 实时' : '随包快照'} · {catalog.models.length} 个模型{catalog.revision ? ` · ${catalog.revision}` : ''}</p> : null}</div>{snapshot ? <AddProvider api={api} snapshot={snapshot} onDone={reload} /> : null}</div>
      {error ? <div className="drm-error">{error}<div><button className="drm-button" onClick={() => { void initialize() }}>重试</button></div></div> : null}
      {snapshot && Object.keys(snapshot.config.providers).length === 0 ? <div className="drm-empty">还没有中转站。点击“添加中转站”开始。</div> : null}
      {snapshot && catalog ? Object.entries(snapshot.config.providers).map(([route, provider]) => <ProviderCard key={route} route={route} provider={provider} snapshot={snapshot} catalog={catalog.models} api={api} onReload={reload} />) : null}
    </section>
  )
}
