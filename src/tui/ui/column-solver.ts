/**
 * Responsive column widths — the thing the CLI display services structurally
 * cannot do (they hardcode padEnd(30) and never read terminal width).
 * Pure and separate from DataTable so it unit-tests without ink.
 *
 * Algorithm: reserve fixed widths, distribute the remainder across flex
 * columns, clamp at minWidth, and when the terminal is too narrow drop the
 * lowest-priority columns until the row fits. Dropping is never silent —
 * the caller receives the dropped keys to surface.
 */
import type { ColumnSpec } from '../../services/shape/record-columns.js'

export interface SolvedColumn {
  key: string
  width: number
}

export interface SolveResult {
  columns: SolvedColumn[]
  dropped: string[]
}

const DEFAULT_MIN = 8

export function solveColumns(
  specs: ColumnSpec[],
  availableWidth: number,
  gap = 2,
): SolveResult {
  const dropped: string[] = []
  // Work on a copy ordered as given; drop by ascending priority.
  let active = [...specs]

  for (;;) {
    if (active.length === 0) return { columns: [], dropped }

    const gaps = gap * Math.max(0, active.length - 1)
    const minTotal = active.reduce((sum, s) => sum + Math.max(s.minWidth ?? DEFAULT_MIN, s.width ?? 0), 0) + gaps

    if (minTotal <= availableWidth || active.length === 1) {
      // Fits (or nothing left to drop) — distribute.
      const flexTotal = active.reduce((sum, s) => sum + (s.flex ?? 0), 0)
      const spare = Math.max(0, availableWidth - minTotal)
      let remainder = flexTotal > 0 ? spare : 0

      const columns = active.map((s) => {
        const base = Math.max(s.minWidth ?? DEFAULT_MIN, s.width ?? 0)
        let extra = 0
        if (flexTotal > 0 && (s.flex ?? 0) > 0) {
          extra = Math.floor((spare * (s.flex ?? 0)) / flexTotal)
          remainder -= extra
        }

        return { key: s.key, width: base + extra }
      })

      // Hand leftover integer columns to the last flex column.
      if (remainder > 0) {
        for (let i = columns.length - 1; i >= 0; i--) {
          if ((active[i].flex ?? 0) > 0) {
            columns[i] = { ...columns[i], width: columns[i].width + remainder }
            break
          }
        }
      }

      return { columns, dropped }
    }

    // Too narrow: shed the lowest-priority column (stable on ties: last one).
    let victim = 0
    for (let i = 1; i < active.length; i++) {
      if (active[i].priority <= active[victim].priority) victim = i
    }

    dropped.push(active[victim].key)
    active = active.filter((_, i) => i !== victim)
  }
}

/** Truncate a cell to a width with an ellipsis, TUI-style. */
export function fitCell(text: string, width: number): string {
  if (width <= 0) return ''
  if (text.length <= width) return text.padEnd(width)
  if (width === 1) return '…'
  return text.slice(0, width - 1) + '…'
}
