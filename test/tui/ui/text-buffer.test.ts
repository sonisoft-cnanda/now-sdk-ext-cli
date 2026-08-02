import { describe, expect, it } from '@jest/globals'

import { TextBuffer } from '../../../src/tui/ui/text-buffer.js'

const at = (b: TextBuffer, line: number, col: number) => {
  b.moveTo(line, col)
  return b
}

describe('construction', () => {
  it('starts with one empty line', () => {
    const b = new TextBuffer()
    expect(b.lines).toEqual([''])
    expect(b.cursor).toEqual({ col: 0, line: 0 })
  })

  it('round-trips text', () => {
    const text = 'var gr = new GlideRecord("incident");\ngr.query();'
    expect(TextBuffer.from(text).toString()).toBe(text)
  })

  it('treats empty input as one empty line, not zero lines', () => {
    expect(TextBuffer.from('').lines).toEqual([''])
  })
})

describe('insert', () => {
  it('inserts at the cursor', () => {
    const b = TextBuffer.from('helloworld')
    at(b, 0, 5).insert(' ')
    expect(b.toString()).toBe('hello world')
    expect(b.cursor).toEqual({ col: 6, line: 0 })
  })

  it('splits the line on a newline', () => {
    const b = TextBuffer.from('ab')
    at(b, 0, 1).insert('\n')
    expect(b.lines).toEqual(['a', 'b'])
    expect(b.cursor).toEqual({ col: 0, line: 1 })
  })

  it('inserts a multi-line paste as ONE operation', () => {
    // cursor sits after 'start|', so head='start|' and tail='end':
    // the last pasted line fuses with the tail.
    const b = TextBuffer.from('start|end')
    at(b, 0, 6).insert('one\ntwo\nthree')
    expect(b.lines).toEqual(['start|one', 'two', 'threeend'])
    expect(b.cursor).toEqual({ col: 5, line: 2 })
  })

  it('a 200-line paste is a single undo step', () => {
    const b = TextBuffer.from('')
    const paste = Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n')
    b.insert(paste)
    expect(b.lineCount).toBe(200)
    b.undo()
    expect(b.lines).toEqual([''])
  })

  it('converts tabs to spaces and normalizes CRLF', () => {
    const b = TextBuffer.from('')
    b.insert('a\tb\r\nc\rd')
    expect(b.lines).toEqual(['a  b', 'c', 'd'])
  })

  it('ignores an empty insert', () => {
    const b = TextBuffer.from('x')
    b.insert('')
    expect(b.toString()).toBe('x')
  })
})

describe('backspace and delete', () => {
  it('backspace removes the character before the cursor', () => {
    const b = TextBuffer.from('abc')
    at(b, 0, 2).backspace()
    expect(b.toString()).toBe('ac')
    expect(b.cursor).toEqual({ col: 1, line: 0 })
  })

  it('backspace at column 0 joins with the previous line', () => {
    const b = TextBuffer.from('ab\ncd')
    at(b, 1, 0).backspace()
    expect(b.lines).toEqual(['abcd'])
    expect(b.cursor).toEqual({ col: 2, line: 0 })
  })

  it('backspace at the very start is a no-op', () => {
    const b = TextBuffer.from('abc')
    at(b, 0, 0).backspace()
    expect(b.toString()).toBe('abc')
  })

  it('delete removes the character at the cursor', () => {
    const b = TextBuffer.from('abc')
    at(b, 0, 1).delete()
    expect(b.toString()).toBe('ac')
  })

  it('delete at end of line pulls the next line up', () => {
    const b = TextBuffer.from('ab\ncd')
    at(b, 0, 2).delete()
    expect(b.lines).toEqual(['abcd'])
  })

  it('delete at the very end is a no-op', () => {
    const b = TextBuffer.from('ab')
    at(b, 0, 2).delete()
    expect(b.toString()).toBe('ab')
  })
})

describe('cursor motion', () => {
  it('clamps within the buffer', () => {
    const b = TextBuffer.from('ab\ncdef')
    b.moveTo(99, 99)
    expect(b.cursor).toEqual({ col: 4, line: 1 })
    b.moveTo(-5, -5)
    expect(b.cursor).toEqual({ col: 0, line: 0 })
  })

  it('moving left off the start wraps to the previous line end', () => {
    const b = TextBuffer.from('ab\ncd')
    at(b, 1, 0).moveBy(0, -1)
    expect(b.cursor).toEqual({ col: 2, line: 0 })
  })

  it('moving right off the end wraps to the next line start', () => {
    const b = TextBuffer.from('ab\ncd')
    at(b, 0, 2).moveBy(0, 1)
    expect(b.cursor).toEqual({ col: 0, line: 1 })
  })

  it('vertical motion clamps the column to the shorter line', () => {
    const b = TextBuffer.from('abcdef\nxy')
    at(b, 0, 6).moveBy(1, 0)
    expect(b.cursor).toEqual({ col: 2, line: 1 })
  })

  it('lineStart and lineEnd', () => {
    const b = TextBuffer.from('hello')
    at(b, 0, 3).lineEnd()
    expect(b.cursor.col).toBe(5)
    b.lineStart()
    expect(b.cursor.col).toBe(0)
  })
})

