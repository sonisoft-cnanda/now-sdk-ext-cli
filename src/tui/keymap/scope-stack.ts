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

/**
 * Chords that reach the global scope even while a modal owns the keyboard.
 *
 * A picker's catch-all `return 'handled'` is correct for text — it is a
 * type-to-filter box, so letters and digits must not leak into pane
 * commands. But it also swallowed ^K, which meant the FIRST screen a new
 * user sees (the table picker, when no --table was given) trapped them:
 * every key was a search, the palette was unreachable, and the hint bar
 * cheerfully advertised bindings that did nothing.
 *
 * So the escape hatch is enforced HERE rather than asked of every modal —
 * one place, impossible to forget when writing the next overlay. A chord in
 * this set reaches 'global' before anything else and cannot be claimed back,
 * so keep the set tiny: a chord a modal legitimately owns (the palette's own
 * ^N/^P) simply must not be added to it.
 */
const ALWAYS_GLOBAL_CHORDS = new Set(['k'])

export class ScopeStack {
  private listeners = new Set<() => void>()
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

    // An always-global chord goes to 'global' FIRST, before any modal.
    //
    // Offering it to the modal first does not work: a picker's catch-all
    // claims every key, and "wanted ^K" is indistinguishable from
    // "swallowed ^K" by return value alone. Global wins outright, which is
    // what makes the escape hatch dependable. Chords a modal genuinely owns
    // (the palette's ^N/^P) simply stay out of this set.
    if (event.chord && ALWAYS_GLOBAL_CHORDS.has(event.chord)) {
      for (const registration of ordered) {
        if (registration.kind === 'global' && registration.handler(event) === 'handled') return true
      }
    }

    for (const registration of ordered) {
      if (registration.handler(event) === 'handled') return true
    }

    return false
  }

  /** Register a handler; returns an unregister function for effect cleanup. */
  register(kind: KeyScopeKind, handler: KeyHandler): () => void {
    const registration: Registration = { handler, id: this.nextId++, kind }
    this.registrations.push(registration)
    this.emit()
    return () => {
      this.registrations = this.registrations.filter((r) => r !== registration)
      this.emit()
    }
  }

  /** Notify on scope changes, so chrome can reflect who owns the keyboard. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
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

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}
