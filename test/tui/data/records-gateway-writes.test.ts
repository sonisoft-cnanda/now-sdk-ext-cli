/**
 * The safety net that matters most: no write reaches the instance without
 * a valid, single-use, spec-matched approval token — and none reaches it
 * at all in a read-only session.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const tablePut = jest.fn<any>()
const addComment = jest.fn<any>()
const assignTask = jest.fn<any>()
const closeIncident = jest.fn<any>()
const resolveIncident = jest.fn<any>()
const approveChange = jest.fn<any>()

jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  AggregateQuery: jest.fn().mockImplementation(() => ({ count: jest.fn<any>() })),
  SchemaDiscovery: jest.fn().mockImplementation(() => ({ discoverTableSchema: jest.fn<any>(), explainField: jest.fn<any>() })),
  TableAPIRequest: jest.fn().mockImplementation(() => ({ get: jest.fn<any>(), put: tablePut })),
  TaskOperations: jest.fn().mockImplementation(() => ({
    addComment, approveChange, assignTask, closeIncident, resolveIncident,
  })),
}))

const { ApprovalRegistry, ApprovalRequiredError, ReadOnlyError } = await import('../../../src/tui/data/approvals.js')
const { RecordsGateway } = await import('../../../src/tui/data/records.gateway.js')

type Spec = Parameters<InstanceType<typeof ApprovalRegistry>['mint']>[0]

const spec: Spec = {
  actionKind: 'record.update',
  detail: [{ after: '1', before: '3', label: 'Priority' }],
  target: { count: 1, instance: 'https://dev.service-now.com', table: 'incident' },
  title: 'update 1 field',
}

describe('RecordsGateway writes', () => {
  beforeEach(() => {
    for (const fn of [tablePut, addComment, assignTask, closeIncident, resolveIncident, approveChange]) {
      fn.mockClear()
      fn.mockResolvedValue({})
    }
  })

  it('writes the record with PUT when the token is valid', async () => {
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new RecordsGateway({}, approvals)
    const token = approvals.mint(spec)
    await gw.updateRecord(spec, token, { patch: { priority: '1' }, sysId: 'abc', table: 'incident' })
    expect(tablePut).toHaveBeenCalledWith('incident', 'abc', { priority: '1' })
  })

  it('treats a no-response write as a FAILURE, never as success', async () => {
    // core 5.0.1's executeRequest has no 'patch' case and returns null for
    // it — a silent no-op that reported success. Any write that comes back
    // empty must throw rather than toast "saved".
    tablePut.mockResolvedValueOnce(undefined)
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new RecordsGateway({}, approvals)
    await expect(
      gw.updateRecord(spec, approvals.mint(spec), { patch: { priority: '1' }, sysId: 'abc', table: 'incident' }),
    ).rejects.toThrow(/was not written/)
  })

  it('NEVER reaches the instance without a token', async () => {
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new RecordsGateway({}, approvals)
    await expect(
      gw.updateRecord(spec, undefined as never, { patch: { priority: '1' }, sysId: 'abc', table: 'incident' }),
    ).rejects.toThrow(ApprovalRequiredError)
    expect(tablePut).not.toHaveBeenCalled()
  })

  it('NEVER reaches the instance on a reused token', async () => {
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new RecordsGateway({}, approvals)
    const token = approvals.mint(spec)
    await gw.updateRecord(spec, token, { patch: { priority: '1' }, sysId: 'abc', table: 'incident' })
    tablePut.mockClear()
    await expect(
      gw.updateRecord(spec, token, { patch: { priority: '1' }, sysId: 'abc', table: 'incident' }),
    ).rejects.toThrow(/already used/)
    expect(tablePut).not.toHaveBeenCalled()
  })

  it('NEVER reaches the instance in a read-only session', async () => {
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev', readOnly: true })
    const gw = new RecordsGateway({}, approvals)
    const token = approvals.mint(spec)
    await expect(
      gw.updateRecord(spec, token, { patch: { priority: '1' }, sysId: 'abc', table: 'incident' }),
    ).rejects.toThrow(ReadOnlyError)
    expect(tablePut).not.toHaveBeenCalled()
  })

  it('every task verb consumes its token before calling core', async () => {
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new RecordsGateway({}, approvals)

    const cases: Array<[string, () => Promise<void>, jest.Mock<any>]> = [
      ['task.comment', () => gw.addComment(spec, approvals.mint(spec), { comment: 'c', isWorkNote: true, sysId: 's', table: 'incident' }), addComment],
      ['task.assign', () => gw.assignTask(spec, approvals.mint(spec), { assignedTo: 'u', sysId: 's', table: 'incident' }), assignTask],
      ['task.close', () => gw.closeIncident(spec, approvals.mint(spec), { notes: 'n', sysId: 's' }), closeIncident],
      ['task.resolve', () => gw.resolveIncident(spec, approvals.mint(spec), { notes: 'n', sysId: 's' }), resolveIncident],
      ['task.approve', () => gw.approveChange(spec, approvals.mint(spec), { sysId: 's' }), approveChange],
    ]

    for (const [, call, mock] of cases) {
      // eslint-disable-next-line no-await-in-loop
      await call()
      expect(mock).toHaveBeenCalledTimes(1)
    }
  })

  it('task verbs refuse without a token too', async () => {
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new RecordsGateway({}, approvals)
    await expect(
      gw.addComment(spec, undefined as never, { comment: 'c', isWorkNote: false, sysId: 's', table: 'incident' }),
    ).rejects.toThrow(ApprovalRequiredError)
    expect(addComment).not.toHaveBeenCalled()
  })

  it('maps comment options to core field names (isWorkNote, recordSysId)', async () => {
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new RecordsGateway({}, approvals)
    await gw.addComment(spec, approvals.mint(spec), { comment: 'hello', isWorkNote: true, sysId: 'sys1', table: 'incident' })
    expect(addComment).toHaveBeenCalledWith({
      comment: 'hello',
      isWorkNote: true,
      recordSysId: 'sys1',
      table: 'incident',
    })
  })
})
