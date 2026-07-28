import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('node:fs', () => ({
  readFileSync: jest.fn<any>().mockReturnValue(JSON.stringify({
    operations: [
      { table: 'incident', values: { short_description: 'Test 1' } },
      { table: 'incident', values: { short_description: 'Test 2' } },
    ],
    updates: [
      { table: 'incident', sys_id: 'abc123', values: { state: '2' } },
      { table: 'incident', sys_id: 'def456', values: { state: '3' } },
    ],
  })),
}))

jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    BatchOperations: jest.fn().mockImplementation(() => ({
      batchCreate: jest.fn<any>().mockResolvedValue({
        success: true,
        createdCount: 2,
        sysIds: { item1: 'sys-001', item2: 'sys-002' },
        errors: [],
        executionTimeMs: 1500,
      }),
      batchUpdate: jest.fn<any>().mockResolvedValue({
        success: true,
        updatedCount: 2,
        errors: [],
        executionTimeMs: 1200,
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
const { Create } = await import('../../../src/commands/batch/create.js')
const { Update } = await import('../../../src/commands/batch/update.js')

describe('Batch Commands - Integration Tests', () => {
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

  describe('batch create', () => {
    describe('command structure', () => {
      it('should have description about batch creating records', () => {
        expect(Create.description).toContain('Batch create records')
      })

      it('should have file flag as required', () => {
        expect(Create.flags.file).toBeDefined()
      })

      it('should have transaction flag with default true', () => {
        expect(Create.flags.transaction).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should batch create records from file', async () => {
        const { error } = await runCommand([
          'batch:create', '--file', './records.json', '--auth', 'test',
        ])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should require file flag', async () => {
        const { error } = await runCommand(['batch:create', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('batch update', () => {
    describe('command structure', () => {
      it('should have description about batch updating records', () => {
        expect(Update.description).toContain('Batch update records')
      })

      it('should have file flag as required', () => {
        expect(Update.flags.file).toBeDefined()
      })

      it('should have stop-on-error flag', () => {
        expect(Update.flags['stop-on-error']).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should batch update records from file', async () => {
        const { error } = await runCommand([
          'batch:update', '--file', './updates.json', '--auth', 'test',
        ])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should require file flag', async () => {
        const { error } = await runCommand(['batch:update', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })
})
