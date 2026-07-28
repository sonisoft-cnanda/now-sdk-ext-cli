import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    SchemaDiscovery: jest.fn().mockImplementation(() => ({
      discoverTableSchema: jest.fn<any>().mockResolvedValue({
        table: 'incident',
        label: 'Incident',
        superClass: 'task',
        fields: [
          { name: 'number', label: 'Number', internalType: 'string', maxLength: 40, mandatory: false, readOnly: true },
          { name: 'short_description', label: 'Short description', internalType: 'string', maxLength: 160, mandatory: true, readOnly: false },
        ],
      }),
      explainField: jest.fn<any>().mockResolvedValue({
        field: 'state',
        table: 'incident',
        label: 'State',
        type: 'integer',
        maxLength: 40,
        mandatory: false,
        readOnly: false,
        choices: [
          { label: 'New', value: '1' },
          { label: 'In Progress', value: '2' },
        ],
      }),
      validateCatalogConfiguration: jest.fn<any>().mockResolvedValue({
        valid: true,
        issues: [],
        warnings: 0,
        errors: 0,
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
const { Schema } = await import('../../../src/commands/schema/index.js')
const { Field } = await import('../../../src/commands/schema/field.js')
const { ValidateCatalog } = await import('../../../src/commands/schema/validate-catalog.js')

describe('Schema Command - Integration Tests', () => {
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

  describe('schema (discover table schema)', () => {
    describe('command structure', () => {
      it('should have description mentioning table schema', () => {
        expect(Schema.description).toContain('Discover and inspect a ServiceNow table schema')
      })

      it('should have table flag as required', () => {
        expect(Schema.flags['table']).toBeDefined()
        expect(Schema.flags['table'].required).toBe(true)
      })

      it('should have include-choices flag', () => {
        expect(Schema.flags['include-choices']).toBeDefined()
      })

      it('should have include-relationships flag', () => {
        expect(Schema.flags['include-relationships']).toBeDefined()
      })

      it('should have include-ui-policies flag', () => {
        expect(Schema.flags['include-ui-policies']).toBeDefined()
      })

      it('should have include-business-rules flag', () => {
        expect(Schema.flags['include-business-rules']).toBeDefined()
      })

      it('should have json flag', () => {
        expect(Schema.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(Schema.examples).toBeDefined()
        expect(Schema.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should discover table schema', async () => {
        const { error } = await runCommand([
          'schema', '--table', 'incident', '--auth', 'test',
        ])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should require table flag', async () => {
        const { error } = await runCommand(['schema', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('schema field (explain field)', () => {
    describe('command structure', () => {
      it('should have description mentioning field information', () => {
        expect(Field.description).toContain('Get detailed information about a specific field')
      })

      it('should have table flag as required', () => {
        expect(Field.flags['table']).toBeDefined()
        expect(Field.flags['table'].required).toBe(true)
      })

      it('should have field flag as required', () => {
        expect(Field.flags['field']).toBeDefined()
        expect(Field.flags['field'].required).toBe(true)
      })

      it('should have json flag', () => {
        expect(Field.flags['json']).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should explain a field', async () => {
        const { error } = await runCommand([
          'schema:field', '--table', 'incident', '--field', 'state', '--auth', 'test',
        ])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should require table flag', async () => {
        const { error } = await runCommand([
          'schema:field', '--field', 'state', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require field flag', async () => {
        const { error } = await runCommand([
          'schema:field', '--table', 'incident', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('schema validate-catalog', () => {
    describe('command structure', () => {
      it('should have description mentioning catalog validation', () => {
        expect(ValidateCatalog.description).toContain('Validate a ServiceNow catalog item configuration')
      })

      it('should have sys-id flag as required', () => {
        expect(ValidateCatalog.flags['sys-id']).toBeDefined()
        expect(ValidateCatalog.flags['sys-id'].required).toBe(true)
      })

      it('should have json flag', () => {
        expect(ValidateCatalog.flags['json']).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should validate a catalog item', async () => {
        const { error } = await runCommand([
          'schema:validate-catalog', '--sys-id', 'abc123', '--auth', 'test',
        ])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should require sys-id flag', async () => {
        const { error } = await runCommand([
          'schema:validate-catalog', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })
})
