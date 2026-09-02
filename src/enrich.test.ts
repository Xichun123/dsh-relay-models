import assert from 'node:assert/strict'
import { test } from 'node:test'
import { indexCatalog, listAliases, listChoices, resetAliases, setAlias } from './catalog.ts'
import { compatFields, enrichDiscovered, enrichEntry, enrichOps, reasoningEfforts } from './enrich.ts'

const index = indexCatalog({
  openai: {
    'gpt-4o': {
      id: 'gpt-4o',
      name: 'GPT-4o',
      api: 'openai-responses',
      provider: 'openai',
      input: ['text', 'image'],
      contextWindow: 128000,
      maxTokens: 16384,
      reasoning: false,
      compat: { supportsStrictMode: true, supportsOpenAIGrammarTools: true },
    },
    'gpt-5.6-sol': {
      id: 'gpt-5.6-sol',
      name: 'GPT-5.6 Sol',
      api: 'openai-responses',
      provider: 'openai',
      input: ['text', 'image'],
      contextWindow: 272000,
      maxTokens: 128000,
      reasoning: true,
      thinkingLevelMap: {
        off: 'none',
        minimal: null,
        low: 'low',
        medium: 'medium',
        high: 'high',
        xhigh: 'xhigh',
        max: 'max',
      },
      compat: {
        supportsStrictMode: true,
        supportsOpenAIGrammarTools: true,
        supportsAdditionalTools: true,
        supportsToolSearch: true,
        supportsExplicitPromptCacheMode: true,
      },
    },
  },
  groq: {
    'gpt-4o': {
      id: 'gpt-4o',
      name: 'GPT-4o (Groq)',
      api: 'openai-completions',
      provider: 'groq',
      input: ['text', 'image'],
      contextWindow: 128000,
      maxTokens: 16384,
      reasoning: false,
      compat: { thinkingFormat: 'openai', supportsStore: false, supportsOpenAIGrammarTools: true },
    },
  },
  xai: {
    'gpt-4o': {
      id: 'gpt-4o',
      name: 'GPT-4o (xAI)',
      api: 'openai-completions',
      provider: 'xai',
      input: ['text', 'image'],
      contextWindow: 128000,
      maxTokens: 16384,
      reasoning: false,
      compat: { thinkingFormat: 'openai', supportsStore: false, supportsOpenAIGrammarTools: true },
    },
  },
  anthropic: {
    'claude-sonnet-4.5': {
      id: 'claude-sonnet-4.5',
      name: 'Claude Sonnet 4.5',
      api: 'anthropic-messages',
      provider: 'anthropic',
      input: ['text', 'image'],
      contextWindow: 200000,
      maxTokens: 64000,
      reasoning: true,
      thinkingLevelMap: { off: null, high: 'high', max: 'max', xhigh: null },
      compat: { forceAdaptiveThinking: true, sendSessionAffinityHeaders: true },
    },
  },
  deepseek: {
    'deepseek-chat': {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      api: 'openai-completions',
      provider: 'deepseek',
      input: ['text'],
      contextWindow: 128000,
      maxTokens: 8192,
      reasoning: true,
      thinkingLevelMap: { off: null, high: 'high', max: 'max' },
      compat: { thinkingFormat: 'deepseek', requiresReasoningContentOnAssistantMessages: true },
    },
  },
})

test('fills missing discovery capacities; keeps endpoint values', () => {
  assert.deepEqual(
    enrichDiscovered([{ id: 'gpt-4o' }, { id: 'unknown' }], index),
    [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxTokens: 16384 },
      { id: 'unknown' },
    ],
  )
  assert.deepEqual(
    enrichDiscovered([{ id: 'gpt-4o', contextWindow: 999 }], index)[0],
    { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 999, maxTokens: 16384 },
  )
})

test('slash-suffixed ids resolve to the bare catalog id', () => {
  const entry = enrichEntry({ id: 'anthropic/claude-sonnet-4.5' }, index, 'anthropic-messages')
  assert.equal(entry.name, 'Claude Sonnet 4.5')
  assert.deepEqual(entry.input, ['text', 'image'])
})

test('prefers a catalog row whose api matches the custom route', () => {
  const entry = enrichEntry({ id: 'gpt-4o' }, index, 'openai-completions')
  assert.equal(entry.name, 'GPT-4o (xAI)')
  assert.equal((entry.compat as { thinkingFormat: string }).thinkingFormat, 'openai')
})

test('reasoningEfforts expands sparse maps and drops explicit nulls', () => {
  assert.deepEqual(reasoningEfforts({
    id: 'm',
    reasoning: true,
    thinkingLevelMap: { off: null, high: 'high', max: 'max', xhigh: null },
  }), { minimal: 'minimal', low: 'low', medium: 'medium', high: 'high', max: 'max' })
  assert.deepEqual(reasoningEfforts({
    id: 'gpt-5.6-sol',
    reasoning: true,
    thinkingLevelMap: {
      off: 'none',
      minimal: null,
      low: 'low',
      medium: 'medium',
      high: 'high',
      xhigh: 'xhigh',
      max: 'max',
    },
  }), {
    off: 'none',
    low: 'low',
    medium: 'medium',
    high: 'high',
    xhigh: 'xhigh',
    max: 'max',
  })
  assert.deepEqual(
    reasoningEfforts({ id: 'm', reasoning: true }),
    { off: null, minimal: 'minimal', low: 'low', medium: 'medium', high: 'high' },
  )
  assert.equal(reasoningEfforts({ id: 'm', reasoning: false }), undefined)
})

