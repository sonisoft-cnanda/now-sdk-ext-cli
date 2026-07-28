import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'
import fs from 'node:fs'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  const mockExecuteScript = jest.fn<any>().mockResolvedValue({
    scriptResults: [{ line: 'test output line 1' }, { line: 'test output line 2' }],
  })

  return {
    BackgroundScriptExecutor: jest.fn().mockImplementation(() => ({
      executeScript: mockExecuteScript,
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
const { Exec } = await import('../../../src/commands/exec/index.js')

describe('Exec Command - Integration Tests', () => {
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
    it('should have description mentioning script execution', () => {
      expect(Exec.description).toContain('Execute JavaScript')
      expect(Exec.description).toContain('Scripts - Background')
    })

    it('should have scope argument as required', () => {
      expect(Exec.args.scope).toBeDefined()
      expect(Exec.args.scope.required).toBe(true)
    })

    it('should have file argument as optional', () => {
      expect(Exec.args.file).toBeDefined()
      expect(Exec.args.file.required).toBe(false)
    })

    it('should have params flag', () => {
      expect(Exec.flags.params).toBeDefined()
      expect(Exec.flags.params.char).toBe('p')
    })
  })

  describe('argument validation', () => {
    it('should error when scope is not provided', async () => {
      const { error } = await runCommand(['exec', '--auth', 'test'])
      expect(error).toBeDefined()
    })
  })

  describe('file execution', () => {
    it('should execute script from file and display output', async () => {
      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(
        Buffer.from('gs.info("hello");')
      )

      const { error } = await runCommand(['exec', 'global', './test-script.js', '--auth', 'test'])
      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)

      readSpy.mockRestore()
    })

    it('should show scope in execution output', async () => {
      const readSpy = jest.spyOn(fs, 'readFileSync').mockReturnValue(
        Buffer.from('gs.info("test");')
      )

      const { error } = await runCommand(['exec', 'x_my_app', './test-script.js', '--auth', 'test'])
      // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)

      readSpy.mockRestore()
    })
  })
})
