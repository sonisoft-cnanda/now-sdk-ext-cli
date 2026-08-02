/**
 * Key-dispatch scopes. There is exactly ONE command-dispatching useInput in
 * the whole app (app.tsx); it forwards every key event here, and the
 * top-most enabled scope gets first refusal. Handlers return 'handled' to
 * consume or 'pass' to bubble to the scope below. Multiple independent
 * useInput handlers all fire simultaneously in Ink — this stack exists so
 * "Esc" can never mean three things at once.
 *
 * Scope order is fixed by kind, not registration time:
 *   modal > palette > editor > pane > global
 * Within a kind, the most recently registered wins (stack discipline).
 */

export type KeyScopeKind = 'editor' | 'global' | 'modal' | 'palette' | 'pane'

export interface KeyEvent {
  /**
   * The letter of a Ctrl-chord (^K -> 'k'), and ONLY then. `input` is empty
   * for chords, which is the point: a plain-letter binding such as `k` for
   * cursor-up structurally cannot swallow Ctrl+K. Guarding 65 comparisons
   * by hand would have left the next one to be written unguarded.
   */
  chord?: string
  ctrl: boolean
  /** Printable input, when any ('' for pure modifier/special keys). */
  input: string
  key: {
    backspace: boolean
    delete: boolean
    downArrow: boolean
    end: boolean
    escape: boolean
    home: boolean
    leftArrow: boolean
    pageDown: boolean
    pageUp: boolean
    return: boolean
    rightArrow: boolean
    shift: boolean
    tab: boolean
    upArrow: boolean
  }
  meta: boolean
}

export type KeyHandler = (event: KeyEvent) => 'handled' | 'pass'

const KIND_ORDER: Record<KeyScopeKind, number> = {
  editor: 2,
  global: 0,
  modal: 4,
  palette: 3,
  pane: 1,
}

interface Registration {
  handler: KeyHandler
  id: number
  kind: KeyScopeKind
}

export class ScopeStack {
  private nextId = 1
  private registrations: Registration[] = []

  /**
   * Dispatch to the top-most scope first, bubbling on 'pass'. Returns true
   * when some handler consumed the event.
   */
  dispatch(event: KeyEvent): boolean {
    const ordered = [...this.registrations].sort(
      (a, b) => KIND_ORDER[b.kind] - KIND_ORDER[a.kind] || b.id - a.id,
    )
    for (const registration of ordered) {
      if (registration.handler(event) === 'handled') return true
    }

    return false
  }

  /** Register a handler; returns an unregister function for effect cleanup. */
  register(kind: KeyScopeKind, handler: KeyHandler): () => void {
    const registration: Registration = { handler, id: this.nextId++, kind }
    this.registrations.push(registration)
    return () => {
      this.registrations = this.registrations.filter((r) => r !== registration)
    }
  }

  /** The kind currently on top — drives the hint bar. */
  topKind(): KeyScopeKind | undefined {
    if (this.registrations.length === 0) return undefined
    const ordered = [...this.registrations].sort(
      (a, b) => KIND_ORDER[b.kind] - KIND_ORDER[a.kind] || b.id - a.id,
    )
    return ordered[0].kind
  }
}
