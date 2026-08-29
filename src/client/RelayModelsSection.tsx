import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button, Input, Pill } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import {
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
  OfficialModelSummary,
  RelayModelStatus,
  RelayProtocol,
  RelayProviderConfig,
  RelayTransport,
} from '../shared/types.ts'
import { peekRelayPage, RELAY_STALE_CODE, type RelayPageApi, type RelayPageSnapshot } from './api.ts'
import type { RelayLocaleKey } from './locales.ts'

/** This page's translate seat. */
type T = Translate<RelayLocaleKey>

interface Props {
  api: RelayPageApi
  t: T
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Whether a refusal was the host rejecting a revision the page had already outgrown. */
function isStale(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === RELAY_STALE_CODE
}

function protocolLabel(t: T, protocol: RelayProtocol | undefined): string {
  if (protocol === 'anthropic-messages') return t('protocolAnthropic')
  if (protocol === 'openai-codex-responses') return t('protocolCodex')
  if (protocol === 'openai-responses') return t('protocolResponses')
  if (protocol === 'openai-completions') return t('protocolCompletions')
  return t('protocolUnsupported')
}

function transportLabel(t: T, transport: RelayTransport): string {
  if (transport === 'websocket') return t('transportWebsocket')
  if (transport === 'websocket-cached') return t('transportWebsocketCached')
  if (transport === 'sse') return t('transportSse')
  return t('transportAuto')
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
  t,
  open,
  onOpen,
  onDone,
}: {
  api: RelayPageApi
  snapshot: RelayPageSnapshot
  t: T
  open: boolean
  onOpen: (open: boolean) => void
  onDone: () => Promise<void>
}): ReactNode {
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
      if (snapshot.config.providers[id]) throw new Error(t('alreadyExists', { id }))
      if (!displayName.trim()) throw new Error(t('needDisplayName'))
      const modelIds = await api.discover({
        baseURL,
        protocol,
        ...apiKey.trim() ? { apiKey: apiKey.trim() } : {},
      })
      if (modelIds.length === 0) throw new Error(t('noModels'))
      const provider: RelayProviderConfig = {
        displayName: displayName.trim(),
        baseURL: baseURL.trim(),
        apiKeyEnv: relayCredentialRef(id),
        fallbackProtocol: protocol,
        modelIds,
        modelMappings: {},
        protocolOverrides: {},
        excludedModels: [],
        headers: {},
        syncedAt: Date.now(),
      }
      await api.setProvider(id, provider, snapshot.revision, apiKey.trim() || undefined)
      await onDone()
      onOpen(false)
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
      <Button variant="primary" size="sm" disabled={!snapshot.writable} onClick={() => { onOpen(true) }}>
        {t('add')}
      </Button>
    )
  }
  return (
    <div className="drm-add">
      <div className="drm-grid">
        <label className="drm-field">
          <span className="drm-label">{t('providerId')}</span>
          <Input value={route} placeholder={t('providerIdPlaceholder')} onChange={event => { setRoute(event.target.value) }} />
        </label>
        <label className="drm-field">
          <span className="drm-label">{t('displayName')}</span>
          <Input value={displayName} placeholder={t('displayNamePlaceholder')} onChange={event => { setDisplayName(event.target.value) }} />
        </label>
        <label className="drm-field wide">
          <span className="drm-label">{t('baseURL')}</span>
          <div className="drm-actions">
            <Input className="drm-grow" value={baseURL} placeholder={t('baseURLPlaceholder')} onChange={event => { setBaseURL(event.target.value) }} />
            <Button size="sm" variant="outline" disabled={!baseURL} onClick={suggest}>{t('suggestName')}</Button>
          </div>
        </label>
        <label className="drm-field">
          <span className="drm-label">{t('fallbackProtocol')}</span>
          <select className="drm-select" value={protocol} onChange={event => { setProtocol(event.target.value as RelayProtocol) }}>
            {RELAY_PROTOCOLS.map(value => <option key={value} value={value}>{protocolLabel(t, value)}</option>)}
          </select>
        </label>
        <label className="drm-field">
          <span className="drm-label">{t('apiKey')}</span>
          <Input type="password" autoComplete="off" value={apiKey} onChange={event => { setApiKey(event.target.value) }} />
        </label>
      </div>
      {error ? <div className="drm-error">{error}</div> : null}
      <div className="drm-actions">
        <Button variant="primary" size="sm" disabled={busy} onClick={() => { void add() }}>
          {busy ? t('discovering') : t('discoverAndAdd')}
        </Button>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => { onOpen(false); setError(undefined) }}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  )
}

/**
 * The page's own wide dialog. `Modal` from the primitives is tuned to a 380px
 * confirmation card with no scrolling body, while the model manager is a wide
 * scrollable table; this keeps the escape key, the portal, the labelled
 * `role="dialog"`, and the page scroll lock.
 */
