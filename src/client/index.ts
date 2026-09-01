import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale) into this program.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the conversation package's own `conversation.input.right`
// SlotMap entry (it owns the key) into this program; no runtime edge.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ClientConnectionRpc, SessionId } from '@deepseek-ai/dsh-client-connection/client'
import type { ModelDirectoryResolver } from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type { CommandUiContract } from '@deepseek-ai/dsh-client-ui-commands/client'
import { RELAY_SERVICE_TIERS, relayModelStatuses } from '../shared/core.ts'
import type { RelayServiceTier } from '../shared/types.ts'
import { bindRelayTransport, onSpeedChanged, relayPageApi } from './api.ts'
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
}

/**
 * Whether the session's current model is served on the Codex Responses wire —
 * the only protocol a speed tier reaches. Read live so a model switch made
 * since the last announcement self-corrects the toggle.
 */
async function currentCodexModel(directories: ModelDirectoryResolver, sessionId: string): Promise<boolean> {
  const selection = directories.directoryFor(sessionId as SessionId).store.getSnapshot().current
  if (selection === null) return false
  const page = await relayPageApi.load()
  const provider = page.config.providers[selection.provider]
  if (provider === undefined) return false
  const status = relayModelStatuses(provider, page.catalog.models).find(entry => entry.id === selection.model)
  return status?.protocol === 'openai-codex-responses' && status.supported && !status.excluded
}

/** The `loadSpeed` half of the inject face: this page's speed state plus visibility. */
function createSpeedLoader(directories: ModelDirectoryResolver, sessionId: string): SpeedSelectInjected['loadSpeed'] {
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

/**
 * The `subscribe` half of the inject face. The two things that invalidate the
 * toggle both announce themselves: the session's model directory is a store,
 * and every tier write on this page goes through one function.
 */
function createSpeedSubscriber(
  directories: ModelDirectoryResolver,
  sessionId: string,
): SpeedSelectInjected['subscribe'] {
  return (listener) => {
    const stopModel = directories.directoryFor(sessionId as SessionId).store.subscribe(listener)
    const stopSpeed = onSpeedChanged(listener)
    return () => {
      stopModel()
      stopSpeed()
    }
  }
}

export const inject = ['slots', 'locale', 'connection']

/**
 * Mount the relay models settings page.
 *
 * The nav row sits between Models (10) and Plugins (15): this page configures
 * model routes, and a tie with another section would leave their order to
 * registration timing.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  // Both halves of Connection merge `connection` onto the same cordis Context
  // interface, and this program sees the Host shape because the node half
  // imports it; in the browser the service is the client handle.
  const connection = ctx.get('connection') as unknown as { rpc: ClientConnectionRpc }
  bindRelayTransport(connection.rpc)
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

  // The composer Speed toggle and /fast popup both need the model-selection
  // service. Wait for that seat through `ctx.inject` instead of reading it once:
  // a bare `ctx.get` at apply time races whichever plugin provides the seat, and
  // losing that race drops both surfaces silently for the whole page load — the
  // settings section still installs, so nothing looks broken.
  ctx.inject(['modelDirectories'], (modelScope) => {
    const scope = modelScope as unknown as ClientContext
    const directories = scope.get('modelDirectories') as ModelDirectoryResolver
    scope.slots.inject('conversation.input.right', () => scope.slots.register({
      name: 'conversation.input.right',
      id: 'relay-models-speed',
      order: 0,
      locale: NS,
      inject: (sessionId: string): SpeedSelectInjected => ({
        loadSpeed: createSpeedLoader(directories, sessionId),
        setSpeed: createSpeedSetter(sessionId),
        subscribe: createSpeedSubscriber(directories, sessionId),
      }),
    }, SpeedSelect))

    scope.inject(['commandUi'], (commandScope) => {
      const command = commandScope as unknown as ClientContext
      const commandUi = command.get('commandUi') as CommandUiContract
      command.effect(() => commandUi.register({
        name: 'fast',
        description: t('commandFast'),
        available: () => true,
        ui: {
          kind: 'popupSelect',
          options: async (session) => {
            const state = await createSpeedLoader(directories, session.sessionId)()
            if (!state.visible) throw new Error(t('commandFastUnavailable'))
            return ([null, ...RELAY_SERVICE_TIERS] as const).map(tier => ({
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
    })
  })
}
