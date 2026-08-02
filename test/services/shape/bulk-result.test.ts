import { describe, expect, it } from '@jest/globals'

import {
  chunkIds,
  isPartial,
  sysIdInQuery,
  toBulkResult,
} from '../../../src/services/shape/bulk-result.js'

describe('toBulkResult', () => {
  it('reads updatedCount for an update and deletedCount for a delete', () => {
    const raw = { deletedCount: 7, dryRun: false, matchCount: 9, success: true, updatedCount: 4 }
    expect(toBulkResult(raw, 'update').changedCount).toBe(4)
    expect(toBulkResult(raw, 'delete').changedCount).toBe(7)
  })

  it('leaves changedCount ABSENT on a dry run — that is not the same as zero', () => {
    const result = toBulkResult({ dryRun: true, matchCount: 5 }, 'update')
    expect(result.changedCount).toBeUndefined()
    expect(result.matchCount).toBe(5)
    expect(result.dryRun).toBe(true)
  })

  it('normalizes errors, whatever core hands back', () => {
    const result = toBulkResult(
      { errors: [{ error: 'ACL', sysId: 'abc' }], matchCount: 1, success: false },
      'update',
    )
    expect(result.errors).toEqual([{ error: 'ACL', sysId: 'abc' }])
    expect(result.success).toBe(false)
  })

  it('survives a null/garbage response rather than throwing', () => {
    expect(toBulkResult(null, 'update')).toMatchObject({ errors: [], matchCount: 0, success: false })
    expect(toBulkResult(undefined, 'delete').matchCount).toBe(0)
  })

  it('treats a missing success flag as NOT successful', () => {
    expect(toBulkResult({ matchCount: 2 }, 'update').success).toBe(false)
  })
})

describe('isPartial — a half-done write must never read as a clean one', () => {
  it('flags fewer changed than matched', () => {
    expect(isPartial(toBulkResult({ dryRun: false, matchCount: 10, updatedCount: 6 }, 'update'))).toBe(true)
  })

  it('flags any per-record error even when the counts agree', () => {
    const r = toBulkResult(
      { dryRun: false, errors: [{ error: 'x', sysId: 'a' }], matchCount: 3, updatedCount: 3 },
      'update',
    )
    expect(isPartial(r)).toBe(true)
  })

  it('is not partial when everything matched changed cleanly', () => {
    expect(isPartial(toBulkResult({ dryRun: false, matchCount: 3, updatedCount: 3 }, 'update'))).toBe(false)
  })

  it('a dry run is never partial — nothing was attempted', () => {
    expect(isPartial(toBulkResult({ dryRun: true, matchCount: 99 }, 'update'))).toBe(false)
  })
})

describe('chunkIds', () => {
  const ids = Array.from({ length: 250 }, (_, i) => `id${i}`)

  it('splits into full batches plus a remainder', () => {
    const chunks = chunkIds(ids, 100)
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50])
  })

  it('loses and duplicates nothing', () => {
    expect(chunkIds(ids, 100).flat()).toEqual(ids)
  })

  it('handles a list shorter than one chunk', () => {
    expect(chunkIds(['a', 'b'], 100)).toEqual([['a', 'b']])
  })

  it('returns nothing for an empty selection', () => {
    expect(chunkIds([], 100)).toEqual([])
  })

  it('refuses a non-positive size instead of looping forever', () => {
    expect(() => chunkIds(ids, 0)).toThrow(/positive/)
  })
})

describe('sysIdInQuery — targeting is an explicit list, never a live query', () => {
  it('builds the encoded query core expects', () => {
    expect(sysIdInQuery(['a', 'b', 'c'])).toBe('sys_idINa,b,c')
  })

  it('targets exactly one record for a single id', () => {
    expect(sysIdInQuery(['only'])).toBe('sys_idINonly')
  })
})
