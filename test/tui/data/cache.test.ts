import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

import { TtlCache } from '../../../src/tui/data/cache.js'

describe('TtlCache', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('stores and returns values', () => {
    const cache = new TtlCache<string>()
    cache.set('a', 'x')
    expect(cache.get('a')).toBe('x')
  })

  it('expires entries after the TTL', () => {
    const cache = new TtlCache<string>({ ttlMs: 1000 })
    cache.set('a', 'x')
    jest.advanceTimersByTime(999)
    expect(cache.get('a')).toBe('x')
    jest.advanceTimersByTime(2)
    expect(cache.get('a')).toBeUndefined()
  })

  it('never expires session-lifetime entries', () => {
    const cache = new TtlCache<string>()
    cache.set('a', 'x')
    jest.advanceTimersByTime(24 * 60 * 60 * 1000)
    expect(cache.get('a')).toBe('x')
  })

  it('evicts least-recently-used beyond maxEntries', () => {
    const cache = new TtlCache<number>({ maxEntries: 2 })
    cache.set('a', 1)
    cache.set('b', 2)
    cache.get('a') // freshen a — b becomes LRU
    cache.set('c', 3)
    expect(cache.get('a')).toBe(1)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe(3)
  })

  it('invalidates explicitly', () => {
    const cache = new TtlCache<string>()
    cache.set('a', 'x')
    cache.delete('a')
    expect(cache.get('a')).toBeUndefined()
  })

  it('de-duplicates concurrent loads for the same key', async () => {
    const cache = new TtlCache<string>()
    let calls = 0
    let release!: (v: string) => void
    const loader = () => {
      calls += 1
      return new Promise<string>((resolve) => {
        release = resolve
      })
    }

    const p1 = cache.getOrLoad('k', loader)
    const p2 = cache.getOrLoad('k', loader)
    release('loaded')
    await expect(p1).resolves.toBe('loaded')
    await expect(p2).resolves.toBe('loaded')
    expect(calls).toBe(1)
  })

  it('does not cache a failed load — the next call retries', async () => {
    const cache = new TtlCache<string>()
    let calls = 0
    const failing = async () => {
      calls += 1
      throw new Error('boom')
    }

    await expect(cache.getOrLoad('k', failing)).rejects.toThrow('boom')
    await expect(cache.getOrLoad('k', async () => {
      calls += 1
      return 'ok'
    })).resolves.toBe('ok')
    expect(calls).toBe(2)
  })
})
