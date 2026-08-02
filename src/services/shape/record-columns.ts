/**
 * Which columns matter for a table — the single definition shared by the CLI
 * display services and the TUI.
 *
 * Split deliberately: the *choice* (which fields, what order, what priority)
 * lives here; the *painting* stays with each consumer. The CLI pads to the
 * widths computed here; the TUI runs its own responsive solve over the same
 * ColumnSpec list.
 */

/** Column description consumed by the TUI's width solver and the CLI alike. */
export interface ColumnSpec {
  /** Extra width distribution weight; the elastic column absorbs remainder. */
  flex?: number
  header: string
  key: string
  minWidth?: number
  /** Higher survives longer when the terminal narrows. Default 50. */
  priority: number
  /** Fixed width, when the column should not size to content. */
  width?: number
}

/**
 * Preferred column order per table. Keys are ServiceNow table names; entries
 * are dictionary field names in display order. Tables not listed fall back to
 * deriveColumns over the fetched data.
 */
export const PREFERRED_COLUMNS: Record<string, string[]> = {
  change_request: ['number', 'short_description', 'state', 'risk', 'assigned_to', 'start_date'],
  cmdb_ci: ['name', 'sys_class_name', 'operational_status', 'assigned_to', 'sys_updated_on'],
  incident: ['number', 'short_description', 'state', 'priority', 'assigned_to', 'sys_updated_on'],
  problem: ['number', 'short_description', 'state', 'priority', 'assigned_to'],
  sc_req_item: ['number', 'short_description', 'state', 'assigned_to', 'sys_updated_on'],
  sys_script: ['name', 'collection', 'when', 'active', 'sys_updated_on'],
  sys_script_include: ['name', 'api_name', 'active', 'sys_updated_on'],
  sys_update_set: ['name', 'state', 'application', 'sys_updated_on'],
  sys_user: ['user_name', 'name', 'email', 'active', 'sys_updated_on'],
  task: ['number', 'short_description', 'state', 'priority', 'assigned_to', 'sys_updated_on'],
}

/** Per-field priority for narrow-terminal column shedding (TUI). */
const FIELD_PRIORITY: Record<string, number> = {
  assigned_to: 60,
  name: 100,
  number: 100,
  priority: 80,
  short_description: 85,
  state: 90,
  sys_id: 5,
  sys_updated_on: 55,
}

const DEFAULT_PRIORITY = 50

/**
 * Minimum solved width per field. Identity fields must never truncate —
 * INC0010001 cut to INC0010… defeats the whole point of the column.
 */
const FIELD_MIN_WIDTH: Record<string, number> = {
  assigned_to: 14,
  name: 16,
  number: 12,
  priority: 10,
  short_description: 16,
  state: 12,
  sys_updated_on: 19,
  user_name: 12,
}

const DEFAULT_MIN_WIDTH = 10

/**
 * The CLI's historical column derivation, extracted verbatim from
 * query-display.service.ts:formatTableResults: every key of the first
 * record except sys_id, capped for readability. Byte-compatible with the
 * pre-extraction behaviour — do not "improve" this; the TUI layers the
 * preferred map on top instead.
 */
export function deriveColumns(records: Array<Record<string, unknown>>, max = 6): string[] {
  if (records.length === 0) return []
  return Object.keys(records[0])
    .filter((k) => k !== 'sys_id')
    .slice(0, max)
}

/**
 * The CLI's historical width computation (min 10, max 30), extracted
 * verbatim. `cellText(record[col])` must be applied by the caller when
 * measuring display values.
 */
export function computeColumnWidths(
  records: Array<Record<string, unknown>>,
  columns: string[],
): number[] {
  return columns.map((col) => {
    const maxDataLen = Math.max(col.length, ...records.map((r) => String(r[col] ?? '').length))
    return Math.min(Math.max(maxDataLen + 2, 10), 30)
  })
}

/**
 * The CLI's historical cell truncation rule, extracted verbatim: values
 * longer than width-2 are cut to width-5 plus '...'.
 */
export function truncateCell(value: unknown, width: number): string {
  const val = String(value ?? '')
  return val.length > width - 2 ? val.slice(0, Math.max(0, width - 5)) + '...' : val
}

/**
 * The TUI's column choice: the preferred map when the table has one
 * (restricted to fields actually present in the data, when data is
 * available), falling back to deriveColumns. Returns full ColumnSpec[]
 * ready for the responsive solver.
 */
export function chooseRecordColumns(
  records: Array<Record<string, unknown>>,
  table: string,
  max = 6,
): ColumnSpec[] {
  const preferred = PREFERRED_COLUMNS[table]
  let keys: string[]
  if (preferred) {
    keys = records.length > 0
      ? preferred.filter((k) => k in records[0]).slice(0, max)
      : preferred.slice(0, max)
    if (keys.length === 0) keys = deriveColumns(records, max)
  } else {
    keys = deriveColumns(records, max)
  }

  return keys.map((key) => ({
    flex: key === 'short_description' || key === 'name' ? 1 : undefined,
    header: key,
    key,
    minWidth: FIELD_MIN_WIDTH[key] ?? DEFAULT_MIN_WIDTH,
    priority: FIELD_PRIORITY[key] ?? DEFAULT_PRIORITY,
  }))
}
