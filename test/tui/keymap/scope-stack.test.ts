import { describe, expect, it } from '@jest/globals'

import type { KeyEvent } from '../../../src/tui/keymap/scope-stack.js'

import { ScopeStack } from '../../../src/tui/keymap/scope-stack.js'

const key = (input: string): KeyEvent => ({
  ctrl: false,
  input,
  key: {
    backspace: false, delete: false, downArrow: false, end: false,
    escape: false, home: false, leftArrow: false, pageDown: false,
    pageUp: false, return: false, rightArrow: false, shift: false,
    tab: false, upArrow: false,
  },
  meta: false,
})

describe('ScopeStack', () => {
  it('dispatches to the top-most kind first (modal beats pane beats global)', () => {
    const stack = new ScopeStack()
    const order: string[] = []
    stack.register('global', () => { order.push('global'); return 'handled' })
    stack.register('pane', () => { order.push('pane'); return 'handled' })
    stack.register('modal', () => { order.push('modal'); return 'handled' })

    expect(stack.dispatch(key('x'))).toBe(true)
    expect(order).toEqual(['modal'])
  })

  it("bubbles on 'pass' until someone handles", () => {
    const stack = new ScopeStack()
    const order: string[] = []
    stack.register('global', () => { order.push('global'); return 'handled' })
    stack.register('pane', () => { order.push('pane'); return 'pass' })

    expect(stack.dispatch(key('x'))).toBe(true)
    expect(order).toEqual(['pane', 'global'])
  })

  it('returns false when every scope passes', () => {
    const stack = new ScopeStack()
    stack.register('pane', () => 'pass')
    expect(stack.dispatch(key('z'))).toBe(false)
  })

  it('within a kind, the most recent registration wins', () => {
    const stack = new ScopeStack()
    const order: string[] = []
    stack.register('pane', () => { order.push('first'); return 'handled' })
    stack.register('pane', () => { order.push('second'); return 'handled' })
    stack.dispatch(key('x'))
    expect(order).toEqual(['second'])
  })

  it('unregister removes the handler (Esc popping semantics)', () => {
    const stack = new ScopeStack()
    const order: string[] = []
    stack.register('pane', () => { order.push('pane'); return 'handled' })
    const unregister = stack.register('modal', () => { order.push('modal'); return 'handled' })

    stack.dispatch(key('x'))
    unregister()
    stack.dispatch(key('x'))
    expect(order).toEqual(['modal', 'pane'])
  })

  it('reports the top kind for the hint bar', () => {
    const stack = new ScopeStack()
    expect(stack.topKind()).toBeUndefined()
    stack.register('pane', () => 'pass')
    expect(stack.topKind()).toBe('pane')
    const un = stack.register('modal', () => 'pass')
    expect(stack.topKind()).toBe('modal')
    un()
    expect(stack.topKind()).toBe('pane')
  })
})
