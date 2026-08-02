/**
 * Suspend the TUI, run a child process with the real terminal, resume.
 *
 * One primitive, two consumers: the Scripts pane's $EDITOR pop-out, and
 * (Phase 6) interactive now-sdk commands, which use @inquirer/prompts and
 * cannot share a terminal with Ink.
 *
 * Ordering is the whole job. Ink must stop drawing BEFORE the alt screen is
 * left, and raw mode must be off before the child starts or the child sees
 * a terminal it did not configure. Getting this wrong corrupts the user's
 * terminal, which is the one failure nobody forgives.
 */
import { spawnSync } from 'node:child_process'

import { enterAltScreen, exitAltScreen } from './terminal.js'

export interface ForegroundOptions {
  args: string[]
  command: string
  /** Extra environment for the child (Phase 6 needs credential-store vars). */
  env?: NodeJS.ProcessEnv
}

export interface ForegroundResult {
  code: number
  error?: Error
}

export interface ForegroundHost {
  /** Re-mount the Ink tree and return control to the app. */
  resume(): void
  /** Unmount the Ink tree so nothing draws over the child. */
  suspend(): void
}

/**
 * Run `command` in the foreground with the terminal fully handed over.
 *
 * Uses spawnSync deliberately: the whole point is that nothing else in this
 * process runs while the child owns the terminal. An async spawn would let
 * timers (the log tail's 10Hz bridge, ambient refresh) keep firing and
 * writing into a screen the child is drawing on.
 */
export function runForeground(host: ForegroundHost, options: ForegroundOptions): ForegroundResult {
  host.suspend()
  exitAltScreen()

  const hadRawMode = Boolean(process.stdin.isTTY)
  if (hadRawMode) {
    try {
      process.stdin.setRawMode(false)
    } catch {
      // A terminal that refuses raw-mode changes is still usable for the
      // child; never let this abort the handoff.
    }
  }

  let result: ForegroundResult
  try {
    const spawned = spawnSync(options.command, options.args, {
      env: { ...process.env, ...options.env },
      stdio: 'inherit',
    })
    result = spawned.error
      ? { code: spawned.status ?? 1, error: spawned.error }
      : { code: spawned.status ?? 0 }
  } catch (error) {
    result = { code: 1, error: error instanceof Error ? error : new Error(String(error)) }
  } finally {
    // Restoration runs even if the child crashed or the spawn threw: the
    // terminal must come back regardless of what happened to the child.
    enterAltScreen()
    host.resume()
  }

  return result
}

/**
 * Resolve the user's editor. $VISUAL wins over $EDITOR (the long-standing
 * convention: VISUAL is the full-screen one), then common editors that are
 * safe to block on. `--wait` matters for the GUI editors — without it they
 * return immediately and we would read the file back before it was saved.
 */
export function resolveEditor(env: NodeJS.ProcessEnv = process.env): null | { args: string[]; command: string } {
  const configured = env.VISUAL || env.EDITOR
  if (configured) {
    const parts = configured.trim().split(/\s+/)
    return { args: parts.slice(1), command: parts[0] }
  }

  return null
}

/** Editors to offer when neither $VISUAL nor $EDITOR is set. */
export const EDITOR_CANDIDATES: Array<{ args: string[]; command: string; label: string }> = [
  { args: ['--wait'], command: 'cursor', label: 'cursor --wait' },
  { args: ['--wait'], command: 'code', label: 'code --wait' },
  { args: [], command: 'nvim', label: 'nvim' },
  { args: [], command: 'vim', label: 'vim' },
  { args: [], command: 'nano', label: 'nano' },
  { args: [], command: 'vi', label: 'vi' },
]
