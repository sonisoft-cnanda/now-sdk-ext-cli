/**
 * The bulk write path. What matters here is not that it updates records —
 * it is that it CANNOT update the wrong ones, cannot run unapproved, and
 * reports a half-finished run honestly.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const queryUpdate = jest.fn()

jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  AggregateQuery: jest.fn().mockImplementation(() => ({ count: jest.fn() })),
  QueryBatchOperations: jest.fn().mockImplementation(() => ({ queryUpdate })),
  SchemaDiscovery: jest.fn().mockImplementation(() => ({})),
  TableAPIRequest: jest.fn().mockImplementation(() => ({})),
  TaskOperations: jest.fn().mockImplementation(() => ({})),
}))

const { BULK_CHUNK_SIZE, RecordsGateway } = await import('../../../src/tui/data/records.gateway.js')
const { ApprovalRegistry } = await import('../../../src/tui/data/approvals.js')

const SPEC = {
  actionKind: 'bulk.update' as const,
  detail: [{ after: '3', label: 'priority' }],
  target: { count: 2, instance: 'https://dev.service-now.com', table: 'incident' },
  title: 'bulk update',
}

function setup() {
  const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
  const gateway = new RecordsGateway({}, approvals)
  return { approvals, gateway }
}

const ids = (n: number) => Array.from({ length: n }, (_, i) => `sys${i}`)

beforeEach(() => {
  queryUpdate.mockReset()
  queryUpdate.mockImplementation((options: any) =>
    Promise.resolve(
      options.confirm
        ? { dryRun: false, errors: [], matchCount: countIn(options.query), success: true, updatedCount: countIn(options.query) }
        : { dryRun: true, matchCount: countIn(options.query) },
    ),
  )
})

const countIn = (query: string) => query.replace('sys_idIN', '').split(',').filter(Boolean).length

describe('bulkDryRun', () => {
  it('never confirms — a preview cannot write', async () => {
    const { gateway } = setup()
    await gateway.bulkDryRun({ data: { priority: '3' }, ids: ids(3), table: 'incident' })
    expect((queryUpdate.mock.calls[0][0] as any).confirm).toBe(false)
  })

  it('targets the explicit id list, not the list query', async () => {
    const { gateway } = setup()
    await gateway.bulkDryRun({ data: { priority: '3' }, ids: ['a', 'b'], table: 'incident' })
    expect((queryUpdate.mock.calls[0][0] as any).query).toBe('sys_idINa,b')
  })

  it('needs no approval token — nothing is written', async () => {
    const { gateway } = setup()
    const result = await gateway.bulkDryRun({ data: { priority: '3' }, ids: ['a'], table: 'incident' })
    expect(result.dryRun).toBe(true)
  })
})

describe('bulkUpdate', () => {
  it('REFUSES without a valid approval token', async () => {
    const { gateway } = setup()
    await expect(
      gateway.bulkUpdate(SPEC, 'not-a-token' as never, { data: { priority: '3' }, ids: ['a'], table: 'incident' }),
    ).rejects.toThrow()
    expect(queryUpdate).not.toHaveBeenCalled()
  })

  it('refuses to reuse a token — one approval, one operation', async () => {
    const { approvals, gateway } = setup()
    const token = approvals.mint(SPEC)
    await gateway.bulkUpdate(SPEC, token, { data: { priority: '3' }, ids: ['a'], table: 'incident' })
    await expect(
      gateway.bulkUpdate(SPEC, token, { data: { priority: '3' }, ids: ['a'], table: 'incident' }),
    ).rejects.toThrow()
  })

  it('chunks a large selection and covers every id exactly once', async () => {
    const { approvals, gateway } = setup()
    const all = ids(250)
    const result = await gateway.bulkUpdate(SPEC, approvals.mint(SPEC), {
      data: { priority: '3' },
      ids: all,
      table: 'incident',
    })

    expect(queryUpdate).toHaveBeenCalledTimes(3)
    const sent = queryUpdate.mock.calls.flatMap((c) =>
      (c[0] as any).query.replace('sys_idIN', '').split(','),
    )
    expect(sent).toEqual(all)
    expect(result.changedCount).toBe(250)
    expect(result.success).toBe(true)
  })

  it('consumes the token ONCE for the whole operation, not per chunk', async () => {
    const { approvals, gateway } = setup()
    // 250 ids = 3 chunks. A per-chunk consume would throw on the second.
    await expect(
      gateway.bulkUpdate(SPEC, approvals.mint(SPEC), {
        data: { priority: '3' },
        ids: ids(250),
        table: 'incident',
      }),
    ).resolves.toBeDefined()
  })

  it('stops at a chunk BOUNDARY when aborted, and reports partial not failed', async () => {
    const { approvals, gateway } = setup()
    let calls = 0
    const result = await gateway.bulkUpdate(SPEC, approvals.mint(SPEC), {
      data: { priority: '3' },
      ids: ids(250),
      shouldAbort: () => {
        calls += 1
        // Abort before the third chunk.
        return calls > 2
      },
      table: 'incident',
    })

    expect(queryUpdate).toHaveBeenCalledTimes(2)
    expect(result.aborted).toBe(true)
    expect(result.changedCount).toBe(BULK_CHUNK_SIZE * 2)
    // Aborting is never success, even though every attempted record wrote.
    expect(result.success).toBe(false)
  })

  it('reports progress as it goes so a long run is not a frozen screen', async () => {
    const { approvals, gateway } = setup()
    const seen: number[] = []
    await gateway.bulkUpdate(SPEC, approvals.mint(SPEC), {
      data: { priority: '3' },
      ids: ids(250),
      onProgress: (done) => seen.push(done),
      table: 'incident',
    })
    expect(seen).toEqual([100, 200, 250])
  })

  it('surfaces per-record errors and does not claim success', async () => {
    const { approvals, gateway } = setup()
    queryUpdate.mockResolvedValue({
      dryRun: false,
      errors: [{ error: 'ACL denied', sysId: 'sys1' }],
      matchCount: 2,
      success: false,
      updatedCount: 1,
    } as never)

    const result = await gateway.bulkUpdate(SPEC, approvals.mint(SPEC), {
      data: { priority: '3' },
      ids: ['sys0', 'sys1'],
      table: 'incident',
    })
    expect(result.errors).toHaveLength(1)
    expect(result.success).toBe(false)
  })
})