function Dialog({
  open,
  title,
  closeLabel,
  onClose,
  children,
}: {
  open: boolean
  title: string
  closeLabel: string
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
          <Button size="sm" variant="outline" onClick={onClose}>{closeLabel}</Button>
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
  t,
  onMap,
  onClose,
}: {
  status: RelayModelStatus
  catalog: readonly OfficialModelSummary[]
  t: T
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
      <div className="drm-actions">
        <Input className="drm-grow" autoFocus value={query} placeholder={t('searchCatalog')} onChange={event => { setQuery(event.target.value) }} />
        <Button size="sm" variant="outline" onClick={onClose}>{t('close')}</Button>
      </div>
      <div className="drm-candidates">
        {results.length === 0 ? <span className="drm-muted">{t('noCandidates')}</span> : results.map(model => (
          <button type="button" key={`${model.provider}/${model.id}`} className="drm-candidate" onClick={() => { void onMap(model) }}>
            <span className="drm-candidate-name"><strong>{model.name}</strong><br /><span className="drm-route">{model.provider}/{model.id}</span></span>
            <Pill>{model.api}</Pill>
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
  t,
  onSave,
}: {
  provider: RelayProviderConfig
  catalog: readonly OfficialModelSummary[]
  statuses: readonly RelayModelStatus[]
  busy: boolean
  error?: string
  notice?: string
  t: T
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
    { id: 'all', label: t('filterAll'), count: counts.all },
    { id: 'active', label: t('filterActive'), count: counts.active },
    { id: 'unmatched', label: t('filterUnmatched'), count: counts.unmatched },
    { id: 'unsupported', label: t('filterUnsupported'), count: counts.unsupported },
    { id: 'excluded', label: t('filterExcluded'), count: counts.excluded },
  ]

  return (
    <>
      {error ? <div className="drm-error">{error}</div> : null}
      {notice ? <div className="drm-success">{notice}</div> : null}
      <div className="drm-toolbar">
        <Input
          className="drm-search"
          value={query}
          placeholder={t('searchModels')}
          onChange={event => { setQuery(event.target.value) }}
        />
        <div className="drm-filters">
          {filters.filter(item => item.id === 'all' || item.count > 0).map(item => (
            <Pill
              key={item.id}
              active={filter === item.id}
              onClick={() => { setFilter(item.id) }}
            >
              {item.label} {item.count}
            </Pill>
          ))}
        </div>
      </div>
      {selectedIds.length > 0 ? (
        <div className="drm-batch">
          <span>{t('selectedCount', { count: selectedIds.length })}</span>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => {
            void onSave({ ...provider, excludedModels: updateExcludedModels(provider.excludedModels, selectedIds, true) }, t('excluded', { count: selectedIds.length }))
            setSelected(new Set())
          }}>{t('exclude')}</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => {
            void onSave({ ...provider, excludedModels: updateExcludedModels(provider.excludedModels, selectedIds, false) }, t('restored', { count: selectedIds.length }))
            setSelected(new Set())
          }}>{t('restore')}</Button>
          <select className="drm-select drm-batch-select" value={batchProtocol} onChange={event => { setBatchProtocol(event.target.value as RelayProtocol | '') }}>
            <option value="">{t('autoProtocol')}</option>
            {RELAY_PROTOCOLS.map(value => <option key={value} value={value}>{protocolLabel(t, value)}</option>)}
          </select>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => {
            const overrides = { ...provider.protocolOverrides }
            for (const id of selectedIds) {
              if (batchProtocol) overrides[id] = batchProtocol
              else delete overrides[id]
            }
            void onSave(
              { ...provider, protocolOverrides: overrides },
              batchProtocol
                ? t('protocolApplied', { count: selectedIds.length })
                : t('protocolCleared', { count: selectedIds.length }),
            )
            setSelected(new Set())
          }}>{t('applyProtocol')}</Button>
          <button type="button" className="drm-link" onClick={() => { setSelected(new Set()) }}>{t('clearSelection')}</button>
        </div>
      ) : null}
      <div className="drm-muted">
        {query.trim() || filter !== 'all'
          ? t('showingCount', { shown: visible.length, total: statuses.length })
          : t('modelCount', { count: statuses.length })}
      </div>
      <div className="drm-models"><table className="drm-table"><thead><tr>
        <th className="drm-check"><input type="checkbox" checked={allVisibleSelected} disabled={visibleIds.length === 0} onChange={event => { toggleVisible(event.target.checked) }} aria-label={t('selectVisible')} /></th>
        <th>{t('columnModel')}</th><th>{t('columnSource')}</th><th>{t('columnProtocol')}</th><th>{t('columnActions')}</th>
      </tr></thead><tbody>
        {visible.length === 0 ? <tr><td colSpan={5}><span className="drm-muted">{t('noMatches')}</span></td></tr> : visible.map(status => {
          const mapping = provider.modelMappings[status.id]
          const source = status.metadataSource
          return [
            <tr key={status.id}>
              <td className="drm-check"><input type="checkbox" checked={selected.has(status.id)} onChange={event => { toggle(status.id, event.target.checked) }} aria-label={t('selectOne', { id: status.id })} /></td>
              <td><span className="drm-model-id">{status.id}</span>{status.excluded ? <Pill className="drm-warn">{t('excludedTag')}</Pill> : null}</td>
              <td>{source ? <span>{source.provider}/{source.id}{mapping ? <Pill>{t('manual')}</Pill> : null}{!status.supported ? <Pill className="drm-warn">{t('needsOverride', { api: status.officialApi ?? '' })}</Pill> : null}</span> : <span className="drm-muted">{t('unmatched')}</span>}</td>
              <td><select className="drm-select" value={provider.protocolOverrides[status.id] ?? ''} disabled={busy} onChange={event => {
                const value = event.target.value as RelayProtocol | ''
                const overrides = { ...provider.protocolOverrides }
                if (value) overrides[status.id] = value
                else delete overrides[status.id]
                void onSave({ ...provider, protocolOverrides: overrides }, value ? t('protocolSaved') : t('protocolAuto'))
              }}><option value="">{t('protocolAutoOption', {
                value: status.supported
                  ? protocolLabel(t, status.protocol)
                  : t('protocolUnsupportedApi', { api: status.officialApi ?? '' }),
              })}</option>{RELAY_PROTOCOLS.map(value => <option key={value} value={value}>{protocolLabel(t, value)}</option>)}</select></td>
              <td><div className="drm-actions">{mapping ? <button type="button" className="drm-link" disabled={busy} onClick={() => {
                const mappings = { ...provider.modelMappings }; delete mappings[status.id]
                void onSave({ ...provider, modelMappings: mappings }, t('unmapped'))
              }}>{t('unmap')}</button> : <button type="button" className="drm-link" onClick={() => { setMappingModel(status.id) }}>{t('map')}</button>}<button type="button" className="drm-link" disabled={busy} onClick={() => { void onSave({ ...provider, excludedModels: updateExcludedModels(provider.excludedModels, [status.id], !status.excluded) }, status.excluded ? t('restored', { count: 1 }) : t('excluded', { count: 1 })) }}>{status.excluded ? t('restore') : t('exclude')}</button></div></td>
            </tr>,
            mappingModel === status.id ? <tr key={`${status.id}:mapping`}><td colSpan={5}><MappingEditor status={status} catalog={catalog} t={t} onClose={() => { setMappingModel(undefined) }} onMap={async model => {
              await onSave({ ...provider, modelMappings: { ...provider.modelMappings, [status.id]: { provider: model.provider, id: model.id } } }, t('mapSaved'))
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
  t,
  onReload,
}: {
  route: string
  provider: RelayProviderConfig
  snapshot: RelayPageSnapshot
  catalog: readonly OfficialModelSummary[]
  api: RelayPageApi
  t: T
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
      if (success) setNotice(success)
    } catch (cause) {
      setError(isStale(cause) ? t('staleReloaded') : messageOf(cause))
    } finally {
      // Reload after a refusal too: a write refused for a stale revision would
      // otherwise be retried with that same revision forever.
      await onReload().catch(() => undefined)
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
  }, t('synced'))

  const saveConnection = (): Promise<void> => run(async () => {
    const next: RelayProviderConfig = {
      ...provider,
      baseURL: baseURL.trim(),
      fallbackProtocol: fallback,
      transport,
      headers: parseHeaderLines(headersDraft),
    }
    await api.setProvider(route, next, snapshot.revision, keyDraft.trim() || undefined)
    setKeyDraft('')
  }, t('connectionSaved'))

  const remove = (): Promise<void> => run(async () => {
    await api.removeProvider(route, snapshot.revision)
  })

  return (
    <article className="drm-card">
      <div className="drm-card-head">
        <span className="drm-card-title">{provider.displayName}</span><span className="drm-route">{route}</span>
        <span className="drm-spacer" />
        <Pill className={credential ? undefined : 'drm-warn'}>{credential ? t('keyConfigured') : t('keyMissing')}</Pill>
        <div className="drm-actions">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => { void sync() }}>{t('sync')}</Button>
          <Button size="sm" variant="outline" onClick={() => { setConnectionOpen(value => !value) }}>{connectionOpen ? t('connectionCollapse') : t('connection')}</Button>
          <Button size="sm" variant="outline" onClick={() => { setModelsOpen(true) }}>{t('models')}</Button>
          <Button size="sm" className="drm-danger" onClick={() => { setConfirmDelete(true) }}>{t('remove')}</Button>
        </div>
      </div>
      <div className="drm-summary">
        <span>{t('summaryActive', { count: active.length })}</span>
        <span>{t('summaryMatched', { count: matched.length })}</span>
        <span>{t('summaryUnmatched', { count: included.length - matched.length })}</span>
        {unsupported.length > 0 ? <span>{t('summaryUnsupported', { count: unsupported.length })}</span> : null}
        <span>{t('summaryExcluded', { count: statuses.filter(status => status.excluded).length })}</span>
        {provider.syncedAt ? <span>{t('summarySyncedAt', { at: new Date(provider.syncedAt).toLocaleString() })}</span> : null}
      </div>
      {confirmDelete ? (
        <div className="drm-confirm">
          <span>{t('removeConfirm')}</span>
          <Button size="sm" className="drm-danger" disabled={busy} onClick={() => { void remove() }}>{t('removeConfirmAction')}</Button>
          <Button size="sm" variant="outline" onClick={() => { setConfirmDelete(false) }}>{t('cancel')}</Button>
        </div>
      ) : null}
      {error && !modelsOpen ? <div className="drm-error">{error}</div> : null}{notice && !modelsOpen ? <div className="drm-success">{notice}</div> : null}
      {connectionOpen ? (
        <>
          <div className="drm-grid">
            <label className="drm-field wide">
              <span className="drm-label">{t('baseURL')}</span>
              <Input value={baseURL} onChange={event => { setBaseURL(event.target.value) }} />
            </label>
            <label className="drm-field">
              <span className="drm-label">{t('fallbackProtocol')}</span>
              <select className="drm-select" value={fallback} onChange={event => { setFallback(event.target.value as RelayProtocol) }}>
                {RELAY_PROTOCOLS.map(value => <option key={value} value={value}>{protocolLabel(t, value)}</option>)}
              </select>
            </label>
            <label className="drm-field">
              <span className="drm-label">{t('codexTransport')}</span>
              <select className="drm-select" value={transport} onChange={event => { setTransport(event.target.value as RelayTransport) }}>
                {RELAY_TRANSPORTS.map(value => <option key={value} value={value}>{transportLabel(t, value)}</option>)}
              </select>
            </label>
            <label className="drm-field">
              <span className="drm-label">{t('replaceKey')}</span>
              <Input type="password" autoComplete="off" value={keyDraft} onChange={event => { setKeyDraft(event.target.value) }} />
            </label>
            <label className="drm-field wide">
              <span className="drm-label">{t('extraHeaders')}</span>
              <textarea className="drm-textarea" value={headersDraft} placeholder={t('extraHeadersPlaceholder')} onChange={event => { setHeadersDraft(event.target.value) }} />
            </label>
          </div>
          <div className="drm-actions">
            <Button variant="primary" size="sm" disabled={busy} onClick={() => { void saveConnection() }}>{t('saveConnection')}</Button>
          </div>
        </>
      ) : null}
      <Dialog open={modelsOpen} title={`${provider.displayName} · ${t('models')}`} closeLabel={t('close')} onClose={() => { setModelsOpen(false) }}>
        <ModelManager provider={provider} catalog={catalog} statuses={statuses} busy={busy} error={error} notice={notice} t={t} onSave={save} />
      </Dialog>
    </article>
  )
}

export function RelayModelsSection({ api, t }: Props): ReactNode {
  const [snapshot, setSnapshot] = useState(() => peekRelayPage())
  const [catalog, setCatalog] = useState(() => peekRelayPage()?.catalog)
  const [adding, setAdding] = useState(false)
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
      <div className="drm-head">
        <h2 className="drm-title">{t('title')}</h2>
        {snapshot ? <AddProvider api={api} snapshot={snapshot} t={t} open={adding} onOpen={setAdding} onDone={reload} /> : null}
      </div>
      {error ? <div className="drm-error">{error}<div><Button size="sm" variant="outline" onClick={() => { void initialize() }}>{t('retry')}</Button></div></div> : null}
      {/* The empty state points at the add button, so it stays out of the way
          while that form is the thing on screen. */}
      {snapshot && !adding && Object.keys(snapshot.config.providers).length === 0 ? <div className="drm-empty">{t('empty')}</div> : null}
      {snapshot && catalog ? Object.entries(snapshot.config.providers).map(([route, provider]) => <ProviderCard key={route} route={route} provider={provider} snapshot={snapshot} catalog={catalog.models} api={api} t={t} onReload={reload} />) : null}
    </section>
  )
}
