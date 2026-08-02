import { describe, expect, it, jest } from '@jest/globals'
import { render } from 'ink-testing-library'
import { createElement } from 'react'

import type { TuiSession } from '../../../src/tui/boot/session.js'
import type { ApprovalSpec } from '../../../src/tui/data/approvals.js'
import type { KeyEvent } from '../../../src/tui/keymap/scope-stack.js'

import { SessionProvider } from '../../../src/tui/context/session-context.js'
import { UiProvider, useUi } from '../../../src/tui/context/ui-context.js'
import { ApprovalDialog } from '../../../src/tui/ui/approval-dialog.js'

const key = (partial: Partial<KeyEvent['key']> = {}, input = ''): KeyEvent => ({
  ctrl: false,
  input,
  key: {
    backspace: false, delete: false, downArrow: false, end: false,
    escape: false, home: false, leftArrow: false, pageDown: false,
    pageUp: false, return: false, rightArrow: false, shift: false,
    tab: false, upArrow: false, ...partial,
  },
  meta: false,
})

const spec: ApprovalSpec = {
  actionKind: 'record.update',
  detail: [{ after: '1 - Critical', before: '3 - Moderate', label: 'Priority' }],
  provenance: 'staged from the record form',
  target: { count: 1, identifier: 'INC0010023', instance: 'https://dev206299.service-now.com', table: 'incident' },
  title: 'update 1 field',
}

function session(over: Partial<TuiSession> = {}): TuiSession {
  return Object.freeze({
    alias: 'dev206299',
    env: 'dev',
    gateway: {} as TuiSession['gateway'],
    host: 'https://dev206299.service-now.com',
    readOnly: false,
    user: 'admin',
    ...over,
  }) as TuiSession
}

function Harness(props: {
  capture(dispatch: (e: KeyEvent) => boolean): void
  onChoice: (c: 'no' | 'remember' | 'yes') => void
  requireChallenge: boolean
  supportsRemember: boolean
}) {
  const { scopes } = useUi()
  props.capture((e) => scopes.dispatch(e))
  return createElement(ApprovalDialog, {
    ambient: { scope: 'x_acme', updateSetIsDefault: true, updateSetName: 'Default' },
    onChoice: props.onChoice,
    requireChallenge: props.requireChallenge,
    spec,
    supportsRemember: props.supportsRemember,
  })
}

function mount(opts: { requireChallenge?: boolean; sess?: TuiSession; supportsRemember?: boolean } = {}) {
  let dispatch!: (e: KeyEvent) => boolean
  const onChoice = jest.fn()
  const view = render(
    createElement(
      SessionProvider,
      {
        children: createElement(UiProvider, {
          children: createElement(Harness, {
            capture: (d) => { dispatch = d },
            onChoice,
            requireChallenge: opts.requireChallenge ?? false,
            supportsRemember: opts.supportsRemember ?? true,
          }),
        }),
        session: opts.sess ?? session(),
      },
    ),
  )
  const send = async (e: KeyEvent) => {
    dispatch(e)
    await new Promise((resolve) => { setTimeout(resolve, 5) })
  }

  return { onChoice, send, view }
}

describe('ApprovalDialog — remember tier', () => {
  it('shows which instance, as whom, and into which scope/update set', () => {
    const frame = mount().view.lastFrame() ?? ''
    expect(frame).toContain('dev206299.service-now.com')
    expect(frame).toContain('as admin')
    expect(frame).toContain('x_acme')
    expect(frame).toContain('Default')
  })

  it('shows the before → after diff and the provenance', () => {
    const frame = mount().view.lastFrame() ?? ''
    expect(frame).toContain('Priority')
    expect(frame).toContain('3 - Moderate')
    expect(frame).toContain('1 - Critical')
    expect(frame).toContain('staged from the record form')
  })

  it('y approves once, a remembers, n refuses', async () => {
    const yes = mount()
    await yes.send(key({}, 'y'))
    expect(yes.onChoice).toHaveBeenCalledWith('yes')

    const remember = mount()
    await remember.send(key({}, 'a'))
    expect(remember.onChoice).toHaveBeenCalledWith('remember')

    const no = mount()
    await no.send(key({}, 'n'))
    expect(no.onChoice).toHaveBeenCalledWith('no')
  })

  it('Esc refuses', async () => {
    const { onChoice, send } = mount()
    await send(key({ escape: true }))
    expect(onChoice).toHaveBeenCalledWith('no')
  })

  it('hides the remember option when the tier does not support it', () => {
    const frame = mount({ supportsRemember: false }).view.lastFrame() ?? ''
    expect(frame).not.toContain("don't ask again")
  })

  it('a does nothing when remember is unsupported', async () => {
    const { onChoice, send } = mount({ supportsRemember: false })
    await send(key({}, 'a'))
    expect(onChoice).not.toHaveBeenCalled()
  })

  it('consumes every key — the dialog owns the keyboard mid-decision', async () => {
    const { onChoice, send } = mount()
    await send(key({}, 'q'))
    await send(key({}, '2'))
    expect(onChoice).not.toHaveBeenCalled()
  })
})

describe('ApprovalDialog — always-ask tier (typed challenge)', () => {
  it('demands the alias and shows it', () => {
    const frame = mount({ requireChallenge: true }).view.lastFrame() ?? ''
    expect(frame).toContain('Type the instance alias')
    expect(frame).toContain('dev206299')
  })

  it('Enter does NOT execute until the alias matches exactly', async () => {
    const { onChoice, send } = mount({ requireChallenge: true })
    await send(key({ return: true }))
    expect(onChoice).not.toHaveBeenCalled()

    for (const ch of 'dev20629') await send(key({}, ch)) // eslint-disable-line no-await-in-loop
    await send(key({ return: true }))
    expect(onChoice).not.toHaveBeenCalled() // one character short

    await send(key({}, '9'))
    await send(key({ return: true }))
    expect(onChoice).toHaveBeenCalledWith('yes')
  })

  it('a wrong alias never enables execute', async () => {
    const { onChoice, send } = mount({ requireChallenge: true })
    for (const ch of 'prod206299') await send(key({}, ch)) // eslint-disable-line no-await-in-loop
    await send(key({ return: true }))
    expect(onChoice).not.toHaveBeenCalled()
  })

  it('y is typed into the challenge, not treated as approval', async () => {
    const { onChoice, send, view } = mount({ requireChallenge: true })
    await send(key({}, 'y'))
    expect(onChoice).not.toHaveBeenCalled()
    expect(view.lastFrame()).toContain('❯ y')
  })

  it('Esc still refuses', async () => {
    const { onChoice, send } = mount({ requireChallenge: true })
    await send(key({ escape: true }))
    expect(onChoice).toHaveBeenCalledWith('no')
  })
})
