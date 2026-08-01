/**
 * TUI entry point. No JSX in this file — only src/tui/**\/*.tsx contains JSX;
 * the oclif command dynamic-imports this module so React and Ink never load
 * for the other commands.
 */
import { render } from 'ink'
import { createElement } from 'react'

import type { PaneId } from './commands/registry.js'

import { App } from './app.js'
import { createSession, type InstanceLike } from './boot/session.js'
import { enterAltScreen, exitAltScreen, registerCleanup, runCleanup } from './boot/terminal.js'

export interface StartTuiOptions {
  alias: string
  ascii?: boolean
  initialPane?: PaneId
  initialQuery?: string
  initialTable?: string
  instance: InstanceLike
  readOnly: boolean
}

export async function startTui(options: StartTuiOptions): Promise<void> {
  const session = createSession({
    alias: options.alias,
    instance: options.instance,
    readOnly: options.readOnly,
  })

  enterAltScreen()
  registerCleanup(() => {
    exitAltScreen()
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false)
    }

    process.stdin.pause()
  })
  // Long-running gateway work (tails, polls) must stop on ANY exit path.
  registerCleanup(() => {
    session.gateway.disposeAll()
  })

  const app = render(
    createElement(App, {
      ascii: options.ascii,
      initialPane: options.initialPane,
      initialQuery: options.initialQuery,
      initialTable: options.initialTable,
      session,
    }),
    {
      exitOnCtrlC: true, // scoped Ctrl+C handling arrives with the write phase
      patchConsole: true,
    },
  )
  registerCleanup(() => {
    app.unmount()
  })

  try {
    await app.waitUntilExit()
  } finally {
    runCleanup()
  }
}
