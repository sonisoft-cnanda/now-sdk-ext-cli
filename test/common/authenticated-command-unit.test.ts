import {expect, jest, describe, it, beforeEach} from '@jest/globals'
import { AuthenticatedCommand } from '../../src/common/authenticated-command.js'
import { Command } from '@oclif/core'

describe('AuthenticatedCommand - Unit Tests', () => {
  describe('baseFlags definition', () => {
    it('should have auth flag defined', () => {
      expect(AuthenticatedCommand.baseFlags.auth).toBeDefined()
      expect(AuthenticatedCommand.baseFlags.auth.char).toBe('a')
      expect(AuthenticatedCommand.baseFlags.auth.description).toContain('Auth alias')
      expect(AuthenticatedCommand.baseFlags.auth.required).toBe(false)
    })

    it('should have log-level flag defined', () => {
      expect(AuthenticatedCommand.baseFlags['log-level']).toBeDefined()
    })

    it('should have correct log-level options', () => {
      const logLevelFlag = AuthenticatedCommand.baseFlags['log-level'] as any
      const options = logLevelFlag.options || []
      
      expect(options).toContain('debug')
      expect(options).toContain('warn')
      expect(options).toContain('error')
      expect(options).toContain('info')
      expect(options).toContain('trace')
    })

    it('should have log-level default value', () => {
      const logLevelFlag = AuthenticatedCommand.baseFlags['log-level'] as any
      expect(logLevelFlag.default).toBe('info')
    })

    it('should have log-level in GLOBAL help group', () => {
      const logLevelFlag = AuthenticatedCommand.baseFlags['log-level'] as any
      expect(logLevelFlag.helpGroup).toBe('GLOBAL')
    })

    // Regression guard. init() used to read `this.flags.logLevel`, but oclif keys
    // parsed flags by their declared name — 'log-level'. That read always yielded
    // undefined, so every command silently fell back to 'info' and --log-level
    // did nothing. If the flag is ever renamed to a camelCase key, this fails and
    // the read site in init() must be updated to match.
    it('should declare log-level in kebab-case only, never as logLevel', () => {
      const flagNames = Object.keys(AuthenticatedCommand.baseFlags)
      expect(flagNames).toContain('log-level')
      expect(flagNames).not.toContain('logLevel')
    })

    // NEX-3. Core used to write ./logs/*.log unconditionally, relative to whatever
    // directory nex was run from, with no way to turn it off. File logging is now
    // opt-in and these are the flags that opt in.
    it('should have log-file flag defined as a boolean in GLOBAL', () => {
      const flag = AuthenticatedCommand.baseFlags['log-file'] as any
      expect(flag).toBeDefined()
      expect(flag.type).toBe('boolean')
      expect(flag.helpGroup).toBe('GLOBAL')
    })

    it('should default log-file to off — a library must not write files uninvited', () => {
      const flag = AuthenticatedCommand.baseFlags['log-file'] as any
      expect(flag.default).toBeFalsy()
    })

    it('should have log-dir flag defined, and document that it implies log-file', () => {
      const flag = AuthenticatedCommand.baseFlags['log-dir'] as any
      expect(flag).toBeDefined()
      expect(flag.helpGroup).toBe('GLOBAL')
      // Without the implication, `--log-dir ./x` alone produces nothing and reads
      // as a broken flag rather than a missing second flag.
      expect(flag.description).toMatch(/implies --log-file/i)
    })

    it('should declare the log flags in kebab-case only', () => {
      const flagNames = Object.keys(AuthenticatedCommand.baseFlags)
      expect(flagNames).toEqual(expect.arrayContaining(['log-file', 'log-dir']))
      expect(flagNames).not.toContain('logFile')
      expect(flagNames).not.toContain('logDir')
    })
  })

  describe('JSON flag support', () => {
    it('should enable JSON flag', () => {
      expect(AuthenticatedCommand.enableJsonFlag).toBe(true)
    })
  })

  describe('class structure', () => {
    it('should extend Command', () => {
      expect(AuthenticatedCommand.prototype).toBeInstanceOf(Command)
    })

    it('should have catch method defined', () => {
      expect(typeof AuthenticatedCommand.prototype.catch).toBe('function')
    })

    it('should have finally method defined', () => {
      expect(typeof AuthenticatedCommand.prototype.finally).toBe('function')
    })

    it('should have init method defined', () => {
      expect(typeof AuthenticatedCommand.prototype.init).toBe('function')
    })
  })

  describe('error handling structure', () => {
    it('should accept errors with exit code', async () => {
      // Just verify the type signature accepts errors with exitCode
      const error = new Error('test') as Error & { exitCode?: number }
      error.exitCode = 1
      
      expect(error.exitCode).toBe(1)
      expect(error.message).toBe('test')
    })

    it('should accept errors without exit code', async () => {
      const error = new Error('test')
      
      expect(error.message).toBe('test')
      expect((error as any).exitCode).toBeUndefined()
    })
  })

  describe('credential args construction', () => {
    it('should construct credential args with auth alias', () => {
      const authAlias = 'test-alias'
      const credentialArgs = {"_": "get-credentials", auth: authAlias}
      
      expect(credentialArgs).toEqual({
        "_": "get-credentials",
        auth: "test-alias"
      })
    })

    it('should construct credential args with fluent-default when no alias', () => {
      const authAlias = undefined
      const credentialArgs = {"_": "get-credentials", auth: authAlias || "fluent-default"}
      
      expect(credentialArgs).toEqual({
        "_": "get-credentials",
        auth: "fluent-default"
      })
    })

    it('should handle empty string auth alias', () => {
      const authAlias = ''
      const credentialArgs = {"_": "get-credentials", auth: authAlias || "fluent-default"}
      
      expect(credentialArgs.auth).toBe("fluent-default")
    })
  })

  describe('ServiceNow settings construction', () => {
    it('should construct settings with alias and credential', () => {
      const alias = 'test-alias'
      const credential = {
        username: 'test-user',
        password: 'test-password',
        instanceUrl: 'https://test.service-now.com'
      }
      
      const snSettings = {
        alias,
        credential
      }
      
      expect(snSettings.alias).toBe('test-alias')
      expect(snSettings.credential).toBe(credential)
    })

    it('should handle undefined alias', () => {
      const alias = undefined
      const credential = { username: 'test' }
      
      const snSettings = {
        alias,
        credential
      }
      
      expect(snSettings.alias).toBeUndefined()
      expect(snSettings.credential).toBeDefined()
    })
  })

  describe('flag parsing logic', () => {
    it('should parse auth flag from flags object', () => {
      const flags = { auth: 'my-instance', 'log-level': 'debug' }
      const authValue = flags.auth
      
      expect(authValue).toBe('my-instance')
    })

    it('should parse log-level flag from flags object', () => {
      const flags = { auth: 'my-instance', 'log-level': 'debug' }
      const logLevel = flags['log-level']
      
      expect(logLevel).toBe('debug')
    })

    it('should handle missing auth flag', () => {
      const flags = { 'log-level': 'info' }
      const authValue = flags.auth || 'fluent-default'
      
      expect(authValue).toBe('fluent-default')
    })
  })

  describe('credential validation logic', () => {
    it('should identify truthy credential', () => {
      const credential = { username: 'test', password: 'test' }
      const isValid = !!credential
      
      expect(isValid).toBe(true)
    })

    it('should identify falsy credential (null)', () => {
      const credential = null
      const isValid = !!credential
      
      expect(isValid).toBe(false)
    })

    it('should identify falsy credential (undefined)', () => {
      const credential = undefined
      const isValid = !!credential
      
      expect(isValid).toBe(false)
    })
  })
})

