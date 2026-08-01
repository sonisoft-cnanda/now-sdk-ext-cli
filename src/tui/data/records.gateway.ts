/**
 * Table/record reads and writes for the TUI.
 *
 * Every write method takes an ApprovalToken and consumes it before touching
 * the instance. The token type can only be produced by ApprovalRegistry, so
 * a component physically cannot call a write it did not get approved —
 * forgetting is a compile error, not a review miss.
 */
import { AggregateQuery, SchemaDiscovery, TableAPIRequest, TaskOperations } from '@sonisoft/now-sdk-ext-core'

import type { ApprovalRegistry, ApprovalSpec, ApprovalToken } from './approvals.js'
import type { FieldChoice, FieldSpec, RecordCell, RecordPage, RecordRow, TableInfo, TableSchema } from './types.js'

import { toFieldSpec } from '../../services/shape/schema-field.js'
import { TtlCache } from './cache.js'

const TABLE_LIST_TTL_MS = 10 * 60 * 1000

/** incident → task → ... is short; the cap is a cycle guard, not a limit. */
const MAX_INHERITANCE_DEPTH = 8

/**
 * Core's dual response envelope, unwrapped in exactly one place. Commands
 * currently duplicate `response?.data?.result ?? response?.bodyObject?.result
 * ?? []` per call site (e.g. src/commands/query/index.ts); the TUI has one
 * definition.
 */
export function unwrapResult<T>(response: unknown): T[] {
  const r = response as undefined | { bodyObject?: { result?: T[] }; data?: { result?: T[] } }
  return r?.data?.result ?? r?.bodyObject?.result ?? []
}

/**
 * Normalize one raw record into cells. With sysparm_display_value=all every
 * field arrives as {value, display_value}; with plain requests it is a
 * string. Both shapes collapse to RecordCell so panes never branch.
 */
export function toRecordRow(raw: Record<string, unknown>): RecordRow {
  const cells: Record<string, RecordCell> = {}
  let sysId = ''
  for (const [key, cell] of Object.entries(raw)) {
    let value: string
    let displayValue: string
    if (cell !== null && typeof cell === 'object' && ('value' in cell || 'display_value' in cell)) {
      const c = cell as { display_value?: unknown; value?: unknown }
      value = String(c.value ?? '')
      displayValue = String(c.display_value ?? c.value ?? '')
    } else {
      value = String(cell ?? '')
      displayValue = value
    }

    cells[key] = { displayValue, value }
    if (key === 'sys_id') sysId = value
  }

  return { cells, sysId }
}

export interface FetchPageOptions {
  fields?: string[]
  limit: number
  offset: number
  query: string
  table: string
}

/**
 * Reads are plain async methods. WRITES (addComment, approveChange,
 * assignTask, closeIncident, resolveIncident, updateRecord) all take
 * `(spec, token, options)` and consume the token BEFORE touching the
 * instance — a missing, reused, or mismatched approval never reaches the
 * network. Alphabetical member order is enforced by lint, so reads and
 * writes interleave; the signature is the marker.
 */
export class RecordsGateway {
  private readonly aggregate: AggregateQuery
  private readonly choiceCache = new TtlCache<FieldChoice[]>({ maxEntries: 256 })
  private readonly schema: SchemaDiscovery
  private readonly schemaCache = new TtlCache<TableSchema>({ maxEntries: 32 })
  private readonly tableApi: TableAPIRequest
  private readonly tableCache = new TtlCache<TableInfo[]>({ maxEntries: 4, ttlMs: TABLE_LIST_TTL_MS })
  private readonly tableNameCache = new TtlCache<string | undefined>({ maxEntries: 64 })
  private readonly tasks: TaskOperations

  constructor(
    instance: unknown,
    private readonly approvals: ApprovalRegistry,
  ) {
    this.aggregate = new AggregateQuery(instance as never)
    this.schema = new SchemaDiscovery(instance as never)
    this.tableApi = new TableAPIRequest(instance as never)
    this.tasks = new TaskOperations(instance as never)
  }

  /** Add a comment or work note. */
  async addComment(
    spec: ApprovalSpec,
    token: ApprovalToken,
    options: { comment: string; isWorkNote: boolean; sysId: string; table: string },
  ): Promise<void> {
    this.approvals.consume(token, spec)
    await this.tasks.addComment({
      comment: options.comment,
      isWorkNote: options.isWorkNote,
      recordSysId: options.sysId,
      table: options.table,
    })
    this.invalidateTable(options.table)
  }

