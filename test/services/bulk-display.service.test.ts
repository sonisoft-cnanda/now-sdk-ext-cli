import { describe, it, expect } from '@jest/globals'
import { BulkDisplayService } from '../../src/services/bulk-display.service.js'

describe('BulkDisplayService', () => {
  const service = new BulkDisplayService()

  describe('formatUpdateResult', () => {
    const dryRunResult = {
      dryRun: true,
      matchCount: 5,
      updatedCount: 0,
      success: true,
      errors: [],
      executionTimeMs: 250,
    }

    const confirmedResult = {
      dryRun: false,
      matchCount: 5,
      updatedCount: 5,
      success: true,
      errors: [],
      executionTimeMs: 1200,
    }

    describe('JSON output', () => {
      it('should return result as JSON string with table name', () => {
        const lines = service.formatUpdateResult(dryRunResult, 'incident', true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.table).toBe('incident')
        expect(parsed.dryRun).toBe(true)
        expect(parsed.matchCount).toBe(5)
        expect(parsed.updatedCount).toBe(0)
      })

      it('should include confirmed result data in JSON', () => {
        const lines = service.formatUpdateResult(confirmedResult, 'incident', true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.dryRun).toBe(false)
        expect(parsed.updatedCount).toBe(5)
        expect(parsed.success).toBe(true)
      })
    })

    describe('text output — dry run', () => {
      it('should display dry run header', () => {
        const lines = service.formatUpdateResult(dryRunResult, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('Dry Run')
        expect(output).toContain('incident')
      })

      it('should display match count', () => {
        const lines = service.formatUpdateResult(dryRunResult, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('Records matching query:  5')
      })

      it('should show no-changes message and re-run hint', () => {
        const lines = service.formatUpdateResult(dryRunResult, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('No changes were made (dry run)')
        expect(output).toContain('--confirm')
      })

      it('should display execution time', () => {
        const lines = service.formatUpdateResult(dryRunResult, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('250ms')
      })
    })

    describe('text output — confirmed', () => {
      it('should display confirmed header (no dry run label)', () => {
        const lines = service.formatUpdateResult(confirmedResult, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('Bulk Update on "incident"')
        expect(output).not.toContain('Dry Run')
      })

      it('should display matched and updated counts', () => {
        const lines = service.formatUpdateResult(confirmedResult, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('Records matched:   5')
        expect(output).toContain('Records updated:   5')
      })

      it('should display success status with check mark', () => {
        const lines = service.formatUpdateResult(confirmedResult, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('\u2714')
        expect(output).toContain('Success')
      })

      it('should display errors when present', () => {
        const withErrors = {
          ...confirmedResult,
          updatedCount: 3,
          success: false,
          errors: [
            { sysId: 'rec-001', error: 'Permission denied' },
            { sysId: 'rec-002', error: 'Record locked' },
          ],
        }
        const lines = service.formatUpdateResult(withErrors, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('\u2718')
        expect(output).toContain('Completed with errors')
        expect(output).toContain('Errors (2)')
        expect(output).toContain('rec-001: Permission denied')
        expect(output).toContain('rec-002: Record locked')
      })
    })
  })

  describe('formatDeleteResult', () => {
    const dryRunResult = {
      dryRun: true,
      matchCount: 3,
      deletedCount: 0,
      success: true,
      errors: [],
      executionTimeMs: 180,
    }

    const confirmedResult = {
      dryRun: false,
      matchCount: 3,
      deletedCount: 3,
      success: true,
      errors: [],
      executionTimeMs: 900,
    }

    describe('JSON output', () => {
      it('should return result as JSON string with table name', () => {
        const lines = service.formatDeleteResult(dryRunResult, 'u_temp', true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.table).toBe('u_temp')
        expect(parsed.dryRun).toBe(true)
        expect(parsed.matchCount).toBe(3)
      })

      it('should include confirmed result data in JSON', () => {
        const lines = service.formatDeleteResult(confirmedResult, 'u_temp', true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.deletedCount).toBe(3)
        expect(parsed.success).toBe(true)
      })
    })

    describe('text output — dry run', () => {
      it('should display dry run header', () => {
        const lines = service.formatDeleteResult(dryRunResult, 'u_temp', false)
        const output = lines.join('\n')

        expect(output).toContain('Dry Run')
        expect(output).toContain('u_temp')
      })

      it('should display match count', () => {
        const lines = service.formatDeleteResult(dryRunResult, 'u_temp', false)
        const output = lines.join('\n')

        expect(output).toContain('Records matching query:  3')
      })

      it('should show no-delete message and re-run hint', () => {
        const lines = service.formatDeleteResult(dryRunResult, 'u_temp', false)
        const output = lines.join('\n')

        expect(output).toContain('No records were deleted (dry run)')
        expect(output).toContain('--confirm')
      })
    })

    describe('text output — confirmed', () => {
      it('should display confirmed header', () => {
        const lines = service.formatDeleteResult(confirmedResult, 'u_temp', false)
        const output = lines.join('\n')

        expect(output).toContain('Bulk Delete on "u_temp"')
        expect(output).not.toContain('Dry Run')
      })

      it('should display matched and deleted counts', () => {
        const lines = service.formatDeleteResult(confirmedResult, 'u_temp', false)
        const output = lines.join('\n')

        expect(output).toContain('Records matched:   3')
        expect(output).toContain('Records deleted:   3')
      })

      it('should display success status', () => {
        const lines = service.formatDeleteResult(confirmedResult, 'u_temp', false)
        const output = lines.join('\n')

        expect(output).toContain('\u2714')
        expect(output).toContain('Success')
      })

      it('should display errors when present', () => {
        const withErrors = {
          ...confirmedResult,
          deletedCount: 1,
          success: false,
          errors: [
            { sysId: 'rec-001', error: 'Record protected' },
          ],
        }
        const lines = service.formatDeleteResult(withErrors, 'u_temp', false)
        const output = lines.join('\n')

        expect(output).toContain('\u2718')
        expect(output).toContain('Errors (1)')
        expect(output).toContain('rec-001: Record protected')
      })
    })
  })
})
