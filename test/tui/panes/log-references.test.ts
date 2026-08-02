import { describe, expect, it } from '@jest/globals'

import { detectReferences } from '../../../src/tui/panes/logs/log-references.js'

describe('detectReferences', () => {
  it('finds record numbers with known prefixes', () => {
    const refs = detectReferences({ message: 'updated INC0010023 via workflow', source: '' })
    expect(refs).toContainEqual(
      expect.objectContaining({ kind: 'record-number', number: 'INC0010023', table: 'incident' }),
    )
  })

  it('ignores unknown number prefixes', () => {
    const refs = detectReferences({ message: 'row ZZZZ0010023 skipped', source: '' })
    expect(refs.filter((r) => r.kind === 'record-number')).toHaveLength(0)
  })

  it('finds explicit table:sys_id with the named table', () => {
    const refs = detectReferences({
      message: 'wrote incident:9c5fa0e1b8412300272866aabbccdd00 to update set',
      source: '',
    })
    expect(refs[0]).toMatchObject({ kind: 'sys-id', sysId: '9c5fa0e1b8412300272866aabbccdd00', table: 'incident' })
  })

  it('bare sys_ids fall back to sys_metadata and never duplicate a table:sys_id hit', () => {
    const refs = detectReferences({
      message: 'incident:9c5fa0e1b8412300272866aabbccdd00 and 1234567890abcdef1234567890abcdef',
      source: '',
    })
    const sysIdRefs = refs.filter((r) => r.kind === 'sys-id')
    expect(sysIdRefs).toHaveLength(2)
    expect(sysIdRefs[0].table).toBe('incident')
    expect(sysIdRefs[1].table).toBe('sys_metadata')
  })

  it('always offers filter-to-source when the entry has a source', () => {
    const refs = detectReferences({ message: 'plain text', source: 'x_acme.MailProbe' })
    expect(refs).toContainEqual(
      expect.objectContaining({ kind: 'source-filter', source: 'x_acme.MailProbe' }),
    )
  })

  it('returns nothing for a plain sourceless line', () => {
    expect(detectReferences({ message: 'nothing to see', source: '' })).toHaveLength(0)
  })

  it('caps the reference list', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `${i}`.repeat(32)).join(' ')
    const refs = detectReferences({ message: ids, source: 's' })
    expect(refs.length).toBeLessThanOrEqual(6)
  })
})
