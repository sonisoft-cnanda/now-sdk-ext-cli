import { describe, expect, it } from '@jest/globals'

import { RequestSequencer } from '../../../src/tui/data/request-token.js'

describe('RequestSequencer', () => {
  it('the newest token is current, older ones are stale', () => {
    const seq = new RequestSequencer()
    const t1 = seq.next()
    const t2 = seq.next()
    expect(seq.isCurrent(t1)).toBe(false)
    expect(seq.isCurrent(t2)).toBe(true)
  })

  it('drops out-of-order settles: a stale response never lands', async () => {
    const seq = new RequestSequencer()
    const results: string[] = []

    // Simulates: slow request issued first, fast request issued second,
    // slow one settles LAST — its result must be discarded.
    const settle = (token: number, value: string) => {
      if (seq.isCurrent(token)) results.push(value)
    }

    const slowToken = seq.next()
    const fastToken = seq.next()
    settle(fastToken, 'fresh')
    settle(slowToken, 'stale')
    expect(results).toEqual(['fresh'])
  })

  it('invalidate() drops everything outstanding (unmount semantics)', () => {
    const seq = new RequestSequencer()
    const token = seq.next()
    seq.invalidate()
    expect(seq.isCurrent(token)).toBe(false)
  })
})
