import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { captureOutput } from '@oclif/test'
import { Config } from '@oclif/core'

const FLOW_SYS_ID = '887dda5583237210fdb8f7b6feaad32c'
const SUBFLOW_SYS_ID = 'b2c3d4e5f6071829a3b4c5d6e7f89012'
const ACTION_SYS_ID = 'c3d4e5f607182939a4b5c6d7e8f90123'

const flowResult = {
  success: true,
  sysId: FLOW_SYS_ID,
  artifactType: 'flow',
  reportedType: 'flow',
  definition: {
    sys_id: FLOW_SYS_ID,
    name: 'Test Flow',
    type: 'flow',
    trigger_instances: [{ sys_id: 'trg001' }],
    action_instances: [{ sys_id: 'act001' }, { sys_id: 'act002' }],
  },
  summary: {
    sysId: FLOW_SYS_ID,
    name: 'Test Flow',
    internalName: 'test_flow',
    description: 'A flow used by tests',
    scope: 'global_scope_sys_id',
    scopeName: 'global',
    status: 'published',
    active: true,
    triggerCount: 1,
    actionCount: 2,
    subflowCount: 0,
    flowLogicCount: 1,
    inputCount: 2,
    outputCount: 1,
  },
}

const subflowResult = {
  success: true,
  sysId: SUBFLOW_SYS_ID,
  artifactType: 'subflow',
  reportedType: 'subflow',
  definition: {
    sys_id: SUBFLOW_SYS_ID,
    name: 'Test Subflow',
    type: 'subflow',
    inputs: [{ name: 'record_id' }],
    outputs: [{ name: 'result' }],
    action_instances: [{ sys_id: 'act010' }],
    subflow_instances: [{ sys_id: 'sub010' }],
    flow_logic_instances: [{ sys_id: 'logic010' }],
  },
  summary: {
    sysId: SUBFLOW_SYS_ID,
    name: 'Test Subflow',
    internalName: 'test_subflow',
    description: '',
    scope: 'x_myapp_scope_sys_id',
    scopeName: 'x_myapp',
    status: 'draft',
    active: true,
    triggerCount: 0,
    actionCount: 1,
    subflowCount: 1,
    flowLogicCount: 1,
    inputCount: 1,
    outputCount: 1,
  },
}

const actionResult = {
  success: true,
  sysId: ACTION_SYS_ID,
  artifactType: 'action',
  metadata: { sys_id: ACTION_SYS_ID, name: 'Test Action', internal_name: 'test_action' },
  steps: [
    { sys_id: 'step001', order: 100, label: 'Script step' },
    { sys_id: 'step002', order: 200, label: 'Log step' },
  ],
  summary: {
    sysId: ACTION_SYS_ID,
    name: 'Test Action',
    internalName: 'test_action',
    description: 'An action used by tests',
    scope: 'global_scope_sys_id',
    scopeName: 'global',
    state: 'published',
    active: true,
    inputCount: 3,
    outputCount: 2,
    stepCount: 2,
    steps: [
      { stepId: 'step001', order: 100, label: 'Script step', stepTypeName: 'Script', stepTypeId: 'type001' },
      { stepId: 'step002', order: 200, label: 'Log step', stepTypeName: 'Log', stepTypeId: 'type002' },
    ],
  },
}

// Mocks are prefixed with `mock` so ts-jest's hoisting allows the factory below
// to close over them.
const mockGetFlowDesignDefinition = jest.fn<any>()
const mockGetSubflowDefinition = jest.fn<any>()
const mockGetActionDefinition = jest.fn<any>()
// Every operation that would execute, mutate, or create a flow context. The
// definition command must never reach one of these.
const mockExecuteFlow = jest.fn<any>()
const mockExecuteSubflow = jest.fn<any>()
const mockExecuteAction = jest.fn<any>()
const mockTestFlow = jest.fn<any>()
const mockCopyFlow = jest.fn<any>()
const mockPublishFlow = jest.fn<any>()
const mockCancelFlow = jest.fn<any>()
const mockSendFlowMessage = jest.fn<any>()
const mockGetFlowContextDetails = jest.fn<any>()
const mockGetFlowContextStatus = jest.fn<any>()

const mutatingMocks = [
  mockExecuteFlow,
  mockExecuteSubflow,
  mockExecuteAction,
  mockTestFlow,
  mockCopyFlow,
  mockPublishFlow,
  mockCancelFlow,
  mockSendFlowMessage,
  mockGetFlowContextDetails,
  mockGetFlowContextStatus,
]