  /** Approve a change request. */
  async approveChange(
    spec: ApprovalSpec,
    token: ApprovalToken,
    options: { comments?: string; sysId: string },
  ): Promise<void> {
    this.approvals.consume(token, spec)
    await this.tasks.approveChange({ comments: options.comments, sysId: options.sysId })
    this.invalidateTable('change_request')
  }

  /** Assign a task to a user and/or group. */
  async assignTask(
    spec: ApprovalSpec,
    token: ApprovalToken,
    options: { assignedTo: string; assignmentGroup?: string; sysId: string; table: string },
  ): Promise<void> {
    this.approvals.consume(token, spec)
    await this.tasks.assignTask({
      assignedTo: options.assignedTo,
      assignmentGroup: options.assignmentGroup,
      recordSysId: options.sysId,
      table: options.table,
    })
    this.invalidateTable(options.table)
  }

  /** Close an incident. */
  async closeIncident(
    spec: ApprovalSpec,
    token: ApprovalToken,
    options: { closeCode?: string; notes: string; sysId: string },
  ): Promise<void> {
    this.approvals.consume(token, spec)
    await this.tasks.closeIncident({
      closeCode: options.closeCode,
      closeNotes: options.notes,
      sysId: options.sysId,
    })
    this.invalidateTable('incident')
  }

  /** True total for the status bar's honest `1–25 of 412`. */
  async countQuery(table: string, query: string): Promise<number> {
    const result = await this.aggregate.count({ query, table })
    return Number(result ?? 0)
  }

  /**
   * One page of records. sysparm_display_value=all is load-bearing: it
   * returns {value, display_value} per field so the UI can show the label
   * while colouring by the internal value — neither 'true' nor 'false'
   * alone permits that.
   */
  async fetchPage(options: FetchPageOptions): Promise<RecordPage> {
    const params: Record<string, unknown> = {
      sysparm_display_value: 'all',
      sysparm_limit: options.limit,
      sysparm_offset: options.offset,
      sysparm_query: options.query || '',
    }
    if (options.fields && options.fields.length > 0) {
      // Always carry the identity fields even when a column set is chosen.
      const fields = new Set(['sys_id', ...options.fields])
      params.sysparm_fields = [...fields].join(',')
    }

    const response = await this.tableApi.get<{ result: Array<Record<string, unknown>> }>(
      options.table,
      params,
    )
    const rows = unwrapResult<Record<string, unknown>>(response).map((raw) => toRecordRow(raw))
    return {
      fetchedAt: Date.now(),
      // Core has no pagination contract; a full page implies more may exist.
      hasMore: rows.length === options.limit,
      limit: options.limit,
      offset: options.offset,
      query: options.query,
      rows,
      table: options.table,
    }
  }

  /** Full record by sys_id — no sysparm_fields, display_value=all. */
  async fetchRecord(table: string, sysId: string): Promise<RecordRow | undefined> {
    const response = await this.tableApi.get<{ result: Array<Record<string, unknown>> }>(table, {
      sysparm_display_value: 'all',
      sysparm_limit: 1,
      sysparm_query: `sys_id=${sysId}`,
    })
    const rows = unwrapResult<Record<string, unknown>>(response)
    return rows.length > 0 ? toRecordRow(rows[0]) : undefined
  }

  /** Choice list for one field, cached for the session. */
  async getChoices(table: string, field: string): Promise<FieldChoice[]> {
    return this.choiceCache.getOrLoad(`${table}.${field}`, async () => {
      const explained = await this.schema.explainField(table, field)
      const choices = (explained as undefined | { choices?: FieldChoice[] })?.choices ?? []
      return choices.map((c) => ({ label: String(c.label ?? c.value ?? ''), value: String(c.value ?? '') }))
    })
  }

