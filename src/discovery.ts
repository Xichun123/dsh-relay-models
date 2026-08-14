import { LlmError } from '@deepseek-ai/dsh-llm'
import type { LlmDiscoveredModel, LlmModelDiscoveryRequest } from '@deepseek-ai/dsh-llm'
import { readBoundedText } from './bounded-response.ts'
import { isRelayProtocol, modelsEndpoints, parseModelIds } from './shared/core.ts'
import type { RelayProtocol } from './shared/types.ts'

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024

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

export async function discoverRelayModels(
  request: LlmModelDiscoveryRequest,
): Promise<readonly LlmDiscoveredModel[]> {
  const baseURL = request.baseURL
  if (!baseURL) throw new LlmError('Relay model discovery needs a Base URL', 'DISCOVERY_FAILED')
  const protocol = request.api ?? 'openai-completions'
  if (!isRelayProtocol(protocol)) {
    throw new LlmError(`Unsupported relay protocol: ${protocol}`, 'DISCOVERY_UNSUPPORTED')
  }
  const apiKey = request.apiKey?.trim()
  let lastError = ''
  for (const url of modelsEndpoints(baseURL)) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: authHeaders(protocol, apiKey),
        ...request.signal ? { signal: request.signal } : {},
      })
    } catch (error) {
      if (request.signal?.aborted) throw new LlmError('Relay model discovery aborted', 'ABORTED', { cause: error })
      throw new LlmError(`Could not reach ${url}`, 'DISCOVERY_FAILED', { cause: error })
    }
    if (!response.ok) {
      lastError = `${url} answered ${response.status}${response.status === 401 || response.status === 403 ? '; check the API key' : ''}`
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
