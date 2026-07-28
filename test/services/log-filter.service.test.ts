import { describe, it, expect } from '@jest/globals'
import { LogFilterService } from '../../src/services/log-filter.service.js'

describe('LogFilterService', () => {
  const service = new LogFilterService()

  describe('parseFilter', () => {
    it('should parse filter with explicit field name', () => {
      expect(service.parseFilter('message CONTAINS test')).toEqual({
        field: 'message', operator: 'CONTAINS', value: 'test'
      })
    })

    it('should default to message field when no field specified', () => {
      expect(service.parseFilter('CONTAINS test')).toEqual({
        field: 'message', operator: 'CONTAINS', value: 'test'
      })
    })

    it('should parse CONTAINS_CI operator', () => {
      expect(service.parseFilter('message CONTAINS_CI error')).toEqual({
        field: 'message', operator: 'CONTAINS_CI', value: 'error'
      })
    })

    it('should parse EQUALS operator', () => {
      expect(service.parseFilter('level EQUALS ERROR')).toEqual({
        field: 'level', operator: 'EQUALS', value: 'ERROR'
      })
    })

    it('should parse STARTS_WITH operator', () => {
      expect(service.parseFilter('message STARTS_WITH [ERROR]')).toEqual({
        field: 'message', operator: 'STARTS_WITH', value: '[ERROR]'
      })
    })

    it('should parse ENDS_WITH operator', () => {
      expect(service.parseFilter('message ENDS_WITH exception')).toEqual({
        field: 'message', operator: 'ENDS_WITH', value: 'exception'
      })
    })

    it('should parse REGEX operator', () => {
      expect(service.parseFilter('message REGEX .*error.*')).toEqual({
        field: 'message', operator: 'REGEX', value: '.*error.*'
      })
    })

    it('should parse NOT_CONTAINS operator', () => {
      expect(service.parseFilter('message NOT_CONTAINS success')).toEqual({
        field: 'message', operator: 'NOT_CONTAINS', value: 'success'
      })
    })

    it('should parse filter with value containing spaces', () => {
      expect(service.parseFilter('message CONTAINS this is a test')).toEqual({
        field: 'message', operator: 'CONTAINS', value: 'this is a test'
      })
    })

    it('should throw error for missing operator', () => {
      expect(() => service.parseFilter('message test')).toThrow('Invalid filter format')
    })

    it('should throw error for empty value', () => {
      expect(() => service.parseFilter('message CONTAINS')).toThrow('cannot be empty')
    })

    it('should handle custom field names', () => {
      expect(service.parseFilter('sys_created_by EQUALS admin')).toEqual({
        field: 'sys_created_by', operator: 'EQUALS', value: 'admin'
      })
    })
  })

  describe('matchesFilter - CONTAINS operators', () => {
    it('should match with CONTAINS (case-sensitive)', () => {
      expect(service.matchesFilter(
        { message: 'This is an Error message' },
        { field: 'message', operator: 'CONTAINS', value: 'Error' }
      )).toBe(true)
    })

    it('should not match with CONTAINS when case differs', () => {
      expect(service.matchesFilter(
        { message: 'This is an error message' },
        { field: 'message', operator: 'CONTAINS', value: 'Error' }
      )).toBe(false)
    })

    it('should match with CONTAINS_CI (case-insensitive)', () => {
      expect(service.matchesFilter(
        { message: 'This is an ERROR message' },
        { field: 'message', operator: 'CONTAINS_CI', value: 'error' }
      )).toBe(true)
    })

    it('should match partial strings with CONTAINS', () => {
      expect(service.matchesFilter(
        { message: 'x_acme_app.process' },
        { field: 'message', operator: 'CONTAINS', value: 'x_acme_app' }
      )).toBe(true)
    })

    it('should not match when substring is not present', () => {
      expect(service.matchesFilter(
        { message: 'This is a test message' },
        { field: 'message', operator: 'CONTAINS', value: 'error' }
      )).toBe(false)
    })
  })

  describe('matchesFilter - EQUALS operators', () => {
    it('should match exact strings with EQUALS', () => {
      expect(service.matchesFilter(
        { level: 'ERROR' },
        { field: 'level', operator: 'EQUALS', value: 'ERROR' }
      )).toBe(true)
    })

    it('should not match with EQUALS when case differs', () => {
      expect(service.matchesFilter(
        { level: 'error' },
        { field: 'level', operator: 'EQUALS', value: 'ERROR' }
      )).toBe(false)
    })

    it('should match with EQUALS_CI (case-insensitive)', () => {
      expect(service.matchesFilter(
        { level: 'error' },
        { field: 'level', operator: 'EQUALS_CI', value: 'ERROR' }
      )).toBe(true)
    })

    it('should not match partial strings with EQUALS', () => {
      expect(service.matchesFilter(
        { level: 'ERROR_WARNING' },
        { field: 'level', operator: 'EQUALS', value: 'ERROR' }
      )).toBe(false)
    })
  })

  describe('matchesFilter - STARTS_WITH operators', () => {
    it('should match strings starting with prefix', () => {
      expect(service.matchesFilter(
        { message: '[ERROR] Something went wrong' },
        { field: 'message', operator: 'STARTS_WITH', value: '[ERROR]' }
      )).toBe(true)
    })

    it('should not match when prefix is not at start', () => {
      expect(service.matchesFilter(
        { message: 'Something [ERROR] went wrong' },
        { field: 'message', operator: 'STARTS_WITH', value: '[ERROR]' }
      )).toBe(false)
    })

    it('should match with STARTS_WITH_CI (case-insensitive)', () => {
      expect(service.matchesFilter(
        { message: 'error: Something went wrong' },
        { field: 'message', operator: 'STARTS_WITH_CI', value: 'ERROR:' }
      )).toBe(true)
    })
  })

  describe('matchesFilter - ENDS_WITH operators', () => {
    it('should match strings ending with suffix', () => {
      expect(service.matchesFilter(
        { message: 'Something went wrong - exception' },
        { field: 'message', operator: 'ENDS_WITH', value: 'exception' }
      )).toBe(true)
    })

    it('should not match when suffix is not at end', () => {
      expect(service.matchesFilter(
        { message: 'exception occurred in process' },
        { field: 'message', operator: 'ENDS_WITH', value: 'exception' }
      )).toBe(false)
    })

    it('should match with ENDS_WITH_CI (case-insensitive)', () => {
      expect(service.matchesFilter(
        { message: 'Something went wrong - EXCEPTION' },
        { field: 'message', operator: 'ENDS_WITH_CI', value: 'exception' }
      )).toBe(true)
    })
  })

  describe('matchesFilter - REGEX operator', () => {
    it('should match with valid regex pattern', () => {
      expect(service.matchesFilter(
        { message: 'Error in x_acme_app module' },
        { field: 'message', operator: 'REGEX', value: '.*x_acme.*' }
      )).toBe(true)
    })

    it('should match complex regex patterns', () => {
      expect(service.matchesFilter(
        { message: 'ERROR: code 500' },
        { field: 'message', operator: 'REGEX', value: 'ERROR: code [0-9]+' }
      )).toBe(true)
    })

    it('should not match when regex does not match', () => {
      expect(service.matchesFilter(
        { message: 'Success message' },
        { field: 'message', operator: 'REGEX', value: '^Error.*' }
      )).toBe(false)
    })

    it('should handle invalid regex gracefully', () => {
      expect(service.matchesFilter(
        { message: 'test message' },
        { field: 'message', operator: 'REGEX', value: '[invalid(' }
      )).toBe(false)
    })
  })

  describe('matchesFilter - NOT operators', () => {
    it('should match with NOT_CONTAINS when substring is absent', () => {
      expect(service.matchesFilter(
        { message: 'Success message' },
        { field: 'message', operator: 'NOT_CONTAINS', value: 'error' }
      )).toBe(true)
    })

    it('should not match with NOT_CONTAINS when substring is present', () => {
      expect(service.matchesFilter(
        { message: 'Error occurred' },
        { field: 'message', operator: 'NOT_CONTAINS', value: 'Error' }
      )).toBe(false)
    })

    it('should match with NOT_CONTAINS_CI (case-insensitive)', () => {
      expect(service.matchesFilter(
        { message: 'Success message' },
        { field: 'message', operator: 'NOT_CONTAINS_CI', value: 'ERROR' }
      )).toBe(true)
    })

    it('should match with NOT_EQUALS', () => {
      expect(service.matchesFilter(
        { level: 'INFO' },
        { field: 'level', operator: 'NOT_EQUALS', value: 'ERROR' }
      )).toBe(true)
    })

    it('should not match with NOT_EQUALS when values are equal', () => {
      expect(service.matchesFilter(
        { level: 'ERROR' },
        { field: 'level', operator: 'NOT_EQUALS', value: 'ERROR' }
      )).toBe(false)
    })
  })

  describe('matchesFilter - edge cases', () => {
    it('should handle null values', () => {
      expect(service.matchesFilter(
        { message: null },
        { field: 'message', operator: 'CONTAINS', value: 'test' }
      )).toBe(false)
    })

    it('should handle undefined values', () => {
      expect(service.matchesFilter(
        { message: undefined },
        { field: 'message', operator: 'CONTAINS', value: 'test' }
      )).toBe(false)
    })

    it('should handle missing fields', () => {
      expect(service.matchesFilter(
        { other: 'value' },
        { field: 'message', operator: 'CONTAINS', value: 'test' }
      )).toBe(false)
    })

    it('should handle numeric values', () => {
      expect(service.matchesFilter(
        { count: 123 },
        { field: 'count', operator: 'CONTAINS', value: '12' }
      )).toBe(true)
    })

    it('should handle empty string values', () => {
      expect(service.matchesFilter(
        { message: '' },
        { field: 'message', operator: 'CONTAINS', value: 'test' }
      )).toBe(false)
    })

    it('should handle empty string in filter value', () => {
      expect(service.matchesFilter(
        { message: 'test message' },
        { field: 'message', operator: 'CONTAINS', value: '' }
      )).toBe(true)
    })
  })

  describe('matchesFilters', () => {
    it('should match when all filters match (AND logic)', () => {
      const log = { message: 'Error in x_acme_app module', level: 'ERROR' }
      const rules = [
        { field: 'message', operator: 'CONTAINS' as const, value: 'x_acme_app' },
        { field: 'message', operator: 'CONTAINS' as const, value: 'Error' },
        { field: 'level', operator: 'EQUALS' as const, value: 'ERROR' }
      ]
      expect(service.matchesFilters(log, rules)).toBe(true)
    })

    it('should not match when any filter fails (AND logic)', () => {
      const log = { message: 'Error in x_acme_app module', level: 'WARNING' }
      const rules = [
        { field: 'message', operator: 'CONTAINS' as const, value: 'x_acme_app' },
        { field: 'level', operator: 'EQUALS' as const, value: 'ERROR' }
      ]
      expect(service.matchesFilters(log, rules)).toBe(false)
    })

    it('should match all logs when no filters are set', () => {
      expect(service.matchesFilters({ message: 'Any message' }, [])).toBe(true)
    })
  })

  describe('real-world scenarios', () => {
    it('should filter logs for specific application scope', () => {
      const rule = { field: 'message', operator: 'CONTAINS' as const, value: 'x_acme_app' }
      expect(service.matchesFilter({ message: 'x_acme_app: processing request' }, rule)).toBe(true)
      expect(service.matchesFilter({ message: 'global: processing request' }, rule)).toBe(false)
    })

    it('should filter errors from specific application', () => {
      const rules = [
        { field: 'message', operator: 'CONTAINS_CI' as const, value: 'error' },
        { field: 'message', operator: 'CONTAINS' as const, value: 'x_acme_app' }
      ]
      expect(service.matchesFilters(
        { message: 'Error in x_acme_app: database connection failed', level: 'ERROR' },
        rules
      )).toBe(true)
    })

    it('should exclude debug messages', () => {
      const rule = { field: 'message', operator: 'NOT_CONTAINS' as const, value: 'DEBUG' }
      expect(service.matchesFilter({ message: 'DEBUG: Some debug info' }, rule)).toBe(false)
      expect(service.matchesFilter({ message: 'ERROR: Something went wrong' }, rule)).toBe(true)
    })

    it('should filter by log level pattern', () => {
      const rule = { field: 'message', operator: 'REGEX' as const, value: '\\[(ERROR|WARN|FATAL)\\]' }
      expect(service.matchesFilter({ message: '[ERROR] Database connection failed' }, rule)).toBe(true)
      expect(service.matchesFilter({ message: '[INFO] Request processed successfully' }, rule)).toBe(false)
    })
  })
})
