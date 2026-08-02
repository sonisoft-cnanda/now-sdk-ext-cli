import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const executeTestSuite = jest.fn<any>()
const getTestSuiteProgress = jest.fn<any>()
const getTestSuiteResults = jest.fn<any>()
const getFlowContextDetails = jest.fn<any>()
const cancelFlow = jest.fn<any>()
const setCurrentUpdateSet = jest.fn<any>()
const setCurrentApplication = jest.fn<any>()
const getCurrentUpdateSet = jest.fn<any>()
const inspectUpdateSet = jest.fn<any>()

jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  ATFTestExecutor: jest.fn().mockImplementation(() => ({
    executeTestSuite, getTestSuiteProgress, getTestSuiteResults,
  })),
  FlowManager: jest.fn().mockImplementation(() => ({ cancelFlow, getFlowContextDetails, getFlowLogs: jest.fn<any>() })),
  ScopeManager: jest.fn().mockImplementation(() => ({ setCurrentApplication })),
  UpdateSetManager: jest.fn().mockImplementation(() => ({
    getCurrentUpdateSet, inspectUpdateSet, listUpdateSets: jest.fn<any>(), setCurrentUpdateSet,
  })),
}))

const { ApprovalRegistry, ApprovalRequiredError } = await import('../../../src/tui/data/approvals.js')
const { AutomationGateway } = await import('../../../src/tui/data/automation.gateway.js')

type Spec = Parameters<InstanceType<typeof ApprovalRegistry>['mint']>[0]
const spec = (kind: Spec['actionKind']): Spec => ({
  actionKind: kind,
  detail: [{ after: 'x', label: 'l' }],
  target: { count: 1, instance: 'https://dev.service-now.com' },
  title: 't',
})

const registry = () => new ApprovalRegistry({ alias: 'dev', env: 'dev' })

describe('ATF: start and poll rather than block', () => {
  beforeEach(() => {
    for (const fn of [executeTestSuite, getTestSuiteProgress, getTestSuiteResults]) fn.mockReset()
  })

  it('returns the progress id so the pane can poll', async () => {
    executeTestSuite.mockResolvedValueOnce({ links: { progress: { id: 'p1', url: '/p' } } })
    const approvals = registry()
    const gw = new AutomationGateway({}, approvals)
    const s = spec('atf.run')
    await expect(gw.startTestSuite(s, approvals.mint(s), 'suite1')).resolves.toBe('p1')
  })

  it('treats a missing progress id as a failed start', async () => {
    executeTestSuite.mockResolvedValueOnce({ links: {} })
    const approvals = registry()
    const gw = new AutomationGateway({}, approvals)
    const s = spec('atf.run')
    await expect(gw.startTestSuite(s, approvals.mint(s), 'suite1')).rejects.toThrow(/not started/)
  })

  it('NEVER starts a suite without an approval token', async () => {
    const gw = new AutomationGateway({}, registry())
    await expect(gw.startTestSuite(spec('atf.run'), undefined as never, 's')).rejects.toThrow(ApprovalRequiredError)
    expect(executeTestSuite).not.toHaveBeenCalled()
  })

  it('marks the run done on a terminal status, not only at 100%', async () => {
    const gw = new AutomationGateway({}, registry())
    getTestSuiteProgress.mockResolvedValueOnce({ percent_complete: 40, status: '3' })
    await expect(gw.pollTestSuite('p')).resolves.toMatchObject({ done: true, percent: 40 })
  })

  it('is still running mid-flight', async () => {
    const gw = new AutomationGateway({}, registry())
    getTestSuiteProgress.mockResolvedValueOnce({ percent_complete: 40, status: '1' })
    await expect(gw.pollTestSuite('p')).resolves.toMatchObject({ done: false })
  })

  it('done at 100% even when the status code is unfamiliar', async () => {
    const gw = new AutomationGateway({}, registry())
    getTestSuiteProgress.mockResolvedValueOnce({ percent_complete: 100, status: 'weird' })
    await expect(gw.pollTestSuite('p')).resolves.toMatchObject({ done: true })
  })

  it('coerces the outcome counters, which core returns as strings', async () => {
    getTestSuiteResults.mockResolvedValueOnce({
      error_count: '1', failure_count: '2', run_time: '30s', skip_count: '0',
      status: 'failed', success_count: '5', sys_id: 'res1',
    })
    const gw = new AutomationGateway({}, registry())
    await expect(gw.getTestSuiteOutcome('r')).resolves.toEqual({
      errors: 1, failures: 2, passed: 5, resultSysId: 'res1', runTime: '30s', skipped: 0, status: 'failed',
    })
  })
})

