/**
 * TUI entry point. No JSX in this file — only src/tui/**\/*.tsx contains JSX;
 * the oclif command dynamic-imports this module so React and Ink never load
 * for the other commands.
 */
import { render } from 'ink'
import { createElement } from 'react'

import { App } from './app.js'
import { enterAltScreen, exitAltScreen, registerCleanup, runCleanup } from './boot/terminal.js'

export interface StartTuiOptions {
  alias: string
  host: string
  user: string
}

export async function startTui(options: StartTuiOptions): Promise<void> {
  enterAltScreen()
  registerCleanup(() => {
    exitAltScreen()
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false)
    }

    process.stdin.pause()
  })

  const app = render(createElement(App, options), {
    exitOnCtrlC: true, // Phase 0 only — scoped Ctrl+C handling arrives with the keymap
    patchConsole: true,
  })
  registerCleanup(() => {
    app.unmount()
  })

  try {
    await app.waitUntilExit()
  } finally {
    runCleanup()
  }
}
