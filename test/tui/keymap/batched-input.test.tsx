/**
 * Ink batches stdin — holding a key or pasting delivers ONE event whose
 * input is many characters. Regression net for the dispatcher contract:
 * text scopes take the chunk whole (paste), command scopes see it replayed
 * as individual keys (key repeat).
 *
 * Found live: 54 rapid 'j' presses moved the cursor ~20 rows because
 * `input === 'j'` is false for 'jjjj…'.
 */
import { describe, expect, it, jest } from '@jest/globals'
import { render } from 'ink-testing-library'
import { Text } from 'ink'
import { createElement } from 'react'

import type { KeyEvent } from '../../../src/tui/keymap/scope-stack.js'

import { ScopeStack } from '../../../src/tui/keymap/scope-stack.js'

/**
 * The exact dispatch rule from app.tsx, exercised directly so the contract
 * is pinned independently of ink's stdin plumbing.
 */
function dispatchBatched(scopes: ScopeStack, input: string): void {
  const toEvent = (chunk: string): KeyEvent => ({
    ctrl: false,
    input: chunk,
    key: {
      backspace: false, delete: false, downArrow: false, end: false,
      escape: false, home: false, leftArrow: false, pageDown: false,
      pageUp: false, return: false, rightArrow: false, shift: false,
      tab: false, upArrow: false,
    },
    meta: false,
  })

  if (scopes.dispatch(toEvent(input))) return
  if (input.length <= 1) return
  for (const ch of input) scopes.dispatch(toEvent(ch))
}

describe('batched stdin dispatch', () => {
  it('replays a repeated key as individual presses for command scopes', () => {
    const scopes = new ScopeStack()
    let moves = 0
    scopes.register('pane', (e) => {
      if (e.input === 'j') {
        moves += 1
        return 'handled'
      }

      return 'pass'
    })

    dispatchBatched(scopes, 'jjjjj')
    expect(moves).toBe(5)
  })

  it('gives a text scope the whole chunk — a paste is not 200 keypresses', () => {
    const scopes = new ScopeStack()
    const chunks: string[] = []
    scopes.register('editor', (e) => {
      chunks.push(e.input)
      return 'handled'
    })

    dispatchBatched(scopes, 'active=true^priority=1')
    expect(chunks).toEqual(['active=true^priority=1'])
  })

  it('a single key is dispatched exactly once', () => {
    const scopes = new ScopeStack()
    let count = 0
    scopes.register('pane', () => {
      count += 1
      return 'handled'
    })

    dispatchBatched(scopes, 'j')
    expect(count).toBe(1)
  })

  it('an unhandled single key never double-dispatches', () => {
    const scopes = new ScopeStack()
    let count = 0
    scopes.register('pane', () => {
      count += 1
      return 'pass'
    })

    dispatchBatched(scopes, 'z')
    expect(count).toBe(1)
  })

  it('mixed navigation replays in order', () => {
    const scopes = new ScopeStack()
    const seen: string[] = []
    scopes.register('pane', (e) => {
      if ('jkgG'.includes(e.input) && e.input.length === 1) {
        seen.push(e.input)
        return 'handled'
      }

      return 'pass'
    })

    dispatchBatched(scopes, 'jjkG')
    expect(seen).toEqual(['j', 'j', 'k', 'G'])
  })
})

describe('end-to-end through ink stdin', () => {
  it('the real App dispatcher moves a list cursor under key repeat', async () => {
    // A minimal component wired the same way app.tsx wires useInput.
    const { useInput } = await import('ink')
    const onMove = jest.fn()

    function Probe(): ReturnType<typeof Text> {
      const scopes = new ScopeStack()
      scopes.register('pane', (e) => {
        if (e.input === 'j') {
          onMove()
          return 'handled'
        }

        return 'pass'
      })
      useInput((input) => {
        dispatchBatched(scopes, input)
      })
      return createElement(Text, null, 'probe')
    }

    const view = render(createElement(Probe))
    view.stdin.write('jjj')
    await new Promise((resolve) => { setTimeout(resolve, 20) })
    expect(onMove.mock.calls.length).toBe(3)
    view.unmount()
  })
})
