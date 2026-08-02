/**
 * Regression net for a bug found live: Ctrl+K did nothing because the
 * Records pane binds `k` to cursor-up and the pane scope outranks global,
 * so the chord was swallowed as a plain letter.
 *
 * 65 single-letter bindings had the same shape. Rather than guard each one
 * — leaving the next one to be written unguarded — a chord travels as
 * `chord` with `input` empty, so a plain-letter binding CANNOT see it.
 */
import { describe, expect, it } from '@jest/globals'

import type { KeyEvent } from '../../../src/tui/keymap/scope-stack.js'

import { ScopeStack } from '../../../src/tui/keymap/scope-stack.js'

const KEY: KeyEvent['key'] = {
  backspace: false, delete: false, downArrow: false, end: false, escape: false,
  home: false, leftArrow: false, pageDown: false, pageUp: false, return: false,
  rightArrow: false, shift: false, tab: false, upArrow: false,
}

const plain = (input: string): KeyEvent => ({ ctrl: false, input, key: KEY, meta: false })
const chord = (letter: string): KeyEvent => ({ chord: letter, ctrl: true, input: '', key: KEY, meta: false })

describe('a Ctrl-chord never reaches a plain-letter binding', () => {
  it('the pane keeps its k, and the global still gets Ctrl+K', () => {
    const stack = new ScopeStack()
    const seen: string[] = []

    // Exactly the real shape: a vim-style pane binding that does not
    // mention ctrl at all, sitting ABOVE global in the stack.
    stack.register('pane', (event) => {
      if (event.input === 'k') { seen.push('pane:up'); return 'handled' }
      return 'pass'
    })
    stack.register('global', (event) => {
      if (event.chord === 'k') { seen.push('global:palette'); return 'handled' }
      return 'pass'
    })

    stack.dispatch(plain('k'))
    stack.dispatch(chord('k'))

    expect(seen).toEqual(['pane:up', 'global:palette'])
  })

  it('a chord carries no printable input, so text entry ignores it', () => {
    const stack = new ScopeStack()
    let typed = ''
    stack.register('modal', (event) => {
      // The text-entry shape used by every free-text field in the app.
      if (event.input && !event.ctrl && !event.meta) { typed += event.input; return 'handled' }
      return 'pass'
    })

    stack.dispatch(plain('h'))
    stack.dispatch(chord('e'))
    stack.dispatch(plain('i'))

    expect(typed).toBe('hi')
  })
})
