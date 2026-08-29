/**
 * Codex Speed toggle: one small control in the composer's right tool row
 * (`conversation.input.right`), switching the session between no `service_tier`
 * and a Codex speed tier. The choice is per session and lives in the node half
 * (in-memory); this component holds only viewing state. It renders nothing
 * until the current session model resolves to a relay route whose protocol is
 * Codex Responses — the only wire a tier reaches.
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Translate } from '@deepseek-ai/dsh-client-ui-slots'
import { RELAY_SERVICE_TIERS } from '../shared/core.ts'
import type { RelayServiceTier } from '../shared/types.ts'
import type { RelayLocaleKey } from './locales.ts'

/** This toggle's translate seat. */
type T = Translate<RelayLocaleKey>

/** What {@link SpeedSelect} renders from: visibility plus the current tier. */
export interface SpeedSelectState {
  visible: boolean
  tier: RelayServiceTier | null
}

/** Injected dependencies of {@link SpeedSelect} (slot `inject`, session-bound). */
export interface SpeedSelectInjected {
  /** Load the session's speed state; `visible` false keeps the control hidden. */
  loadSpeed: () => Promise<SpeedSelectState>
  /** Set the session's speed tier (null clears it); resolves false on failure. */
  setSpeed: (tier: RelayServiceTier | null) => Promise<boolean>
}

export type SpeedSelectProps = Partial<SpeedSelectInjected> & { t?: T }

/** The display label of one tier, or the no-tier default when null. */
export function speedTierLabel(t: T, tier: RelayServiceTier | null): string {
  if (tier === 'fast') return t('serviceTierFast')
  if (tier === 'priority') return t('serviceTierPriority')
  if (tier === 'flex') return t('serviceTierFlex')
  return t('serviceTierUnset')
}

/** How often the control re-reads the host state (model switches arrive only by asking). */
const POLL_INTERVAL_MS = 3000

/** The option rows the menu lists: the no-tier default, then each speed tier. */
const OPTIONS: readonly (RelayServiceTier | null)[] = [null, ...RELAY_SERVICE_TIERS]

/**
 * The composer Speed control. The host pushes nothing on a model switch, so
 * the control re-reads on a slow poll with a single-flight guard; a failed
 * read keeps the last known state, so a transient failure never locks the
 * toggle away.
 */
export function SpeedSelect({ loadSpeed, setSpeed, t }: SpeedSelectProps) {
  const [state, setState] = useState<SpeedSelectState | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  // The inject face may be re-evaluated (new callback identities) on re-render;
  // the poll effect mounts once and reads through this ref, so identity churn
  // neither resets the interval nor multiplies in-flight loads.
  const loadRef = useRef(loadSpeed)
  loadRef.current = loadSpeed

  useEffect(() => {
    if (loadRef.current === undefined) return
    let cancelled = false
    let inflight = false
    const reload = (): void => {
      const load = loadRef.current
      if (load === undefined || inflight) return
      inflight = true
      void load().then(
        (loaded) => { if (!cancelled) setState(loaded) },
        () => { /* keep the last known state; the next tick retries */ },
      ).finally(() => { inflight = false })
    }
    reload()
    const timer = setInterval(reload, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => { document.removeEventListener('mousedown', closeOutside) }
  }, [open])

  if (loadSpeed === undefined || setSpeed === undefined || t === undefined || state === null || !state.visible) {
    return null
  }

  const choose = (tier: RelayServiceTier | null): void => {
    if (busy) return
    if (tier === state.tier) {
      setOpen(false)
      return
    }
    setBusy(true)
    void setSpeed(tier).then((ok) => {
      setBusy(false)
      if (ok) {
        setState({ visible: true, tier })
        setOpen(false)
      }
    })
  }

  const show = (): void => {
    setOpen(true)
    const load = loadRef.current
    if (load === undefined) return
    void load().then(setState, () => { /* keep showing the last good state */ })
  }

  const triggerLabel = `${t('speed')} · ${speedTierLabel(t, state.tier)}`

  return (
    <div
      ref={rootRef}
      style={styles.root}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault()
          setOpen(false)
        }
      }}
    >
      {open && (
        <div style={styles.menu} role="menu" aria-label={t('speed')}>
          {OPTIONS.map(tier => (
            <button
              key={tier ?? 'unset'}
              type="button"
              role="menuitemradio"
              aria-checked={tier === state.tier}
              style={styles.item}
              disabled={busy}
              onClick={() => { choose(tier) }}
            >
              <span style={styles.itemCheck}>{tier === state.tier ? '✓' : ''}</span>
              <span style={styles.itemText}>
                <span style={styles.itemName}>{speedTierLabel(t, tier)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        style={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        title={triggerLabel}
        disabled={busy}
        onClick={() => {
          if (open) setOpen(false)
          else show()
        }}
      >
        {triggerLabel}
      </button>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: { position: 'relative', display: 'inline-flex' },
  trigger: {
    border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 8,
    background: 'transparent', color: 'var(--dsw-alias-label-secondary)',
    font: 'inherit', fontSize: 12, lineHeight: '18px',
    padding: '2px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  menu: {
    position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
    minWidth: 200, padding: 4, zIndex: 20,
    background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l2)',
    borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 2,
  },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: 6, width: '100%',
    border: 'none', borderRadius: 6, background: 'transparent',
    padding: '6px 8px', cursor: 'pointer', font: 'inherit', textAlign: 'left',
  },
  itemCheck: {
    width: 14, flexShrink: 0, fontSize: 12, lineHeight: '18px',
    color: 'var(--dsw-alias-label-primary)',
  },
  itemText: { display: 'flex', flexDirection: 'column' },
  itemName: { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-primary)' },
}
