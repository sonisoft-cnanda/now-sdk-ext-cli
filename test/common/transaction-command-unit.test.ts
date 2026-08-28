import {beforeEach, describe, expect, it, jest} from '@jest/globals'

const getTransactions = jest.fn<any>()
const killTransaction = jest.fn<any>()
const managerConstructor = jest.fn(() => ({getTransactions, killTransaction}))

jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  ...jest.requireActual('@sonisoft/now-sdk-ext-core'),
  ClusterTransactionManager: managerConstructor,
  ServiceNowInstance: jest.fn(() => ({})),
}))

jest.unstable_mockModule('@servicenow/sdk-cli/dist/auth/index.js', () => ({
  getCredentials: jest.fn<any>().mockResolvedValue({instanceUrl: 'https://test.service-now.com', password: 'test-password', type: 'basic', username: 'test-user'}),
}))

const {default: TransactionList} = await import('../../src/commands/transaction/list.js')
const {default: TransactionKill} = await import('../../src/commands/transaction/kill.js')

const record = {
  acl_time: '1', age: '2', br_count: '3', br_time: '4', business_rule: 'rule', db_time: '5',
  event_count: '6', foreground: 'true', node_id: 'node', query_count: '7', state: 'running',
  sys_id: '0123456789abcdef0123456789abcdef', thread: 'worker', type: 'background',
  url: '/incident_list.do', user: 'admin',
}

async function capture<T>(action: () => Promise<T>): Promise<{error?: Error; result?: T}> {
  try {
    return {result: await action()}
  } catch (error) {
    return {error: error as Error}
  }
}

describe('transaction commands', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getTransactions.mockResolvedValue([record])
    killTransaction.mockResolvedValue({accepted: true, sysId: record.sys_id})
  })

  it('calls getTransactions once and forwards only supplied retrieval options', async () => {
    const {error} = await capture(() => TransactionList.run(['--auth', 'test', '--poll-interval-ms', '5', '--timeout-ms', '10', '--query', 'user=admin', '--limit', '2']))
    expect(error).toBeUndefined()
    expect(getTransactions).toHaveBeenCalledTimes(1)
    expect(getTransactions).toHaveBeenCalledWith(expect.objectContaining({limit: 2, pollIntervalMs: 5, query: 'user=admin', timeoutMs: 10, signal: expect.any(AbortSignal)}))
  })

  it('does not pin core defaults when retrieval flags are omitted', async () => {
    await TransactionList.run(['--auth', 'test'])
    expect(Object.keys(getTransactions.mock.calls[0][0] as object)).toEqual(['signal'])
  })

  it.each([['--limit', '0'], ['--limit', '1.5'], ['--timeout-ms', '-1'], ['--poll-interval-ms', '-1']])(
    'rejects invalid %s before collection', async (flag, value) => {
      const {error} = await capture(() => TransactionList.run(['--auth', 'test', flag, value]))
      expect(error).toBeDefined()
      expect(getTransactions).not.toHaveBeenCalled()
    },
  )

  it('returns complete empty and populated result objects for native JSON serialization', async () => {
    getTransactions.mockResolvedValueOnce([])
    expect(await TransactionList.run(['--auth', 'test', '--json'])).toEqual({count: 0, transactions: []})
    expect(await TransactionList.run(['--auth', 'test', '--json'])).toEqual({count: 1, transactions: [record]})
  })

  it('fails collection without returning a partial success result', async () => {
    getTransactions.mockRejectedValueOnce(new Error('collection failed'))
    const {result} = await capture(() => TransactionList.run(['--auth', 'test', '--json']))
    expect(result).toBeUndefined()
    expect(getTransactions).toHaveBeenCalledTimes(1)
  })

  it('aborts a pending collection on SIGINT and never invokes termination', async () => {
    getTransactions.mockImplementationOnce(({signal}: {signal: AbortSignal}) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Transaction collection was aborted')))
      process.emit('SIGINT')
    }))
    const {result} = await capture(() => TransactionList.run(['--auth', 'test', '--json']))
    expect(result).toBeUndefined()
    expect(killTransaction).not.toHaveBeenCalled()
  })

  it('submits exactly one confirmed identifier and never refreshes', async () => {
    const result = await TransactionKill.run(['--auth', 'test', '--transaction-id', record.sys_id, '--confirm', '--json'])
    expect(result).toEqual({accepted: true, sysId: record.sys_id})
    expect(killTransaction).toHaveBeenCalledTimes(1)
    expect(killTransaction).toHaveBeenCalledWith(record.sys_id)
    expect(getTransactions).not.toHaveBeenCalled()
  })

  it('refuses missing confirmation without constructing the manager', async () => {
    const {error} = await capture(() => TransactionKill.run(['--auth', 'test', '--transaction-id', record.sys_id]))
    expect(error).toBeDefined()
    expect(managerConstructor).not.toHaveBeenCalled()
  })

  it('refuses malformed identifiers without constructing the manager', async () => {
    const {error} = await capture(() => TransactionKill.run(['--auth', 'test', '--transaction-id', 'zzz', '--confirm']))
    expect(error).toBeDefined()
    expect(managerConstructor).not.toHaveBeenCalled()
  })

  it('does not return acceptance when the platform rejects the request', async () => {
    killTransaction.mockRejectedValueOnce(new Error('platform rejected request'))
    const {error, result} = await capture(() => TransactionKill.run(['--auth', 'test', '--transaction-id', record.sys_id, '--confirm']))
    expect(error).toBeDefined()
    expect(result).toBeUndefined()
    expect(killTransaction).toHaveBeenCalledTimes(1)
  })
})
