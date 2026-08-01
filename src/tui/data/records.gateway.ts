/**
 * Table/record reads for the TUI. Read-only by design in Phase 1 — every
 * write method arrives in Phase 3 together with the ApprovalToken contract,
 * so there is deliberately nothing here to call unsafely.
 */
import { AggregateQuery, SchemaDiscovery, TableAPIRequest } from '@sonisoft/now-sdk-ext-core'

import type { FieldChoice, RecordCell, RecordPage, RecordRow, TableInfo, TableSchema } from './types.js'

import { toFieldSpec } from '../../services/shape/schema-field.js'
import { TtlCache } from './cache.js'

const TABLE_LIST_TTL_MS = 10 * 60 * 1000

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

export class RecordsGateway {
  private readonly aggregate: AggregateQuery
  private readonly choiceCache = new TtlCache<FieldChoice[]>({ maxEntries: 256 })
  private readonly schema: SchemaDiscovery
  private readonly schemaCache = new TtlCache<TableSchema>({ maxEntries: 32 })
  private readonly tableApi: TableAPIRequest
  private readonly tableCache = new TtlCache<TableInfo[]>({ maxEntries: 4, ttlMs: TABLE_LIST_TTL_MS })

  constructor(instance: unknown) {
    this.aggregate = new AggregateQuery(instance as never)
    this.schema = new SchemaDiscovery(instance as never)
    this.tableApi = new TableAPIRequest(instance as never)
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
  async getSchema(table: string): Promise<TableSchema> {
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
      const schema: TableSchema = {
        fields: (r.fields ?? []).map((f) => toFieldSpec(f)),
        label: r.label ?? table,
        table: r.table ?? table,
      }
      if (r.superClass) schema.superClass = r.superClass
      return schema
    })
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
}
