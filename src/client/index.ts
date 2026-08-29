import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale) into this program.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { relayModelStatuses } from '../shared/core.ts'
import type { RelayServiceTier } from '../shared/types.ts'
import { relayPageApi } from './api.ts'
import { en, zh, type RelayLocaleKey } from './locales.ts'
import { RelayModelsSection } from './RelayModelsSection.tsx'
import { SpeedSelect, speedTierLabel, type SpeedSelectInjected, type SpeedSelectState } from './SpeedSelect.tsx'
import { installStyles } from './styles.ts'

/** Dictionary namespace owned by this page. */
const NS = 'relay-models'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** This page's own copy. */
    'relay-models': RelayLocaleKey
  }
  interface SlotMap {
    /**
     * The composer tool-row seat the Speed toggle joins. The conversation
     * package owns this slot in the real host and declares the authoritative
     * entry (with its InputZone owner); this declaration only has to be
     * compatible for this program to register into it, so the owner share is
     * opaque here — the toggle reads nothing from it.
     */
    'conversation.input.right': { kind: 'list'; scope: 'session' }
  }
}

/**
 * The sliver of the model-selection plugin's `modelDirectories` service this
 * page reads: the session's current provider/model selection. That service
 * lives in another client plugin this one does not import, so the face is
 * structural — `ctx.get` answers undefined when the seat is absent, and the
 * Speed control stays hidden rather than guess.
 */
interface ModelDirectoriesFace {
  directoryFor(sessionId: string): {
    store: { getSnapshot(): { current: { provider: string; model: string } | null } }
  }
}

/** The sliver of the commands plugin's `commandUi` service the /fast popup uses. */
interface CommandUiFace {
  register(contribution: {
    name: string
    description: string
    available(session: { sessionId: string }): boolean
    ui: {
      kind: 'popupSelect'
      options(session: { sessionId: string }): Promise<readonly { id: string; label: string; detail?: string; active?: boolean }[]>
      onSelect(option: { id: string }, session: { sessionId: string }): void | Promise<void>
    }
  }): () => void
}

/**
 * Whether the session's current model is served on the Codex Responses wire —
 * the only protocol a speed tier reaches. Read live so a model switch made
 * since the last poll self-corrects the toggle.
 */
async function currentCodexModel(directories: ModelDirectoriesFace, sessionId: string): Promise<boolean> {
  const selection = directories.directoryFor(sessionId).store.getSnapshot().current
  if (selection === null) return false
  const page = await relayPageApi.load()
  const provider = page.config.providers[selection.provider]
  if (provider === undefined) return false
  const status = relayModelStatuses(provider, page.catalog.models).find(entry => entry.id === selection.model)
  return status?.protocol === 'openai-codex-responses' && status.supported && !status.excluded
}

/** The `loadSpeed` half of the inject face: this page's speed state plus visibility. */
function createSpeedLoader(directories: ModelDirectoriesFace, sessionId: string): SpeedSelectInjected['loadSpeed'] {
  return async (): Promise<SpeedSelectState> => {
    const [visible, tier] = await Promise.all([
      currentCodexModel(directories, sessionId),
      relayPageApi.getSpeed(sessionId).catch(() => null),
    ])
    return { visible, tier }
  }
}

/** The `setSpeed` half of the inject face: boolean outcome for the busy state. */
function createSpeedSetter(sessionId: string): SpeedSelectInjected['setSpeed'] {
  return tier => relayPageApi.setSpeed(sessionId, tier).then(() => true, () => false)
}

export const inject = ['slots', 'locale']

/**
 * Mount the relay models settings page.
 *
 * The nav row sits between Models (10) and Plugins (15): this page configures
 * model routes, and a tie with another section would leave their order to
 * registration timing.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => installStyles(), 'relay-models: settings styles')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'relay-models: section dictionaries')
  const t = ctx.locale.bind(NS)
  void relayPageApi.load().catch(() => undefined)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'relay-models',
    order: 12,
    label: () => t('nav'),
    locale: NS,
    inject: () => ({ api: relayPageApi }),
  }, RelayModelsSection))

  // The composer Speed toggle and /fast popup both depend on the
  // model-selection service; either entry stays off when that seat is absent.
  const directories = ctx.get('modelDirectories') as ModelDirectoriesFace | undefined
  if (directories !== undefined) {
    ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
      name: 'conversation.input.right',
      id: 'relay-models-speed',
      order: 0,
      locale: NS,
      inject: (sessionId: string): SpeedSelectInjected => ({
        loadSpeed: createSpeedLoader(directories, sessionId),
        setSpeed: createSpeedSetter(sessionId),
      }),
    }, SpeedSelect))

    const commandUi = ctx.get('commandUi') as CommandUiFace | undefined
    if (commandUi !== undefined) {
      ctx.effect(() => commandUi.register({
        name: 'fast',
        description: t('commandFast'),
        available: () => true,
        ui: {
          kind: 'popupSelect',
          options: async (session) => {
            const state = await createSpeedLoader(directories, session.sessionId)()
            if (!state.visible) throw new Error(t('commandFastUnavailable'))
            return ([null, 'fast', 'priority', 'flex'] as const).map(tier => ({
              id: tier ?? 'unset',
              label: speedTierLabel(t, tier),
              active: tier === state.tier,
            }))
          },
          onSelect: async (option, session) => {
            await relayPageApi.setSpeed(session.sessionId, option.id === 'unset' ? null : option.id as RelayServiceTier)
          },
        },
      }), 'relay-models: /fast contribution')
    }
  }
}