describe('word motion', () => {
  it('wordRight steps over a word and trailing space', () => {
    const b = TextBuffer.from('var gr = new GlideRecord')
    at(b, 0, 0).wordRight()
    expect(b.cursor.col).toBe(4)
    b.wordRight()
    expect(b.cursor.col).toBe(7)
  })

  it('wordLeft steps back to the start of the previous word', () => {
    const b = TextBuffer.from('var gr = new')
    at(b, 0, 12).wordLeft()
    expect(b.cursor.col).toBe(9)
  })

  it('word motion crosses line boundaries', () => {
    const b = TextBuffer.from('ab\ncd')
    at(b, 0, 2).wordRight()
    expect(b.cursor).toEqual({ col: 0, line: 1 })
    b.wordLeft()
    expect(b.cursor).toEqual({ col: 2, line: 0 })
  })
})

describe('undo / redo', () => {
  it('undoes and redoes an edit', () => {
    const b = TextBuffer.from('a')
    at(b, 0, 1).insert('b')
    expect(b.toString()).toBe('ab')
    b.undo()
    expect(b.toString()).toBe('a')
    b.redo()
    expect(b.toString()).toBe('ab')
  })

  it('restores the cursor with the text', () => {
    const b = TextBuffer.from('abc')
    at(b, 0, 3).insert('\ndef')
    b.undo()
    expect(b.cursor).toEqual({ col: 3, line: 0 })
  })

  it('a new edit clears the redo branch', () => {
    const b = TextBuffer.from('a')
    at(b, 0, 1).insert('b')
    b.undo()
    b.insert('c')
    b.redo()
    expect(b.toString()).toBe('ac')
  })

  it('undo on a fresh buffer is a no-op', () => {
    const b = TextBuffer.from('a')
    b.undo()
    b.undo()
    expect(b.toString()).toBe('a')
  })

  it('caps history depth without corrupting the buffer', () => {
    const b = TextBuffer.from('')
    for (let i = 0; i < 150; i++) b.insert('x')
    for (let i = 0; i < 150; i++) b.undo()
    // 100 steps recoverable; the rest are gone but the buffer stays valid.
    expect(b.toString()).toBe('x'.repeat(50))
  })
})

describe('bracket auto-close', () => {
  it('closes brackets and leaves the cursor inside', () => {
    const b = TextBuffer.from('')
    b.insertWithAutoClose('(')
    expect(b.toString()).toBe('()')
    expect(b.cursor.col).toBe(1)
  })

  it('closes quotes', () => {
    const b = TextBuffer.from('')
    b.insertWithAutoClose("'")
    expect(b.toString()).toBe("''")
    expect(b.cursor.col).toBe(1)
  })

  it('steps over a closing quote instead of doubling it', () => {
    const b = TextBuffer.from("''")
    at(b, 0, 1).insertWithAutoClose("'")
    expect(b.toString()).toBe("''")
    expect(b.cursor.col).toBe(2)
  })

  it('steps over a closing BRACKET instead of doubling it', () => {
    // Found live: typing a balanced call produced gs.info(x)) because the
    // hand-typed ')' did not step over the auto-inserted one.
    const b = TextBuffer.from('')
    for (const ch of 'gs.info(x)') b.insertWithAutoClose(ch)
    expect(b.toString()).toBe('gs.info(x)')
  })

  it('types a realistic nested statement without stray closers', () => {
    const b = TextBuffer.from('')
    for (const ch of 'while (gr.next()) { gs.info("hi"); }') b.insertWithAutoClose(ch)
    expect(b.toString()).toBe('while (gr.next()) { gs.info("hi"); }')
  })

  it('still inserts a closer when nothing is under the cursor', () => {
    const b = TextBuffer.from('')
    b.insertWithAutoClose(')')
    expect(b.toString()).toBe(')')
  })

  it('passes ordinary characters straight through', () => {
    const b = TextBuffer.from('')
    b.insertWithAutoClose('x')
    expect(b.toString()).toBe('x')
  })
})

describe('a realistic editing session', () => {
  it('composes motions and edits into the expected script', () => {
    const b = TextBuffer.from('')
    b.insert("var gr = new GlideRecord('incident');")
    b.newline()
    b.insert("gr.addQuery('active', true);")
    b.newline()
    b.insert('gr.query();')
    expect(b.lineCount).toBe(3)

    // fix a typo on line 2
    b.moveTo(1, 0)
    b.wordRight()
    expect(b.toString().split('\n')[1]).toBe("gr.addQuery('active', true);")

    b.moveTo(2, 11)
    b.insert(' // run it')
    expect(b.lines[2]).toBe('gr.query(); // run it')
    b.undo()
    expect(b.lines[2]).toBe('gr.query();')
  })
})