// unstable_mockModule, not jest.mock: this suite is ESM, and jest.mock does not
// intercept ESM imports — a factory registered with it is silently ignored and
// the command talks to the real core (and a real instance) instead.
jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => {
  return {
    FlowManager: jest.fn().mockImplementation(() => ({
      cancelFlow: mockCancelFlow,
      copyFlow: mockCopyFlow,
      executeAction: mockExecuteAction,
      executeFlow: mockExecuteFlow,
      executeSubflow: mockExecuteSubflow,
      getActionDefinition: mockGetActionDefinition,
      getFlowContextDetails: mockGetFlowContextDetails,
      getFlowContextStatus: mockGetFlowContextStatus,
      getFlowDesignDefinition: mockGetFlowDesignDefinition,
      getSubflowDefinition: mockGetSubflowDefinition,
      publishFlow: mockPublishFlow,
      sendFlowMessage: mockSendFlowMessage,
      testFlow: mockTestFlow,
    })),
    Logger: jest.fn().mockImplementation(() => ({
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn(),
    })),
    // Everything AuthenticatedCommand.init() and common/policy.ts reach for.
    // Stubbed rather than passed through so a test can neither configure real
    // logging nor install a real policy ladder.
    ALLOW_ENV: 'NEX_POLICY_ALLOW',
    DENY_ENV: 'NEX_POLICY_DENY',
    allowFromEnvironment: jest.fn<any>().mockReturnValue(undefined),
    configureLogging: jest.fn(),
    denyFromEnvironment: jest.fn<any>().mockReturnValue(undefined),
    denyLayer: jest.fn<any>().mockReturnValue({ name: 'test-deny' }),
    flushLogs: jest.fn<any>().mockResolvedValue(undefined),
    grantLayer: jest.fn<any>().mockReturnValue({ name: 'test-grant' }),
    installPolicy: jest.fn(),
    isPolicyRefusal: jest.fn<any>().mockReturnValue(false),
    setRemediationWriter: jest.fn(),
    NowStringUtil: {
      isStringEmpty(str: string | null | undefined): boolean {
        return !str || str.trim().length === 0
      },
    },
    ServiceNowInstance: jest.fn().mockImplementation(() => ({
      getHost: jest.fn().mockReturnValue('https://test.service-now.com'),
      getUserName: jest.fn().mockReturnValue('test-user'),
    })),
  }
})

jest.unstable_mockModule('@servicenow/sdk-cli/dist/auth/index.js', () => ({
  getCredentials: jest.fn<any>().mockResolvedValue({
    instanceUrl: 'https://test.service-now.com',
    password: 'test-password',
    type: 'basic',
    username: 'test-user',
  }),
}))

// Dynamic import — loaded after the mocks are registered
const { FlowDefinition } = await import('../../../src/commands/flow/definition.js')

// The command is invoked as a class rather than through runCommand(): oclif's
// own runner loads the built command out of dist/ with a native import, which
// escapes the module registry and would put the REAL core — and a real
// credential lookup and a real HTTP call — behind these assertions.
const ROOT = process.cwd()

async function runDefinition(argv: string[]) {
  return captureOutput(async () => FlowDefinition.run(argv, ROOT))
}

/** The exit code oclif attached to a CLIError, however it was surfaced. */
function exitCodeOf(error: unknown): number | undefined {
  const err = error as undefined | { exitCode?: number; oclif?: { exit?: number } }
  return err?.oclif?.exit ?? err?.exitCode
}

