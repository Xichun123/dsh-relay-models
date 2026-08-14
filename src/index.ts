import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import z from '@deepseek-ai/schemastery'
import { assertUsableApiKey, LlmError, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import type { AdapterRegistrationHandle } from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { buildRelayProvider, OFFICIAL_SUMMARIES } from './materialize.ts'
import { normalizeBaseURL, RELAY_PROTOCOLS, relayCredentialRef, validateProviderId } from './shared/core.ts'
import type { RelayConfig, RelayProviderConfig } from './shared/types.ts'
import { installWebApi } from './web-api.ts'

export const name = 'relay-models'
export const inject = ['llm', 'settings', 'credentials', 'webServer']

const NS = settingsNamespace('llm-relay-models')
const OFFICIAL_REFS = new Set(OFFICIAL_SUMMARIES.map(model => `${model.provider}/${model.id}`))

export type Config = RelayConfig

const officialReference = z.object({
  provider: z.string().required(),
  id: z.string().required(),
})

const providerConfig = z.object({
  displayName: z.string().required(),
  baseURL: z.string().required(),
  apiKeyEnv: z.string().required().role('credential-ref'),
  fallbackProtocol: z.union(RELAY_PROTOCOLS).required(),
  modelIds: z.array(z.string()).default([]),
  modelMappings: z.dict(officialReference).default({}),
  protocolOverrides: z.dict(z.union(RELAY_PROTOCOLS)).default({}),
  excludedModels: z.array(z.string()).default([]),
  syncedAt: z.natural(),
})

export const Config: z<Config> = z.object({
  providers: z.dict(providerConfig).default({}),
})

function validateProvider(route: string, config: RelayProviderConfig): void {
  if (validateProviderId(route) !== route) throw new Error(`Relay provider route must be normalized: ${route}`)
  if (!config.displayName.trim()) throw new Error(`Relay provider "${route}" needs a display name`)
  normalizeBaseURL(config.baseURL)
  if (config.apiKeyEnv !== relayCredentialRef(route)) {
    throw new Error(`Relay provider "${route}" must use credential reference ${relayCredentialRef(route)}`)
  }
  for (const [remoteId, reference] of Object.entries(config.modelMappings)) {
    if (!remoteId.trim()) throw new Error(`Relay provider "${route}" has an empty remote model mapping key`)
    if (!OFFICIAL_REFS.has(`${reference.provider}/${reference.id}`)) {
      throw new Error(`Relay provider "${route}" maps "${remoteId}" to unknown model ${reference.provider}/${reference.id}`)
    }
  }
  for (const remoteId of Object.keys(config.protocolOverrides)) {
    if (!remoteId.trim()) throw new Error(`Relay provider "${route}" has an empty protocol override key`)
  }
}

function validateConfig(config: Config): void {
  for (const [route, provider] of Object.entries(config.providers)) validateProvider(route, provider)
}

function resolveProfiles(config: Config): Map<string, ResolvedPiAiProviderProfile> {
  const profiles = new Map<string, ResolvedPiAiProviderProfile>()
  for (const [provider, source] of Object.entries(config.providers)) {
    profiles.set(provider, {
      provider,
      displayName: source.displayName,
      apiKeyEnv: source.apiKeyEnv as ResolvedPiAiProviderProfile['apiKeyEnv'],
      streamIdleTimeoutMs: 300_000,
      retryPolicy: resolveRetryPolicy(undefined, `relay-models: provider "${provider}" retry policy`),
      piProvider: buildRelayProvider(provider, source),
      configuredMaxTokens: new Map(),
    } as ResolvedPiAiProviderProfile)
  }
  return profiles
}

export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config
  let profiles = resolveProfiles(config)

  const resolveApiKey = async (
    provider: string,
    profile: ResolvedPiAiProviderProfile,
  ): Promise<string | undefined> => {
    const ref = String(profile.apiKeyEnv)
    const hit = (await ctx.credentials.resolve(credentialRef(ref)))?.value
    if (hit) return assertUsableApiKey(hit, 'relay-models', ref)
    throw new LlmError(
      `relay-models: no credential for provider "${provider}"; store ${ref} on the Relay Models page`,
      'MISSING_CREDENTIAL',
    )
  }

  const adapter = new PiAiAdapter({
    profiles: () => profiles,
    resolveApiKey,
    resolveAttachments: () => ctx.get('attachments'),
  })

  let registration: AdapterRegistrationHandle | undefined
  const refresh = (): void => {
    const next = resolveProfiles(current())
    const routes = [...next.keys()]
    const previous = profiles
    profiles = next
    try {
      if (!registration && routes.length > 0) registration = ctx.llm.registerAdapter(routes, adapter)
      else if (registration) registration.replace(routes)
    } catch (error) {
      profiles = previous
      throw error
    }
  }
  refresh()

  installSettingsSection(ctx, NS, Config, config, {
    validate: validateConfig,
    setSource: source => { current = source },
    onChange: refresh,
  })
  installWebApi(ctx, NS, () => current())
}
