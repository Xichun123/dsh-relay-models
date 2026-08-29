import { describe, expect, it } from 'vitest'
import { SpeedController } from '../src/shared/speed.ts'

describe('speed controller', () => {
  it('defaults to no tier and scopes the choice to its session', () => {
    const speed = new SpeedController()
    expect(speed.get('s1')).toBeUndefined()
    speed.set('s1', 'fast')
    expect(speed.get('s1')).toBe('fast')
    expect(speed.get('s2')).toBeUndefined()
  })

  it('clears back to the default on undefined and ignores a missing id', () => {
    const speed = new SpeedController()
    speed.set('s1', 'fast')
    speed.set('s1', undefined)
    expect(speed.get('s1')).toBeUndefined()
    expect(speed.get(undefined)).toBeUndefined()
  })
})
