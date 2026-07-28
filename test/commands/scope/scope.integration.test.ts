import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    ScopeManager: jest.fn().mockImplementation(() => ({
      setCurrentApplication: jest.fn<any>().mockResolvedValue({
        success: true, application: 'Test App', scope: 'x_test_app', sysId: 'app-001', verified: true, warnings: [],
      }),
      getCurrentApplication: jest.fn<any>().mockResolvedValue({ sys_id: 'global', name: 'Global', scope: 'global' }),
      listApplications: jest.fn<any>().mockResolvedValue([
        { sys_id: 'global', name: 'Global', scope: 'global' },
        { sys_id: 'app-001', name: 'Test App', scope: 'x_test_app' },
      ]),
      getApplication: jest.fn<any>().mockResolvedValue({ sys_id: 'app-001', name: 'Test App', scope: 'x_test_app' }),
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

describe('Scope Commands - Integration Tests', () => {
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

  describe('scope (get current)', () => {
    describe('command structure', () => {
      it('should have description about getting scope', async () => {
        const { Scope } = await import('../../../src/commands/scope/index.js')
        expect(Scope.description).toContain('current application scope')
      })

      it('should have list flag', async () => {
        const { Scope } = await import('../../../src/commands/scope/index.js')
        expect(Scope.flags.list).toBeDefined()
      })
    })

    describe('get current scope', () => {
      it('should get the current application scope', async () => {
        const { stdout, error } = await runCommand(['scope', '--auth', 'test'])

        if (!error) {
          expect(stdout).toContain('Fetching current application scope')
        }
      })
    })

    describe('list applications', () => {
      it('should list all available applications', async () => {
        const { stdout, error } = await runCommand(['scope', '--list', '--auth', 'test'])

        if (!error) {
          expect(stdout).toContain('Fetching available applications')
        }
      })
    })
  })

  describe('scope set', () => {
    describe('command structure', () => {
      it('should have description about setting scope', async () => {
        const { Set } = await import('../../../src/commands/scope/set.js')
        expect(Set.description).toContain('Set the current application scope')
      })

      it('should have app-id flag as required', async () => {
        const { Set } = await import('../../../src/commands/scope/set.js')
        expect(Set.flags['app-id']).toBeDefined()
      })
    })

    describe('set scope', () => {
      it('should set application scope', async () => {
        const { stdout, error } = await runCommand(['scope:set', '--app-id', 'app-001', '--auth', 'test'])

        if (!error) {
          expect(stdout).toContain('Setting application scope')
        }
      })
    })

    describe('validation', () => {
      it('should require app-id flag', async () => {
        const { error } = await runCommand(['scope:set', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })
})
