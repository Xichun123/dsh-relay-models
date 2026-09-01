import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import Schema from '@deepseek-ai/schemastery'
import { assertUsableApiKey, LlmError, RetryPolicySchema, resolveRetryPolicy } from '@deepseek-ai/dsh-llm'
import type { AdapterRegistrationHandle, DirectoryRegistrationHandle } from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import type { ResolvedPiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { MAX_TIMER_DELAY_MS } from '@deepseek-ai/dsh-timeout'
import { builtinProviders } from '@earendil-works/pi-ai/providers/all'
import { currentOfficialCatalog, refreshOfficialCatalog } from './catalog.ts'
import { discoverRelayModels } from './discovery.ts'
import { buildRelayProvider } from './materialize.ts'
import { relayAuthInjection } from './pi-auth.ts'
import type { SpeedResolver } from './codex-relay.ts'
import { SpeedController } from './shared/speed.ts'
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
} from './shared/core.ts'
import type { OfficialModelSummary, RelayConfig, RelayProviderConfig } from './shared/types.ts'
import { installWebApi } from './web-api.ts'
import { enrichOfficialProviders, type PiAiProvidersMap } from './enrich-official.ts'

export const name = 'relay-models'
export const inject = ['llm', 'settings', 'credentials', 'connection']

const NS = settingsNamespace('llm-relay-models')
const PI_AI_NS = settingsNamespace('llm-pi-ai')

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
  retryPolicy: RetryPolicySchema,
  syncedAt: Schema.natural(),
})

export const Config: Schema<Config> = Schema.object({
  providers: Schema.dict(providerConfig).default({}),
})

/**
 * Every provider id the installed pi-ai build ships, read live so a pi-ai
 * release that adds one is covered without editing this plugin.
 * `builtinProviders()` rather than `getBuiltinProviders()` because a provider
 * with a dynamically refreshed catalog (`radius`) owns no static model table
 * and is missing from the latter.
 */
function liveReservedProviderIds(): Set<string> {
  return new Set(builtinProviders().map(provider => provider.id))
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
  // The speed tier is session state, not configuration: validation only proves
  // the routes materialize, with no tier in play.
  resolveProfiles(config, currentOfficialCatalog().models, () => undefined)
}

function resolveProfile(
  provider: string,
  source: RelayProviderConfig,
  catalog: readonly OfficialModelSummary[],
  speedFor: SpeedResolver,
): ResolvedPiAiProviderProfile {
  const profile: ResolvedPiAiProviderProfile = {
    provider,
    displayName: source.displayName,
    apiKeyEnv: credentialRef(source.apiKeyEnv),
    streamIdleTimeoutMs: source.streamIdleTimeoutMs ?? DEFAULT_STREAM_IDLE_TIMEOUT_MS,
    // pi-ai's own request-image ceilings: `ResolvedPiAiProviderProfile` requires
    // the numbers and `dsh-llm-pi-ai` exports neither them nor its resolver, so
    // they are restated here rather than offered as per-provider knobs no
    // surface sets.
    maxRequestImageBytes: DEFAULT_MAX_REQUEST_IMAGE_BYTES,
    requestImagePixelBudget: DEFAULT_REQUEST_IMAGE_PIXEL_BUDGET,
    requestImageMaxBytes: DEFAULT_REQUEST_IMAGE_MAX_BYTES,
    retryPolicy: resolveRetryPolicy(source.retryPolicy, `relay-models: provider "${provider}" retry policy`),
    piProvider: buildRelayProvider(provider, source, catalog, speedFor),
    configuredMaxTokens: new Map(),
  }
  if (source.headers && Object.keys(source.headers).length > 0) profile.headers = { ...source.headers }
  if (source.transport) profile.transport = source.transport
  return profile
}

function resolveProfiles(
  config: Config,
  catalog: readonly OfficialModelSummary[],
  speedFor: SpeedResolver,
): Map<string, ResolvedPiAiProviderProfile> {
  const profiles = new Map<string, ResolvedPiAiProviderProfile>()
  for (const [provider, source] of Object.entries(config.providers)) {
    profiles.set(provider, resolveProfile(provider, source, catalog, speedFor))
  }
  return profiles
}

export function apply(ctx: Context, config: Config): void {
  // Per-session Codex speed tier, chosen from the composer Speed toggle or the
  // /fast popup; in-memory, so a restart restores the no-`service_tier` default.
  const speed = new SpeedController()
  const speedFor: SpeedResolver = options => speed.get(options?.sessionId)
  let current: () => Config = () => config
  let profiles = resolveProfiles(config, currentOfficialCatalog().models, speedFor)

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
    const next = resolveProfiles(current(), currentOfficialCatalog().models, speedFor)
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

  const syncOfficialModels = (): void => {
    const snapshot = ctx.settings.get(PI_AI_NS) as { providers?: PiAiProvidersMap } | undefined
    const providers = snapshot?.providers
    if (!providers || Object.keys(providers).length === 0) return
    const result = enrichOfficialProviders(providers, currentOfficialCatalog().models)
    if (!result.changed) return
    const revision = ctx.settings.describe({ redactSecrets: true }).find(item => item.ns === PI_AI_NS)?.revision
    void ctx.settings.mutate(PI_AI_NS, [{ op: 'set', path: ['providers'], value: result.providers }], revision).then(() => {
      ctx.logger.info(`relay-models: filled official Models metadata (${result.notes.join('; ')})`)
    }).catch((error: unknown) => {
      ctx.logger.warn('relay-models: did not write llm-pi-ai enrichment: %s', String(error))
    })
  }

  ctx.effect(() => {
    syncOfficialModels()
    const stop = ctx.on('settings/updated', (ns: unknown) => {
      if (ns === PI_AI_NS) syncOfficialModels()
    })
    return () => { stop() }
  }, 'relay-models: fill official Models capabilities')

  installSettingsSection(ctx, NS, Config, config, {
    validate: validateConfig,
    setSource: source => { current = source },
    onChange: safeRefresh,
  })
  installWebApi(ctx, NS, () => current(), safeRefresh, speed, syncOfficialModels)
}
