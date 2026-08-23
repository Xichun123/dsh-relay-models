import { readdirSync, readFileSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  devDependencies?: Record<string, string>
}

/** Every scoped specifier `src/` imports, subpaths collapsed to their package. */
function importedPackages(): string[] {
  const found = new Set<string>()
  const walk = (dir: URL): void => {
    for (const entry of readdirSync(dir)) {
      const child = new URL(`${entry}${statSync(new URL(entry, dir)).isDirectory() ? '/' : ''}`, dir)
      if (child.pathname.endsWith('/')) {
        walk(child)
        continue
      }
      if (!/\.tsx?$/u.test(entry)) continue
      for (const match of readFileSync(child, 'utf8').matchAll(/from '(@[^'/]+\/[^'/]+)[^']*'/gu)) {
        found.add(match[1]!)
      }
    }
  }
  walk(new URL('../src/', import.meta.url))
  return [...found].sort()
}

describe('package.json host contract', () => {
  it('does not ship DSH/cordis copies as installable dependencies', () => {
    const deps = Object.keys(pkg.dependencies ?? {})
    expect(deps.filter(name => name === '@deepseek-ai/cordis' || name.startsWith('@deepseek-ai/dsh-'))).toEqual([])
  })

  it('declares every imported host package as a peer so the running DSH copy wins', () => {
    const peers = pkg.peerDependencies ?? {}
    const imported = importedPackages().filter(name => pkg.dependencies?.[name] === undefined)
    expect(imported.length).toBeGreaterThan(0)
    expect(imported.filter(name => peers[name] == null)).toEqual([])
  })

  it('keeps every peer buildable and testable locally', () => {
    const dev = pkg.devDependencies ?? {}
    expect(Object.keys(pkg.peerDependencies ?? {}).filter(name => dev[name] == null)).toEqual([])
  })

  it('leaves pi-ai to the host, as one optional peer', () => {
    // The provider objects this plugin builds cross into the host's own
    // `PiAiAdapter`, so both halves must come from one module instance. An
    // installed copy would also drag every provider SDK into the profile,
    // where pnpm refuses their build scripts and fails `dsh plugin add`.
    expect(pkg.dependencies?.['@earendil-works/pi-ai']).toBeUndefined()
    expect(pkg.peerDependencies?.['@earendil-works/pi-ai']).toBe('^0.82.1')
    expect(pkg.peerDependenciesMeta?.['@earendil-works/pi-ai']?.optional).toBe(true)
  })

  it('marks every browser-supplied peer optional, because no profile installs one', () => {
    const meta = pkg.peerDependenciesMeta ?? {}
    for (const name of ['react', ...Object.keys(pkg.peerDependencies ?? {}).filter(n => n.startsWith('@deepseek-ai/dsh-client-'))]) {
      expect(meta[name]?.optional, name).toBe(true)
    }
  })
})
