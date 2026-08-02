/**
 * The binding registry. The hint bar, the ? help sheet and (Phase 7) the
 * command palette all derive from this one table, so the hints structurally
 * cannot disagree with the actual keymap. Phase 1 is data-only; run()
 * callbacks arrive with the palette.
 */

export type PaneId = 'logs' | 'ops' | 'project' | 'records' | 'scripts'

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
  { group: 'Record form', key: 'e', label: 'edit field (stages locally)', pane: 'records' },
  { group: 'Record form', key: '^S', label: 'save staged changes (asks for approval)', pane: 'records' },
  { group: 'Record form', key: 'u', label: 'discard staged changes', pane: 'records' },
  { group: 'Record form', key: 'o', label: 'open referenced record', pane: 'records' },
  { group: 'Record form', key: 'Esc', label: 'back', pane: 'records' },
  { group: 'Scripts', key: 'typing', label: 'edits the buffer (paste is one operation)', pane: 'scripts' },
  { group: 'Scripts', key: '^E', label: 'execute the buffer (asks for approval)', pane: 'scripts' },
  { group: 'Scripts', key: '^Z / ^Y', label: 'undo / redo', pane: 'scripts' },
  { group: 'Scripts', key: 'Tab', label: 'move between buffer and transcript', pane: 'scripts' },
  { group: 'Scripts', key: '⏎', label: 'recall a past run into the buffer (transcript)', pane: 'scripts' },
  { group: 'Scripts', key: 's', label: 'pick scope (transcript)', pane: 'scripts' },
  { group: 'Scripts', key: 'p', label: 'set {placeholder} params (transcript)', pane: 'scripts' },
  { group: 'Scripts', key: 'E', label: 'open the buffer in $EDITOR (transcript)', pane: 'scripts' },
  { group: 'Scripts', key: '^L', label: 'logs for the selected run (transcript)', pane: 'scripts' },
  { group: 'Ops', key: '4', label: 'cycle Flows / ATF / Update Sets', pane: 'ops' },
  { group: 'Ops · Flows', key: '⏎', label: 'action-by-action detail', pane: 'ops' },
  { group: 'Ops · Flows', key: 'c', label: 'cancel execution (asks for approval)', pane: 'ops' },
  { group: 'Ops · Flows', key: 'o', label: 'open the context record', pane: 'ops' },
  { group: 'Ops · ATF', key: 't', label: 'pick a test suite', pane: 'ops' },
  { group: 'Ops · ATF', key: 'r', label: 'run the suite (live progress)', pane: 'ops' },
  { group: 'Ops · ATF', key: 'o', label: 'open the suite result record', pane: 'ops' },
  { group: 'Ops · Update Sets', key: '⏎', label: 'inspect contents', pane: 'ops' },
  { group: 'Ops · Update Sets', key: 'S', label: 'switch current set (asks for approval)', pane: 'ops' },
  { group: 'Project', key: '⏎', label: 'configure a command / resolve a flag value', pane: 'project' },
  { group: 'Project', key: '^E', label: 'run the configured command', pane: 'project' },
  { group: 'Project', key: 'Esc', label: 'back', pane: 'project' },
  { group: 'Approval', key: 'y', label: 'approve once' },
  { group: 'Approval', key: 'a', label: "approve and don't ask again (this action, this alias)" },
  { group: 'Approval', key: 'n / Esc', label: 'refuse' },
  { group: 'Logs', key: 'Space', label: 'follow / pause', pane: 'logs' },
  { group: 'Logs', key: '↑↓ / j k', label: 'scroll (up auto-pauses)', pane: 'logs' },
  { group: 'Logs', key: 'G', label: 'jump to tail + resume follow', pane: 'logs' },
  { group: 'Logs', key: '/', label: 'find in buffer', pane: 'logs' },
  { group: 'Logs', key: 'n / N', label: 'next / previous find match', pane: 'logs' },
  { group: 'Logs', key: 'f', label: 'edit filter rules (nex log -f syntax)', pane: 'logs' },
  { group: 'Logs', key: 'o', label: 'open reference in this line', pane: 'logs' },
  { group: 'Logs', key: 'w', label: 'write buffer to file', pane: 'logs' },
]

export function bindingsForPane(pane: PaneId | undefined): BindingEntry[] {
  return BINDINGS.filter((b) => b.pane === undefined || b.pane === pane)
}
