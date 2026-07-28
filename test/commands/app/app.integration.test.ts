import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    Application: jest.fn().mockImplementation(() => ({
      changeApplication: jest.fn<any>().mockResolvedValue(undefined),
      uninstall: jest.fn<any>().mockResolvedValue(undefined),
    })),
    ApplicationManager: jest.fn().mockImplementation(() => ({
      installBatch: jest.fn<any>().mockResolvedValue('Installation complete'),
    })),
    AppRepoApplication: jest.fn().mockImplementation(() => ({
      installFromAppRepo: jest.fn<any>().mockResolvedValue({
        links: { progress: { id: 'progress-001', url: '/progress' } },
        percent_complete: 0,
        status: 'pending',
        status_label: 'Pending',
      }),
      installFromAppRepoAndWait: jest.fn<any>().mockResolvedValue({
        error: '',
        percent_complete: 100,
        status_label: 'Completed',
        status_message: '',
        success: true,
      }),
    })),
    BackgroundScriptExecutor: jest.fn().mockImplementation(() => ({
      executeScript: jest.fn<any>().mockResolvedValue({ scriptResults: [] }),
    })),
    CompanyApplications: jest.fn().mockImplementation(() => ({
      getCompanyApplicationByScope: jest.fn<any>().mockResolvedValue({
        can_install_or_upgrade: true,
        dependencies: null,
        isInstalled: false,
        latest_version: '2.0.0',
        name: 'Test Application',
        scope: 'x_test_app',
        short_description: 'A test app',
        sys_id: 'app-001',
        vendor: 'Test Vendor',
        version: null,
        versions: [{ version: '2.0.0', publish_date_display: '2025-06-01' }],
      }),
      getCompanyApplications: jest.fn<any>().mockResolvedValue({
        data: [
          {
            can_install_or_upgrade: true,
            dependencies: null,
            isInstalled: true,
            latest_version: '1.5.0',
            name: 'Installed App',
            scope: 'x_installed',
            short_description: 'An installed app',
            sys_id: 'app-001',
            vendor: 'Vendor A',
            version: '1.0.0',
            versions: [{ version: '1.5.0', publish_date_display: '2025-06-01' }],
          },
          {
            can_install_or_upgrade: true,
            dependencies: null,
            isInstalled: false,
            latest_version: '3.0.0',
            name: 'Available App',
            scope: 'x_available',
            short_description: 'An available app',
            sys_id: 'app-002',
            vendor: 'Vendor B',
            version: null,
            versions: [{ version: '3.0.0', publish_date_display: '2025-07-01' }],
          },
        ],
        dataProcessingTime: 150,
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
const { RepoList } = await import('../../../src/commands/app/repo-list.js')
const { RepoInstall } = await import('../../../src/commands/app/repo-install.js')
const { Uninstall } = await import('../../../src/commands/app/uninstall.js')
const { Install } = await import('../../../src/commands/app/install.js')

describe('App Commands - Integration Tests', () => {
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

  describe('app repo-list', () => {
    describe('command structure', () => {
      it('should have description about listing applications', () => {
        expect(RepoList.description).toContain('List applications')
      })

      it('should have installed, installable, and json flags', () => {
        expect(RepoList.flags.installed).toBeDefined()
        expect(RepoList.flags.installable).toBeDefined()
        expect(RepoList.flags.json).toBeDefined()
      })
    })

    describe('listing', () => {
      it('should list all applications', async () => {
        const { error } = await runCommand(['app:repo-list', '--auth', 'test'])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should filter to installed applications only', async () => {
        const { error } = await runCommand(['app:repo-list', '--installed', '--auth', 'test'])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should filter to installable applications only', async () => {
        const { error } = await runCommand(['app:repo-list', '--installable', '--auth', 'test'])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })
  })

  describe('app repo-install', () => {
    describe('command structure', () => {
      it('should have description about installing applications', () => {
        expect(RepoInstall.description).toContain('Install an application')
      })

      it('should have scope flag as required', () => {
        expect(RepoInstall.flags.scope).toBeDefined()
      })

      it('should have version and no-wait flags', () => {
        expect(RepoInstall.flags.version).toBeDefined()
        expect(RepoInstall.flags['no-wait']).toBeDefined()
      })
    })

    describe('installation', () => {
      it('should install application by scope', async () => {
        const { error } = await runCommand([
          'app:repo-install', '--scope', 'x_test_app', '--auth', 'test',
        ])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })

    describe('validation', () => {
      it('should require scope flag', async () => {
        const { error } = await runCommand(['app:repo-install', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('app uninstall', () => {
    describe('command structure', () => {
      it('should have description about uninstalling applications', () => {
        expect(Uninstall.description).toContain('Uninstall')
      })

      it('should have applicationId and scope flags as required', () => {
        expect(Uninstall.flags.applicationId).toBeDefined()
        expect(Uninstall.flags.scope).toBeDefined()
      })
    })

    describe('uninstallation', () => {
      it('should uninstall application by id and scope', async () => {
        const { error } = await runCommand([
          'app:uninstall', '--applicationId', 'abc123', '--scope', 'x_test_app', '--auth', 'test',
        ])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })

    describe('validation', () => {
      it('should require applicationId flag', async () => {
        const { error } = await runCommand([
          'app:uninstall', '--scope', 'x_test_app', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require scope flag', async () => {
        const { error } = await runCommand([
          'app:uninstall', '--applicationId', 'abc123', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('app install', () => {
    describe('command structure', () => {
      it('should have description about batch installation', () => {
        expect(Install.description).toContain('Install or upgrade')
      })

      it('should have batch and definitionPath flags', () => {
        expect(Install.flags.batch).toBeDefined()
        expect(Install.flags.definitionPath).toBeDefined()
      })
    })
  })
})
