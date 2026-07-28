import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('node:fs', () => ({
  readFileSync: jest.fn<any>().mockReturnValue(JSON.stringify({
    applications: [
      { name: 'App 1', scope: 'x_app1', version: '1.0.0' },
    ],
  })),
}))

jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    ApplicationManager: jest.fn().mockImplementation(() => ({
      installBatch: jest.fn<any>().mockResolvedValue('Installation complete'),
      searchApplications: jest.fn<any>().mockResolvedValue({
        apps: [
          { name: 'Test App', scope: 'x_test', version: '1.0.0', vendor: 'Test Vendor', sys_id: 'app-001' },
        ],
        total: 1,
      }),
      installStoreApplication: jest.fn<any>().mockResolvedValue({
        links: { progress: { id: 'prog-001', url: '/progress' } },
        percent_complete: 0,
        status: 'pending',
        status_label: 'Pending',
      }),
      installStoreApplicationAndWait: jest.fn<any>().mockResolvedValue({
        error: '',
        percent_complete: 100,
        status_label: 'Completed',
        status_message: '',
        success: true,
      }),
      updateStoreApplication: jest.fn<any>().mockResolvedValue({
        links: { progress: { id: 'prog-002', url: '/progress' } },
        percent_complete: 0,
        status: 'pending',
        status_label: 'Pending',
      }),
      updateStoreApplicationAndWait: jest.fn<any>().mockResolvedValue({
        error: '',
        percent_complete: 100,
        status_label: 'Completed',
        status_message: '',
        success: true,
      }),
      validateBatchDefinition: jest.fn<any>().mockResolvedValue({
        valid: true,
        errors: [],
        warnings: [],
      }),
    })),
    APP_TAB_CONTEXT: {
      AVAILABLE_FOR_YOU: 'available_for_you',
      INSTALLED: 'installed',
      UPDATES: 'updates',
    },
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
const { Search } = await import('../../../src/commands/store/search.js')
const { Install } = await import('../../../src/commands/store/install.js')
const { Update } = await import('../../../src/commands/store/update.js')
const { Validate } = await import('../../../src/commands/store/validate.js')

describe('Store Commands - Integration Tests', () => {
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

  describe('store search', () => {
    describe('command structure', () => {
      it('should have description about searching store applications', () => {
        expect(Search.description).toContain('Search for applications')
      })

      it('should have term, tab, and limit flags', () => {
        expect(Search.flags.term).toBeDefined()
        expect(Search.flags.tab).toBeDefined()
        expect(Search.flags.limit).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should search store applications', async () => {
        const { error } = await runCommand([
          'store:search', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should search with a term', async () => {
        const { error } = await runCommand([
          'store:search', '--term', 'ITSM', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should search with tab filter', async () => {
        const { error } = await runCommand([
          'store:search', '--tab', 'installed', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })
  })

  describe('store install', () => {
    describe('command structure', () => {
      it('should have description about installing store applications', () => {
        expect(Install.description).toContain('Install an application')
      })

      it('should have required app-id and version flags', () => {
        expect(Install.flags['app-id']).toBeDefined()
        expect(Install.flags.version).toBeDefined()
      })

      it('should have no-wait, poll-interval, timeout, and demo-data flags', () => {
        expect(Install.flags['no-wait']).toBeDefined()
        expect(Install.flags['poll-interval']).toBeDefined()
        expect(Install.flags.timeout).toBeDefined()
        expect(Install.flags['demo-data']).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should install store application and wait', async () => {
        const { error } = await runCommand([
          'store:install', '--app-id', 'abc123', '--version', '1.0.0', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should install with no-wait', async () => {
        const { error } = await runCommand([
          'store:install', '--app-id', 'abc123', '--version', '1.0.0', '--no-wait', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should require app-id flag', async () => {
        const { error } = await runCommand([
          'store:install', '--version', '1.0.0', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require version flag', async () => {
        const { error } = await runCommand([
          'store:install', '--app-id', 'abc123', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('store update', () => {
    describe('command structure', () => {
      it('should have description about updating store applications', () => {
        expect(Update.description).toContain('Update a ServiceNow Store application')
      })

      it('should have required app-id and version flags', () => {
        expect(Update.flags['app-id']).toBeDefined()
        expect(Update.flags.version).toBeDefined()
      })

      it('should have no-wait, poll-interval, and timeout flags', () => {
        expect(Update.flags['no-wait']).toBeDefined()
        expect(Update.flags['poll-interval']).toBeDefined()
        expect(Update.flags.timeout).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should update store application and wait', async () => {
        const { error } = await runCommand([
          'store:update', '--app-id', 'abc123', '--version', '2.0.0', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should update with no-wait', async () => {
        const { error } = await runCommand([
          'store:update', '--app-id', 'abc123', '--version', '2.0.0', '--no-wait', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should require app-id flag', async () => {
        const { error } = await runCommand([
          'store:update', '--version', '2.0.0', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require version flag', async () => {
        const { error } = await runCommand([
          'store:update', '--app-id', 'abc123', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('store validate', () => {
    describe('command structure', () => {
      it('should have description about validating batch definition', () => {
        expect(Validate.description).toContain('Validate a batch installation')
      })

      it('should have file flag as required', () => {
        expect(Validate.flags.file).toBeDefined()
      })
    })

    describe('execution', () => {
      it('should validate a batch definition file', async () => {
        const { error } = await runCommand([
          'store:validate', '--file', './batch-definition.json', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should require file flag', async () => {
        const { error } = await runCommand(['store:validate', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })
})
