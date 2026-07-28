import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    FlowManager: jest.fn().mockImplementation(() => ({
      executeFlow: jest.fn<any>().mockResolvedValue({
        success: true,
        flowObjectName: 'global.test_flow',
        flowObjectType: 'flow',
        contextId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        executionDate: '2025-01-01 12:00:00',
        outputs: { result: 'done' },
      }),
      executeSubflow: jest.fn<any>().mockResolvedValue({
        success: true,
        flowObjectName: 'global.test_subflow',
        flowObjectType: 'subflow',
        contextId: 'b2c3d4e5f6071829a3b4c5d6e7f89012',
      }),
      executeAction: jest.fn<any>().mockResolvedValue({
        success: true,
        flowObjectName: 'global.test_action',
        flowObjectType: 'action',
        contextId: 'c3d4e5f607182939a4b5c6d7e8f90123',
      }),
      getFlowContextStatus: jest.fn<any>().mockResolvedValue({
        success: true,
        contextId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        found: true,
        state: 'COMPLETE',
        name: 'Test Flow',
      }),
      getFlowOutputs: jest.fn<any>().mockResolvedValue({
        success: true,
        contextId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        outputs: { result: 'done' },
      }),
      getFlowError: jest.fn<any>().mockResolvedValue({
        success: true,
        contextId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        flowErrorMessage: undefined,
      }),
      cancelFlow: jest.fn<any>().mockResolvedValue({
        success: true,
        contextId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      }),
      sendFlowMessage: jest.fn<any>().mockResolvedValue({
        success: true,
        contextId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      }),
      testFlow: jest.fn<any>().mockResolvedValue({
        success: true,
        contextId: 'd4e5f6071829394a5b6c7d8e9f012345',
        flowId: '887dda5583237210fdb8f7b6feaad32c',
        state: 'COMPLETE',
        outputs: { result: 'test_done' },
      }),
      copyFlow: jest.fn<any>().mockResolvedValue({
        success: true,
        newFlowSysId: 'new-flow-001',
      }),
      getFlowContextDetails: jest.fn<any>().mockResolvedValue({
        success: true,
        contextId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        flowContext: {
          name: 'Test Flow',
          state: 'COMPLETE',
          runTime: '1234',
          isTestRun: true,
          executedAs: 'admin',
          flowInitiatedBy: 'admin',
          executionSource: {
            callingSource: 'TEST_BUTTON',
            executionSourceTable: 'change_request',
            executionSourceRecordDisplay: 'CHG0010042',
          },
        },
        flowReport: {
          actionOperationsReports: {
            'act001': {
              actionName: 'act001',
              stepLabel: 'Create Incident',
              operationsCore: { error: '', state: 'COMPLETE', order: '1', runTime: '120' },
              operationsInput: { data: { table_name: { value: 'incident', displayValue: 'Incident' } } },
              operationsOutput: { data: { sys_id: { value: 'inc001', displayValue: 'INC0001234' } } },
            },
          },
          subflowOperationsReports: {},
          operationsOutput: { data: {} },
        },
      }),
      getFlowLogs: jest.fn<any>().mockResolvedValue({
        success: true,
        contextId: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        entries: [
          { sysId: 'log-001', level: '2', message: 'Record created', action: 'action.create_record', createdOn: '2025-01-01 12:00:00' },
          { sysId: 'log-002', level: '-1', message: 'Failed to send email', action: 'action.send_notification', createdOn: '2025-01-01 12:00:01' },
        ],
      }),
    })),
    Logger: jest.fn().mockImplementation(() => ({
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn(),
    })),
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

jest.mock('@servicenow/sdk-cli/dist/auth/index.js', () => ({
  getCredentials: jest.fn<any>().mockResolvedValue({
    instanceUrl: 'https://test.service-now.com',
    password: 'test-password',
    type: 'basic',
    username: 'test-user',
  }),
}))

