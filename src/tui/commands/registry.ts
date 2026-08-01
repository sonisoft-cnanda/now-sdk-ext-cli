/**
 * The binding registry. The hint bar, the ? help sheet and (Phase 7) the
 * command palette all derive from this one table, so the hints structurally
 * cannot disagree with the actual keymap. Phase 1 is data-only; run()
 * callbacks arrive with the palette.
 */

export type PaneId = 'logs' | 'ops' | 'records' | 'scripts'

export interface BindingEntry {
  group: string
  key: string
  label: string
  /** Absent = global. */
  pane?: PaneId
}

export const BINDINGS: BindingEntry[] = [
  { group: 'Global', key: '1-4', label: 'switch pane' },
  { group: 'Global', key: '?', label: 'this help' },
  { group: 'Global', key: 'q', label: 'quit' },
  { group: 'Global', key: 'Ctrl+C', label: 'quit' },
  { group: 'Records', key: 't', label: 'pick table', pane: 'records' },
  { group: 'Records', key: '/', label: 'edit encoded query', pane: 'records' },
  { group: 'Records', key: '↑↓ / j k', label: 'move cursor', pane: 'records' },
  { group: 'Records', key: 'g / G', label: 'first / last row', pane: 'records' },
  { group: 'Records', key: 'n / p', label: 'next / previous page (API round trip)', pane: 'records' },
  { group: 'Records', key: 'x / X / -', label: 'select / select all / clear', pane: 'records' },
  { group: 'Records', key: '⏎', label: 'open record', pane: 'records' },
  { group: 'Records', key: 'r', label: 'refresh', pane: 'records' },
  { group: 'Record form', key: '↑↓ / j k', label: 'move field cursor', pane: 'records' },
  { group: 'Record form', key: 'o', label: 'open referenced record', pane: 'records' },
  { group: 'Record form', key: 'Esc', label: 'back', pane: 'records' },
]

export function bindingsForPane(pane: PaneId | undefined): BindingEntry[] {
  return BINDINGS.filter((b) => b.pane === undefined || b.pane === pane)
}
