import { attributionHeaders, LlmError } from '@deepseek-ai/dsh-llm'
import type { LlmDiscoveredModel, LlmModelDiscoveryRequest } from '@deepseek-ai/dsh-llm'
import { readBoundedText } from './bounded-response.ts'
import { assertSafeHeaders, isRelayProtocol, modelsEndpoints, parseModelIds } from './shared/core.ts'
import type { RelayProtocol } from './shared/types.ts'

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024
const MAX_FAILURE_BODY_BYTES = 64 * 1024
const MAX_FAILURE_DETAIL_CHARS = 300

/**
 * A discovery request plus the stored provider's extra request headers, which
 * the LLM service's own request type does not carry. Discovery and the
 * `PiAiAdapter` runtime path therefore reach the endpoint with the same
 * deployment headers.
 */
export interface RelayDiscoveryRequest extends LlmModelDiscoveryRequest {
  /**
   * Extra headers configured for the provider; a draft endpoint that is not
   * saved yet has none. Credential headers are refused, and harness
   * attribution still wins over a `user-agent` set here.
   */
  headers?: Readonly<Record<string, string>>
}

function authHeaders(protocol: RelayProtocol, apiKey: string | undefined): Record<string, string> {
  if (protocol === 'anthropic-messages') {
    return {
      accept: 'application/json',
      'anthropic-version': '2023-06-01',
      ...apiKey ? { 'x-api-key': apiKey } : {},
    }
  }
  return {
    accept: 'application/json',
    ...apiKey ? { authorization: `Bearer ${apiKey}` } : {},
  }
}

/**
 * The configured headers minus the names attribution owns, so a relay that
 * only answers Claude Code or Codex User-Agents cannot be satisfied by
 * configuration: the plugin never impersonates another client.
 * @param configured - headers stored for the provider, if any.
 * @param attribution - the attribution headers that win over them.
 * @returns the headers to merge below attribution.
 */
function deploymentHeaders(
  configured: Readonly<Record<string, string>> | undefined,
  attribution: Readonly<Record<string, string>>,
): Record<string, string> {
  if (!configured) return {}
  assertSafeHeaders(configured)
  const reserved = new Set(Object.keys(attribution).map(name => name.toLowerCase()))
  return Object.fromEntries(Object.entries(configured).filter(([name]) => !reserved.has(name.toLowerCase())))
}

/**
 * The message a refusal body states, across the `error.message`, string
 * `error`, `message`, and `detail` forms OpenAI-compatible relays and their
 * gateways use. A body that is not JSON (a proxy's HTML page) has no field
 * worth quoting.
 * @param text - the response body.
 * @returns the stated message, or undefined when the body states none.
 */
function statedMessage(text: string): string | undefined {
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    // A non-JSON refusal body carries no message field; the status alone describes it.
    return undefined
  }
  if (!payload || typeof payload !== 'object') return undefined
  const record = payload as Record<string, unknown>
  const nested = record.error && typeof record.error === 'object'
    ? (record.error as Record<string, unknown>).message
    : undefined
  for (const candidate of [nested, record.error, record.message, record.detail]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate
  }
  return undefined
}

/**
 * The endpoint's own explanation of a refusal, collapsed to one bounded line.
 * @param response - the refused response, whose body this consumes.
 * @param url - the interrogated endpoint, for the byte-limit error.
 * @returns the explanation, or '' when the endpoint gave none.
 */
async function failureDetail(response: Response, url: string): Promise<string> {
  const body = await readBoundedText(response, url, MAX_FAILURE_BODY_BYTES).catch(() => '')
  const line = (statedMessage(body) ?? '').replace(/\s+/gu, ' ').trim()
  return line.length > MAX_FAILURE_DETAIL_CHARS ? `${line.slice(0, MAX_FAILURE_DETAIL_CHARS)}…` : line
}

/**
 * The failure text for a refused listing. The endpoint's own words replace the
 * key guess whenever it says anything: a 401 can also mean the endpoint
 * rejected the client, the account, or the route, and only the endpoint knows
 * which.
 * @param url - the interrogated endpoint.
 * @param status - the HTTP status it answered.
 * @param detail - the endpoint's explanation, or '' when it gave none.
 * @returns the message to report.
 */
function failureMessage(url: string, status: number, detail: string): string {
  if (detail) return `${url} answered ${status}: ${detail}`
  if (status === 401 || status === 403) return `${url} answered ${status}; check the API key`
  return `${url} answered ${status}`
}

export async function discoverRelayModels(
  request: RelayDiscoveryRequest,
): Promise<readonly LlmDiscoveredModel[]> {
  const baseURL = request.baseURL
  if (!baseURL) throw new LlmError('Relay model discovery needs a Base URL', 'DISCOVERY_FAILED')
  const protocol = request.api ?? 'openai-completions'
  if (!isRelayProtocol(protocol)) {
    throw new LlmError(`Unsupported relay protocol: ${protocol}`, 'DISCOVERY_UNSUPPORTED')
  }
  const apiKey = request.apiKey?.trim()
  const attribution = attributionHeaders()
  const extra = deploymentHeaders(request.headers, attribution)
  let lastError = ''
  for (const url of modelsEndpoints(baseURL)) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { ...authHeaders(protocol, apiKey), ...extra, ...attribution },
        ...request.signal ? { signal: request.signal } : {},
      })
    } catch (error) {
      if (request.signal?.aborted) throw new LlmError('Relay model discovery aborted', 'ABORTED', { cause: error })
      throw new LlmError(`Could not reach ${url}`, 'DISCOVERY_FAILED', { cause: error })
    }
    if (!response.ok) {
      lastError = failureMessage(url, response.status, await failureDetail(response, url))
      if (response.status === 404 || response.status === 405) continue
      throw new LlmError(lastError, 'DISCOVERY_FAILED')
    }
    let payload: unknown
    try {
      payload = JSON.parse(await readBoundedText(response, url, MAX_RESPONSE_BYTES))
    } catch (error) {
      if (error instanceof LlmError) throw error
      throw new LlmError(`${url} did not answer with a valid model listing`, 'DISCOVERY_FAILED', { cause: error })
    }
    return parseModelIds(payload).map(id => ({ id }))
  }
  throw new LlmError(lastError || 'Relay model discovery failed', 'DISCOVERY_FAILED')
}
