import { describe, expect, it, jest } from '@jest/globals'
import { render } from 'ink-testing-library'
import { createElement } from 'react'

import type { KeyEvent } from '../../../src/tui/keymap/scope-stack.js'
import type { PickerItem } from '../../../src/tui/ui/picker.js'

import { UiProvider, useUi } from '../../../src/tui/context/ui-context.js'
import { Picker } from '../../../src/tui/ui/picker.js'

const items: PickerItem[] = [
  { id: 'incident', label: 'incident' },
  { hint: 'Task', id: 'task', label: 'task' },
  { id: 'sys_user', label: 'sys_user' },
]

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

/** Captures the scope stack so the test can dispatch synthetic keys. */
function Harness(props: {
  capture: (dispatch: (e: KeyEvent) => boolean) => void
  onCancel: () => void
  onSelect: (item: PickerItem) => void
}): ReturnType<typeof Picker> {
  const { scopes } = useUi()
  props.capture((e) => scopes.dispatch(e))
  return createElement(Picker, {
    height: 8,
    items,
    onCancel: props.onCancel,
    onSelect: props.onSelect,
    title: 'Table',
  })
}

const mount = () => {
  let dispatch!: (e: KeyEvent) => boolean
  const onSelect = jest.fn()
  const onCancel = jest.fn()
  const view = render(
    createElement(UiProvider, { children: createElement(Harness, {
      capture: (d) => { dispatch = d },
      onCancel,
      onSelect,
    }) }),
  )
  // setState from a dispatched key lands on the next microtask/frame; every
  // dispatch is awaited so assertions read the settled frame.
  const send = async (e: KeyEvent) => {
    const handled = dispatch(e)
    await new Promise((resolve) => { setTimeout(resolve, 5) })
    return handled
  }

  return { onCancel, onSelect, send, view }
}

describe('Picker', () => {
  it('lists all items with the count', () => {
    const { view } = mount()
    const frame = view.lastFrame() ?? ''
    expect(frame).toContain('incident')
    expect(frame).toContain('3/3')
  })

  it('typing filters; Enter selects the top match', async () => {
    const { onSelect, send, view } = mount()
    await send(key({}, 'u'))
    await send(key({}, 's'))
    expect(view.lastFrame()).toContain('1/3')
    await send(key({ return: true }))
    expect(onSelect).toHaveBeenCalledWith(items[2])
  })

  it('arrows move the cursor before selecting', async () => {
    const { onSelect, send } = mount()
    await send(key({ downArrow: true }))
    await send(key({ return: true }))
    expect(onSelect).toHaveBeenCalledWith(items[1])
  })

  it('backspace edits the filter and Enter on no matches is a no-op', async () => {
    const { onSelect, send, view } = mount()
    for (const ch of 'zzz') await send(key({}, ch)) // eslint-disable-line no-await-in-loop
    expect(view.lastFrame()).toContain('0/3')
    await send(key({ return: true }))
    expect(onSelect).not.toHaveBeenCalled()
    await send(key({ backspace: true }))
    expect(view.lastFrame()).toContain('zz')
  })

  it('Esc cancels', async () => {
    const { onCancel, send } = mount()
    await send(key({ escape: true }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('consumes every key — a picker on screen owns the keyboard', async () => {
    const { send } = mount()
    await expect(send(key({}, 'q'))).resolves.toBe(true)
  })
})
