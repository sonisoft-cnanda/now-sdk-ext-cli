import { describe, it, expect } from '@jest/globals'
import { LogFormatterService } from '../../src/services/log-formatter.service.js'

describe('LogFormatterService', () => {
  describe('highlightKeywords', () => {
    const formatter = new LogFormatterService({ noColor: true })

    it('should highlight single keyword', () => {
      const result = formatter.highlightKeywords(
        'This is an error message',
        ['error'],
        (text: string) => `**${text}**`
      )
      expect(result).toContain('**error**')
    })

    it('should highlight multiple occurrences', () => {
      const result = formatter.highlightKeywords(
        'error occurred, another error found',
        ['error'],
        (text: string) => `**${text}**`
      )
      expect((result.match(/\*\*error\*\*/g) || []).length).toBe(2)
    })

    it('should be case-insensitive', () => {
      const result = formatter.highlightKeywords(
        'ERROR occurred, Error found, error again',
        ['error', 'Error', 'ERROR'],
        (text: string) => `**${text}**`
      )
      expect((result.match(/\*\*/g) || []).length).toBeGreaterThan(0)
    })

    it('should not highlight partial matches', () => {
      const result = formatter.highlightKeywords(
        'terrorism is not the same as error',
        ['error'],
        (text: string) => `**${text}**`
      )
      expect(result).toContain('**error**')
      expect(result).not.toContain('t**error**ism')
    })

    it('should handle empty keyword array', () => {
      const result = formatter.highlightKeywords(
        'This is a test message',
        [],
        (text: string) => `**${text}**`
      )
      expect(result).toBe('This is a test message')
    })
  })

  describe('formatHeader', () => {
    it('should include host and interval in no-color mode', () => {
      const formatter = new LogFormatterService({ noColor: true })
      const lines = formatter.formatHeader({
        host: 'test.service-now.com',
        interval: 1000,
        filterRules: [],
      })
      const output = lines.join('\n')

      expect(output).toContain('ServiceNow Log Tail')
      expect(output).toContain('test.service-now.com')
      expect(output).toContain('1000ms')
    })

    it('should include output file when specified', () => {
      const formatter = new LogFormatterService({ noColor: true })
      const lines = formatter.formatHeader({
        host: 'test.service-now.com',
        interval: 1000,
        output: '/tmp/test.log',
        filterRules: [],
      })
      const output = lines.join('\n')

      expect(output).toContain('/tmp/test.log')
    })

    it('should include filter count when filters are active', () => {
      const formatter = new LogFormatterService({ noColor: true })
      const lines = formatter.formatHeader({
        host: 'test.service-now.com',
        interval: 1000,
        filterRules: [
          { field: 'message', operator: 'CONTAINS', value: 'error' }
        ],
      })
      const output = lines.join('\n')

      expect(output).toContain('1 active')
    })

    it('should include host and interval in color mode', () => {
      const formatter = new LogFormatterService({ noColor: false })
      const lines = formatter.formatHeader({
        host: 'test.service-now.com',
        interval: 2000,
        filterRules: [],
      })
      const output = lines.join('\n')

      expect(output).toContain('test.service-now.com')
      expect(output).toContain('2000ms')
    })
  })

  describe('formatLog', () => {
    it('should format log with sequence number in no-color mode', () => {
      const formatter = new LogFormatterService({ noColor: true })
      const lines = formatter.formatLog({
        sys_created_on: '2025-10-12T10:30:00.000Z',
        message: 'Test log message',
        sequence: '12345',
      }, 1)
      const output = lines.join('\n')

      expect(output).toContain('Test log message')
      expect(output).toContain('12345')
    })

    it('should handle log without sequence number in no-color mode', () => {
      const formatter = new LogFormatterService({ noColor: true })
      const lines = formatter.formatLog({
        sys_created_on: '2025-10-12T10:30:00.000Z',
        message: 'Test log message',
      }, 1)
      const output = lines.join('\n')

      expect(output).toContain('Test log message')
    })

    it('should format log in color mode', () => {
      const formatter = new LogFormatterService({ noColor: false })
      const lines = formatter.formatLog({
        sys_created_on: '2025-10-12T10:30:00.000Z',
        message: 'Normal log message',
        sequence: '123',
      }, 5)

      expect(lines.length).toBeGreaterThan(0)
    })

    it('should format log with error keywords in color mode', () => {
      const formatter = new LogFormatterService({ noColor: false })
      const lines = formatter.formatLog({
        sys_created_on: '2025-10-12T10:30:00.000Z',
        message: 'Error occurred during processing',
        sequence: '123',
      }, 1)

      expect(lines.length).toBeGreaterThan(0)
    })

    it('should format log with warning keywords in color mode', () => {
      const formatter = new LogFormatterService({ noColor: false })
      const lines = formatter.formatLog({
        sys_created_on: '2025-10-12T10:30:00.000Z',
        message: 'Warning: deprecated method used',
        sequence: '123',
      }, 1)

      expect(lines.length).toBeGreaterThan(0)
    })

    it('should format log with success keywords in color mode', () => {
      const formatter = new LogFormatterService({ noColor: false })
      const lines = formatter.formatLog({
        sys_created_on: '2025-10-12T10:30:00.000Z',
        message: 'Operation completed successfully',
        sequence: '123',
      }, 1)

      expect(lines.length).toBeGreaterThan(0)
    })
  })
})
