import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale) into this program.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { relayPageApi } from './api.ts'
import { en, zh, type RelayLocaleKey } from './locales.ts'
import { RelayModelsSection } from './RelayModelsSection.tsx'
import { installStyles } from './styles.ts'

/** Dictionary namespace owned by this page. */
const NS = 'relay-models'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** This page's own copy. */
    'relay-models': RelayLocaleKey
  }
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
}
