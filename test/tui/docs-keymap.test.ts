/**
 * docs/tui.md publishes the keymap as a table. It is GENERATED from the
 * same registry the in-app `?` sheet renders, which is only worth anything
 * if it stays generated — a hand-edited table that drifts from the real
 * bindings is worse than no table, because people trust it.
 *
 * This fails when a binding is added without regenerating the doc.
 */
import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { BINDINGS } from '../../src/tui/commands/registry.js'

const DOC = join(process.cwd(), 'docs', 'tui.md')

describe('docs/tui.md keymap stays in sync with the registry', () => {
  const doc = readFileSync(DOC, 'utf8')

  it('documents every binding', () => {
    const missing = BINDINGS.filter((b) => !doc.includes(`| \`${b.key}\` | ${b.label} |`))
    expect(
      missing.map((b) => `${b.group}/${b.key}`),
    ).toEqual([])
  })

  it('documents every group', () => {
    for (const group of new Set(BINDINGS.map((b) => b.group))) {
      expect(doc).toContain(`### ${group}`)
    }
  })

  it('says where the table comes from, so the next person regenerates it', () => {
    expect(doc).toContain('nex tui --json')
  })
})
