import { describe, expect, it } from '@jest/globals'

import { tokenizeLine } from '../../../src/tui/ui/editor.js'

const text = (line: string) => tokenizeLine(line).map((t) => t.text).join('')
const coloured = (line: string, needle: string) =>
  tokenizeLine(line).find((t) => t.text === needle)?.color

describe('tokenizeLine', () => {
  it('never loses or reorders characters', () => {
    const line = "var gr = new GlideRecord('incident'); // find it"
    expect(text(line)).toBe(line)
  })

  it('colours keywords, strings, numbers and the Glide family distinctly', () => {
    const line = "var x = new GlideRecord('incident');"
    const keyword = coloured(line, 'var')
    const glide = coloured(line, 'GlideRecord')
    const string = coloured(line, "'incident'")
    expect(keyword).toBeDefined()
    expect(glide).toBeDefined()
    expect(string).toBeDefined()
    expect(new Set([keyword, glide, string]).size).toBe(3)
    expect(coloured('var n = 42;', '42')).toBeDefined()
  })

  it('treats // as a comment to end of line', () => {
    const tokens = tokenizeLine('gr.query(); // run it')
    expect(tokens.at(-1)!.text).toBe('// run it')
  })

  it('does NOT treat // inside a string as a comment', () => {
    const line = "gs.info('https://example.com/path');"
    const tokens = tokenizeLine(line)
    expect(tokens.every((t) => !t.text.startsWith('//'))).toBe(true)
    expect(text(line)).toBe(line)
  })

  it('handles an escaped quote inside a string', () => {
    const line = "gs.info('it\\'s fine'); // ok"
    expect(text(line)).toBe(line)
    expect(tokens_last(line)).toBe('// ok')
  })

  it('handles an empty line and a bare comment', () => {
    expect(tokenizeLine('')).toEqual([])
    expect(tokenizeLine('// only').at(-1)!.text).toBe('// only')
  })

  it('leaves plain identifiers uncoloured', () => {
    expect(coloured('myVariable = 1;', 'myVariable')).toBeUndefined()
  })
})

function tokens_last(line: string): string {
  return tokenizeLine(line).at(-1)!.text
}
