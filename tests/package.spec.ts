import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const HOST = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-credentials',
  '@deepseek-ai/dsh-host-webserver',
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-llm-pi-ai',
  '@deepseek-ai/dsh-settings',
  '@deepseek-ai/dsh-timeout',
]

describe('package.json host contract', () => {
  it('does not ship DSH/cordis copies as installable dependencies', () => {
    const deps = Object.keys(pkg.dependencies ?? {})
    expect(deps.filter((name) => name === '@deepseek-ai/cordis' || name.startsWith('@deepseek-ai/dsh-'))).toEqual([])
  })

  it('declares imported host packages as peers so the running DSH copy wins', () => {
    const peers = pkg.peerDependencies ?? {}
    expect(HOST.filter((name) => peers[name] == null)).toEqual([])
  })
})