test('compat drops withheld keys and fields the route api cannot take', () => {
  assert.deepEqual(
    compatFields({ thinkingFormat: 'deepseek', sendSessionAffinityHeaders: true }, 'openai-completions'),
    { thinkingFormat: 'deepseek' },
  )
  assert.equal(compatFields({ forceAdaptiveThinking: true }, 'openai-completions'), undefined)
})

test('mutate ops fill a new custom provider and a models-only edit', () => {
  const created = enrichOps([{
    op: 'set',
    path: ['providers', 'my-gateway'],
    value: {
      api: 'openai-completions',
      baseURL: 'https://gw.example/v1',
      models: [{ id: 'deepseek-chat' }, { id: 'local-only' }],
    },
  }], {}, index)
  const models = (created[0]!.value as { models: Record<string, unknown>[] }).models
  assert.equal(models[0]!.name, 'DeepSeek Chat')
  assert.deepEqual(models[0]!.input, ['text'])
  assert.equal((models[0]!.compat as { thinkingFormat: string }).thinkingFormat, 'deepseek')
  assert.deepEqual(models[1], { id: 'local-only' })

  const edited = enrichOps([{
    op: 'set',
    path: ['providers', 'my-gateway', 'models'],
    value: [{ id: 'gpt-4o' }],
  }], { providers: { 'my-gateway': { api: 'openai-completions' } } }, index)
  assert.equal((edited[0]!.value as Record<string, unknown>[])[0]!.name, 'GPT-4o (xAI)')
})

test('ignores catalog providers outside the allowlist', () => {
  assert.equal(enrichEntry({ id: 'gpt-4o' }, index).name, 'GPT-4o')
  assert.deepEqual(enrichEntry({ id: 'groq-only' }, indexCatalog({
    groq: { 'groq-only': { id: 'groq-only', name: 'Nope', provider: 'groq' } },
  })), { id: 'groq-only' })
})

test('listChoices is unique ids from the allowlist, ranked pick per id', () => {
  assert.deepEqual(listChoices(index).map(choice => choice.id), [
    'claude-sonnet-4.5', 'deepseek-chat', 'gpt-4o', 'gpt-5.6-sol',
  ])
  assert.equal(listChoices(index).find(choice => choice.id === 'gpt-4o')?.name, 'GPT-4o')
  assert.equal(listChoices(index).find(choice => choice.id === 'gpt-5.6-sol')?.provider, 'openai')
})

test('openai wins over openai-codex for the same model id', () => {
  const both = indexCatalog({
    'openai-codex': {
      'gpt-5.6-sol': { id: 'gpt-5.6-sol', name: 'Codex Sol', provider: 'openai-codex' },
    },
    openai: {
      'gpt-5.6-sol': { id: 'gpt-5.6-sol', name: 'OpenAI Sol', provider: 'openai' },
    },
  })
  assert.equal(enrichEntry({ id: 'gpt-5.6-sol' }, both).name, 'OpenAI Sol')
})

test('enrichEntry fills openai gpt-5.6-sol onto an openai-responses route', () => {
  const entry = enrichEntry({ id: 'gpt-5.6-sol' }, index, 'openai-responses')
  assert.equal(entry.name, 'GPT-5.6 Sol')
  assert.equal(entry.contextWindow, 272000)
  assert.equal(entry.maxTokens, 128000)
  assert.deepEqual(entry.input, ['text', 'image'])
  assert.deepEqual(entry.reasoningEfforts, {
    off: 'none',
    low: 'low',
    medium: 'medium',
    high: 'high',
    xhigh: 'xhigh',
    max: 'max',
  })
  assert.deepEqual(entry.compat, { supportsStrictMode: true })
})

test('alias map fills unmatched ids and is stamped as catalogId', () => {
  resetAliases()
  setAlias('claude-sonnet-4-5-20250929', 'claude-sonnet-4.5')
  assert.deepEqual(listAliases(), { 'claude-sonnet-4-5-20250929': 'claude-sonnet-4.5' })
  const entry = enrichEntry({ id: 'claude-sonnet-4-5-20250929' }, index, 'anthropic-messages')
  assert.equal(entry.name, 'Claude Sonnet 4.5')
  assert.equal(entry.catalogId, 'claude-sonnet-4.5')
  const saved = enrichOps([{
    op: 'set',
    path: ['providers', 'relay', 'models'],
    value: [{ id: 'claude-sonnet-4-5-20250929' }],
  }], { providers: { relay: { api: 'anthropic-messages' } } }, index)
  assert.equal((saved[0]!.value as Record<string, unknown>[])[0]!.name, 'Claude Sonnet 4.5')
  resetAliases()
  assert.deepEqual(listAliases(), {})
  assert.deepEqual(enrichEntry({ id: 'claude-sonnet-4-5-20250929' }, index), { id: 'claude-sonnet-4-5-20250929' })
})

test('catalogId fills unmatched ids and overrides auto-match', () => {
  const dated = enrichEntry(
    { id: 'claude-sonnet-4-5-20250929', catalogId: 'claude-sonnet-4.5' },
    index,
    'anthropic-messages',
  )
  assert.equal(dated.id, 'claude-sonnet-4-5-20250929')
  assert.equal(dated.catalogId, 'claude-sonnet-4.5')
  assert.equal(dated.name, 'Claude Sonnet 4.5')
  assert.deepEqual(dated.input, ['text', 'image'])

  const override = enrichEntry({ id: 'gpt-4o', catalogId: 'deepseek-chat' }, index, 'openai-completions')
  assert.equal(override.name, 'DeepSeek Chat')
  assert.equal(override.id, 'gpt-4o')

  assert.deepEqual(
    enrichEntry({ id: 'local-only', catalogId: 'missing' }, index),
    { id: 'local-only', catalogId: 'missing' },
  )
})
