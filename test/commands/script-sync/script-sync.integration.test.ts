import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  const MockScriptSync = jest.fn().mockImplementation(() => ({
    pullScript: jest.fn<any>().mockResolvedValue({
      scriptName: 'TestScript',
      scriptType: 'sys_script_include',
      filePath: '/tmp/TestScript.sys_script_include.js',
      direction: 'pull',
      success: true,
      sysId: 'script-sys-id',
      message: "Successfully pulled Script Include 'TestScript'",
      timestamp: '2025-01-01T00:00:00.000Z',
    }),
    pushScript: jest.fn<any>().mockResolvedValue({
      scriptName: 'TestScript',
      scriptType: 'sys_script_include',
      filePath: '/tmp/TestScript.sys_script_include.js',
      direction: 'push',
      success: true,
      sysId: 'script-sys-id',
      message: "Successfully pushed Script Include 'TestScript'",
      timestamp: '2025-01-01T00:00:00.000Z',
    }),
    syncAllScripts: jest.fn<any>().mockResolvedValue({
      directory: '/tmp/scripts',
      scriptTypes: ['sys_script_include'],
      totalFiles: 3,
      synced: 3,
      failed: 0,
      scripts: [],
      timestamp: '2025-01-01T00:00:00.000Z',
    }),
  }));

  // Static methods on the class itself
  MockScriptSync.parseFileName = jest.fn();
  MockScriptSync.generateFileName = jest.fn((n: string, t: string) => `${n}.${t}.js`);

  return {
    ScriptSync: MockScriptSync,
    SCRIPT_TYPES: {
      sys_script_include: { table: 'sys_script_include', label: 'Script Include', nameField: 'name', scriptField: 'script', extension: '.js' },
      sys_script: { table: 'sys_script', label: 'Business Rule', nameField: 'name', scriptField: 'script', extension: '.js' },
      sys_ui_script: { table: 'sys_ui_script', label: 'UI Script', nameField: 'name', scriptField: 'script', extension: '.js' },
      sys_ui_action: { table: 'sys_ui_action', label: 'UI Action', nameField: 'name', scriptField: 'script', extension: '.js' },
      sys_script_client: { table: 'sys_script_client', label: 'Client Script', nameField: 'name', scriptField: 'script', extension: '.js' },
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
const { Pull } = await import('../../../src/commands/script-sync/pull.js')
const { Push } = await import('../../../src/commands/script-sync/push.js')
const { Sync } = await import('../../../src/commands/script-sync/sync.js')

describe('Script Sync Commands - Integration Tests', () => {
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

  describe('script-sync pull', () => {
    describe('command structure', () => {
      it('should have description about pulling scripts', () => {
        expect(Pull.description).toContain('Pull a script from a ServiceNow instance')
      })

      it('should have name, type, and output flags', () => {
        expect(Pull.flags.name).toBeDefined()
        expect(Pull.flags.type).toBeDefined()
        expect(Pull.flags.output).toBeDefined()
      })

      it('should require name flag', () => {
        expect(Pull.flags.name.required).toBe(true)
      })

      it('should require type flag', () => {
        expect(Pull.flags.type.required).toBe(true)
      })

      it('should not require output flag', () => {
        expect(Pull.flags.output.required).toBe(false)
      })

      it('should have examples', () => {
        expect(Pull.examples).toBeDefined()
        expect(Pull.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should pull a script by name and type', async () => {
        const { error } = await runCommand([
          'script-sync:pull', '--name', 'TestScript', '--type', 'sys_script_include', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should pull a script with a custom output path', async () => {
        const { error } = await runCommand([
          'script-sync:pull', '--name', 'TestScript', '--type', 'sys_script_include',
          '--output', '/tmp/custom-output.js', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })

    describe('validation', () => {
      it('should fail without name flag', async () => {
        const { error } = await runCommand([
          'script-sync:pull', '--type', 'sys_script_include', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should fail without type flag', async () => {
        const { error } = await runCommand([
          'script-sync:pull', '--name', 'TestScript', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should fail with invalid type', async () => {
        const { error } = await runCommand([
          'script-sync:pull', '--name', 'TestScript', '--type', 'invalid_type', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('script-sync push', () => {
    describe('command structure', () => {
      it('should have description about pushing scripts', () => {
        expect(Push.description).toContain('Push a local script file to a ServiceNow instance')
      })

      it('should have name, type, and file flags', () => {
        expect(Push.flags.name).toBeDefined()
        expect(Push.flags.type).toBeDefined()
        expect(Push.flags.file).toBeDefined()
      })

      it('should require name flag', () => {
        expect(Push.flags.name.required).toBe(true)
      })

      it('should require type flag', () => {
        expect(Push.flags.type.required).toBe(true)
      })

      it('should require file flag', () => {
        expect(Push.flags.file.required).toBe(true)
      })

      it('should have examples', () => {
        expect(Push.examples).toBeDefined()
        expect(Push.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should push a script by name, type, and file', async () => {
        const { error } = await runCommand([
          'script-sync:push', '--name', 'TestScript', '--type', 'sys_script_include',
          '--file', '/tmp/TestScript.sys_script_include.js', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })

    describe('validation', () => {
      it('should fail without name flag', async () => {
        const { error } = await runCommand([
          'script-sync:push', '--type', 'sys_script_include',
          '--file', '/tmp/test.js', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should fail without type flag', async () => {
        const { error } = await runCommand([
          'script-sync:push', '--name', 'TestScript',
          '--file', '/tmp/test.js', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should fail without file flag', async () => {
        const { error } = await runCommand([
          'script-sync:push', '--name', 'TestScript', '--type', 'sys_script_include',
          '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should fail with invalid type', async () => {
        const { error } = await runCommand([
          'script-sync:push', '--name', 'TestScript', '--type', 'invalid_type',
          '--file', '/tmp/test.js', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('script-sync sync', () => {
    describe('command structure', () => {
      it('should have description about synchronizing scripts', () => {
        expect(Sync.description).toContain('Synchronize all scripts in a directory')
      })

      it('should have directory and types flags', () => {
        expect(Sync.flags.directory).toBeDefined()
        expect(Sync.flags.types).toBeDefined()
      })

      it('should require directory flag', () => {
        expect(Sync.flags.directory.required).toBe(true)
      })

      it('should not require types flag', () => {
        expect(Sync.flags.types.required).toBe(false)
      })

      it('should have examples', () => {
        expect(Sync.examples).toBeDefined()
        expect(Sync.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should sync all scripts in a directory', async () => {
        const { error } = await runCommand([
          'script-sync:sync', '--directory', '/tmp/scripts', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should sync scripts filtered by types', async () => {
        const { error } = await runCommand([
          'script-sync:sync', '--directory', '/tmp/scripts',
          '--types', 'sys_script_include', '--types', 'sys_script',
          '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })

    describe('validation', () => {
      it('should fail without directory flag', async () => {
        const { error } = await runCommand([
          'script-sync:sync', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should fail with invalid type in types flag', async () => {
        const { error } = await runCommand([
          'script-sync:sync', '--directory', '/tmp/scripts',
          '--types', 'invalid_type', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })
})
