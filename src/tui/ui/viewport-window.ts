/**
 * Window math for every scrollable list in the TUI. Pure and separate from
 * the Viewport component precisely so it unit-tests without ink.
 *
 * Ink has no scrolling and no overflow — "scrolling" here is windowing: we
 * render exactly `height` rows of a long list and move the window. The
 * invariants:
 *  - the cursor is always inside the window, with `scrolloff` rows of
 *    context above/below where possible (vim's scrolloff)
 *  - the window never shows past the end when content is shorter
 *  - follow mode pins the window to the tail until the caller unpins
 */

export interface WindowInput {
  cursor: number
  follow?: boolean
  height: number
  length: number
  /** Previous window top — scrolling is relative, not recomputed from zero. */
  prevTop: number
  scrolloff?: number
}

export interface WindowResult {
  /** Clamped cursor (callers pass raw intents; this is the truth). */
  cursor: number
  /** Index of the first visible row. */
  top: number
  /** Indices [top, top+visible) are renderable. */
  visible: number
}

export function computeWindow(input: WindowInput): WindowResult {
  const length = Math.max(0, input.length)
  const height = Math.max(1, input.height)
  const scrolloff = Math.max(0, input.scrolloff ?? 3)

  if (length === 0) {
    return { cursor: 0, top: 0, visible: 0 }
  }

  const maxTop = Math.max(0, length - height)
  const cursor = Math.min(Math.max(0, input.cursor), length - 1)

  if (input.follow) {
    return { cursor: length - 1, top: maxTop, visible: Math.min(height, length) }
  }

  let top = Math.min(Math.max(0, input.prevTop), maxTop)

  // Effective scrolloff shrinks when the window is small: with height 5 and
  // scrolloff 3 the margins would overlap, so cap at just under half.
  const off = Math.min(scrolloff, Math.floor((height - 1) / 2))

  if (cursor < top + off) {
    top = Math.max(0, cursor - off)
  } else if (cursor > top + height - 1 - off) {
    top = Math.min(maxTop, cursor - height + 1 + off)
  }

  return { cursor, top, visible: Math.min(height, length - top) }
}

/**
 * Scrollbar geometry for the 1-column gutter: which rows of the gutter are
 * the thumb. Returns null when everything fits (no scrollbar).
 */
export function computeScrollbar(
  length: number,
  height: number,
  top: number,
): null | { from: number; to: number } {
  if (length <= height || height <= 0) return null
  const thumbSize = Math.max(1, Math.round((height / length) * height))
  const maxTop = length - height
  const maxThumbFrom = height - thumbSize
  const from = Math.round((top / maxTop) * maxThumbFrom)
  return { from, to: from + thumbSize - 1 }
}
