import { describe, expect, it } from '@jest/globals'
import { render } from 'ink-testing-library'
import { createElement } from 'react'

import type { PaletteAction } from '../../../src/tui/commands/palette-actions.js'

import { UiProvider } from '../../../src/tui/context/ui-context.js'
import { CommandPalette } from '../../../src/tui/ui/command-palette.js'

const ACTIONS: PaletteAction[] = [
  { group: 'Go to', id: 'pane.records', key: '1', label: 'Records', run() {} },
  { group: 'Go to', id: 'pane.logs', key: '2', label: 'Logs', run() {} },
  { group: 'Help', id: 'docs.open', label: 'Fluent API docs (offline)', run() {} },
]

const mount = () =>
  render(
    createElement(UiProvider, {
      children: createElement(CommandPalette, { actions: ACTIONS, height: 12, onClose() {} }),
    }),
  )

const flush = (ms = 80) => new Promise((r) => { setTimeout(r, ms) })

describe('CommandPalette', () => {
  it('renders without throwing and shows the prompt', async () => {
    const v = mount()
    await flush()
    expect(v.lastFrame() ?? '').toContain('type to search commands')
    v.unmount()
  })

  it('lists every action up front', async () => {
    const v = mount()
    await flush()
    const frame = v.lastFrame() ?? ''
    expect(frame).toContain('Records')
    expect(frame).toContain('Fluent API docs')
    expect(frame).toContain('3/3')
    v.unmount()
  })
})
