/**
 * Codex Speed toggle: one small control in the composer's right tool row
 * (`conversation.input.right`), switching the session between no `service_tier`
 * and a Codex speed tier. The choice is per session and lives in the node half
 * (in-memory); this component holds only viewing state. It renders nothing
 * until the current session model resolves to a relay route whose protocol is
 * Codex Responses — the only wire a tier reaches.
 */
import { useEffect, useRef, useState } from 'react'
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'
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
  /** Announce a model switch or a tier written elsewhere (the /fast popup). */
  subscribe: (listener: () => void) => () => void
}

export type SpeedSelectProps = Partial<SpeedSelectInjected> & { t?: T }

/** The display label of one tier, or the no-tier default when null. */
export function speedTierLabel(t: T, tier: RelayServiceTier | null): string {
  // `priority` is the wire value; "Fast mode" is what OpenAI and Codex CLI call it.
  return tier === 'priority' ? t('serviceTierFast') : t('serviceTierUnset')
}

/** The option rows the menu lists: the no-tier default, then each speed tier. */
const OPTIONS: readonly (RelayServiceTier | null)[] = [null, ...RELAY_SERVICE_TIERS]

/** The row id one option carries; the no-tier default has no tier to name it. */
function optionId(tier: RelayServiceTier | null): string {
  return tier ?? 'unset'
}

/**
 * The composer Speed control. State is re-read when the session's model
 * selection changes or another surface writes the tier, both of which arrive
 * through {@link SpeedSelectInjected.subscribe}; a failed read keeps the last
 * known state, so a transient failure never locks the toggle away.
 */
export function SpeedSelect({ loadSpeed, setSpeed, subscribe, t }: SpeedSelectProps) {
  const [state, setState] = useState<SpeedSelectState | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  // The inject face may be re-evaluated (new callback identities) on re-render;
  // the subscription mounts once and reads through these refs, so identity
  // churn neither resubscribes nor multiplies in-flight loads.
  const loadRef = useRef(loadSpeed)
  const subscribeRef = useRef(subscribe)
  loadRef.current = loadSpeed
  subscribeRef.current = subscribe

  useEffect(() => {
    let cancelled = false
    let inflight = false
    let queued = false
    const reload = (): void => {
      const load = loadRef.current
      if (load === undefined) return
      // Coalesce rather than drop: an announcement arriving mid-load is the one
      // that matters (a model switch), and dropping it leaves the control
      // showing the previous model's visibility and tier.
      if (inflight) {
        queued = true
        return
      }
      inflight = true
      void load().then(
        (loaded) => { if (!cancelled) setState(loaded) },
        () => { /* keep the last known state; the queued or next announcement retries */ },
      ).finally(() => {
        inflight = false
        if (queued && !cancelled) {
          queued = false
          reload()
        }
      })
    }
    reload()
    const stop = subscribeRef.current?.(reload)
    return () => {
      cancelled = true
      stop?.()
    }
  }, [])

  if (loadSpeed === undefined || setSpeed === undefined || t === undefined || state === null || !state.visible) {
    return null
  }

  const choose = (id: string): void => {
    const tier = OPTIONS.find(option => optionId(option) === id) ?? null
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

  // The button shows only the current tier. `title` keeps the "Speed" word as
  // the button's accessible description, so what the control selects stays
  // discoverable without spending composer width on it.
  const tierLabel = speedTierLabel(t, state.tier)

  return (
    <Menu
      open={open}
      side="top"
      align="end"
      compact
      selectedId={optionId(state.tier)}
      items={OPTIONS.map(tier => ({ id: optionId(tier), label: speedTierLabel(t, tier), disabled: busy }))}
      onSelect={choose}
      onClose={() => { setOpen(false) }}
      anchor={(
        <button
          type="button"
          className="drm-speed-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          title={`${t('speed')} · ${tierLabel}`}
          disabled={busy}
          onClick={() => { setOpen(value => !value) }}
        >
          {tierLabel}
        </button>
      )}
    />
  )
}
