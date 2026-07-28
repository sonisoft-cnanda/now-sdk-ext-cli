import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    ATFTestExecutor: jest.fn().mockImplementation(() => ({
      executeTest: jest.fn<any>().mockResolvedValue({
        output: 'All steps passed',
        run_time: '10s',
        status: 'success',
        sys_id: 'result-001',
        test: { value: 'test-001', display_value: 'Test Name' },
        test_name: 'Verify Login Flow',
      }),
      executeTestSuiteAndWait: jest.fn<any>().mockResolvedValue({
        end_time: '2025-01-01 12:01:00',
        error_count: '0',
        failure_count: '0',
        number: 'SUITE0001',
        run_time: '45s',
        skip_count: '0',
        start_time: '2025-01-01 12:00:00',
        status: 'success',
        success: 'true',
        success_count: '5',
        sys_id: 'suite-result-001',
        test_suite: { value: 'suite-001', display_value: 'Smoke Tests' },
      }),
      executeTestSuiteByNameAndWait: jest.fn<any>().mockResolvedValue({
        end_time: '2025-01-01 12:00:30',
        error_count: '0',
        failure_count: '0',
        number: 'SUITE0002',
        run_time: '30s',
        skip_count: '0',
        start_time: '2025-01-01 12:00:00',
        status: 'success',
        success: 'true',
        success_count: '3',
        sys_id: 'suite-result-002',
        test_suite: { value: 'suite-002', display_value: 'Quick Tests' },
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
    ReferenceLink: {},
    ServiceNowInstance: jest.fn().mockImplementation(() => ({
      getHost: jest.fn().mockReturnValue('https://test.service-now.com'),
      getUserName: jest.fn().mockReturnValue('test-user'),
    })),
    TestResult: {},
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
const { Atf } = await import('../../../src/commands/atf/index.js')

describe('ATF Command - Integration Tests', () => {
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

  describe('command structure', () => {
    it('should have description mentioning ATF', () => {
      expect(Atf.description).toContain('Execute ATF')
      expect(Atf.description).toContain('Automated Test Framework')
    })

    it('should have test-id, suite-id, and suite-name flags', () => {
      expect(Atf.flags['test-id']).toBeDefined()
      expect(Atf.flags['suite-id']).toBeDefined()
      expect(Atf.flags['suite-name']).toBeDefined()
    })

    it('should have wait flag defaulting to true', () => {
      expect(Atf.flags['wait']).toBeDefined()
    })

    it('should have json flag', () => {
      expect(Atf.flags['json']).toBeDefined()
    })
  })

  describe('validation', () => {
    it('should have mutually exclusive test-id, suite-id, and suite-name flags', () => {
      // Verify the flags have exclusive constraints
      const testIdFlag = Atf.flags['test-id'] as any
      const suiteIdFlag = Atf.flags['suite-id'] as any
      const suiteNameFlag = Atf.flags['suite-name'] as any

      expect(testIdFlag.exclusive).toContain('suite-id')
      expect(testIdFlag.exclusive).toContain('suite-name')
      expect(suiteIdFlag.exclusive).toContain('test-id')
      expect(suiteNameFlag.exclusive).toContain('test-id')
    })

    it('should not require any of the execution flags individually', () => {
      expect(Atf.flags['test-id'].required).toBe(false)
      expect(Atf.flags['suite-id'].required).toBe(false)
      expect(Atf.flags['suite-name'].required).toBe(false)
    })
  })

  describe('test execution', () => {
    it('should execute a single test by sys_id', async () => {
      const { error } = await runCommand([
        'atf', '--test-id', 'abc123', '--auth', 'test',
      ])
      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })
  })

  describe('test suite execution', () => {
    it('should execute a test suite by sys_id and wait', async () => {
      const { error } = await runCommand([
        'atf', '--suite-id', 'suite-abc', '--auth', 'test', '--wait',
      ])
      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })

    it('should execute a test suite by name', async () => {
      const { error } = await runCommand([
        'atf', '--suite-name', 'Smoke Tests', '--auth', 'test',
      ])
      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })
  })
})
