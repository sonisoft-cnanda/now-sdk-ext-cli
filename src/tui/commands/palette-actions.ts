/**
 * What the command palette can run.
 *
 * A pure function of a context object rather than a module-level table, so
 * the whole set is unit-testable without ink: hand it a fake context and
 * assert both that an action exists and that running it does the right
 * thing.
 *
 * This is the discoverability answer for a workspace covering 71 commands'
 * worth of capability, and it is where DELIBERATELY KEYLESS actions live —
 * things too consequential to sit one keystroke away.
 */
import type { PaneId } from './registry.js'

export interface PaletteAction {
  group: string
  id: string
  /** The key that also does this, shown on the right. Absent = palette-only. */
  key?: string
  label: string
  /** Marks an action that changes something. Rendered with a warning tint. */
  risk?: 'write'
  run(): void
}

export interface PaletteContext {
  /** Panes actually available this session — `project` only inside one. */
  panes: { id: PaneId; label: string }[]
  quit(): void
  /** Ask the active pane to do something. Returns false if it declined. */
  sendIntent(intent: PaneIntent): boolean
  setPane(pane: PaneId): void
  showHelp(): void
  toast(kind: 'error' | 'info' | 'success', message: string): void
}

/**
 * Pane-local actions the palette can trigger.
 *
 * The palette is global but most useful actions are pane-local, so rather
 * than hoisting pane state into the shell the palette dispatches an intent
 * and the active pane handles it. A pane that does not handle one says so
 * and the user is told, instead of the palette silently doing nothing.
 */
export type PaneIntent =
  | { kind: 'bulk' }
  | { kind: 'edit-query' }
  | { kind: 'open-docs' }
  | { kind: 'pick-scope' }
  | { kind: 'pick-table' }
  | { kind: 'refresh' }
  | { kind: 'toggle-follow' }

/**
 * Which pane owns each intent.
 *
 * The palette is global, so running "Change table" from the Logs pane
 * should take you to Records and open the picker — not refuse. Keeping the
 * mapping as data means the shell switches panes for free and the only
 * genuine failure is a pane that is not present at all.
 */
export const INTENT_OWNER: Record<PaneIntent['kind'], PaneId> = {
  bulk: 'records',
  'edit-query': 'records',
  'open-docs': 'scripts',
  'pick-scope': 'scripts',
  'pick-table': 'records',
  refresh: 'records',
  'toggle-follow': 'logs',
}

export function buildPaletteActions(context: PaletteContext): PaletteAction[] {
  const actions: PaletteAction[] = []

  for (const [i, pane] of context.panes.entries()) {
    actions.push({
      group: 'Go to',
      id: `pane.${pane.id}`,
      key: String(i + 1),
      label: pane.label,
      run() { context.setPane(pane.id) },
    })
  }

  const intent = (id: string, group: string, label: string, value: PaneIntent, key?: string, risk?: 'write') => {
    actions.push({
      group,
      id,
      label,
      run() {
        if (!context.sendIntent(value)) {
          // Never no-op silently: say which pane owns it.
          context.toast('info', `${label} is not available in this pane`)
        }
      },
      ...(key ? { key } : {}),
      ...(risk ? { risk } : {}),
    })
  }

  intent('records.table', 'Records', 'Change table', { kind: 'pick-table' }, 't')
  intent('records.query', 'Records', 'Edit encoded query', { kind: 'edit-query' }, '/')
  intent('records.refresh', 'Records', 'Refresh', { kind: 'refresh' }, 'r')
  intent('records.bulk', 'Records', 'Bulk update selected records', { kind: 'bulk' }, 'b', 'write')
  intent('logs.follow', 'Logs', 'Toggle follow / pause', { kind: 'toggle-follow' }, 'Space')
  intent('scripts.scope', 'Scripts', 'Change execution scope', { kind: 'pick-scope' }, 's')
  intent('docs.open', 'Help', 'Fluent API docs (offline)', { kind: 'open-docs' }, 'd')

  actions.push(
    { group: 'Help', id: 'help', key: '?', label: 'Keymap help', run() { context.showHelp() } },
    { group: 'Session', id: 'quit', key: 'q', label: 'Quit', run() { context.quit() } },
  )

  return actions
}

/** Label, then group — so a name hit outranks a group hit. See palette-score. */
export function searchTextsOf(action: PaletteAction): string[] {
  return [action.label, action.group]
}