describe('flow definition - Integration Tests', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>

  beforeEach(() => {
    jest.clearAllMocks()
    // Both output paths — this.log and the console.log the JSON document goes
    // out on — end up at console.log, which jest replaces with a reporter that
    // decorates every line. Write straight to the stream instead so the
    // captured stdout is byte-for-byte what the CLI would print.
    consoleSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      process.stdout.write(args.map((a) => String(a)).join(' ') + '\n')
    })
    mockGetFlowDesignDefinition.mockResolvedValue(flowResult)
    mockGetSubflowDefinition.mockResolvedValue(subflowResult)
    mockGetActionDefinition.mockResolvedValue(actionResult)
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    // oclif sets process.exitCode when a command errors, and leaving it set
    // would fail the whole jest run. Reset to undefined rather than 0: oclif
    // only assigns when it is nullish, so a 0 here would suppress the next
    // test's exit code.
    process.exitCode = undefined
  })

  describe('command structure', () => {
    it('should require sys-id', () => {
      expect(FlowDefinition.flags['sys-id']).toBeDefined()
      expect(FlowDefinition.flags['sys-id'].required).toBe(true)
    })

    it('should offer the three artifact types and default to flow', () => {
      expect(FlowDefinition.flags['type']).toBeDefined()
      expect(FlowDefinition.flags['type'].options).toEqual(['flow', 'subflow', 'action'])
      expect(FlowDefinition.flags['type'].default).toBe('flow')
    })

    it('should have scope and json flags', () => {
      expect(FlowDefinition.flags['scope']).toBeDefined()
      expect(FlowDefinition.flags['json']).toBeDefined()
    })

    it('should describe itself as design-time and distinguish it from flow details', () => {
      expect(FlowDefinition.description).toContain('design-time')
      expect(FlowDefinition.description).toContain('flow details')
      expect(FlowDefinition.description).toContain('context')
    })

    it('should be discoverable as "flow definition" in the built command tree', async () => {
      const config = await Config.load(ROOT)
      expect(config.findCommand('flow:definition')).toBeDefined()
    })

    it('should leave the existing flow commands in place', async () => {
      const config = await Config.load(ROOT)
      for (const id of ['flow:run', 'flow:subflow', 'flow:action', 'flow:details', 'flow:test']) {
        expect(config.findCommand(id)).toBeDefined()
      }
    })

    it('should have examples for flow, subflow, action, and JSON piping', () => {
      const examples = FlowDefinition.examples!.map((e) => JSON.stringify(e)).join('\n')
      expect(FlowDefinition.examples!.length).toBeGreaterThanOrEqual(4)
      expect(examples).toContain('--type subflow')
      expect(examples).toContain('--type action')
      expect(examples).toContain('> flow.json')
      expect(examples).toContain('| jq')
    })
  })

  describe('core method selection', () => {
    it('should call getFlowDesignDefinition for a flow', async () => {
      const { error } = await runDefinition([
        '--sys-id', FLOW_SYS_ID, '--auth', 'test',
      ])

      expect(error).toBeUndefined()
      expect(mockGetFlowDesignDefinition).toHaveBeenCalledWith(FLOW_SYS_ID, undefined)
      expect(mockGetSubflowDefinition).not.toHaveBeenCalled()
      expect(mockGetActionDefinition).not.toHaveBeenCalled()
    })

    it('should call getSubflowDefinition for a subflow', async () => {
      const { error } = await runDefinition([
        '--sys-id', SUBFLOW_SYS_ID, '--type', 'subflow', '--auth', 'test',
      ])

      expect(error).toBeUndefined()
      expect(mockGetSubflowDefinition).toHaveBeenCalledWith(SUBFLOW_SYS_ID, undefined)
      expect(mockGetFlowDesignDefinition).not.toHaveBeenCalled()
      expect(mockGetActionDefinition).not.toHaveBeenCalled()
    })

    it('should call getActionDefinition for an action', async () => {
      const { error } = await runDefinition([
        '--sys-id', ACTION_SYS_ID, '--type', 'action', '--auth', 'test',
      ])

      expect(error).toBeUndefined()
      expect(mockGetActionDefinition).toHaveBeenCalledWith(ACTION_SYS_ID, undefined)
      expect(mockGetFlowDesignDefinition).not.toHaveBeenCalled()
      expect(mockGetSubflowDefinition).not.toHaveBeenCalled()
    })

    it('should pass --scope through as a definition option', async () => {
      await runDefinition([
        '--sys-id', FLOW_SYS_ID, '--scope', 'x_myapp', '--auth', 'test',
      ])

      expect(mockGetFlowDesignDefinition).toHaveBeenCalledWith(FLOW_SYS_ID, { scope: 'x_myapp' })
    })

    it('should require sys-id', async () => {
      const { error } = await runDefinition(['--auth', 'test'])
      expect(error).toBeDefined()
    })

    it('should reject an unknown artifact type', async () => {
      const { error } = await runDefinition([
        '--sys-id', FLOW_SYS_ID, '--type', 'workflow', '--auth', 'test',
      ])
      expect(error).toBeDefined()
    })
  })

  describe('read-only boundary', () => {
    it.each([
      ['flow', FLOW_SYS_ID],
      ['subflow', SUBFLOW_SYS_ID],
      ['action', ACTION_SYS_ID],
    ])('should not execute, mutate, or create a context for a %s', async (type, sysId) => {
      await runDefinition([
        '--sys-id', sysId, '--type', type, '--auth', 'test',
      ])

      for (const mutating of mutatingMocks) {
        expect(mutating).not.toHaveBeenCalled()
      }
    })
  })

  describe('JSON output', () => {
    it('should print one JSON document with the flow definition payload', async () => {
      const { stdout } = await runDefinition(['--sys-id', FLOW_SYS_ID, '--json', '--auth', 'test'])

      const parsed = JSON.parse(stdout)
      expect(parsed.success).toBe(true)
      expect(parsed.sysId).toBe(FLOW_SYS_ID)
      expect(parsed.artifactType).toBe('flow')
      expect(parsed.definition).toEqual(flowResult.definition)
    })

    it('should print the subflow inputs, outputs, actions, subflows and logic', async () => {
      const { stdout } = await runDefinition([
        '--sys-id', SUBFLOW_SYS_ID, '--type', 'subflow', '--json', '--auth', 'test',
      ])

      const parsed = JSON.parse(stdout)
      expect(parsed.artifactType).toBe('subflow')
      expect(parsed.definition.inputs).toEqual(subflowResult.definition.inputs)
      expect(parsed.definition.outputs).toEqual(subflowResult.definition.outputs)
      expect(parsed.definition.action_instances).toEqual(subflowResult.definition.action_instances)
      expect(parsed.definition.subflow_instances).toEqual(subflowResult.definition.subflow_instances)
      expect(parsed.definition.flow_logic_instances).toEqual(subflowResult.definition.flow_logic_instances)
    })

    it('should print action metadata and ordered step instances', async () => {
      const { stdout } = await runDefinition([
        '--sys-id', ACTION_SYS_ID, '--type', 'action', '--json', '--auth', 'test',
      ])

      const parsed = JSON.parse(stdout)
      expect(parsed.artifactType).toBe('action')
      expect(parsed.metadata).toEqual(actionResult.metadata)
      expect(parsed.steps).toEqual(actionResult.steps)
      expect(parsed.summary.steps.map((step: { order: number }) => step.order)).toEqual([100, 200])
    })

    it('should keep stdout free of progress text, banners and decoration', async () => {
      const { stdout } = await runDefinition(['--sys-id', FLOW_SYS_ID, '--json', '--auth', 'test'])

      expect(stdout).not.toContain('Retrieving')
      expect(stdout).not.toContain('\u2714')
      expect(stdout).not.toContain('\u2500')
      expect(stdout.trimStart().startsWith('{')).toBe(true)
      expect(stdout.trimEnd().endsWith('}')).toBe(true)
      expect(() => JSON.parse(stdout)).not.toThrow()

      // captureOutput strips ANSI by default; ask for the raw bytes so the
      // "no decoration" half of this actually means something.
      const raw = await captureOutput(
        async () => FlowDefinition.run(['--sys-id', FLOW_SYS_ID, '--json', '--auth', 'test'], ROOT),
        { stripAnsi: false },
      )
      // eslint-disable-next-line no-control-regex
      expect(raw.stdout).not.toMatch(/\u001B\[/)
    })
  })

  describe('human-readable summary', () => {
    it('should identify the flow, its sys_id, status, scope and counts', async () => {
      const { stdout } = await runDefinition([
        '--sys-id', FLOW_SYS_ID, '--auth', 'test',
      ])

      expect(stdout).toContain('Flow Definition')
      expect(stdout).toContain(FLOW_SYS_ID)
      expect(stdout).toContain('Test Flow')
      expect(stdout).toContain('published')
      expect(stdout).toContain('global')
      expect(stdout).toContain('Actions:      2')
      expect(stdout).toContain('Triggers:     1')
    })

    it('should label a subflow as a subflow', async () => {
      const { stdout } = await runDefinition([
        '--sys-id', SUBFLOW_SYS_ID, '--type', 'subflow', '--auth', 'test',
      ])

      expect(stdout).toContain('Subflow Definition')
      expect(stdout).toContain('Test Subflow')
      expect(stdout).toContain('draft')
    })

    it('should list action steps in order', async () => {
      const { stdout } = await runDefinition([
        '--sys-id', ACTION_SYS_ID, '--type', 'action', '--auth', 'test',
      ])

      expect(stdout).toContain('Action Definition')
      expect(stdout).toContain('Test Action')
      expect(stdout).toContain('Steps:        2')
      expect(stdout.indexOf('Script step')).toBeLessThan(stdout.indexOf('Log step'))
    })

    it('should not print the raw definition payload', async () => {
      const { stdout } = await runDefinition([
        '--sys-id', FLOW_SYS_ID, '--auth', 'test',
      ])

      expect(stdout).not.toContain('trigger_instances')
      expect(stdout).not.toContain('act001')
    })
  })

  describe('failures', () => {
    it.each([
      ['invalid_identifier', 'A flow sys_id must be 32 hexadecimal characters.'],
      ['type_mismatch', 'The artifact is a subflow, not a flow.'],
      ['not_found', 'No flow found for that sys_id.'],
      ['permission_denied', 'The session is not permitted to read this flow.'],
      ['api_error', 'ServiceNow reported an error retrieving the flow.'],
      ['malformed_response', 'The instance returned an unexpected response body.'],
    ])('should exit non-zero and stay actionable on %s', async (failureReason, errorMessage) => {
      mockGetFlowDesignDefinition.mockResolvedValue({
        success: false,
        sysId: FLOW_SYS_ID,
        failureReason,
        errorMessage,
      })

      const { error, stdout } = await runDefinition([
        '--sys-id', FLOW_SYS_ID, '--auth', 'test',
      ])

      expect(error).toBeDefined()
      expect(exitCodeOf(error)).toBeGreaterThan(0)
      expect(error!.message).toContain(failureReason)
      expect(error!.message).toContain(errorMessage)
      // No summary block, and above all no success icon, on a failure.
      expect(stdout).not.toContain('✔')
    })

    it('should not relabel a type mismatch as a success', async () => {
      mockGetSubflowDefinition.mockResolvedValue({
        success: false,
        sysId: FLOW_SYS_ID,
        failureReason: 'type_mismatch',
        reportedType: 'flow',
        errorMessage: 'The artifact is a flow, not a subflow.',
      })

      const { error, stdout } = await runDefinition([
        '--sys-id', FLOW_SYS_ID, '--type', 'subflow', '--auth', 'test',
      ])

      expect(error).toBeDefined()
      expect(error!.message).toContain('subflow')
      expect(stdout).not.toContain('Subflow Definition')
    })

    it('should fail when the action definition is incomplete', async () => {
      mockGetActionDefinition.mockResolvedValue({
        success: false,
        sysId: ACTION_SYS_ID,
        failureReason: 'api_error',
        errorMessage: 'Step instances could not be retrieved.',
        errorCode: 400,
      })

      const { error } = await runDefinition([
        '--sys-id', ACTION_SYS_ID, '--type', 'action', '--auth', 'test',
      ])

      expect(error).toBeDefined()
      expect(exitCodeOf(error)).toBeGreaterThan(0)
      expect(error!.message).toContain('api_error')
    })

    it('should fail when a failure carries no classification', async () => {
      mockGetFlowDesignDefinition.mockResolvedValue({ success: false, sysId: FLOW_SYS_ID })

      const { error } = await runDefinition([
        '--sys-id', FLOW_SYS_ID, '--auth', 'test',
      ])

      expect(error).toBeDefined()
      expect(error!.message).toContain('request_failed')
    })

    it('should surface a thrown transport error rather than a shape exception', async () => {
      mockGetFlowDesignDefinition.mockRejectedValue(new Error('socket hang up'))

      const { error } = await runDefinition([
        '--sys-id', FLOW_SYS_ID, '--auth', 'test',
      ])

      expect(error).toBeDefined()
      expect(error!.message).toContain('socket hang up')
      expect(exitCodeOf(error)).toBeGreaterThan(0)
    })

    it('should report a failure as JSON on stdout when --json is set', async () => {
      mockGetFlowDesignDefinition.mockResolvedValue({
        success: false,
        sysId: FLOW_SYS_ID,
        failureReason: 'not_found',
        errorMessage: 'No flow found for that sys_id.',
      })

      const { stdout } = await runDefinition([
        '--sys-id', FLOW_SYS_ID, '--json', '--auth', 'test',
      ])

      // oclif renders the failure as its own JSON document, and no definition
      // document is emitted alongside it.
      const parsed = JSON.parse(stdout)
      expect(parsed.success).toBeUndefined()
      expect(parsed.error).toBeDefined()
      expect(parsed.error.message).toContain('not_found')
      expect(process.exitCode).toBeGreaterThan(0)
    })
  })
})
