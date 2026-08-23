import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import Schema from '@deepseek-ai/schemastery'
import { assertUsableApiKey, LlmError, RetryPolicySchema, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import type { AdapterRegistrationHandle, DirectoryRegistrationHandle } from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { getBuiltinProviders } from '@earendil-works/pi-ai/providers/all'
import { currentOfficialCatalog, refreshOfficialCatalog } from './catalog.ts'
import { discoverRelayModels } from './discovery.ts'
import { buildRelayProvider } from './materialize.ts'
import { relayAuthInjection } from './pi-auth.ts'
import {
  assertSafeHeaders,
  assertUnreservedProviderId,
  DEFAULT_MAX_REQUEST_IMAGE_BYTES,
  DEFAULT_REQUEST_IMAGE_MAX_BYTES,
  DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  isRelayProtocol,
  normalizeBaseURL,
  RELAY_PROTOCOLS,
  RELAY_TRANSPORTS,
  relayCredentialRef,
  RESERVED_PROVIDER_IDS,
} from './shared/core.ts'
import type { OfficialModelSummary, RelayConfig, RelayProviderConfig } from './shared/types.ts'
import { installWebApi } from './web-api.ts'

export const name = 'relay-models'
export const inject = ['llm', 'settings', 'credentials', 'webServer']

const NS = settingsNamespace('llm-relay-models')

export type Config = RelayConfig

const officialReference = Schema.object({
  provider: Schema.string().required(),
  id: Schema.string().required(),
})

const providerConfig = Schema.object({
  displayName: Schema.string().required(),
  baseURL: Schema.string().required(),
  apiKeyEnv: Schema.string().required().role('credential-ref'),
  fallbackProtocol: Schema.union(RELAY_PROTOCOLS).required(),
  modelIds: Schema.array(Schema.string()).default([]),
  modelMappings: Schema.dict(officialReference).default({}),
  protocolOverrides: Schema.dict(Schema.union(RELAY_PROTOCOLS)).default({}),
  excludedModels: Schema.array(Schema.string()).default([]),
  headers: Schema.dict(Schema.string()).default({}),
  transport: Schema.union(RELAY_TRANSPORTS),
  streamIdleTimeoutMs: Schema.number().min(Number.MIN_VALUE).max(MAX_TIMER_DELAY_MS).default(DEFAULT_STREAM_IDLE_TIMEOUT_MS),
  maxRequestImageBytes: Schema.number().step(1).min(1).default(DEFAULT_MAX_REQUEST_IMAGE_BYTES),
  requestImagePixelBudget: Schema.number().step(1).min(1).default(DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET),
  requestImageMaxBytes: Schema.number().step(1).min(1).default(DEFAULT_REQUEST_IMAGE_MAX_BYTES),
  retryPolicy: RetryPolicySchema,
  syncedAt: Schema.natural(),
})

export const Config: Schema<Config> = Schema.object({
  providers: Schema.dict(providerConfig).default({}),
  trustedHosts: Schema.array(Schema.string()).default([]),
})

function liveReservedProviderIds(): Set<string> {
  return new Set<string>([...RESERVED_PROVIDER_IDS, ...getBuiltinProviders()])
}

function validateProvider(route: string, config: RelayProviderConfig): void {
  assertUnreservedProviderId(route, liveReservedProviderIds())
  if (!config.displayName.trim()) throw new Error(`Relay provider "${route}" needs a display name`)
  normalizeBaseURL(config.baseURL)
  if (config.apiKeyEnv !== relayCredentialRef(route)) {
    throw new Error(`Relay provider "${route}" must use credential reference ${relayCredentialRef(route)}`)
  }
  assertSafeHeaders(config.headers ?? {})
  for (const remoteId of Object.keys(config.modelMappings)) {
    if (!remoteId.trim()) throw new Error(`Relay provider "${route}" has an empty remote model mapping key`)
  }
  for (const remoteId of Object.keys(config.protocolOverrides)) {
    if (!remoteId.trim()) throw new Error(`Relay provider "${route}" has an empty protocol override key`)
  }
}

/**
 * Refuse a section this plugin could not serve, at the write that stores it.
 * Materialization is part of the check because that is where an unserviceable
 * protocol or model fails: without it a schema-valid provider would be stored,
 * the swap below would refuse it, and the page would report a successful save
 * of a route that is not registered.
 * @param config - the resolved section, schema-valid by construction.
 */
function validateConfig(config: Config): void {
  for (const [route, provider] of Object.entries(config.providers)) validateProvider(route, provider)
  resolveProfiles(config, currentOfficialCatalog().models)
}

function resolveProfile(
  provider: string,
  source: RelayProviderConfig,
  catalog: readonly OfficialModelSummary[],
): ResolvedPiAiProviderProfile {
  const profile: ResolvedPiAiProviderProfile = {
    provider,
    displayName: source.displayName,
    apiKeyEnv: credentialRef(source.apiKeyEnv),
    streamIdleTimeoutMs: source.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS,
    maxRequestImageBytes: source.maxRequestImageBytes ?? DEFAULT_MAX_REQUEST_IMAGE_BYTES,
    requestImagePixelBudget: source.requestImagePixelBudget ?? DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET,
    requestImageMaxBytes: source.requestImageMaxBytes ?? DEFAULT_REQUEST_IMAGE_MAX_BYTES,
    retryPolicy: resolveRetryPolicy(source.retryPolicy, `relay-models: provider "${provider}" retry policy`),
    piProvider: buildRelayProvider(provider, source, catalog),
    configuredMaxTokens: new Map(),
  }
  if (source.headers && Object.keys(source.headers).length > 0) profile.headers = { ...source.headers }
  if (source.transport) profile.transport = source.transport
  return profile
}

function resolveProfiles(
  config: Config,
  catalog: readonly OfficialModelSummary[],
): Map<string, ResolvedPiAiProviderProfile> {
  const profiles = new Map<string, ResolvedPiAiProviderProfile>()
  for (const [provider, source] of Object.entries(config.providers)) {
    profiles.set(provider, resolveProfile(provider, source, catalog))
  }
  return profiles
}

export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config
  let profiles = resolveProfiles(config, currentOfficialCatalog().models)

  /**
   * The key one request authenticates with, or undefined for a relay that takes
   * none — a self-hosted gateway on loopback is the case, and the page shows
   * such a provider as having no key.
   *
   * Handing pi-ai `undefined` cannot leak an unrelated ambient key here the way
   * it can for an installed catalog route: {@link buildRelayProvider} gives
   * every relay route one `apiKey` method whose resolver answers from this
   * credential alone, so an absent key means no `Authorization` header rather
   * than provider-native environment discovery.
   * @param profile - the resolved profile naming the credential reference.
   * @returns the usable key, or undefined when none is stored.
   */
  const resolveApiKey = async (
    _provider: string,
    profile: ResolvedPiAiProviderProfile,
  ): Promise<string | undefined> => {
    const ref = String(profile.apiKeyEnv)
    const hit = (await ctx.credentials.resolve(credentialRef(ref)))?.value
    return hit ? assertUsableApiKey(hit, 'relay-models', ref) : undefined
  }

  const adapter = new PiAiAdapter({
    profiles: () => profiles,
    resolveApiKey,
    auth: relayAuthInjection(ctx),
    resolveAttachments: () => ctx.get('attachments'),
    onReplayDegrade: ({ provider, model, reason }) => {
      ctx.logger.warn(
        `relay-models: unusable replay state on assistant history for route "${provider}/${model}";`
        + ` sending that message as provider-neutral content (${reason})`,
      )
    },
  })

  let registration: AdapterRegistrationHandle | undefined
  let directory: DirectoryRegistrationHandle | undefined

  const directoryEntries = () => Object.entries(current().providers).map(([provider, source]) => ({
    provider,
    displayName: source.displayName,
    settingsNs: NS,
    settingsPath: ['providers', provider],
    declared: true as const,
  }))

  const refreshDirectory = (): void => {
    const entries = directoryEntries()
    try {
      if (!directory && entries.length > 0) directory = ctx.llm.registerConfigurableProviders(entries)
      else if (directory) directory.replace(entries)
    } catch (error) {
      ctx.logger.error('relay-models: keeping the previous configurable-provider directory after a refused update')
      ctx.logger.error(error)
    }
  }

  const refresh = (): void => {
    const next = resolveProfiles(current(), currentOfficialCatalog().models)
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

  const safeRefresh = (): void => {
    try {
      refresh()
    } catch (error) {
      ctx.logger.error('relay-models: keeping the previously registered routes after a refused update')
      ctx.logger.error(error)
    }
    refreshDirectory()
  }

  refresh()
  refreshDirectory()

  ctx.llm.registerModelDiscovery(NS, async request => {
    const stored = request.provider ? current().providers[request.provider] : undefined
    const baseURL = stored?.baseURL ?? request.baseURL
    const protocol = (isRelayProtocol(request.api) ? request.api : undefined)
      ?? stored?.fallbackProtocol
      ?? 'openai-completions'
    if (!baseURL) throw new LlmError('Relay model discovery needs a Base URL', 'DISCOVERY_FAILED')
    const storedKey = stored
      ? (await ctx.credentials.resolve(credentialRef(stored.apiKeyEnv)))?.value
      : undefined
    return discoverRelayModels({
      baseURL,
      api: protocol,
      apiKey: request.apiKey ?? storedKey,
      ...stored?.headers && Object.keys(stored.headers).length > 0 ? { headers: stored.headers } : {},
      ...request.signal ? { signal: request.signal } : {},
    })
  })

  ctx.effect(() => {
    const controller = new AbortController()
    void refreshOfficialCatalog(controller.signal).then(() => { if (!controller.signal.aborted) safeRefresh() }).catch((error: unknown) => {
      if (!controller.signal.aborted) ctx.logger.warn('relay-models: using bundled model catalog because pi.dev refresh failed: %s', String(error))
    })
    return () => { controller.abort() }
  }, 'relay-models: refresh pi.dev model catalog')

  installSettingsSection(ctx, NS, Config, config, {
    validate: validateConfig,
    setSource: source => { current = source },
    onChange: safeRefresh,
  })
  installWebApi(ctx, NS, () => current(), safeRefresh)
}
