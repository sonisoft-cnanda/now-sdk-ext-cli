import { describe, expect, it, jest } from '@jest/globals'

const tableGet = jest.fn<any>()
const aggregateCount = jest.fn<any>()
const discoverTableSchema = jest.fn<any>()
const explainField = jest.fn<any>()

// ESM: jest.mock does not hoist under --experimental-vm-modules;
// unstable_mockModule + dynamic import is the working pattern.
jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  AggregateQuery: jest.fn().mockImplementation(() => ({ count: aggregateCount })),
  SchemaDiscovery: jest.fn().mockImplementation(() => ({ discoverTableSchema, explainField })),
  TableAPIRequest: jest.fn().mockImplementation(() => ({ get: tableGet })),
}))

const { RecordsGateway, toRecordRow, unwrapResult } = await import('../../../src/tui/data/records.gateway.js')

describe('unwrapResult', () => {
  it('prefers data.result, falls back to bodyObject.result, then empty', () => {
    expect(unwrapResult({ data: { result: [1] } })).toEqual([1])
    expect(unwrapResult({ bodyObject: { result: [2] } })).toEqual([2])
    expect(unwrapResult({})).toEqual([])
    expect(unwrapResult(undefined)).toEqual([])
  })
})

describe('toRecordRow', () => {
  it('normalizes display_value=all cells', () => {
    const row = toRecordRow({
      state: { display_value: 'In Progress', value: '2' },
      sys_id: { display_value: 'abc', value: 'abc' },
    })
    expect(row.sysId).toBe('abc')
    expect(row.cells.state).toEqual({ displayValue: 'In Progress', value: '2' })
  })

  it('normalizes plain string cells to identical value/display', () => {
    const row = toRecordRow({ number: 'INC0010001', sys_id: 'xyz' })
    expect(row.sysId).toBe('xyz')
    expect(row.cells.number).toEqual({ displayValue: 'INC0010001', value: 'INC0010001' })
  })

  it('stringifies null to empty', () => {
    const row = toRecordRow({ assigned_to: null })
    expect(row.cells.assigned_to).toEqual({ displayValue: '', value: '' })
  })
})

describe('RecordsGateway', () => {
  it('fetchPage builds sysparm params with display_value=all and offset', async () => {
    tableGet.mockResolvedValueOnce({ data: { result: [{ number: 'INC1', sys_id: 'a' }] } })
    const gw = new RecordsGateway({})
    const page = await gw.fetchPage({ limit: 25, offset: 50, query: 'active=true', table: 'incident' })

    expect(tableGet).toHaveBeenCalledWith('incident', expect.objectContaining({
      sysparm_display_value: 'all',
      sysparm_limit: 25,
      sysparm_offset: 50,
      sysparm_query: 'active=true',
    }))
    expect(page.rows).toHaveLength(1)
    expect(page.hasMore).toBe(false) // 1 row < limit 25
  })

  it('always carries sys_id when a field list is given', async () => {
    tableGet.mockResolvedValueOnce({ data: { result: [] } })
    const gw = new RecordsGateway({})
    await gw.fetchPage({ fields: ['number', 'state'], limit: 10, offset: 0, query: '', table: 'incident' })
    const params = tableGet.mock.calls.at(-1)![1] as Record<string, unknown>
    expect(String(params.sysparm_fields).split(',')).toEqual(expect.arrayContaining(['sys_id', 'number', 'state']))
  })

  it('hasMore is true exactly when a full page returns', async () => {
    tableGet.mockResolvedValueOnce({ data: { result: [{ sys_id: 'a' }, { sys_id: 'b' }] } })
    const gw = new RecordsGateway({})
    const page = await gw.fetchPage({ limit: 2, offset: 0, query: '', table: 'incident' })
    expect(page.hasMore).toBe(true)
  })

  it('caches schema per table (LRU, session lifetime)', async () => {
    discoverTableSchema.mockResolvedValue({
      fields: [{ internalType: 'string', label: 'Number', name: 'number' }],
      label: 'Incident',
      table: 'incident',
    })
    const gw = new RecordsGateway({})
    const first = await gw.getSchema('incident')
    const second = await gw.getSchema('incident')
    expect(discoverTableSchema).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
    expect(first.fields[0]).toMatchObject({ controlKind: 'text', name: 'number', type: 'string' })
  })

  it('caches choices per table.field', async () => {
    explainField.mockResolvedValue({ choices: [{ label: 'New', value: '1' }] })
    const gw = new RecordsGateway({})
    await gw.getChoices('incident', 'state')
    const again = await gw.getChoices('incident', 'state')
    expect(explainField).toHaveBeenCalledTimes(1)
    expect(again).toEqual([{ label: 'New', value: '1' }])
  })

  it('countQuery passes the options object and coerces to a number', async () => {
    aggregateCount.mockResolvedValueOnce('412')
    const gw = new RecordsGateway({})
    await expect(gw.countQuery('incident', 'active=true')).resolves.toBe(412)
    expect(aggregateCount).toHaveBeenCalledWith({ query: 'active=true', table: 'incident' })
  })

  it('listTables normalizes reference-shaped super_class and drops nameless rows', async () => {
    tableGet.mockResolvedValueOnce({ data: { result: [
      { label: 'Incident', name: 'incident', super_class: { value: 'task-sys-id' } },
      { label: 'Task', name: 'task', super_class: '' },
      { label: 'Broken', name: '' },
    ] } })
    const gw = new RecordsGateway({})
    const tables = await gw.listTables()
    expect(tables).toHaveLength(2)
    expect(tables[0]).toEqual({ label: 'Incident', name: 'incident', superClass: 'task-sys-id' })
    expect(tables[1].superClass).toBeUndefined()
  })
})
