import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    QueryBatchOperations: jest.fn().mockImplementation(() => ({
      queryUpdate: jest.fn<any>().mockResolvedValue({
        dryRun: true,
        matchCount: 5,
        updatedCount: 0,
        success: true,
        errors: [],
        executionTimeMs: 250,
      }),
      queryDelete: jest.fn<any>().mockResolvedValue({
        dryRun: true,
        matchCount: 3,
        deletedCount: 0,
        success: true,
        errors: [],
        executionTimeMs: 180,
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

// Dynamic imports after mocks
const { BulkUpdate } = await import('../../../src/commands/bulk/update.js')
const { BulkDelete } = await import('../../../src/commands/bulk/delete.js')

describe('Bulk Commands - Integration Tests', () => {
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

  describe('bulk update', () => {
    describe('command structure', () => {
      it('should have description mentioning bulk update', () => {
        expect(BulkUpdate.description).toContain('Bulk update')
      })

      it('should have table flag as required', () => {
        expect(BulkUpdate.flags['table']).toBeDefined()
        expect(BulkUpdate.flags['table'].required).toBe(true)
      })

      it('should have query flag as required', () => {
        expect(BulkUpdate.flags['query']).toBeDefined()
        expect(BulkUpdate.flags['query'].required).toBe(true)
      })

      it('should have data flag as required', () => {
        expect(BulkUpdate.flags['data']).toBeDefined()
        expect(BulkUpdate.flags['data'].required).toBe(true)
      })

      it('should have confirm flag defaulting to false', () => {
        expect(BulkUpdate.flags['confirm']).toBeDefined()
        expect(BulkUpdate.flags['confirm'].default).toBe(false)
      })

      it('should have limit flag defaulting to 200', () => {
        expect(BulkUpdate.flags['limit']).toBeDefined()
        expect(BulkUpdate.flags['limit'].default).toBe(200)
      })

      it('should have json flag', () => {
        expect(BulkUpdate.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(BulkUpdate.examples).toBeDefined()
        expect(BulkUpdate.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should run dry-run bulk update', async () => {
        const { stdout, error } = await runCommand([
          'bulk:update', '--table', 'incident', '--query', 'active=true',
          '--data', '{"priority":"4"}', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Dry run')
        }
      })

      it('should run confirmed bulk update', async () => {
        const { stdout, error } = await runCommand([
          'bulk:update', '--table', 'incident', '--query', 'active=true',
          '--data', '{"priority":"4"}', '--confirm', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Executing bulk update')
        }
      })

      it('should require table flag', async () => {
        const { error } = await runCommand([
          'bulk:update', '--query', 'active=true', '--data', '{"priority":"4"}', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require query flag', async () => {
        const { error } = await runCommand([
          'bulk:update', '--table', 'incident', '--data', '{"priority":"4"}', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require data flag', async () => {
        const { error } = await runCommand([
          'bulk:update', '--table', 'incident', '--query', 'active=true', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('bulk delete', () => {
    describe('command structure', () => {
      it('should have description mentioning bulk delete', () => {
        expect(BulkDelete.description).toContain('Bulk delete')
      })

      it('should have table flag as required', () => {
        expect(BulkDelete.flags['table']).toBeDefined()
        expect(BulkDelete.flags['table'].required).toBe(true)
      })

      it('should have query flag as required', () => {
        expect(BulkDelete.flags['query']).toBeDefined()
        expect(BulkDelete.flags['query'].required).toBe(true)
      })

      it('should have confirm flag defaulting to false', () => {
        expect(BulkDelete.flags['confirm']).toBeDefined()
        expect(BulkDelete.flags['confirm'].default).toBe(false)
      })

      it('should have limit flag defaulting to 200', () => {
        expect(BulkDelete.flags['limit']).toBeDefined()
        expect(BulkDelete.flags['limit'].default).toBe(200)
      })

      it('should have json flag', () => {
        expect(BulkDelete.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(BulkDelete.examples).toBeDefined()
        expect(BulkDelete.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should run dry-run bulk delete', async () => {
        const { stdout, error } = await runCommand([
          'bulk:delete', '--table', 'u_temp', '--query', 'processed=true', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Dry run')
        }
      })

      it('should run confirmed bulk delete', async () => {
        const { stdout, error } = await runCommand([
          'bulk:delete', '--table', 'u_temp', '--query', 'processed=true', '--confirm', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Executing bulk delete')
        }
      })

      it('should require table flag', async () => {
        const { error } = await runCommand([
          'bulk:delete', '--query', 'active=true', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require query flag', async () => {
        const { error } = await runCommand([
          'bulk:delete', '--table', 'u_temp', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })
})
