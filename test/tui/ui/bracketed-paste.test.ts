import { describe, expect, it } from '@jest/globals'

import { decodePaste, hasPasteMarkers } from '../../../src/tui/ui/bracketed-paste.js'

const START = '[200~'
const END = '[201~'

describe('hasPasteMarkers', () => {
  it('detects either marker', () => {
    expect(hasPasteMarkers('plain')).toBe(false)
    expect(hasPasteMarkers(`${START}x`)).toBe(true)
    expect(hasPasteMarkers(`x${END}`)).toBe(true)
  })
})

describe('decodePaste', () => {
  it('passes plain typing straight through', () => {
    expect(decodePaste('abc')).toEqual({ pasted: '', typed: 'abc' })
  })

  it('extracts a bracketed paste', () => {
    expect(decodePaste(`${START}hello world${END}`)).toEqual({ pasted: 'hello world', typed: '' })
  })

  it('keeps a multi-line paste intact — the whole point', () => {
    const script = "var gr = new GlideRecord('incident');\ngr.query();\nwhile (gr.next()) {}"
    expect(decodePaste(`${START}${script}${END}`).pasted).toBe(script)
  })

  it('separates typing that surrounds a paste', () => {
    expect(decodePaste(`a${START}P${END}b`)).toEqual({ pasted: 'P', typed: 'ab' })
  })

  it('handles two pastes in one chunk', () => {
    expect(decodePaste(`${START}one${END}${START}two${END}`).pasted).toBe('onetwo')
  })

  it('treats an unterminated paste as pasted, not as keystrokes', () => {
    // The safer failure: interpreting a paste as commands is how you
    // trigger destructive single-key actions by accident.
    expect(decodePaste(`${START}partial text`)).toEqual({ pasted: 'partial text', typed: '' })
  })

  it('drops a stray end marker', () => {
    expect(decodePaste(`abc${END}`)).toEqual({ pasted: '', typed: 'abc' })
  })

  it('handles an empty paste', () => {
    expect(decodePaste(`${START}${END}`)).toEqual({ pasted: '', typed: '' })
  })

  it('preserves newlines and tabs inside the paste', () => {
    expect(decodePaste(`${START}a\n\tb${END}`).pasted).toBe('a\n\tb')
  })
})
