import { describe, expect, it } from '@jest/globals'

import { RingBuffer } from '../../../src/tui/data/ring-buffer.js'

describe('RingBuffer', () => {
  it('stores in order below capacity', () => {
    const ring = new RingBuffer<number>(4)
    ring.push(1)
    ring.push(2)
    ring.push(3)
    expect(ring.length).toBe(3)
    expect(ring.at(0)).toBe(1)
    expect(ring.at(2)).toBe(3)
    expect(ring.dropped).toBe(0)
  })

  it('drops oldest at capacity and counts the drops', () => {
    const ring = new RingBuffer<number>(3)
    for (const n of [1, 2, 3, 4, 5]) ring.push(n)
    expect(ring.length).toBe(3)
    expect(ring.at(0)).toBe(3)
    expect(ring.at(2)).toBe(5)
    expect(ring.dropped).toBe(2)
    expect(ring.total).toBe(5)
  })

  it('wraps correctly across many revolutions', () => {
    const ring = new RingBuffer<number>(7)
    for (let i = 0; i < 1000; i++) ring.push(i)
    expect(ring.length).toBe(7)
    expect(ring.toArray()).toEqual([993, 994, 995, 996, 997, 998, 999])
    expect(ring.dropped).toBe(993)
  })

  it('range-checks at()', () => {
    const ring = new RingBuffer<number>(2)
    ring.push(1)
    expect(() => ring.at(1)).toThrow(RangeError)
    expect(() => ring.at(-1)).toThrow(RangeError)
  })

  it('clear resets everything including drop counts', () => {
    const ring = new RingBuffer<number>(2)
    ring.push(1)
    ring.push(2)
    ring.push(3)
    ring.clear()
    expect(ring.length).toBe(0)
    expect(ring.dropped).toBe(0)
    expect(ring.total).toBe(0)
  })

  it('rejects a nonsensical capacity', () => {
    expect(() => new RingBuffer(0)).toThrow()
  })
})
