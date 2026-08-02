import { describe, expect, it } from '@jest/globals'

import { parseExplainList, toDocsItems } from '../../../src/tui/data/explain.js'

// Verbatim from `now-sdk explain --list` on 4.9.2.
const REAL_OUTPUT = [
  'Available topics:',
  '',
  '  acl-api  (Acl, acl, access control, security, permission, sys_security_acl)',
  '  business-rule-guide  (business rule, server script, record trigger, sys_script, before, after, async)',
  '  choiceset-api  (ChoiceSet, choices, sys_choice_set, dropdown, picklist)',
  '  keys-file  (keys.ts, Now.ID, sys_id, record identity, coalesce)',
]

describe('parseExplainList', () => {
  it('pulls the topic name and its keywords off each line', () => {
    const topics = parseExplainList(REAL_OUTPUT)
    expect(topics).toHaveLength(4)
    expect(topics[2]).toEqual({
      keywords: ['ChoiceSet', 'choices', 'sys_choice_set', 'dropdown', 'picklist'],
      name: 'choiceset-api',
    })
  })

  it('skips the header and blank lines rather than inventing topics', () => {
    expect(parseExplainList(REAL_OUTPUT).map((t) => t.name)).not.toContain('Available')
  })

  it('ignores lines that do not match the shape — a new section header costs nothing', () => {
    const topics = parseExplainList([...REAL_OUTPUT, 'Deprecated:', '  not-a-topic-line'])
    expect(topics).toHaveLength(4)
  })

  it('de-duplicates', () => {
    const topics = parseExplainList([...REAL_OUTPUT, ...REAL_OUTPUT])
    expect(topics).toHaveLength(4)
  })

  it('returns nothing for empty output rather than throwing', () => {
    expect(parseExplainList([])).toEqual([])
  })
})

describe('toDocsItems — keywords go in the hint so Picker can search them', () => {
  const items = toDocsItems(parseExplainList(REAL_OUTPUT))

  /** Picker's own filter: label OR hint OR id contains the needle. */
  const search = (needle: string) =>
    items
      .filter(
        (i) =>
          i.label.toLowerCase().includes(needle) ||
          i.hint.toLowerCase().includes(needle) ||
          i.id.toLowerCase().includes(needle),
      )
      .map((i) => i.id)

  it('finds choiceset-api by "dropdown" — the acceptance case, and it is NOT in the name', () => {
    expect(search('dropdown')).toEqual(['choiceset-api'])
    expect('choiceset-api').not.toContain('dropdown')
  })

  it('finds choiceset-api by "picklist" too', () => {
    expect(search('picklist')).toEqual(['choiceset-api'])
  })

  it('still finds topics by name', () => {
    expect(search('keys-file')).toEqual(['keys-file'])
  })

  it('finds business-rule-guide by a keyword phrase', () => {
    expect(search('record trigger')).toEqual(['business-rule-guide'])
  })

  it('finds by table name — how a ServiceNow developer actually searches', () => {
    expect(search('sys_security_acl')).toEqual(['acl-api'])
    expect(search('sys_script')).toEqual(['business-rule-guide'])
  })
})