describe('Flows', () => {
  it('builds an ordered step tree from the context report', async () => {
    getFlowContextDetails.mockResolvedValueOnce({
      contextId: 'c1',
      flowContext: { name: 'Acme Flow', state: 'ERROR' },
      flowReport: {
        actionOperationsReports: {
          a: { operationsCore: { order: '2', runTime: '5', state: 'COMPLETE' }, stepLabel: 'Second' },
          b: { operationsCore: { error: 'boom', order: '1', runTime: '1', state: 'ERROR' }, stepLabel: 'First' },
        },
      },
    })
    const gw = new AutomationGateway({}, registry())
    const detail = await gw.getFlowDetail('c1')
    expect(detail.name).toBe('Acme Flow')
    expect(detail.steps.map((s) => s.label)).toEqual(['First', 'Second'])
    expect(detail.steps[0].error).toBe('boom')
  })

  it('NEVER cancels without an approval token', async () => {
    const gw = new AutomationGateway({}, registry())
    await expect(gw.cancelFlow(spec('flow.cancel'), undefined as never, 'c1')).rejects.toThrow(ApprovalRequiredError)
    expect(cancelFlow).not.toHaveBeenCalled()
  })
})

describe('session-state mutations are serialised', () => {
  beforeEach(() => {
    setCurrentUpdateSet.mockReset()
    setCurrentApplication.mockReset()
  })

  it('runs update-set and scope switches one at a time', async () => {
    // Both mutate SERVER-side session state; overlapping them can leave
    // the session pointing somewhere neither call intended.
    const order: string[] = []
    let releaseFirst!: () => void
    setCurrentUpdateSet.mockImplementationOnce(() => {
      order.push('set:start')
      return new Promise<void>((resolve) => {
        releaseFirst = () => { order.push('set:end'); resolve() }
      })
    })
    setCurrentApplication.mockImplementationOnce(async () => { order.push('scope:start') })

    const approvals = registry()
    const gw = new AutomationGateway({}, approvals)
    const s1 = spec('updateset.set')
    const s2 = spec('scope.set')
    const p1 = gw.setCurrentUpdateSet(s1, approvals.mint(s1), 'u1')
    const p2 = gw.setCurrentScope(s2, approvals.mint(s2), 'a1')

    await new Promise((resolve) => { setTimeout(resolve, 10) })
    expect(order).toEqual(['set:start']) // the scope switch has NOT started
    releaseFirst()
    await Promise.all([p1, p2])
    expect(order).toEqual(['set:start', 'set:end', 'scope:start'])
  })

  it('a failed mutation does not wedge the chain', async () => {
    setCurrentUpdateSet.mockRejectedValueOnce(new Error('denied'))
    setCurrentApplication.mockResolvedValueOnce(undefined)
    const approvals = registry()
    const gw = new AutomationGateway({}, approvals)
    const s1 = spec('updateset.set')
    const s2 = spec('scope.set')
    await expect(gw.setCurrentUpdateSet(s1, approvals.mint(s1), 'u1')).rejects.toThrow('denied')
    await expect(gw.setCurrentScope(s2, approvals.mint(s2), 'a1')).resolves.toBeUndefined()
  })
})

describe('Update sets', () => {
  it('flags the Default set — the classic capture mistake', async () => {
    getCurrentUpdateSet.mockResolvedValueOnce({ name: 'Default', state: 'in progress', sys_id: 'd1' })
    const gw = new AutomationGateway({}, registry())
    await expect(gw.getCurrentUpdateSet()).resolves.toMatchObject({ isDefault: true, name: 'Default' })
  })

  it('returns undefined rather than throwing when the lookup fails', async () => {
    getCurrentUpdateSet.mockRejectedValueOnce(new Error('no role'))
    const gw = new AutomationGateway({}, registry())
    await expect(gw.getCurrentUpdateSet()).resolves.toBeUndefined()
  })

  it('normalizes inspection components', async () => {
    inspectUpdateSet.mockResolvedValueOnce({
      components: [{ count: '2', items: ['a', 'b'], type: 'Business Rule' }],
      totalRecords: '2',
    })
    const gw = new AutomationGateway({}, registry())
    await expect(gw.inspectUpdateSet('u1')).resolves.toEqual({
      components: [{ count: 2, items: ['a', 'b'], type: 'Business Rule' }],
      total: 2,
    })
  })
})
