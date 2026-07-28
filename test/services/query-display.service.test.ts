import { describe, it, expect } from '@jest/globals'
import { QueryDisplayService } from '../../src/services/query-display.service.js'

describe('QueryDisplayService', () => {
  const service = new QueryDisplayService()

  describe('formatTableResults', () => {
    const mockRecords = [
      { sys_id: 'rec-001', number: 'INC0010001', short_description: 'Test incident', state: '1', priority: '1' },
      { sys_id: 'rec-002', number: 'INC0010002', short_description: 'Another incident', state: '2', priority: '2' },
    ]

    describe('JSON output', () => {
      it('should return results as JSON string', () => {
        const lines = service.formatTableResults(mockRecords, 'incident', true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.table).toBe('incident')
        expect(parsed.count).toBe(2)
        expect(parsed.records).toHaveLength(2)
      })

      it('should include record data in JSON', () => {
        const lines = service.formatTableResults(mockRecords, 'incident', true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.records[0].number).toBe('INC0010001')
        expect(parsed.records[0].short_description).toBe('Test incident')
      })

      it('should handle empty records as JSON', () => {
        const lines = service.formatTableResults([], 'incident', true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.table).toBe('incident')
        expect(parsed.count).toBe(0)
        expect(parsed.records).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should display table name and record count', () => {
        const lines = service.formatTableResults(mockRecords, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('incident')
        expect(output).toContain('2 records')
      })

      it('should display record data', () => {
        const lines = service.formatTableResults(mockRecords, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('INC0010001')
        expect(output).toContain('INC0010002')
      })

      it('should show no records message when empty', () => {
        const lines = service.formatTableResults([], 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('No records found')
      })

      it('should display column headers', () => {
        const lines = service.formatTableResults(mockRecords, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('number')
        expect(output).toContain('short_description')
      })

      it('should handle single record pluralization', () => {
        const lines = service.formatTableResults([mockRecords[0]], 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('1 record)')
        expect(output).not.toContain('1 records')
      })
    })
  })

  describe('formatAppResults', () => {
    const mockApps = [
      { sys_id: 'app-001', name: 'ITSM App', scope: 'x_itsm_app', version: '1.0.0', active: 'true', source: 'sys_scope' },
      { sys_id: 'app-002', name: 'HR Service', scope: 'x_hr_svc', version: '2.1.0', active: 'true', source: 'sys_scope' },
    ]

    describe('JSON output', () => {
      it('should return apps as JSON string', () => {
        const lines = service.formatAppResults(mockApps, 'ITSM', true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.search).toBe('ITSM')
        expect(parsed.count).toBe(2)
        expect(parsed.apps).toHaveLength(2)
      })

      it('should include app data in JSON', () => {
        const lines = service.formatAppResults(mockApps, 'ITSM', true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.apps[0].name).toBe('ITSM App')
        expect(parsed.apps[0].scope).toBe('x_itsm_app')
      })

      it('should handle empty results as JSON', () => {
        const lines = service.formatAppResults([], 'nothing', true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.count).toBe(0)
        expect(parsed.apps).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should display search term and result count', () => {
        const lines = service.formatAppResults(mockApps, 'ITSM', false)
        const output = lines.join('\n')

        expect(output).toContain('ITSM')
        expect(output).toContain('2 results')
      })

      it('should display app names', () => {
        const lines = service.formatAppResults(mockApps, 'app', false)
        const output = lines.join('\n')

        expect(output).toContain('ITSM App')
        expect(output).toContain('HR Service')
      })

      it('should display column headers', () => {
        const lines = service.formatAppResults(mockApps, 'app', false)
        const output = lines.join('\n')

        expect(output).toContain('Name')
        expect(output).toContain('Scope')
        expect(output).toContain('Version')
        expect(output).toContain('Active')
        expect(output).toContain('Source')
      })

      it('should show no apps message when empty', () => {
        const lines = service.formatAppResults([], 'nonexistent', false)
        const output = lines.join('\n')

        expect(output).toContain('No applications found')
        expect(output).toContain('nonexistent')
      })
    })
  })

  describe('formatColumnsResults', () => {
    const mockFields = [
      { name: 'number', label: 'Number', internalType: 'string', maxLength: 40, mandatory: false, readOnly: true },
      { name: 'short_description', label: 'Short description', internalType: 'string', maxLength: 160, mandatory: true, readOnly: false },
    ]

    describe('JSON output', () => {
      it('should return fields as JSON string', () => {
        const lines = service.formatColumnsResults(mockFields, 'incident', undefined, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.table).toBe('incident')
        expect(parsed.count).toBe(2)
        expect(parsed.fields).toHaveLength(2)
      })

      it('should include search term in JSON when provided', () => {
        const lines = service.formatColumnsResults(mockFields, 'incident', 'num', true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.search).toBe('num')
      })

      it('should handle empty fields as JSON', () => {
        const lines = service.formatColumnsResults([], 'incident', undefined, true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.count).toBe(0)
        expect(parsed.fields).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should display table name and field count', () => {
        const lines = service.formatColumnsResults(mockFields, 'incident', undefined, false)
        const output = lines.join('\n')

        expect(output).toContain('incident')
        expect(output).toContain('2 fields')
      })

      it('should display search filter in header', () => {
        const lines = service.formatColumnsResults(mockFields, 'incident', 'num', false)
        const output = lines.join('\n')

        expect(output).toContain('matching "num"')
      })

      it('should display field data', () => {
        const lines = service.formatColumnsResults(mockFields, 'incident', undefined, false)
        const output = lines.join('\n')

        expect(output).toContain('number')
        expect(output).toContain('Number')
        expect(output).toContain('short_description')
      })

      it('should display column headers', () => {
        const lines = service.formatColumnsResults(mockFields, 'incident', undefined, false)
        const output = lines.join('\n')

        expect(output).toContain('Name')
        expect(output).toContain('Label')
        expect(output).toContain('Type')
        expect(output).toContain('Max Length')
        expect(output).toContain('Mandatory')
        expect(output).toContain('Read Only')
      })

      it('should show no columns message when empty', () => {
        const lines = service.formatColumnsResults([], 'incident', undefined, false)
        const output = lines.join('\n')

        expect(output).toContain('No columns found')
      })

      it('should include search term in no-results message', () => {
        const lines = service.formatColumnsResults([], 'incident', 'xyz', false)
        const output = lines.join('\n')

        expect(output).toContain('matching "xyz"')
      })
    })
  })

  describe('formatSyslogResults', () => {
    const mockRecords = [
      { sys_id: 'log-001', sys_created_on: '2025-01-01 12:00:00', level: 'error', message: 'Test error message', source: 'test_script' },
      { sys_id: 'log-002', sys_created_on: '2025-01-01 12:01:00', level: 'warning', message: 'Test warning message', source: 'test_script' },
    ]

    describe('JSON output', () => {
      it('should return records as JSON string', () => {
        const lines = service.formatSyslogResults(mockRecords, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.count).toBe(2)
        expect(parsed.records).toHaveLength(2)
      })

      it('should include record data in JSON', () => {
        const lines = service.formatSyslogResults(mockRecords, true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.records[0].level).toBe('error')
        expect(parsed.records[0].message).toBe('Test error message')
      })

      it('should handle empty records as JSON', () => {
        const lines = service.formatSyslogResults([], true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.count).toBe(0)
        expect(parsed.records).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should display record count', () => {
        const lines = service.formatSyslogResults(mockRecords, false)
        const output = lines.join('\n')

        expect(output).toContain('2 records')
      })

      it('should display log entries', () => {
        const lines = service.formatSyslogResults(mockRecords, false)
        const output = lines.join('\n')

        expect(output).toContain('error')
        expect(output).toContain('Test error message')
        expect(output).toContain('test_script')
      })

      it('should display column headers', () => {
        const lines = service.formatSyslogResults(mockRecords, false)
        const output = lines.join('\n')

        expect(output).toContain('Created On')
        expect(output).toContain('Level')
        expect(output).toContain('Source')
        expect(output).toContain('Message')
      })

      it('should show no records message when empty', () => {
        const lines = service.formatSyslogResults([], false)
        const output = lines.join('\n')

        expect(output).toContain('No syslog records found')
      })

      it('should truncate long messages', () => {
        const longRecord = [{
          sys_id: 'log-003',
          sys_created_on: '2025-01-01 12:02:00',
          level: 'info',
          message: 'A'.repeat(100),
          source: 'test',
        }]
        const lines = service.formatSyslogResults(longRecord, false)
        const output = lines.join('\n')

        expect(output).toContain('...')
        expect(output).not.toContain('A'.repeat(100))
      })
    })
  })
})
