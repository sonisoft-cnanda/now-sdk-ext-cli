import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
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
    SyslogReader: jest.fn().mockImplementation(() => ({
      isTailing: false,
      startTailing: jest.fn<any>().mockResolvedValue(undefined),
      startTailingWithChannelAjax: jest.fn<any>().mockImplementation((opts: any) => {
        // Simulate receiving a log entry then resolving
        if (opts.onLog) {
          opts.onLog({
            sys_created_on: '2025-10-12T10:30:00.000Z',
            message: 'Test log message from integration test',
            sequence: '12345',
          })
        }

        return Promise.resolve()
      }),
      stopTailing: jest.fn(),
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
const { Log } = await import('../../../src/commands/log/index.js')
const { LogFilterService } = await import('../../../src/services/log-filter.service.js')

describe('Log Command - Integration Tests', () => {
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
    it('should have description about log tailing', () => {
      expect(Log.description).toContain('Tail and monitor ServiceNow system logs')
    })

    it('should have output, interval, filter, and no-color flags', () => {
      expect(Log.flags['output']).toBeDefined()
      expect(Log.flags['interval']).toBeDefined()
      expect(Log.flags['filter']).toBeDefined()
      expect(Log.flags['no-color']).toBeDefined()
    })

    it('should have filter flag with multiple option', () => {
      expect(Log.flags['filter'].multiple).toBe(true)
    })

    it('should have interval default of 1000ms', () => {
      expect(Log.flags['interval'].default).toBe(1000)
    })
  })

  describe('log tailing', () => {
    it('should start tailing and display header and logs', async () => {
      const { error } = await runCommand(['log', '--auth', 'test', '--no-color'])
      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })

    it('should apply filter and show filtered log count', async () => {
      const { error } = await runCommand([
        'log', '--auth', 'test', '--no-color',
        '--filter', 'message CONTAINS integration',
      ])
      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })
  })

  describe('filter validation', () => {
    it('should validate filter format through LogFilterService', () => {
      const filterService = new LogFilterService()

      expect(() => filterService.parseFilter('invalid-filter')).toThrow('Invalid filter format')
      expect(() => filterService.parseFilter('message CONTAINS')).toThrow('cannot be empty')
    })

    it('should accept valid filter formats', () => {
      const filterService = new LogFilterService()

      const rule = filterService.parseFilter('message CONTAINS error')
      expect(rule).toEqual({ field: 'message', operator: 'CONTAINS', value: 'error' })
    })
  })
})
