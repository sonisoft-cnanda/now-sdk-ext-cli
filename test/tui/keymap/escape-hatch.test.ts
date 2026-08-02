/**
 * Regression net for a trap found by a user on their first run.
 *
 * Launched without --table, the TUI opens on the table picker. A picker's
 * catch-all `return 'handled'` is right for text — it is a type-to-filter
 * box — but it also swallowed ^K, so the very first screen consumed every
 * key, the palette was unreachable, and the hint bar advertised bindings
 * that did nothing.
 *
 * The escape hatch is enforced in the dispatcher rather than asked of each
 * modal, so the next overlay written cannot reintroduce it.
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

/** A picker: consumes everything, exactly like the real one. */
function greedyModal(stack: ScopeStack, sink: string[]) {
  return stack.register('modal', (event) => {
    sink.push(event.chord ? `^${event.chord}` : event.input)
    return 'handled'
  })
}

describe('^K reaches global even through a greedy modal', () => {
  it('opens the palette from inside a picker that swallows every key', () => {
    const stack = new ScopeStack()
    const swallowed: string[] = []
    const global: string[] = []
    greedyModal(stack, swallowed)
    stack.register('global', (event) => {
      if (event.chord === 'k') { global.push('palette'); return 'handled' }
      return 'pass'
    })

    // Typing still belongs entirely to the picker.
    stack.dispatch(plain('i'))
    stack.dispatch(plain('2'))
    expect(global).toEqual([])
    expect(swallowed).toEqual(['i', '2'])

    // ^K gets through anyway.
    stack.dispatch(chord('k'))
    expect(global).toEqual(['palette'])
  })

  it('global wins outright — a modal cannot claim it back', () => {
    // Offering it to the modal first cannot work: a catch-all claims every
    // key, and "wanted ^K" is indistinguishable from "swallowed ^K" by
    // return value. So global goes first, unconditionally.
    const stack = new ScopeStack()
    const seen: string[] = []
    stack.register('modal', (event) => {
      if (event.chord === 'k') { seen.push('modal'); return 'handled' }
      return 'pass'
    })
    stack.register('global', (event) => {
      if (event.chord === 'k') { seen.push('global'); return 'handled' }
      return 'pass'
    })

    stack.dispatch(chord('k'))
    expect(seen).toEqual(['global'])
  })

  it('falls through to the modal when global does not handle it', () => {
    const stack = new ScopeStack()
    const seen: string[] = []
    stack.register('modal', (event) => { seen.push(`modal:^${event.chord}`); return 'handled' })
    stack.register('global', () => 'pass')

    stack.dispatch(chord('k'))
    expect(seen).toEqual(['modal:^k'])
  })

  it('does not give other chords the same bypass', () => {
    const stack = new ScopeStack()
    const swallowed: string[] = []
    const global: string[] = []
    greedyModal(stack, swallowed)
    stack.register('global', (event) => {
      if (event.chord === 'e') { global.push('execute'); return 'handled' }
      return 'pass'
    })

    stack.dispatch(chord('e'))
    expect(global).toEqual([])
    expect(swallowed).toEqual(['^e'])
  })
})

describe('topKind + subscribe drive the hint bar', () => {
  it('reports the modal while one is up, and the pane again after', () => {
    const stack = new ScopeStack()
    stack.register('global', () => 'pass')
    stack.register('pane', () => 'pass')
    expect(stack.topKind()).toBe('pane')

    const close = greedyModal(stack, [])
    expect(stack.topKind()).toBe('modal')
    close()
    expect(stack.topKind()).toBe('pane')
  })

  it('notifies subscribers so the chrome can re-render', () => {
    const stack = new ScopeStack()
    let notifications = 0
    const unsubscribe = stack.subscribe(() => { notifications += 1 })

    const close = stack.register('modal', () => 'handled')
    expect(notifications).toBe(1)
    close()
    expect(notifications).toBe(2)

    unsubscribe()
    stack.register('modal', () => 'handled')
    expect(notifications).toBe(2)
  })
})
