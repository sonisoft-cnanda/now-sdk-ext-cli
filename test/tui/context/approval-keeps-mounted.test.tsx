/**
 * Regression net for a bug found live: ApprovalProvider used to render
 * `pending ? dialog : children`, which UNMOUNTED the pane while a decision
 * was pending and destroyed all of its state. The Scripts pane's entire
 * script buffer vanished the moment its own run asked for approval.
 *
 * Children must stay mounted (collapsed) so no pane loses work.
 */
import { describe, expect, it } from '@jest/globals'
import { Text, useInput } from 'ink'
import { render } from 'ink-testing-library'
import { createElement, useEffect, useRef, useState } from 'react'

import type { TuiSession } from '../../../src/tui/boot/session.js'

import { ApprovalProvider, useApproval } from '../../../src/tui/context/approval-context.js'
import { SessionProvider } from '../../../src/tui/context/session-context.js'
import { UiProvider, useUi } from '../../../src/tui/context/ui-context.js'
import { ApprovalRegistry } from '../../../src/tui/data/approvals.js'

/** Stands in for Shell's single useInput → ScopeStack dispatcher. */
function KeyRouter(props: { children: React.ReactNode }): ReturnType<typeof Text> {
  const { scopes } = useUi()
  useInput((input, key) => {
    scopes.dispatch({
      ctrl: key.ctrl,
      input,
      key: {
        backspace: key.backspace, delete: key.delete, downArrow: key.downArrow,
        end: false, escape: key.escape, home: false, leftArrow: key.leftArrow,
        pageDown: key.pageDown, pageUp: key.pageUp, return: key.return,
        rightArrow: key.rightArrow, shift: key.shift, tab: key.tab, upArrow: key.upArrow,
      },
      meta: key.meta,
    })
  })
  return props.children as ReturnType<typeof Text>
}

function fakeSession(): TuiSession {
  const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
  return Object.freeze({
    alias: 'dev',
    env: 'dev',
    gateway: {
      ambient: { getAmbient: async () => ({ scope: 's', updateSetIsDefault: false, updateSetName: 'u' }) },
      approvals,
    } as unknown as TuiSession['gateway'],
    host: 'https://dev.service-now.com',
    readOnly: false,
    user: 'admin',
  }) as TuiSession
}

const spec = {
  actionKind: 'record.update' as const,
  detail: [{ after: '1', before: '3', label: 'Priority' }],
  target: { count: 1, instance: 'https://dev.service-now.com', table: 'incident' },
  title: 'update 1 field',
}

/** A pane holding volatile local state, exactly like the Scripts buffer. */
function VolatilePane(props: { mounts: { count: number } }): ReturnType<typeof Text> {
  const approve = useApproval()
  const buffer = useRef('my precious script')
  const [, force] = useState(0)

  useEffect(() => {
    props.mounts.count += 1
    // Ask for approval as soon as we mount, mimicking ^E.
    approve(spec).then(() => {
      force((n) => n + 1)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createElement(Text, null, `BUFFER:${buffer.current}`)
}

// Ink commits and effect-registration lag the first render in the test
// renderer; the dialog's keymap is not live for ~100ms. A real user is
// never this fast.
const flush = (ms = 150) => new Promise((resolve) => { setTimeout(resolve, ms) })

describe('ApprovalProvider keeps children mounted', () => {
  it('does not remount the pane while a decision is pending', async () => {
    const mounts = { count: 0 }
    const view = render(
      createElement(SessionProvider, {
        children: createElement(UiProvider, {
          children: createElement(KeyRouter, {
            children: createElement(ApprovalProvider, {
              children: createElement(VolatilePane, { mounts }),
            }),
          }),
        }),
        session: fakeSession(),
      }),
    )

    await flush()
    // Dialog is up …
    expect(view.lastFrame()).toContain('APPROVE WRITE')
    // … and the pane mounted exactly once, so its buffer still exists.
    expect(mounts.count).toBe(1)

    // Decide, and confirm the pane STILL was not remounted.
    view.stdin.write('y')
    await flush()
    expect(mounts.count).toBe(1)
    expect(view.lastFrame()).toContain('BUFFER:my precious script')
    view.unmount()
  })

  it('hides the pane body while the dialog is up', async () => {
    const mounts = { count: 0 }
    const view = render(
      createElement(SessionProvider, {
        children: createElement(UiProvider, {
          children: createElement(KeyRouter, {
            children: createElement(ApprovalProvider, {
              children: createElement(VolatilePane, { mounts }),
            }),
          }),
        }),
        session: fakeSession(),
      }),
    )

    await flush()
    // Collapsed: the dialog owns the screen, the pane text is not drawn.
    expect(view.lastFrame()).not.toContain('BUFFER:')
    view.stdin.write('n')
    await flush()
    // Refused — pane is visible again, state intact.
    expect(view.lastFrame()).toContain('BUFFER:my precious script')
    view.unmount()
  })
})
