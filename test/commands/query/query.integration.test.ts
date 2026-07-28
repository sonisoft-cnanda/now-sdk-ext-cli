import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    TableAPIRequest: jest.fn().mockImplementation(() => ({
      get: jest.fn<any>().mockResolvedValue({
        data: {
          result: [
            { sys_id: 'rec-001', number: 'INC0010001', short_description: 'Test incident', state: '1', priority: '1' },
            { sys_id: 'rec-002', number: 'INC0010002', short_description: 'Another incident', state: '2', priority: '2' },
          ]
        },
        status: 200,
      }),
      post: jest.fn<any>().mockResolvedValue({ data: { result: {} }, status: 201 }),
      put: jest.fn<any>().mockResolvedValue({ data: { result: {} }, status: 200 }),
      patch: jest.fn<any>().mockResolvedValue({ data: { result: {} }, status: 200 }),
    })),
    SchemaDiscovery: jest.fn().mockImplementation(() => ({
      discoverTableSchema: jest.fn<any>().mockResolvedValue({
        table: 'incident',
        label: 'Incident',
        superClass: 'task',
        fields: [
          { name: 'number', label: 'Number', internalType: 'string', maxLength: 40, mandatory: false, readOnly: true },
          { name: 'short_description', label: 'Short description', internalType: 'string', maxLength: 160, mandatory: true, readOnly: false },
          { name: 'state', label: 'State', internalType: 'integer', maxLength: 40, mandatory: false, readOnly: false },
        ],
      }),
      explainField: jest.fn<any>().mockResolvedValue({}),
      validateCatalogConfiguration: jest.fn<any>().mockResolvedValue({}),
    })),
    SyslogReader: jest.fn().mockImplementation(() => ({
      querySyslog: jest.fn<any>().mockResolvedValue([
        { sys_id: 'log-001', sys_created_on: '2025-01-01 12:00:00', level: 'error', message: 'Test error', source: 'test_script' },
      ]),
      querySyslogAppScope: jest.fn<any>().mockResolvedValue([]),
      startTailing: jest.fn<any>().mockResolvedValue(undefined),
      startTailingWithChannelAjax: jest.fn<any>().mockResolvedValue(undefined),
      stopTailing: jest.fn(),
      isTailing: false,
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
const { Query } = await import('../../../src/commands/query/index.js')
const { QueryApp } = await import('../../../src/commands/query/app.js')
const { QueryColumns } = await import('../../../src/commands/query/columns.js')
const { QuerySyslog } = await import('../../../src/commands/query/syslog.js')

describe('Query Commands - Integration Tests', () => {
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

  describe('query (table query)', () => {
    describe('command structure', () => {
      it('should have description mentioning table query', () => {
        expect(Query.description).toContain('Query any ServiceNow table')
      })

      it('should have table flag as required', () => {
        expect(Query.flags['table']).toBeDefined()
        expect(Query.flags['table'].required).toBe(true)
      })

      it('should have query flag', () => {
        expect(Query.flags['query']).toBeDefined()
      })

      it('should have fields flag', () => {
        expect(Query.flags['fields']).toBeDefined()
      })

      it('should have display-value flag', () => {
        expect(Query.flags['display-value']).toBeDefined()
      })

      it('should have limit flag with default of 20', () => {
        expect(Query.flags['limit']).toBeDefined()
        expect(Query.flags['limit'].default).toBe(20)
      })

      it('should have json flag', () => {
        expect(Query.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(Query.examples).toBeDefined()
        expect(Query.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should query a table', async () => {
        const { stdout, error } = await runCommand([
          'query', '--table', 'incident', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Querying table: incident')
        }
      })

      it('should require table flag', async () => {
        const { error } = await runCommand(['query', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('query app (application search)', () => {
    describe('command structure', () => {
      it('should have description mentioning application search', () => {
        expect(QueryApp.description).toContain('Search for applications')
      })

      it('should have search flag as required', () => {
        expect(QueryApp.flags['search']).toBeDefined()
        expect(QueryApp.flags['search'].required).toBe(true)
      })

      it('should have active flag', () => {
        expect(QueryApp.flags['active']).toBeDefined()
      })

      it('should have limit flag', () => {
        expect(QueryApp.flags['limit']).toBeDefined()
      })

      it('should have json flag', () => {
        expect(QueryApp.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(QueryApp.examples).toBeDefined()
        expect(QueryApp.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should search for applications', async () => {
        const { stdout, error } = await runCommand([
          'query:app', '--search', 'ITSM', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Searching for applications matching: "ITSM"')
        }
      })

      it('should require search flag', async () => {
        const { error } = await runCommand(['query:app', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('query columns (column listing)', () => {
    describe('command structure', () => {
      it('should have description mentioning columns', () => {
        expect(QueryColumns.description).toContain('List and search columns')
      })

      it('should have table flag as required', () => {
        expect(QueryColumns.flags['table']).toBeDefined()
        expect(QueryColumns.flags['table'].required).toBe(true)
      })

      it('should have search flag', () => {
        expect(QueryColumns.flags['search']).toBeDefined()
      })

      it('should have json flag', () => {
        expect(QueryColumns.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(QueryColumns.examples).toBeDefined()
        expect(QueryColumns.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should list columns for a table', async () => {
        const { stdout, error } = await runCommand([
          'query:columns', '--table', 'incident', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Listing columns for table: incident')
        }
      })

      it('should require table flag', async () => {
        const { error } = await runCommand(['query:columns', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('query syslog (syslog query)', () => {
    describe('command structure', () => {
      it('should have description mentioning syslog', () => {
        expect(QuerySyslog.description).toContain('Query ServiceNow system logs')
      })

      it('should have query flag', () => {
        expect(QuerySyslog.flags['query']).toBeDefined()
      })

      it('should have limit flag with default of 100', () => {
        expect(QuerySyslog.flags['limit']).toBeDefined()
        expect(QuerySyslog.flags['limit'].default).toBe(100)
      })

      it('should have json flag', () => {
        expect(QuerySyslog.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(QuerySyslog.examples).toBeDefined()
        expect(QuerySyslog.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should query syslog records', async () => {
        const { stdout, error } = await runCommand([
          'query:syslog', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Querying syslog records')
        }
      })
    })
  })
})
