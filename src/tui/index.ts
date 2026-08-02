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
  approveAll?: boolean
  ascii?: boolean
  initialPane?: PaneId
  initialQuery?: string
  initialTable?: string
  instance: InstanceLike
  readOnly: boolean
  scrollback?: number
}

export async function startTui(options: StartTuiOptions): Promise<void> {
  const session = createSession({
    alias: options.alias,
    approveAll: options.approveAll,
    instance: options.instance,
    readOnly: options.readOnly,
    scrollback: options.scrollback,
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

  // The $EDITOR pop-out and interactive now-sdk commands need Ink out of the
  // way and then back. Ink has no "pause" — clear() blanks the frame and a
  // re-render restores it, which is what suspend/resume mean here.
  const foregroundHost = {
    resume() {
      // Ink's raw-mode refcount never changed, so it does not know raw mode
      // was turned off and will not re-enable it. Restore it here or every
      // key after a handoff arrives line-buffered.
      if (process.stdin.isTTY) {
        try {
          process.stdin.setRawMode(true)
        } catch {
          // Non-fatal: a terminal that refuses is still readable.
        }
      }

      process.stdin.resume()
      app.clear()
    },
    suspend() {
      app.clear()
      // CRITICAL, and only visible under a real pty: clear() blanks the
      // frame but leaves Ink's stdin 'data' listener attached and the
      // stream flowing. spawnSync(stdio:'inherit') hands the child the SAME
      // fd 0, so the parent and the child then race for keystrokes and the
      // parent silently eats the first ones — the child's first prompt sits
      // there looking ignored. Pausing stops the parent reading; the child
      // still owns the descriptor.
      process.stdin.pause()
    },
  }

  const app = render(
    createElement(App, {
      ascii: options.ascii,
      foregroundHost,
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

  // Hard exit, same precedent and same root cause as the SIGINT handler in
  // src/commands/log/index.ts: core's tail machinery (poll interval,
  // keep-alive sockets) does not release the event loop even after
  // stopTailing(), so a session that ever tailed would hang the process
  // after quit. Cleanup above has already restored the terminal.
  // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
  process.exit(0)
}
