import {expect, jest, test, describe, beforeEach, afterEach, it} from '@jest/globals'
import fs from 'node:fs'

// Mock the external dependencies using manual mocks — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core')
jest.mock('@servicenow/sdk-cli/dist/auth/index.js')

// Dynamic imports — loaded after mocks are registered
const { Log } = await import('../../../src/commands/log/index.js')
const { SyslogReader } = await import('@sonisoft/now-sdk-ext-core')

describe('Log Command - Execution Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // Display method tests (displayHeader, displayLog, highlightKeywords) have been
  // migrated to test/services/log-formatter.service.test.ts

  describe('Exit Handling', () => {
    let command: Log
    let consoleSpy: jest.SpyInstance
    let exitSpy: jest.SpyInstance
    let mockReader: SyslogReader
    let stopTailingSpy: jest.SpyInstance

    beforeEach(() => {
      mockReader = new SyslogReader()
      // Spy on the stopTailing method
      stopTailingSpy = jest.spyOn(mockReader, 'stopTailing')
      
      command = new Log([], {} as any)
      ;(command as any).syslogReader = mockReader
      ;(command as any).flags = { 'no-color': false }
      consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    })

    afterEach(() => {
      consoleSpy.mockRestore()
      exitSpy.mockRestore()
      stopTailingSpy.mockRestore()
    })

    it('should stop tailing on exit', () => {
      ;(command as any).handleExit()

      expect(stopTailingSpy).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('should display colored exit message by default', () => {
      ;(command as any).handleExit()

      expect(consoleSpy).toHaveBeenCalled()
      expect(stopTailingSpy).toHaveBeenCalled()
    })

    it('should display non-colored exit message with no-color flag', () => {
      ;(command as any).flags = { 'no-color': true }
      ;(command as any).handleExit()

      expect(consoleSpy).toHaveBeenCalled()
      expect(stopTailingSpy).toHaveBeenCalled()
    })

    it('should not fail if syslogReader is not initialized', () => {
      ;(command as any).syslogReader = null
      
      expect(() => {
        ;(command as any).handleExit()
      }).not.toThrow()

      expect(exitSpy).toHaveBeenCalledWith(0)
    })
  })

  describe('Tailing Method Selection', () => {
    it('should have ChannelAjax method available on SyslogReader', () => {
      const reader = new SyslogReader()
      
      expect(reader.startTailingWithChannelAjax).toBeDefined()
      expect(typeof reader.startTailingWithChannelAjax).toBe('function')
    })

    it('should have regular tailing method available', () => {
      const reader = new SyslogReader()
      
      expect(reader.startTailing).toBeDefined()
      expect(typeof reader.startTailing).toBe('function')
    })
  })

  describe('Flag Handling', () => {
    it('should use custom interval when specified', () => {
      expect(Log.flags.interval.default).toBe(1000)
    })

    it('should support no-color flag', () => {
      expect(Log.flags['no-color']).toBeDefined()
      expect(Log.flags['no-color'].default).toBe(false)
    })

    it('should support output flag', () => {
      expect(Log.flags.output).toBeDefined()
      expect(Log.flags.output.char).toBe('o')
    })
  })
})

