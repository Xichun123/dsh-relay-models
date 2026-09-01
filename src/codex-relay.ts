import type { ProviderStreams, StreamOptions } from '@earendil-works/pi-ai'
import { openAICodexResponsesApi } from '@earendil-works/pi-ai/api/openai-codex-responses.lazy'
import type { RelayServiceTier } from './shared/types.ts'

/** The claim pi-ai reads `chatgpt-account-id` from. */
const CODEX_ACCOUNT_CLAIM = 'https://api.openai.com/auth'

/**
 * The header a relay key travels in while the synthetic token holds
 * `Authorization`. CLIProxyAPI — the gateway serving the `/backend-api/codex`
 * alias this protocol talks to — authenticates a caller from `x-api-key` even
 * when a bearer is present, and forwards neither header upstream: it injects
 * its own Codex credential there.
 */
export const CODEX_RELAY_KEY_HEADER = 'x-api-key'

/**
 * The account id pi-ai would derive from this key. The decode mirrors pi-ai's
 * own (`atob` over the payload segment, same claim path), so this answers the
 * only question that matters at the call: whether pi-ai can build Codex
 * headers from the key as stored.
 * @param apiKey - the key the credentials service resolved.
 * @returns the account id, or undefined when the key carries none.
 */
export function codexAccountId(apiKey: string): string | undefined {
  const parts = apiKey.split('.')
  if (parts.length !== 3) return undefined
  try {
    const payload = JSON.parse(atob(parts[1]!)) as Record<string, { chatgpt_account_id?: unknown }> | null
    const accountId = payload?.[CODEX_ACCOUNT_CLAIM]?.chatgpt_account_id
    return typeof accountId === 'string' && accountId.length > 0 ? accountId : undefined
  } catch {
    return undefined
  }
}

/**
 * An unsigned token naming `accountId` in the claim pi-ai reads. The segments
 * use standard base64, not base64url, because pi-ai decodes the payload with
 * `atob`, which rejects the url alphabet.
 * @param accountId - the account id to carry; the route name here.
 * @returns the token to hand pi-ai as the API key.
 */
export function syntheticCodexToken(accountId: string): string {
  const segment = (value: unknown): string => btoa(JSON.stringify(value))
  return [
    segment({ alg: 'none', typ: 'JWT' }),
    segment({ [CODEX_ACCOUNT_CLAIM]: { chatgpt_account_id: accountId } }),
    'unsigned',
  ].join('.')
}

/**
 * Resolve the speed tier for one call from the session the caller named.
 * @param options - the options pi-ai was called with (`sessionId` is the key).
 * @returns the session's tier, or undefined for no `service_tier`.
 */
export type SpeedResolver = (options: StreamOptions | undefined) => RelayServiceTier | undefined

/**
 * Keep a tier through pi-ai's `streamSimple`: its base-options rebuild preserves
 * `onPayload` but drops the API-specific `serviceTier`, so restore the wire field
 * at the last hook before serialization. A caller's payload replacement still
 * runs first and keeps authority when it already names `service_tier`.
 */
function preserveServiceTierPayload<T extends StreamOptions>(options: T): T {
  const serviceTier = (options as { serviceTier?: unknown }).serviceTier
  if (serviceTier === undefined) return options
  const onPayload = options.onPayload
  return {
    ...options,
    onPayload: async (payload, model) => {
      const replaced = await onPayload?.(payload, model)
      const body = replaced === undefined ? payload : replaced
      if (body === null || typeof body !== 'object' || Array.isArray(body) || Object.hasOwn(body, 'service_tier')) {
        return body
      }
      return { ...body, service_tier: serviceTier }
    },
  } as T
}

/**
 * The options one Codex Responses call runs with on a relay route.
 *
 * A key that already carries the claim keeps its `Authorization` untouched:
 * that is a relay fronting real ChatGPT tokens, and pi-ai reads such a key
 * itself. The speed tier still applies, because it is per-session choice
 * rather than authentication.
 * @param route - the provider id, which names the synthetic account.
 * @param speedFor - resolves the calling session's speed tier.
 * @param options - the options pi-ai was called with.
 * @returns the options to delegate with.
 */
export function codexRelayStreamOptions<T extends StreamOptions>(
  route: string,
  speedFor: SpeedResolver,
  options: T | undefined,
): T {
  // A caller that already chose a tier keeps it. `priority` is in pi-ai's
  // `serviceTier` union (it mirrors the OpenAI SDK), so no cast is needed.
  const chosen = (options as { serviceTier?: unknown } | undefined)?.serviceTier
  const sessionTier = speedFor(options)
  const tier = sessionTier !== undefined && chosen === undefined
    ? { serviceTier: sessionTier }
    : {}
  const apiKey = options?.apiKey
  if (apiKey !== undefined && codexAccountId(apiKey) !== undefined) return { ...options, ...tier } as T
  const headers = {
    ...options?.headers,
    // The relay key is what the gateway checks, so it wins over a configured
    // header of the same name — one cannot be configured, but the merge order
    // still says which value is authoritative.
    ...apiKey === undefined ? {} : { [CODEX_RELAY_KEY_HEADER]: apiKey },
  }
  return {
    ...options,
    ...tier,
    apiKey: syntheticCodexToken(route),
    ...Object.keys(headers).length > 0 ? { headers } : {},
  } as T
}

/**
 * Codex Responses for a relay route.
 *
 * pi-ai derives `chatgpt-account-id` by decoding the API key as a ChatGPT OAuth
 * token, and it does so before picking a transport: a relay key — 20 opaque
 * characters, not a JWT — fails that decode with `Failed to extract accountId
 * from token`, so neither the WebSocket nor the SSE endpoint is ever reached.
 * The header is not what the relay authenticates on. It checks its own key and
 * injects its own upstream Codex credential, and it accepts a request whose
 * `chatgpt-account-id` it did not issue.
 *
 * So the token pi-ai reads is synthesized per route, and the key that would
 * have been the bearer moves to {@link CODEX_RELAY_KEY_HEADER}, which pi-ai
 * passes through untouched. A relay that authenticates on `Authorization`
 * alone refuses such a request — it refuses the un-rewritten one too, one step
 * earlier and with a less usable message, so nothing that worked stops working.
 *
 * The same wrapper carries the session's speed tier, because `service_tier`
 * is a Codex-only body field and no DSH adapter sets one.
 * @param route - the provider id whose credential authenticates the call.
 * @param speedFor - resolves the calling session's speed tier.
 * @param base - the implementation to wrap; pi-ai's Codex api by default.
 * @returns the api entry to register for `openai-codex-responses`.
 */
export function codexRelayApi(
  route: string,
  speedFor: SpeedResolver,
  base: ProviderStreams = openAICodexResponsesApi(),
): ProviderStreams {
  return {
    stream: (model, context, options) => base.stream(model, context, codexRelayStreamOptions(route, speedFor, options)),
    streamSimple: (model, context, options) => base.streamSimple(
      model,
      context,
      preserveServiceTierPayload(codexRelayStreamOptions(route, speedFor, options)),
    ),
  }
}
