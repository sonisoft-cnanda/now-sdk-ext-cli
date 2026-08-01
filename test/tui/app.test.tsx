/**
 * Phase-0 gate: ink 7 + jest ESM (--experimental-vm-modules) + yoga-layout
 * (wasm) rendering under ink-testing-library. If this file goes red, every
 * Tier-2 component test in the TUI plan is blocked — fix this before writing
 * any UI.
 */
import { describe, expect, it } from '@jest/globals'
import { render } from 'ink-testing-library'
import { createElement } from 'react'

import { App } from '../../src/tui/app.js'

describe('App (phase-0 skeleton)', () => {
  it('renders the session identity', () => {
    const { lastFrame, unmount } = render(
      createElement(App, {
        alias: 'dev',
        host: 'https://test.service-now.com',
        user: 'test-user',
      }),
    )

    const frame = lastFrame() ?? ''
    expect(frame).toContain('nex tui')
    expect(frame).toContain('https://test.service-now.com')
    expect(frame).toContain('test-user')
    unmount()
  })
})
