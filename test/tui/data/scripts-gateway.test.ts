import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const executeScript = jest.fn<any>()
const listApplications = jest.fn<any>()

jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  BackgroundScriptExecutor: jest.fn().mockImplementation(() => ({ executeScript })),
  ScopeManager: jest.fn().mockImplementation(() => ({ listApplications })),
}))

const { ApprovalRegistry, ApprovalRequiredError } = await import('../../../src/tui/data/approvals.js')
const { cleanOutputLine, ScriptsGateway } = await import('../../../src/tui/data/scripts.gateway.js')

type Spec = Parameters<InstanceType<typeof ApprovalRegistry>['mint']>[0]

const spec: Spec = {
  actionKind: 'script.execute',
  detail: [{ after: 'global', label: 'scope' }],
  target: { count: 1, instance: 'https://dev.service-now.com' },
  title: 'execute background script in global',
}

describe('ScriptsGateway.execute', () => {
  beforeEach(() => {
    executeScript.mockReset()
    listApplications.mockReset()
  })

  it('runs the script and returns its output lines', async () => {
    executeScript.mockResolvedValueOnce({ scriptResults: [{ line: 'INC0010001' }, { line: 'done' }] })
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new ScriptsGateway({}, approvals)
    const result = await gw.execute(spec, approvals.mint(spec), { scope: 'global', script: 'gs.info(1)' })
    expect(result.lines).toEqual(['INC0010001', 'done'])
    expect(executeScript).toHaveBeenCalledWith('gs.info(1)', 'global', expect.anything())
  })

  it('NEVER executes without an approval token', async () => {
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new ScriptsGateway({}, approvals)
    await expect(
      gw.execute(spec, undefined as never, { scope: 'global', script: 'gs.info(1)' }),
    ).rejects.toThrow(ApprovalRequiredError)
    expect(executeScript).not.toHaveBeenCalled()
  })

  it('treats a missing payload as a failure, not an empty success (NEX-92 lesson)', async () => {
    executeScript.mockResolvedValueOnce({})
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new ScriptsGateway({}, approvals)
    await expect(
      gw.execute(spec, approvals.mint(spec), { scope: 'global', script: 'x' }),
    ).rejects.toThrow(/no output/)
  })

  it('reuses one executor per scope so its scope→sys_id cache survives', async () => {
    executeScript.mockResolvedValue({ scriptResults: [] })
    const approvals = new ApprovalRegistry({ alias: 'dev', env: 'dev' })
    const gw = new ScriptsGateway({}, approvals)
    const core = await import('@sonisoft/now-sdk-ext-core')
    const ctor = core.BackgroundScriptExecutor as unknown as jest.Mock
    ctor.mockClear()
    await gw.execute(spec, approvals.mint(spec), { scope: 'global', script: 'a' })
    await gw.execute(spec, approvals.mint(spec), { scope: 'global', script: 'b' })
    await gw.execute(spec, approvals.mint(spec), { scope: 'x_app', script: 'c' })
    expect(ctor).toHaveBeenCalledTimes(2) // global + x_app, not 3
  })
})

describe('cleanOutputLine', () => {
  it('strips the <BR/> the background-script page emits', () => {
    // Observed live: gs.info('ok') came back as 'ok<BR/>'.
    expect(cleanOutputLine('NEX_TUI_PHASE4 ok<BR/>')).toEqual(['NEX_TUI_PHASE4 ok'])
  })

  it('splits a multi-line payload on breaks', () => {
    expect(cleanOutputLine('one<br/>two<BR>three')).toEqual(['one', 'two', 'three'])
  })

  it('decodes the entities the page emits, ampersand last', () => {
    expect(cleanOutputLine('a &lt;b&gt; &amp;amp; &quot;q&quot;')).toEqual(['a <b> &amp; "q"'])
  })

  it('keeps a genuinely blank line rather than vanishing it', () => {
    expect(cleanOutputLine('')).toEqual([''])
  })
})

describe('ScriptsGateway.listScopes', () => {
  beforeEach(() => {
    listApplications.mockReset()
  })

  it('pins global first and sorts the rest', async () => {
    listApplications.mockResolvedValueOnce([
      { name: 'Zeta App', scope: 'x_zeta', sys_id: '2' },
      { name: 'Acme App', scope: 'x_acme', sys_id: '1' },
    ])
    const gw = new ScriptsGateway({}, new ApprovalRegistry({ alias: 'dev', env: 'dev' }))
    const scopes = await gw.listScopes()
    expect(scopes.map((s) => s.scope)).toEqual(['global', 'x_acme', 'x_zeta'])
  })

  it('drops entries without a scope and never duplicates global', async () => {
    listApplications.mockResolvedValueOnce([
      { name: 'No scope', scope: '', sys_id: '1' },
      { name: 'Global', scope: 'global', sys_id: 'g' },
    ])
    const gw = new ScriptsGateway({}, new ApprovalRegistry({ alias: 'dev', env: 'dev' }))
    const scopes = await gw.listScopes()
    expect(scopes).toEqual([{ name: 'Global', scope: 'global', sysId: 'global' }])
  })

  it('still offers global when the lookup fails entirely', async () => {
    listApplications.mockRejectedValueOnce(new Error('no role'))
    const gw = new ScriptsGateway({}, new ApprovalRegistry({ alias: 'dev', env: 'dev' }))
    await expect(gw.listScopes()).resolves.toEqual([
      { name: 'Global', scope: 'global', sysId: 'global' },
    ])
  })

  it('caches the scope list', async () => {
    listApplications.mockResolvedValue([{ name: 'A', scope: 'x_a', sys_id: '1' }])
    const gw = new ScriptsGateway({}, new ApprovalRegistry({ alias: 'dev', env: 'dev' }))
    await gw.listScopes()
    await gw.listScopes()
    expect(listApplications).toHaveBeenCalledTimes(1)
  })
})
