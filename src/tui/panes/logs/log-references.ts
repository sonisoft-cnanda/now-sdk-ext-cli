/**
 * Reference detection over log lines — the adjacency that justifies the
 * TUI: a log line and the record it names become one keystroke apart.
 * Pure ranked ruleset; the pane decides how to act on the hits.
 */
import type { LogEntry } from '../../../services/shape/log-entry.js'

export type LogReference =
  | { kind: 'record-number'; label: string; number: string; table: string }
  | { kind: 'source-filter'; label: string; source: string }
  | { kind: 'sys-id'; label: string; sysId: string; table: string }

/** ServiceNow record-number prefixes → tables (the common core set). */
export const NUMBER_PREFIX_TABLES: Record<string, string> = {
  CHG: 'change_request',
  CTASK: 'change_task',
  INC: 'incident',
  KB: 'kb_knowledge',
  PRB: 'problem',
  PTASK: 'problem_task',
  REQ: 'sc_request',
  RITM: 'sc_req_item',
  SCTASK: 'sc_task',
  TASK: 'task',
}

const SYS_ID_RE = /\b[0-9a-f]{32}\b/g
const TABLE_SYS_ID_RE = /\b([a-z][\d_a-z]{2,}):([0-9a-f]{32})\b/g
const NUMBER_RE = /\b([A-Z]{2,6})(\d{7,10})\b/g

const MAX_REFS = 6

export function detectReferences(entry: Pick<LogEntry, 'message' | 'source'>): LogReference[] {
  const refs: LogReference[] = []
  const seen = new Set<string>()
  const text = entry.message

  // 1. Explicit table:sys_id — unambiguous, highest confidence.
  for (const match of text.matchAll(TABLE_SYS_ID_RE)) {
    const key = `t:${match[2]}`
    if (seen.has(key)) continue
    seen.add(key)
    seen.add(`s:${match[2]}`) // the bare-hex rule must not re-offer it
    refs.push({ kind: 'sys-id', label: `${match[1]} ${match[2].slice(0, 8)}…`, sysId: match[2], table: match[1] })
  }

  // 2. Record numbers with a known prefix (INC0010023 → incident).
  for (const match of text.matchAll(NUMBER_RE)) {
    const table = NUMBER_PREFIX_TABLES[match[1]]
    if (!table) continue
    const number = match[0]
    const key = `n:${number}`
    if (seen.has(key)) continue
    seen.add(key)
    refs.push({ kind: 'record-number', label: `${number} → ${table}`, number, table })
  }

  // 3. Bare 32-hex sys_ids. Without a named table the honest fallback is
  //    sys_metadata (covers application artifacts); the form reports
  //    cleanly when the id lives elsewhere.
  for (const match of text.matchAll(SYS_ID_RE)) {
    const key = `s:${match[0]}`
    if (seen.has(key)) continue
    seen.add(key)
    refs.push({ kind: 'sys-id', label: `sys_id ${match[0].slice(0, 8)}… → sys_metadata`, sysId: match[0], table: 'sys_metadata' })
  }

  // 4. Filter-to-source — always available when the entry has a source.
  if (entry.source) {
    refs.push({ kind: 'source-filter', label: `filter logs to source "${entry.source}"`, source: entry.source })
  }

  return refs.slice(0, MAX_REFS)
}
