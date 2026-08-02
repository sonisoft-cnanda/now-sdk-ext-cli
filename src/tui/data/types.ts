/**
 * Normalized DTOs for the TUI. Panes and components only ever see these —
 * core's response envelopes (data vs bodyObject, {value, display_value}
 * cells vs plain strings) are flattened at the gateway boundary and never
 * escape it.
 */

/** One field of one record: internal value + what the platform displays. */
export interface RecordCell {
  displayValue: string
  value: string
}

export interface RecordRow {
  cells: Record<string, RecordCell>
  sysId: string
}

export interface RecordPage {
  fetchedAt: number
  hasMore: boolean
  limit: number
  offset: number
  query: string
  rows: RecordRow[]
  table: string
  /** From the parallel aggregate count; undefined until it lands. */
  total?: number
}

export interface TableInfo {
  label: string
  name: string
  superClass?: string
}

// Field-level types are owned by the shape layer (shared with the CLI
// display services) and re-exported here for pane convenience.
export type { FieldChoice, FieldControlKind, FieldSpec } from '../../services/shape/schema-field.js'
import type { FieldSpec } from '../../services/shape/schema-field.js'

export interface TableSchema {
  fields: FieldSpec[]
  label: string
  superClass?: string
  table: string
}

export type InstanceEnv = 'dev' | 'prod' | 'test' | 'unknown'
