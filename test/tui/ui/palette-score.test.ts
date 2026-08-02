/**
 * The thing worth testing is the RANKING, not whether a subsequence
 * matches. A palette that finds the right entry and puts it fourth is a
 * palette people stop using.
 */
import { describe, expect, it } from '@jest/globals'

import { rank, score } from '../../../src/tui/ui/palette-score.js'

const best = (needle: string, items: string[]) =>
  rank(needle, items, (s) => [s]).map((r) => r.item)

describe('score', () => {
  it('matches a scattered subsequence', () => {
    expect(score('usq', 'update set query')).toBeDefined()
  })

  it('rejects letters that are not there', () => {
    expect(score('zzz', 'update set')).toBeUndefined()
  })

  it('rejects a needle longer than the haystack', () => {
    expect(score('abcdef', 'abc')).toBeUndefined()
  })

  it('matches everything on an empty needle', () => {
    expect(score('', 'anything')?.score).toBeGreaterThan(0)
  })

  it('reports the matched positions so the UI can highlight them', () => {
    expect(score('ups', 'update set')?.positions).toEqual([0, 1, 7])
  })

  it('is case-insensitive in both directions', () => {
    expect(score('UPD', 'update set')).toBeDefined()
    expect(score('upd', 'UPDATE SET')).toBeDefined()
  })
})

describe('ranking — the part that actually matters', () => {
  it('prefers a word-boundary match over one buried mid-word', () => {
    // "us" is inside "status", but Update Set is what you meant.
    expect(best('us', ['status bar', 'Update Set'])[0]).toBe('Update Set')
  })

  it('prefers consecutive runs over scattered hits', () => {
    expect(best('updset', ['update set', 'upgrade dataset settings'])[0]).toBe('update set')
  })

  it('prefers a match at the very start', () => {
    expect(best('log', ['Logs', 'open the changelog'])[0]).toBe('Logs')
  })

  it('breaks ties toward the shorter label', () => {
    expect(best('logs', ['Logs', 'Open logs for this run'])[0]).toBe('Logs')
  })

  it('drops non-matches entirely rather than ranking them last', () => {
    expect(best('xyz', ['Logs', 'Records'])).toEqual([])
  })

  it('finds an entry by a secondary text (its group), but ranks name hits first', () => {
    const items = [
      { group: 'Records', label: 'refresh' },
      { group: 'Ops', label: 'records list' },
    ]
    const ordered = rank('records', items, (i) => [i.label, i.group]).map((r) => r.item.label)
    expect(ordered[0]).toBe('records list')
    expect(ordered).toContain('refresh')
  })

  it('is stable enough that the top hit for a full word is that word', () => {
    const panes = ['Records', 'Logs', 'Scripts', 'Ops', 'Project']
    for (const pane of panes) {
      expect(best(pane.toLowerCase(), panes)[0]).toBe(pane)
    }
  })
})