  /** Table schema as typed FieldSpecs, cached for the session (LRU 32). */
  async getSchema(table: string, depth = 0): Promise<TableSchema> {
    return this.schemaCache.getOrLoad(table, async () => {
      const raw = await this.schema.discoverTableSchema(table, {
        includeBusinessRules: false,
        includeChoiceTables: false,
        includeRelationships: false,
        // internalType feeds the shared fieldTypeText fallback chain
        includeTypeCodes: true,
        includeUIPolicies: false,
      })
      const r = raw as { fields?: unknown[]; label?: string; superClass?: string; table?: string }
      const own = (r.fields ?? []).map((f) => toFieldSpec(f))

      // core returns ONLY fields defined directly on this table — on
      // `incident` that is 22 fields, and priority/state/short_description
      // (inherited from `task`) are all absent. Without walking the chain
      // the form treats every inherited field as unknown, which means
      // unlabelled and read-only. superClass is the PARENT'S sys_id, so it
      // has to be resolved to a table name first.
      let inherited: FieldSpec[] = []
      let parentTable: string | undefined
      if (r.superClass && depth < MAX_INHERITANCE_DEPTH) {
        parentTable = await this.resolveTableName(r.superClass)
        if (parentTable && parentTable !== table) {
          const parent = await this.getSchema(parentTable, depth + 1).catch(() => {})
          inherited = parent?.fields ?? []
        }
      }

      // Own definitions win: a child table can redefine an inherited field.
      const byName = new Map<string, FieldSpec>()
      for (const field of [...inherited, ...own]) byName.set(field.name, field)

      const schema: TableSchema = {
        fields: [...byName.values()],
        label: r.label ?? table,
        table: r.table ?? table,
      }
      if (parentTable) schema.superClass = parentTable
      return schema
    })
  }

  /**
   * Drop cached derivations that a write to `table` could invalidate.
   * Records themselves are never cached (a stale record in a write-capable
   * tool is a hazard), so this only clears schema-adjacent entries.
   */
  invalidateTable(table: string): void {
    this.schemaCache.delete(table)
  }

  /** All tables, for the table picker. Cached 10 minutes. */
  async listTables(): Promise<TableInfo[]> {
    return this.tableCache.getOrLoad('tables', async () => {
      const response = await this.tableApi.get<{ result: Array<Record<string, unknown>> }>(
        'sys_db_object',
        {
          sysparm_fields: 'name,label,super_class',
          sysparm_limit: 5000,
          sysparm_query: 'ORDERBYname',
        },
      )
      return unwrapResult<Record<string, unknown>>(response).map((raw) => {
        const info: TableInfo = {
          label: String(raw.label ?? raw.name ?? ''),
          name: String(raw.name ?? ''),
        }
        const superClass = raw.super_class
        if (superClass !== null && superClass !== undefined && superClass !== '') {
          info.superClass = typeof superClass === 'object'
            ? String((superClass as { value?: unknown }).value ?? '')
            : String(superClass)
        }

        return info
      }).filter((t) => t.name.length > 0)
    })
  }

  /** Resolve an incident. */
  async resolveIncident(
    spec: ApprovalSpec,
    token: ApprovalToken,
    options: { closeCode?: string; notes: string; sysId: string },
  ): Promise<void> {
    this.approvals.consume(token, spec)
    await this.tasks.resolveIncident({
      closeCode: options.closeCode,
      resolutionNotes: options.notes,
      sysId: options.sysId,
    })
    this.invalidateTable('incident')
  }

  /**
   * Update fields on one record.
   *
   * Uses PUT, not PATCH, deliberately: core 5.0.1's
   * `ServiceNowRequest.executeRequest` switches on the HTTP method with
   * cases for post/put/get/delete and NO case for patch, so
   * `TableAPIRequest.patch()` resolves successfully having sent nothing —
   * a silent no-op. No CLI command uses patch, which is why it went
   * unnoticed. Verified against a live instance: PUT with a partial body
   * updates only the supplied fields and leaves the rest untouched, which
   * is the semantic we want. Revert to patch once core is fixed.
   */
  async updateRecord(
    spec: ApprovalSpec,
    token: ApprovalToken,
    options: { patch: Record<string, string>; sysId: string; table: string },
  ): Promise<void> {
    this.approvals.consume(token, spec)
    const response = await this.tableApi.put<{ result?: unknown }>(
      options.table,
      options.sysId,
      options.patch,
    )
    // Belt and braces after the patch discovery: a write that returns no
    // response at all did not happen, and must not be reported as success.
    if (!response) {
      throw new Error(`update to ${options.table} returned no response — the record was not written`)
    }

    this.invalidateTable(options.table)
  }

  /** sys_db_object sys_id → table name, cached for the session. */
  private async resolveTableName(sysId: string): Promise<string | undefined> {
    return this.tableNameCache.getOrLoad(sysId, async () => {
      const response = await this.tableApi.get<{ result: Array<Record<string, unknown>> }>(
        'sys_db_object',
        { sysparm_fields: 'name', sysparm_limit: 1, sysparm_query: `sys_id=${sysId}` },
      )
      const rows = unwrapResult<Record<string, unknown>>(response)
      const name = rows.length > 0 ? String(rows[0].name ?? '') : ''
      return name.length > 0 ? name : undefined
    })
  }
}
