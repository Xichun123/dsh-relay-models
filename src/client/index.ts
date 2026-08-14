import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { relayPageApi } from './api.ts'
import { RelayModelsSection } from './RelayModelsSection.tsx'
import { installStyles } from './styles.ts'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  installStyles()
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'relay-models',
    order: 15,
    label: () => '中转模型',
    inject: () => ({ api: relayPageApi }),
  }, RelayModelsSection))
}
