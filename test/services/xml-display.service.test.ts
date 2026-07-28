import { describe, it, expect } from '@jest/globals'
import { XmlDisplayService } from '../../src/services/xml-display.service.js'

describe('XmlDisplayService', () => {
  const service = new XmlDisplayService()

  describe('formatExportResult', () => {
    const exportResult = {
      xml: '<record_update table="sys_script_include"><sys_script_include action="INSERT_OR_UPDATE"><name>TestScript</name><sys_id>abc123</sys_id></sys_script_include></record_update>',
      table: 'sys_script_include',
      sysId: 'abc123',
      unloadDate: '2025-01-15 10:30:00',
    }

    describe('JSON output', () => {
      it('should return result as JSON string', () => {
        const lines = service.formatExportResult(exportResult, undefined, true)
        expect(lines).toHaveLength(1)
        const parsed = JSON.parse(lines[0])
        expect(parsed.table).toBe('sys_script_include')
        expect(parsed.sysId).toBe('abc123')
        expect(parsed.xml).toBeDefined()
      })

      it('should include unloadDate in JSON when present', () => {
        const lines = service.formatExportResult(exportResult, undefined, true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.unloadDate).toBe('2025-01-15 10:30:00')
      })

      it('should include outputFile in JSON when provided', () => {
        const lines = service.formatExportResult(exportResult, './output.xml', true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.outputFile).toBe('./output.xml')
      })

      it('should not include outputFile in JSON when not provided', () => {
        const lines = service.formatExportResult(exportResult, undefined, true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.outputFile).toBeUndefined()
      })
    })

    describe('text output', () => {
      it('should display export header', () => {
        const lines = service.formatExportResult(exportResult, undefined, false)
        const output = lines.join('\n')
        expect(output).toContain('XML Export')
      })

      it('should display table and sys_id', () => {
        const lines = service.formatExportResult(exportResult, undefined, false)
        const output = lines.join('\n')
        expect(output).toContain('sys_script_include')
        expect(output).toContain('abc123')
      })

      it('should display unload date when present', () => {
        const lines = service.formatExportResult(exportResult, undefined, false)
        const output = lines.join('\n')
        expect(output).toContain('2025-01-15 10:30:00')
      })

      it('should not display unload date when absent', () => {
        const resultNoDate = { ...exportResult, unloadDate: undefined }
        const lines = service.formatExportResult(resultNoDate, undefined, false)
        const output = lines.join('\n')
        expect(output).not.toContain('Unload Date')
      })

      it('should show file path when output was specified', () => {
        const lines = service.formatExportResult(exportResult, './export.xml', false)
        const output = lines.join('\n')
        expect(output).toContain('./export.xml')
      })

      it('should not show file path when output was not specified', () => {
        const lines = service.formatExportResult(exportResult, undefined, false)
        const output = lines.join('\n')
        expect(output).not.toContain('Written to')
      })

      it('should include separator lines', () => {
        const lines = service.formatExportResult(exportResult, undefined, false)
        const output = lines.join('\n')
        expect(output).toContain('\u2500')
      })
    })
  })

  describe('formatImportResult', () => {
    const successResult = {
      success: true,
      targetTable: 'sys_script_include',
      responseBody: 'Import completed successfully',
    }

    const failResult = {
      success: false,
      targetTable: 'incident',
      responseBody: 'Error: permission denied',
    }

    describe('JSON output', () => {
      it('should return result as JSON string', () => {
        const lines = service.formatImportResult(successResult, true)
        expect(lines).toHaveLength(1)
        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.targetTable).toBe('sys_script_include')
      })

      it('should include responseBody in JSON', () => {
        const lines = service.formatImportResult(successResult, true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.responseBody).toBe('Import completed successfully')
      })
    })

    describe('text output', () => {
      it('should display import header', () => {
        const lines = service.formatImportResult(successResult, false)
        const output = lines.join('\n')
        expect(output).toContain('XML Import')
      })

      it('should display target table', () => {
        const lines = service.formatImportResult(successResult, false)
        const output = lines.join('\n')
        expect(output).toContain('sys_script_include')
      })

      it('should display success status with check mark', () => {
        const lines = service.formatImportResult(successResult, false)
        const output = lines.join('\n')
        expect(output).toContain('\u2714')
        expect(output).toContain('Success')
      })

      it('should display failure status with cross mark', () => {
        const lines = service.formatImportResult(failResult, false)
        const output = lines.join('\n')
        expect(output).toContain('\u2718')
        expect(output).toContain('Failed')
      })

      it('should display response body when present', () => {
        const lines = service.formatImportResult(successResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Import completed successfully')
      })

      it('should not display response line when absent', () => {
        const resultNoBody = { success: true, targetTable: 'incident' }
        const lines = service.formatImportResult(resultNoBody, false)
        const output = lines.join('\n')
        expect(output).not.toContain('Response')
      })

      it('should include separator lines', () => {
        const lines = service.formatImportResult(successResult, false)
        const output = lines.join('\n')
        expect(output).toContain('\u2500')
      })
    })
  })
})
