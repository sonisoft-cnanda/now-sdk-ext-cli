import { describe, it, expect } from '@jest/globals'
import { formatBatchCreateResult, formatBatchUpdateResult } from '../../src/services/batch-display.service.js'

describe('batch-display.service', () => {

  describe('formatBatchCreateResult', () => {

    describe('JSON output', () => {
      it('should return JSON string when jsonOutput is true', () => {
        const result = {
          success: true,
          createdCount: 2,
          sysIds: { item1: 'sys-001', item2: 'sys-002' },
          errors: [],
          executionTimeMs: 1500,
        }
        const lines = formatBatchCreateResult(result, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.createdCount).toBe(2)
        expect(parsed.sysIds.item1).toBe('sys-001')
      })
    })

    describe('text output', () => {
      it('should display created count', () => {
        const result = {
          success: true,
          createdCount: 3,
          sysIds: { a: '001', b: '002', c: '003' },
          errors: [],
          executionTimeMs: 2000,
        }
        const lines = formatBatchCreateResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Created:         3')
      })

      it('should display sys IDs', () => {
        const result = {
          success: true,
          createdCount: 1,
          sysIds: { myRecord: 'sys-abc' },
          errors: [],
          executionTimeMs: 500,
        }
        const lines = formatBatchCreateResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('myRecord: sys-abc')
      })

      it('should display execution time', () => {
        const result = {
          success: true,
          createdCount: 1,
          sysIds: {},
          errors: [],
          executionTimeMs: 1234,
        }
        const lines = formatBatchCreateResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('1234ms')
      })

      it('should display errors when present', () => {
        const result = {
          success: false,
          createdCount: 0,
          sysIds: {},
          errors: ['Record creation failed', 'Invalid table'],
          executionTimeMs: 100,
        }
        const lines = formatBatchCreateResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Errors (2)')
        expect(output).toContain('Record creation failed')
        expect(output).toContain('Invalid table')
      })

      it('should handle null result', () => {
        const lines = formatBatchCreateResult(null, false)
        const output = lines.join('\n')
        expect(output).toContain('No result returned')
      })

      it('should show success status', () => {
        const result = { success: true, createdCount: 1, sysIds: {}, errors: [] }
        const lines = formatBatchCreateResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Success:         true')
      })
    })
  })

  describe('formatBatchUpdateResult', () => {

    describe('JSON output', () => {
      it('should return JSON string when jsonOutput is true', () => {
        const result = {
          success: true,
          updatedCount: 5,
          errors: [],
          executionTimeMs: 3000,
        }
        const lines = formatBatchUpdateResult(result, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.updatedCount).toBe(5)
      })
    })

    describe('text output', () => {
      it('should display updated count', () => {
        const result = {
          success: true,
          updatedCount: 4,
          errors: [],
          executionTimeMs: 2500,
        }
        const lines = formatBatchUpdateResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Updated:         4')
      })

      it('should display execution time', () => {
        const result = {
          success: true,
          updatedCount: 1,
          errors: [],
          executionTimeMs: 789,
        }
        const lines = formatBatchUpdateResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('789ms')
      })

      it('should display errors when present', () => {
        const result = {
          success: false,
          updatedCount: 0,
          errors: ['Update failed for record xyz'],
          executionTimeMs: 50,
        }
        const lines = formatBatchUpdateResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Errors (1)')
        expect(output).toContain('Update failed for record xyz')
      })

      it('should handle null result', () => {
        const lines = formatBatchUpdateResult(null, false)
        const output = lines.join('\n')
        expect(output).toContain('No result returned')
      })

      it('should show success status', () => {
        const result = { success: true, updatedCount: 2, errors: [] }
        const lines = formatBatchUpdateResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Success:         true')
      })
    })
  })
})
