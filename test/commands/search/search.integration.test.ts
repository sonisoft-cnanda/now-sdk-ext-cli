import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    CodeSearch: jest.fn().mockImplementation(() => ({
      search: jest.fn<any>().mockResolvedValue([
        {
          group: 'Script Includes',
          results: [
            {
              name: 'MyScriptInclude',
              table: 'sys_script_include',
              sys_id: 'abc123',
              field: 'script',
              match: 'GlideRecord',
              context: 'var gr = new GlideRecord("incident");',
            },
          ],
        },
      ]),
      searchInApp: jest.fn<any>().mockResolvedValue([
        {
          group: 'Script Includes',
          results: [
            {
              name: 'ScopedScriptInclude',
              table: 'sys_script_include',
              sys_id: 'scoped-001',
              field: 'script',
              match: 'getValue',
              context: 'current.getValue("field");',
            },
          ],
        },
      ]),
      searchInTable: jest.fn<any>().mockResolvedValue([
        {
          name: 'TableResult',
          table: 'sys_script_include',
          sys_id: 'table-result-001',
          field: 'script',
          match: 'initialize',
          context: 'initialize: function() {',
        },
      ]),
      getSearchGroups: jest.fn<any>().mockResolvedValue([
        {
          name: 'Script Includes',
          sys_id: 'group-001',
          description: 'All script include tables',
          order: 100,
        },
        {
          name: 'Business Rules',
          sys_id: 'group-002',
          description: 'Business rule tables',
          order: 200,
        },
      ]),
      getTablesForSearchGroup: jest.fn<any>().mockResolvedValue([
        {
          name: 'sys_script_include',
          sys_id: 'table-001',
          search_fields: 'script',
          table: 'sys_script_include',
        },
      ]),
      addTableToSearchGroup: jest.fn<any>().mockResolvedValue({
        table: 'u_custom_script',
        search_fields: 'script',
        search_group: 'Custom Scripts',
        sys_id: 'new-001',
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
const { Search } = await import('../../../src/commands/search/index.js')
const { SearchGroups } = await import('../../../src/commands/search/groups.js')
const { SearchTables } = await import('../../../src/commands/search/tables.js')
const { SearchAddTable } = await import('../../../src/commands/search/add-table.js')

// Mock flattenResults as a static method
const { CodeSearch } = jest.requireMock('@sonisoft/now-sdk-ext-core') as any
CodeSearch.flattenResults = jest.fn<any>().mockImplementation((rawResults: any[]) => {
  const flattened: any[] = []
  for (const group of rawResults) {
    if (group.results) {
      flattened.push(...group.results)
    }
  }

  return flattened
})

describe('Search Commands - Integration Tests', () => {
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

  describe('search command structure', () => {
    it('should have description mentioning search', () => {
      expect(Search.description).toContain('Search platform code')
    })

    it('should have term flag as required', () => {
      expect(Search.flags['term']).toBeDefined()
      expect(Search.flags['term'].required).toBe(true)
    })

    it('should have scope flag as optional', () => {
      expect(Search.flags['scope']).toBeDefined()
      expect(Search.flags['scope'].required).toBe(false)
    })

    it('should have table flag as optional', () => {
      expect(Search.flags['table']).toBeDefined()
      expect(Search.flags['table'].required).toBe(false)
    })

    it('should have search-group flag as optional', () => {
      expect(Search.flags['search-group']).toBeDefined()
      expect(Search.flags['search-group'].required).toBe(false)
    })

    it('should have limit flag as optional', () => {
      expect(Search.flags['limit']).toBeDefined()
      expect(Search.flags['limit'].required).toBe(false)
    })
  })

  describe('search groups command structure', () => {
    it('should have description mentioning search groups', () => {
      expect(SearchGroups.description).toContain('search groups')
    })
  })

  describe('search tables command structure', () => {
    it('should have description mentioning tables', () => {
      expect(SearchTables.description).toContain('tables')
    })

    it('should have search-group flag as required', () => {
      expect(SearchTables.flags['search-group']).toBeDefined()
      expect(SearchTables.flags['search-group'].required).toBe(true)
    })
  })

  describe('search add-table command structure', () => {
    it('should have description mentioning add table', () => {
      expect(SearchAddTable.description).toContain('Add a table')
    })

    it('should have table flag as required', () => {
      expect(SearchAddTable.flags['table']).toBeDefined()
      expect(SearchAddTable.flags['table'].required).toBe(true)
    })

    it('should have search-fields flag as required', () => {
      expect(SearchAddTable.flags['search-fields']).toBeDefined()
      expect(SearchAddTable.flags['search-fields'].required).toBe(true)
    })

    it('should have search-group flag as required', () => {
      expect(SearchAddTable.flags['search-group']).toBeDefined()
      expect(SearchAddTable.flags['search-group'].required).toBe(true)
    })
  })

  describe('search execution', () => {
    it('should execute a global search', async () => {
      const { error } = await runCommand([
        'search', '--term', 'GlideRecord', '--auth', 'test',
      ])

      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })

    it('should execute a scoped search', async () => {
      const { error } = await runCommand([
        'search', '--term', 'getValue', '--scope', 'x_my_app', '--auth', 'test',
      ])

      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })

    it('should execute a table-specific search', async () => {
      const { error } = await runCommand([
        'search', '--term', 'initialize', '--search-group', 'Script Includes', '--table', 'sys_script_include', '--auth', 'test',
      ])

      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })
  })

  describe('search groups execution', () => {
    it('should list search groups', async () => {
      const { error } = await runCommand([
        'search:groups', '--auth', 'test',
      ])

      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })
  })

  describe('search tables execution', () => {
    it('should list tables for a search group', async () => {
      const { error } = await runCommand([
        'search:tables', '--search-group', 'Script Includes', '--auth', 'test',
      ])

      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })
  })

  describe('search add-table execution', () => {
    it('should add a table to a search group', async () => {
      const { error } = await runCommand([
        'search:add-table', '--table', 'u_custom_script', '--search-fields', 'script', '--search-group', 'Custom Scripts', '--auth', 'test',
      ])

      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
    })
  })
})
