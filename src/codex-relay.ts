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
 * The options one Codex Responses call runs with on a relay route.
 *
 * A key that already carries the claim keeps its `Authorization` untouched:
 * that is a relay fronting real ChatGPT tokens, and pi-ai reads such a key
 * itself. The speed tier still applies, because it is configuration rather
 * than authentication.
 * @param route - the provider id, which names the synthetic account.
 * @param serviceTier - the configured speed tier, or undefined to send none.
 * @param options - the options pi-ai was called with.
 * @returns the options to delegate with.
 */
export function codexRelayStreamOptions<T extends StreamOptions>(
  route: string,
  serviceTier: RelayServiceTier | undefined,
  options: T | undefined,
): T {
  // pi-ai types `serviceTier` as the OpenAI SDK's `service_tier` union, which
  // predates the ChatGPT-credit `fast` tier; on the wire it is a plain string.
  // A caller that already chose a tier keeps it.
  const chosen = (options as { serviceTier?: unknown } | undefined)?.serviceTier
  const tier = serviceTier !== undefined && chosen === undefined
    ? { serviceTier: serviceTier as 'priority' }
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
 * The same wrapper carries the route's speed tier, because `service_tier` is a
 * Codex-only body field and no DSH adapter sets one.
 * @param route - the provider id whose credential authenticates the call.
 * @param serviceTier - the configured speed tier, or undefined to send none.
 * @param base - the implementation to wrap; pi-ai's Codex api by default.
 * @returns the api entry to register for `openai-codex-responses`.
 */
export function codexRelayApi(
  route: string,
  serviceTier?: RelayServiceTier,
  base: ProviderStreams = openAICodexResponsesApi(),
): ProviderStreams {
  return {
    stream: (model, context, options) => base.stream(model, context, codexRelayStreamOptions(route, serviceTier, options)),
    streamSimple: (model, context, options) => base.streamSimple(model, context, codexRelayStreamOptions(route, serviceTier, options)),
  }
}
