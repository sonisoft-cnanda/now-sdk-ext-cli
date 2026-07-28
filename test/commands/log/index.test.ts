import {expect, test, jest} from '@jest/globals'
import {runCommand} from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn(), trace: jest.fn(),
  })),
  NowStringUtil: { isStringEmpty(str: string | null | undefined): boolean { return !str || str.trim().length === 0 } },
  ServiceNowInstance: jest.fn().mockImplementation(() => ({
    getHost: jest.fn().mockReturnValue('https://test.service-now.com'),
    getUserName: jest.fn().mockReturnValue('test-user'),
  })),
  SyslogReader: jest.fn().mockImplementation(() => ({
    isTailing: false,
    startTailing: jest.fn<any>().mockResolvedValue(undefined),
    startTailingWithChannelAjax: jest.fn<any>().mockResolvedValue(undefined),
    stopTailing: jest.fn(),
  })),
}))
jest.mock('@servicenow/sdk-cli/dist/auth/index.js')

// Dynamic imports — loaded after mocks are registered
const { Log } = await import('../../../src/commands/log/index.js')

const AUTH_ALIAS = 'tanengdev012'
const TIMEOUT_10_SEC = 10000

describe('log', () => {
  describe('validation tests', () => {
    // Help output test removed - covered by integration tests

    it('should accept valid command instance', async () => {
      // This test will verify that the command accepts valid flags
      // We won't actually run it since it would tail indefinitely
      const command = new Log([], {} as any)
      expect(command).toBeDefined()
    })

    it('should have correct default values', async () => {
      expect(Log.flags.interval.default).toBe(1000)
      expect(Log.flags['no-color'].default).toBe(false)
    })

    it('should have client-side filtering flag', async () => {
      // Client-side filtering is supported via --filter flag
      expect(Log.flags.filter).toBeDefined()
      expect(Log.flags.filter.description).toContain('filter')
      expect(Log.flags.filter.multiple).toBe(true)
    })

    it('should have simplified flag set for ChannelAjax', async () => {
      // output, interval, no-color, and filter flags should exist
      expect(Log.flags.output).toBeDefined()
      expect(Log.flags.interval).toBeDefined()
      expect(Log.flags['no-color']).toBeDefined()
      expect(Log.flags.filter).toBeDefined()
    })
  })

  describe('flag validation', () => {
    it('should require auth flag for actual execution', async () => {
      expect(Log.baseFlags.auth).toBeDefined()
    })

    it('should have proper flag descriptions', async () => {
      expect(Log.flags.output.description).toContain('file path')
      expect(Log.flags.interval.description).toContain('interval')
      expect(Log.flags['no-color'].description).toContain('color')
    })
  })

  describe('command structure', () => {
    it('should have proper description', async () => {
      expect(Log.description).toContain('Tail and monitor ServiceNow system logs')
      expect(Log.description).toContain('ChannelAjax')
      expect(Log.description).toContain('sequence')
    })

    it('should have examples', async () => {
      expect(Log.examples.length).toBeGreaterThan(0)
      expect(Log.examples[0].command).toBeDefined()
      expect(Log.examples[0].description).toBeDefined()
    })

    it('should have at least 4 examples', async () => {
      expect(Log.examples.length).toBeGreaterThanOrEqual(4)
    })

    it('should mention ChannelAjax in description', async () => {
      expect(Log.description).toContain('ChannelAjax')
    })

    it('should mention sequence numbers in description', async () => {
      expect(Log.description.toLowerCase()).toContain('sequence')
    })

    it('should mention smart highlighting feature', async () => {
      expect(Log.description.toLowerCase()).toContain('highlight')
    })
  })

  // Note: Filter parsing and matching tests have been migrated to
  // test/services/log-filter.service.test.ts as part of the service extraction.
  // Integration tests are in test/commands/log/log.integration.test.ts.
})
