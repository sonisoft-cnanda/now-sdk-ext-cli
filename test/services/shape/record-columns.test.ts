import { describe, expect, it } from '@jest/globals'

import {
  chooseRecordColumns,
  computeColumnWidths,
  deriveColumns,
  PREFERRED_COLUMNS,
  truncateCell,
} from '../../../src/services/shape/record-columns.js'

const rows = [
  { number: 'INC0010001', priority: '1', short_description: 'Email down', state: '2', sys_id: 'abc' },
  { number: 'INC0010002', priority: '2', short_description: 'VPN drops for EMEA users constantly', state: '1', sys_id: 'def' },
]

describe('deriveColumns', () => {
  it('takes keys of the first record, excludes sys_id, caps at 6', () => {
    const wide = [Object.fromEntries([...Array.from({ length: 9 }, (_, i) => [`f${i}`, 'x']), ['sys_id', 'a']])]
    expect(deriveColumns(wide)).toHaveLength(6)
    expect(deriveColumns(rows)).toEqual(['number', 'priority', 'short_description', 'state'])
    expect(deriveColumns(rows)).not.toContain('sys_id')
  })

  it('returns empty for no records', () => {
    expect(deriveColumns([])).toEqual([])
  })
})

describe('computeColumnWidths', () => {
  it('clamps to min 10 and max 30', () => {
    const widths = computeColumnWidths(rows, ['state', 'short_description'])
    expect(widths[0]).toBe(10) // 'state'.length + 2 = 7 -> clamped up
    expect(widths[1]).toBe(30) // long description -> clamped down
  })

  it('uses header length when data is shorter', () => {
    const widths = computeColumnWidths(rows, ['number'])
    expect(widths[0]).toBe(12) // 'INC0010001'.length(10) + 2
  })
})

describe('truncateCell', () => {
  it('passes short values through', () => {
    expect(truncateCell('short', 10)).toBe('short')
  })

  it('truncates with the historical width-5 rule', () => {
    expect(truncateCell('A'.repeat(40), 20)).toBe('A'.repeat(15) + '...')
  })

  it('stringifies null/undefined to empty', () => {
    expect(truncateCell(null, 10)).toBe('')
    expect(truncateCell(undefined, 10)).toBe('')
  })
})

describe('chooseRecordColumns', () => {
  it('uses the preferred map for known tables, restricted to present fields', () => {
    const specs = chooseRecordColumns(rows, 'incident')
    expect(specs.map((s) => s.key)).toEqual(['number', 'short_description', 'state', 'priority'])
  })

  it('returns the full preferred list when no data is loaded yet', () => {
    const specs = chooseRecordColumns([], 'incident')
    expect(specs.map((s) => s.key)).toEqual(PREFERRED_COLUMNS.incident.slice(0, 6))
  })

  it('falls back to derivation for unknown tables', () => {
    const specs = chooseRecordColumns(rows, 'u_custom_table')
    expect(specs.map((s) => s.key)).toEqual(['number', 'priority', 'short_description', 'state'])
  })

  it('assigns shedding priorities and marks the elastic column', () => {
    const specs = chooseRecordColumns(rows, 'incident')
    const byKey = Object.fromEntries(specs.map((s) => [s.key, s]))
    expect(byKey.number.priority).toBeGreaterThan(byKey.assigned_to?.priority ?? 0)
    expect(byKey.short_description.flex).toBe(1)
    expect(byKey.number.flex).toBeUndefined()
  })
})
