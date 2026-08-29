import type { RelayServiceTier } from './types.ts'

/**
 * Per-session Codex speed tier: one in-memory choice per conversation,
 * replacing the route-level `serviceTier` config. Restart clears it (the
 * reference plugin's posture), so a stale choice never outlives the session
 * that made it. `undefined` clears the session, restoring the default of no
 * `service_tier` on the wire.
 */
export class SpeedController {
  private readonly tiers = new Map<string, RelayServiceTier>()

  /** The session's chosen tier, or undefined for the no-`service_tier` default. */
  get(sessionId: string | undefined): RelayServiceTier | undefined {
    return sessionId === undefined ? undefined : this.tiers.get(sessionId)
  }

  /** Set the session's tier; `undefined` clears it back to the default. */
  set(sessionId: string, tier: RelayServiceTier | undefined): void {
    if (tier === undefined) this.tiers.delete(sessionId)
    else this.tiers.set(sessionId, tier)
  }
}
