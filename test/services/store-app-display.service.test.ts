import { describe, it, expect } from '@jest/globals'
import { formatSearchResults, formatInstallResult, formatValidationResult } from '../../src/services/store-app-display.service.js'

describe('store-app-display.service', () => {

  describe('formatSearchResults', () => {

    describe('JSON output', () => {
      it('should return JSON string when jsonOutput is true', () => {
        const results = {
          apps: [
            { name: 'Test App', scope: 'x_test', version: '1.0.0', vendor: 'Test Vendor', sys_id: 'app-001' },
          ],
          total: 1,
        }
        const lines = formatSearchResults(results, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.total).toBe(1)
        expect(parsed.apps).toHaveLength(1)
        expect(parsed.apps[0].name).toBe('Test App')
      })
    })

    describe('text output', () => {
      it('should display application count', () => {
        const results = {
          apps: [
            { name: 'App One', scope: 'x_one', version: '1.0.0', vendor: 'Vendor A', sys_id: 'a1' },
            { name: 'App Two', scope: 'x_two', version: '2.0.0', vendor: 'Vendor B', sys_id: 'a2' },
          ],
          total: 2,
        }
        const lines = formatSearchResults(results, false)
        const output = lines.join('\n')
        expect(output).toContain('Found 2 application(s)')
      })

      it('should display application details', () => {
        const results = {
          apps: [
            { name: 'My App', scope: 'x_my_app', version: '3.0.0', vendor: 'Acme Corp', sys_id: 'sys-abc' },
          ],
          total: 1,
        }
        const lines = formatSearchResults(results, false)
        const output = lines.join('\n')
        expect(output).toContain('My App')
        expect(output).toContain('x_my_app')
        expect(output).toContain('3.0.0')
        expect(output).toContain('Acme Corp')
        expect(output).toContain('sys-abc')
      })

      it('should handle empty results', () => {
        const results = { apps: [], total: 0 }
        const lines = formatSearchResults(results, false)
        const output = lines.join('\n')
        expect(output).toContain('No applications found')
      })

      it('should handle null results', () => {
        const lines = formatSearchResults(null, false)
        const output = lines.join('\n')
        expect(output).toContain('No results returned')
      })
    })
  })

  describe('formatInstallResult', () => {

    describe('JSON output', () => {
      it('should return JSON string when jsonOutput is true', () => {
        const result = {
          success: true,
          percent_complete: 100,
          status_label: 'Completed',
          status_message: '',
          error: '',
        }
        const lines = formatInstallResult(result, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.percent_complete).toBe(100)
      })
    })

    describe('text output', () => {
      it('should display success status', () => {
        const result = {
          success: true,
          percent_complete: 100,
          status_label: 'Completed',
        }
        const lines = formatInstallResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Success:         true')
        expect(output).toContain('Status:          Completed')
        expect(output).toContain('Progress:        100%')
      })

      it('should display error when present', () => {
        const result = {
          success: false,
          percent_complete: 50,
          status_label: 'Failed',
          error: 'Dependency not met',
        }
        const lines = formatInstallResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Error:           Dependency not met')
      })

      it('should display progress link when present', () => {
        const result = {
          links: { progress: { id: 'prog-001', url: '/progress' } },
          percent_complete: 0,
          status: 'pending',
          status_label: 'Pending',
        }
        const lines = formatInstallResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Progress ID:     prog-001')
        expect(output).toContain('Progress URL:    /progress')
      })

      it('should handle null result', () => {
        const lines = formatInstallResult(null, false)
        const output = lines.join('\n')
        expect(output).toContain('No result returned')
      })
    })
  })

  describe('formatValidationResult', () => {

    describe('JSON output', () => {
      it('should return JSON string when jsonOutput is true', () => {
        const result = { valid: true, errors: [], warnings: [] }
        const lines = formatValidationResult(result, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.valid).toBe(true)
        expect(parsed.errors).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should display valid result', () => {
        const result = { valid: true, errors: [], warnings: [] }
        const lines = formatValidationResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Valid:           Yes')
        expect(output).toContain('Validation passed successfully')
      })

      it('should display invalid result with errors', () => {
        const result = {
          valid: false,
          errors: ['Missing required field: name', 'Invalid version format'],
          warnings: [],
        }
        const lines = formatValidationResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Valid:           No')
        expect(output).toContain('Errors (2)')
        expect(output).toContain('Missing required field: name')
        expect(output).toContain('Invalid version format')
        expect(output).toContain('Validation failed')
      })

      it('should display warnings when present', () => {
        const result = {
          valid: true,
          errors: [],
          warnings: ['Consider pinning version numbers'],
        }
        const lines = formatValidationResult(result, false)
        const output = lines.join('\n')
        expect(output).toContain('Warnings (1)')
        expect(output).toContain('Consider pinning version numbers')
      })

      it('should handle null result', () => {
        const lines = formatValidationResult(null, false)
        const output = lines.join('\n')
        expect(output).toContain('No result returned')
      })
    })
  })
})
