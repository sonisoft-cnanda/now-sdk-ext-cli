/**
 * Terminal lifecycle for the TUI: alternate screen, cursor, bracketed paste,
 * and a single idempotent cleanup path.
 *
 * Everything here writes raw escape sequences to stdout directly — Ink owns
 * the frame, but the alt-screen enter/exit brackets the whole session and must
 * survive any exit path (quit key, Ctrl+C, SIGTERM, crash). A corrupted
 * terminal is the one failure users do not forgive.
 */

const ALT_SCREEN_ENTER = '[?1049h'
const ALT_SCREEN_EXIT = '[?1049l'
const CURSOR_HIDE = '[?25l'
const CURSOR_SHOW = '[?25h'
const BRACKETED_PASTE_ON = '[?2004h'
const BRACKETED_PASTE_OFF = '[?2004l'

export type CleanupFn = () => void

const cleanups: CleanupFn[] = []
let cleanedUp = false
let signalsInstalled = false

export function enterAltScreen(): void {
  process.stdout.write(ALT_SCREEN_ENTER + CURSOR_HIDE + BRACKETED_PASTE_ON)
}

export function exitAltScreen(): void {
  process.stdout.write(BRACKETED_PASTE_OFF + CURSOR_SHOW + ALT_SCREEN_EXIT)
}

/**
 * Register a cleanup step. Steps run in reverse registration order, exactly
 * once, no matter how many exit paths fire. Errors in one step never prevent
 * the rest — restoring the terminal is best-effort by design.
 */
export function registerCleanup(fn: CleanupFn): void {
  cleanups.push(fn)
  installSignalHandlers()
}

export function runCleanup(): void {
  if (cleanedUp) return
  cleanedUp = true
  for (const fn of [...cleanups].reverse()) {
    try {
      fn()
    } catch {
      // best-effort: a failed step must not block terminal restoration
    }
  }
}

function installSignalHandlers(): void {
  if (signalsInstalled) return
  signalsInstalled = true

  // 'exit' covers the normal path; the signal handlers cover everything that
  // would otherwise skip it. An uncaught exception must still restore the
  // terminal before the stack trace prints, or the trace lands in the alt
  // screen and vanishes with it.
  //
  // process.exit is deliberate on every path below: after a signal or crash
  // there is no frame to return to — throwing would land in an unmounted Ink
  // tree. Same precedent as the SIGINT handler in src/commands/log/index.ts.
  process.on('exit', runCleanup)
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.on(signal, () => {
      runCleanup()
      // eslint-disable-next-line n/no-process-exit
      process.exit(signal === 'SIGINT' ? 130 : 143)
    })
  }

  process.on('uncaughtException', (error) => {
    runCleanup()
    console.error(error)
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  })
  process.on('unhandledRejection', (reason) => {
    runCleanup()
    console.error(reason)
    // eslint-disable-next-line n/no-process-exit
    process.exit(1)
  })
}