// Dynamic imports — loaded after mocks are registered
const { FlowRun } = await import('../../../src/commands/flow/run.js')
const { FlowSubflow } = await import('../../../src/commands/flow/subflow.js')
const { FlowAction } = await import('../../../src/commands/flow/action.js')
const { FlowStatus } = await import('../../../src/commands/flow/status.js')
const { FlowOutputs } = await import('../../../src/commands/flow/outputs.js')
const { FlowError } = await import('../../../src/commands/flow/error.js')
const { FlowCancel } = await import('../../../src/commands/flow/cancel.js')
const { FlowMessage } = await import('../../../src/commands/flow/message.js')
const { FlowTest } = await import('../../../src/commands/flow/test.js')
const { FlowCopy } = await import('../../../src/commands/flow/copy.js')
const { FlowDetails } = await import('../../../src/commands/flow/details.js')
const { FlowLogs } = await import('../../../src/commands/flow/logs.js')

describe('Flow Commands - Integration Tests', () => {
  let consoleSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('flow run', () => {
    describe('command structure', () => {
      it('should have description mentioning flow', () => {
        expect(FlowRun.description).toContain('flow')
      })

      it('should have name flag as required', () => {
        expect(FlowRun.flags['name']).toBeDefined()
        expect(FlowRun.flags['name'].required).toBe(true)
      })

      it('should have inputs flag', () => {
        expect(FlowRun.flags['inputs']).toBeDefined()
      })

      it('should have mode flag with foreground default', () => {
        expect(FlowRun.flags['mode']).toBeDefined()
        expect(FlowRun.flags['mode'].default).toBe('foreground')
      })

      it('should have json flag', () => {
        expect(FlowRun.flags['json']).toBeDefined()
      })

      it('should have examples', () => {
        expect(FlowRun.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should execute a flow', async () => {
        const { error } = await runCommand([
          'flow:run', '--name', 'global.test_flow', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })

      it('should require name flag', async () => {
        const { error } = await runCommand(['flow:run', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('flow subflow', () => {
    describe('command structure', () => {
      it('should have description mentioning subflow', () => {
        expect(FlowSubflow.description).toContain('subflow')
      })

      it('should have name flag as required', () => {
        expect(FlowSubflow.flags['name'].required).toBe(true)
      })

      it('should have examples', () => {
        expect(FlowSubflow.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should execute a subflow', async () => {
        const { error } = await runCommand([
          'flow:subflow', '--name', 'global.test_subflow', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })
    })
  })

  describe('flow action', () => {
    describe('command structure', () => {
      it('should have description mentioning action', () => {
        expect(FlowAction.description).toContain('action')
      })

      it('should have name flag as required', () => {
        expect(FlowAction.flags['name'].required).toBe(true)
      })
    })

    describe('execution', () => {
      it('should execute an action', async () => {
        const { error } = await runCommand([
          'flow:action', '--name', 'global.test_action', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })
    })
  })

  describe('flow status', () => {
    describe('command structure', () => {
      it('should have description mentioning status', () => {
        expect(FlowStatus.description).toContain('status')
      })

      it('should have context-id flag as required', () => {
        expect(FlowStatus.flags['context-id']).toBeDefined()
        expect(FlowStatus.flags['context-id'].required).toBe(true)
      })

      it('should have json flag', () => {
        expect(FlowStatus.flags['json']).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should check flow status', async () => {
        const { error } = await runCommand([
          'flow:status', '--context-id', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })

      it('should require context-id flag', async () => {
        const { error } = await runCommand(['flow:status', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('flow outputs', () => {
    describe('command structure', () => {
      it('should have description mentioning outputs', () => {
        expect(FlowOutputs.description).toContain('outputs')
      })

      it('should have context-id flag as required', () => {
        expect(FlowOutputs.flags['context-id'].required).toBe(true)
      })
    })

    describe('execution', () => {
      it('should retrieve flow outputs', async () => {
        const { error } = await runCommand([
          'flow:outputs', '--context-id', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })
    })
  })

  describe('flow error', () => {
    describe('command structure', () => {
      it('should have description mentioning error', () => {
        expect(FlowError.description).toContain('error')
      })

      it('should have context-id flag as required', () => {
        expect(FlowError.flags['context-id'].required).toBe(true)
      })
    })

    describe('execution', () => {
      it('should retrieve flow error', async () => {
        const { error } = await runCommand([
          'flow:error', '--context-id', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })
    })
  })

  describe('flow cancel', () => {
    describe('command structure', () => {
      it('should have description mentioning cancel', () => {
        expect(FlowCancel.description).toContain('Cancel')
      })

      it('should have context-id flag as required', () => {
        expect(FlowCancel.flags['context-id'].required).toBe(true)
      })

      it('should have reason flag', () => {
        expect(FlowCancel.flags['reason']).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should cancel a flow', async () => {
        const { error } = await runCommand([
          'flow:cancel', '--context-id', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })
    })
  })

  describe('flow message', () => {
    describe('command structure', () => {
      it('should have description mentioning message', () => {
        expect(FlowMessage.description).toContain('message')
      })

      it('should have context-id flag as required', () => {
        expect(FlowMessage.flags['context-id'].required).toBe(true)
      })

      it('should have message flag as required', () => {
        expect(FlowMessage.flags['message']).toBeDefined()
        expect(FlowMessage.flags['message'].required).toBe(true)
      })

      it('should have payload flag', () => {
        expect(FlowMessage.flags['payload']).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should send a message to a flow', async () => {
        const { error } = await runCommand([
          'flow:message', '--context-id', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', '--message', 'approved', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })

      it('should require message flag', async () => {
        const { error } = await runCommand([
          'flow:message', '--context-id', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('flow test', () => {
    describe('command structure', () => {
      it('should have description mentioning test', () => {
        expect(FlowTest.description).toContain('Test')
      })

      it('should have description mentioning draft/unpublished', () => {
        expect(FlowTest.description).toContain('unpublished')
      })

      it('should have flow-id flag as required', () => {
        expect(FlowTest.flags['flow-id']).toBeDefined()
        expect(FlowTest.flags['flow-id'].required).toBe(true)
      })

      it('should have output-map flag as required', () => {
        expect(FlowTest.flags['output-map']).toBeDefined()
        expect(FlowTest.flags['output-map'].required).toBe(true)
      })

      it('should have scope flag as optional', () => {
        expect(FlowTest.flags['scope']).toBeDefined()
        expect(FlowTest.flags['scope'].required).toBe(false)
      })

      it('should have synchronous flag defaulting to true', () => {
        expect(FlowTest.flags['synchronous']).toBeDefined()
        expect(FlowTest.flags['synchronous'].default).toBe(true)
      })

      it('should have json flag', () => {
        expect(FlowTest.flags['json']).toBeDefined()
      })

      it('should have examples', () => {
        expect(FlowTest.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should test a flow', async () => {
        const { error } = await runCommand([
          'flow:test', '--flow-id', '887dda5583237210fdb8f7b6feaad32c',
          '--output-map', '{"current":"abc123","table_name":"incident"}',
          '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })

      it('should require flow-id flag', async () => {
        const { error } = await runCommand([
          'flow:test', '--output-map', '{"current":"abc123"}', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require output-map flag', async () => {
        const { error } = await runCommand([
          'flow:test', '--flow-id', 'abc123', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should support --no-synchronous for async execution', async () => {
        const { error } = await runCommand([
          'flow:test', '--flow-id', '887dda5583237210fdb8f7b6feaad32c',
          '--output-map', '{"current":"abc123"}',
          '--no-synchronous', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })
    })
  })

  describe('flow copy', () => {
    describe('command structure', () => {
      it('should have description mentioning copy', () => {
        expect(FlowCopy.description).toContain('Copy')
      })

      it('should have description mentioning best practice', () => {
        expect(FlowCopy.description).toContain('best practice')
      })

      it('should have source-flow-id flag as required', () => {
        expect(FlowCopy.flags['source-flow-id']).toBeDefined()
        expect(FlowCopy.flags['source-flow-id'].required).toBe(true)
      })

      it('should have name flag as required', () => {
        expect(FlowCopy.flags['name']).toBeDefined()
        expect(FlowCopy.flags['name'].required).toBe(true)
      })

      it('should have target-scope flag as required', () => {
        expect(FlowCopy.flags['target-scope']).toBeDefined()
        expect(FlowCopy.flags['target-scope'].required).toBe(true)
      })

      it('should have json flag', () => {
        expect(FlowCopy.flags['json']).toBeDefined()
      })

      it('should have examples', () => {
        expect(FlowCopy.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should copy a flow', async () => {
        const { error } = await runCommand([
          'flow:copy',
          '--source-flow-id', 'e89e3ade731310108ef62d2b04f6a744',
          '--name', 'Copy_of_Change_Standard',
          '--target-scope', '4a5a6115402946939ee48e3fe80f60f8',
          '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })

      it('should copy a flow with --json output', async () => {
        const { error } = await runCommand([
          'flow:copy',
          '--source-flow-id', 'e89e3ade731310108ef62d2b04f6a744',
          '--name', 'Copy_of_Change_Standard',
          '--target-scope', '4a5a6115402946939ee48e3fe80f60f8',
          '--json', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })

      it('should require source-flow-id flag', async () => {
        const { error } = await runCommand([
          'flow:copy', '--name', 'Copy', '--target-scope', 'scope-001', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require name flag', async () => {
        const { error } = await runCommand([
          'flow:copy', '--source-flow-id', 'flow-001', '--target-scope', 'scope-001', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require target-scope flag', async () => {
        const { error } = await runCommand([
          'flow:copy', '--source-flow-id', 'flow-001', '--name', 'Copy', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('flow details', () => {
    describe('command structure', () => {
      it('should have description mentioning details', () => {
        expect(FlowDetails.description).toContain('details')
      })

      it('should have description mentioning diagnostic', () => {
        expect(FlowDetails.description).toContain('diagnostic')
      })

      it('should have context-id flag as required', () => {
        expect(FlowDetails.flags['context-id']).toBeDefined()
        expect(FlowDetails.flags['context-id'].required).toBe(true)
      })

      it('should have scope flag as optional', () => {
        expect(FlowDetails.flags['scope']).toBeDefined()
        expect(FlowDetails.flags['scope'].required).toBe(false)
      })

      it('should have include-definition flag defaulting to false', () => {
        expect(FlowDetails.flags['include-definition']).toBeDefined()
        expect(FlowDetails.flags['include-definition'].default).toBe(false)
      })

      it('should have json flag', () => {
        expect(FlowDetails.flags['json']).toBeDefined()
      })

      it('should have examples', () => {
        expect(FlowDetails.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should get flow execution details', async () => {
        const { error } = await runCommand([
          'flow:details', '--context-id', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })

      it('should get details with --json output', async () => {
        const { error } = await runCommand([
          'flow:details', '--context-id', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', '--json', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })

      it('should require context-id flag', async () => {
        const { error } = await runCommand(['flow:details', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('flow logs', () => {
    describe('command structure', () => {
      it('should have description mentioning log', () => {
        expect(FlowLogs.description).toContain('log')
      })

      it('should have description mentioning sys_flow_log', () => {
        expect(FlowLogs.description).toContain('sys_flow_log')
      })

      it('should have context-id flag as required', () => {
        expect(FlowLogs.flags['context-id']).toBeDefined()
        expect(FlowLogs.flags['context-id'].required).toBe(true)
      })

      it('should have limit flag with default 100', () => {
        expect(FlowLogs.flags['limit']).toBeDefined()
        expect(FlowLogs.flags['limit'].default).toBe(100)
      })

      it('should have order flag with default asc', () => {
        expect(FlowLogs.flags['order']).toBeDefined()
        expect(FlowLogs.flags['order'].default).toBe('asc')
      })

      it('should have json flag', () => {
        expect(FlowLogs.flags['json']).toBeDefined()
      })

      it('should have examples', () => {
        expect(FlowLogs.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should get flow logs', async () => {
        const { error } = await runCommand([
          'flow:logs', '--context-id', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })

      it('should get logs with --json output', async () => {
        const { error } = await runCommand([
          'flow:logs', '--context-id', 'a1b2c3d4e5f60718293a4b5c6d7e8f90', '--json', '--auth', 'test',
        ])
        expect(error).toBeUndefined()
      })

      it('should require context-id flag', async () => {
        const { error } = await runCommand(['flow:logs', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })
})
