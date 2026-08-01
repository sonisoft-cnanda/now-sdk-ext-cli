import { describe, expect, it } from '@jest/globals'

import type { ColumnSpec } from '../../../src/services/shape/record-columns.js'

import { fitCell, solveColumns } from '../../../src/tui/ui/column-solver.js'

const specs: ColumnSpec[] = [
  { header: 'number', key: 'number', minWidth: 12, priority: 100 },
  { flex: 1, header: 'short_description', key: 'short_description', minWidth: 16, priority: 85 },
  { header: 'state', key: 'state', minWidth: 12, priority: 90 },
  { header: 'priority', key: 'priority', minWidth: 10, priority: 80 },
  { header: 'assigned_to', key: 'assigned_to', minWidth: 14, priority: 60 },
]

const total = (r: { columns: Array<{ width: number }> }, gap = 2) =>
  r.columns.reduce((s, c) => s + c.width, 0) + gap * (r.columns.length - 1)

describe('solveColumns', () => {
  it('keeps everything and feeds spare width to the flex column at 120 cols', () => {
    const r = solveColumns(specs, 120)
    expect(r.dropped).toEqual([])
    expect(r.columns.map((c) => c.key)).toEqual(specs.map((s) => s.key))
    const flexWidth = r.columns.find((c) => c.key === 'short_description')!.width
    expect(flexWidth).toBeGreaterThan(16)
    expect(total(r)).toBe(120)
  })

  it('drops the lowest-priority column first when narrow (80 cols)', () => {
    const r = solveColumns(specs, 60)
    expect(r.dropped[0]).toBe('assigned_to')
    expect(total(r)).toBeLessThanOrEqual(60)
  })

  it('keeps shedding until it fits at 40 cols, preserving the highest priorities', () => {
    const r = solveColumns(specs, 40)
    expect(r.columns.map((c) => c.key)).toContain('number')
    expect(total(r)).toBeLessThanOrEqual(40)
    expect(r.dropped).not.toContain('number')
  })

  it('never drops the last remaining column even when it cannot fit', () => {
    const r = solveColumns(specs, 4)
    expect(r.columns).toHaveLength(1)
    expect(r.columns[0].key).toBe('number')
  })

  it('at 200 cols the flex column absorbs everything spare', () => {
    const r = solveColumns(specs, 200)
    expect(total(r)).toBe(200)
  })

  it('distributes exactly with no flex columns (no spare handed out)', () => {
    const rigid = specs.map(({ flex: _flex, ...s }) => s)
    const r = solveColumns(rigid, 200)
    const sum = r.columns.reduce((s, c) => s + c.width, 0)
    expect(sum).toBe(specs.reduce((s, c) => s + (c.minWidth ?? 8), 0))
  })

  it('handles the empty spec list', () => {
    expect(solveColumns([], 80)).toEqual({ columns: [], dropped: [] })
  })
})

describe('fitCell', () => {
  it('pads short values to the width', () => {
    expect(fitCell('abc', 6)).toBe('abc   ')
  })

  it('truncates long values with an ellipsis', () => {
    expect(fitCell('abcdefgh', 5)).toBe('abcd…')
  })

  it('degrades at width 1 and 0', () => {
    expect(fitCell('abc', 1)).toBe('…')
    expect(fitCell('abc', 0)).toBe('')
  })
})
