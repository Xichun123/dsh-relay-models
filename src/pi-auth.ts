import type { Context } from '@deepseek-ai/cordis'
import { credentialRef, isCredentialRefName } from '@deepseek-ai/dsh-credentials'
import type { PiAiAdapterOptions } from '@deepseek-ai/dsh-llm-pi-ai'

/**
 * The pi-ai auth injection for relay routes.
 *
 * `buildRelayProvider` gives every route a single `apiKey` method and
 * `PiAiAdapter` resolves that key per request from the DSH credentials service,
 * so pi-ai owns no credential of its own here: no relay route offers a sign-in,
 * and no refresh rotates a token. The store therefore reports an empty
 * credential plane, and a write that could not land is refused rather than
 * dropped.
 *
 * `@deepseek-ai/dsh-llm-pi-ai` keeps its own `credentialStoreFrom` /
 * `authContextFrom` builders private, so this is what a third-party adapter can
 * supply for the required option.
 * @param ctx - the plugin context carrying `ctx.credentials`.
 * @returns the injection to hand {@link PiAiAdapterOptions.auth}.
 */
export function relayAuthInjection(ctx: Context): PiAiAdapterOptions['auth'] {
  return {
    credentials: {
      read: () => Promise.resolve(undefined),
      list: () => Promise.resolve([]),
      modify: async (providerId, fn) => {
        const written = await fn(undefined)
        if (written !== undefined) {
          throw new Error(
            `relay-models: provider "${providerId}" cannot store a pi-ai credential; a relay route`
            + ' authenticates with the API key the DSH credentials service holds',
          )
        }
        return undefined
      },
      delete: () => Promise.resolve(),
    },
    authContext: {
      // A name outside the reference grammar has no credential record to miss,
      // so it reads as "not set" here and falls through to the environment.
      env: async name => {
        const stored = isCredentialRefName(name)
          ? (await ctx.credentials.resolve(credentialRef(name)))?.value
          : undefined
        return stored !== undefined && stored.length > 0 ? stored : process.env[name]
      },
      // Relay routes authenticate from their configured API key alone; no local
      // credential file participates in resolving one.
      fileExists: () => Promise.resolve(false),
    },
  }
}
