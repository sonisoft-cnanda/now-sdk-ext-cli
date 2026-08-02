import { describe, expect, it } from '@jest/globals'

import { computeScrollbar, computeWindow } from '../../../src/tui/ui/viewport-window.js'

describe('computeWindow', () => {
  it('handles the empty list', () => {
    expect(computeWindow({ cursor: 5, height: 10, length: 0, prevTop: 0 })).toEqual({ cursor: 0, top: 0, visible: 0 })
  })

  it('shows everything when content fits', () => {
    const w = computeWindow({ cursor: 2, height: 10, length: 5, prevTop: 0 })
    expect(w).toEqual({ cursor: 2, top: 0, visible: 5 })
  })

  it('clamps a wild cursor into range', () => {
    const w = computeWindow({ cursor: 999, height: 5, length: 20, prevTop: 0 })
    expect(w.cursor).toBe(19)
    const w2 = computeWindow({ cursor: -3, height: 5, length: 20, prevTop: 10 })
    expect(w2.cursor).toBe(0)
    expect(w2.top).toBe(0)
  })

  it('keeps the window still while the cursor moves inside the scrolloff-safe band', () => {
    const w = computeWindow({ cursor: 5, height: 10, length: 100, prevTop: 2, scrolloff: 3 })
    expect(w.top).toBe(2)
  })

  it('scrolls down just enough to preserve scrolloff below the cursor', () => {
    const w = computeWindow({ cursor: 12, height: 10, length: 100, prevTop: 0, scrolloff: 3 })
    // cursor must sit at top+height-1-off => top = 12 - 9 + 3 = 6
    expect(w.top).toBe(6)
  })

  it('scrolls up just enough to preserve scrolloff above the cursor', () => {
    const w = computeWindow({ cursor: 4, height: 10, length: 100, prevTop: 10, scrolloff: 3 })
    expect(w.top).toBe(1)
  })

  it('relaxes scrolloff at the very start and end of the list', () => {
    expect(computeWindow({ cursor: 0, height: 10, length: 100, prevTop: 50 }).top).toBe(0)
    const end = computeWindow({ cursor: 99, height: 10, length: 100, prevTop: 0 })
    expect(end.top).toBe(90)
    expect(end.visible).toBe(10)
  })

  it('caps effective scrolloff for tiny windows instead of oscillating', () => {
    const w = computeWindow({ cursor: 50, height: 3, length: 100, prevTop: 0, scrolloff: 3 })
    // off capped at floor((3-1)/2) = 1
    expect(w.top).toBe(49)
  })

  it('follow pins to the tail regardless of prevTop and cursor', () => {
    const w = computeWindow({ cursor: 3, follow: true, height: 10, length: 100, prevTop: 0 })
    expect(w).toEqual({ cursor: 99, top: 90, visible: 10 })
  })

  it('never scrolls past the end when content barely overflows', () => {
    const w = computeWindow({ cursor: 10, height: 10, length: 11, prevTop: 0 })
    expect(w.top).toBe(1)
    expect(w.visible).toBe(10)
  })
})

describe('computeScrollbar', () => {
  it('is null when everything fits', () => {
    expect(computeScrollbar(5, 10, 0)).toBeNull()
  })

  it('puts the thumb at the top and bottom extremes', () => {
    const top = computeScrollbar(100, 10, 0)!
    expect(top.from).toBe(0)
    const bottom = computeScrollbar(100, 10, 90)!
    expect(bottom.to).toBe(9)
  })

  it('thumb size scales with the visible fraction but never vanishes', () => {
    const bar = computeScrollbar(10_000, 10, 0)!
    expect(bar.to - bar.from + 1).toBe(1)
  })
})
