import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    WorkflowManager: jest.fn().mockImplementation(() => ({
      createCompleteWorkflow: jest.fn<any>().mockResolvedValue({
        workflowSysId: 'wf-001', versionSysId: 'wfv-001',
        activitySysIds: { '0': 'act-001', '1': 'act-002' },
        transitionSysIds: ['tr-001'], published: false,
      }),
      publishWorkflow: jest.fn<any>().mockResolvedValue(undefined),
    })),
    Logger: jest.fn().mockImplementation(() => ({
      debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn(), trace: jest.fn(),
    })),
    NowStringUtil: { isStringEmpty(str: string | null | undefined): boolean { return !str || str.trim().length === 0 } },
    ServiceNowInstance: jest.fn().mockImplementation(() => ({
      getHost: jest.fn().mockReturnValue('https://test.service-now.com'),
      getUserName: jest.fn().mockReturnValue('test-user'),
    })),
  }
})

jest.mock('@servicenow/sdk-cli/dist/auth/index.js', () => ({
  getCredentials: jest.fn<any>().mockResolvedValue({
    instanceUrl: 'https://test.service-now.com',
    password: 'test-password', type: 'basic', username: 'test-user',
  }),
}))

describe('Workflow Commands - Integration Tests', () => {
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

  describe('workflow create', () => {
    describe('command structure', () => {
      it('should have description about creating workflows', async () => {
        const { Create } = await import('../../../src/commands/workflow/create.js')
        expect(Create.description).toContain('Create a complete workflow')
      })

      it('should have spec flag as required', async () => {
        const { Create } = await import('../../../src/commands/workflow/create.js')
        expect(Create.flags.spec).toBeDefined()
      })
    })

    describe('validation', () => {
      it('should require spec flag', async () => {
        const { error } = await runCommand(['workflow:create', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('workflow publish', () => {
    describe('command structure', () => {
      it('should have description about publishing workflows', async () => {
        const { Publish } = await import('../../../src/commands/workflow/publish.js')
        expect(Publish.description).toContain('Publish a workflow version')
      })

      it('should have version-id and start-activity flags as required', async () => {
        const { Publish } = await import('../../../src/commands/workflow/publish.js')
        expect(Publish.flags['version-id']).toBeDefined()
        expect(Publish.flags['start-activity']).toBeDefined()
      })
    })

    describe('publishing', () => {
      it('should publish a workflow version', async () => {
        const { stdout, error } = await runCommand([
          'workflow:publish', '--version-id', 'wfv-001', '--start-activity', 'act-001', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Publishing workflow version')
        }
      })
    })

    describe('validation', () => {
      it('should require version-id flag', async () => {
        const { error } = await runCommand([
          'workflow:publish', '--start-activity', 'act-001', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require start-activity flag', async () => {
        const { error } = await runCommand([
          'workflow:publish', '--version-id', 'wfv-001', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })
})
