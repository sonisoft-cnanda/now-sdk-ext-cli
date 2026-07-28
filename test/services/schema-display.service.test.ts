import { describe, it, expect } from '@jest/globals'
import { SchemaDisplayService } from '../../src/services/schema-display.service.js'

describe('SchemaDisplayService', () => {
  const service = new SchemaDisplayService()

  describe('formatTableSchema', () => {
    const mockSchema = {
      table: 'incident',
      label: 'Incident',
      superClass: 'task',
      fields: [
        { name: 'number', label: 'Number', internalType: 'string', maxLength: 40, mandatory: false, readOnly: true },
        { name: 'short_description', label: 'Short description', internalType: 'string', maxLength: 160, mandatory: true, readOnly: false },
      ],
    }

    describe('JSON output', () => {
      it('should return schema as JSON string', () => {
        const lines = service.formatTableSchema(mockSchema, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.table).toBe('incident')
        expect(parsed.label).toBe('Incident')
        expect(parsed.superClass).toBe('task')
        expect(parsed.fields).toHaveLength(2)
      })

      it('should include all field properties in JSON', () => {
        const lines = service.formatTableSchema(mockSchema, true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.fields[0].name).toBe('number')
        expect(parsed.fields[0].label).toBe('Number')
        expect(parsed.fields[0].internalType).toBe('string')
        expect(parsed.fields[0].maxLength).toBe(40)
        expect(parsed.fields[0].mandatory).toBe(false)
        expect(parsed.fields[0].readOnly).toBe(true)
      })

      it('should handle schema with no fields as JSON', () => {
        const emptySchema = { table: 'empty_table', label: 'Empty', fields: [] }
        const lines = service.formatTableSchema(emptySchema, true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.table).toBe('empty_table')
        expect(parsed.fields).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should display table name and label', () => {
        const lines = service.formatTableSchema(mockSchema, false)
        const output = lines.join('\n')

        expect(output).toContain('Incident')
        expect(output).toContain('incident')
      })

      it('should display super class', () => {
        const lines = service.formatTableSchema(mockSchema, false)
        const output = lines.join('\n')

        expect(output).toContain('task')
      })

      it('should display field count', () => {
        const lines = service.formatTableSchema(mockSchema, false)
        const output = lines.join('\n')

        expect(output).toContain('Fields (2)')
      })

      it('should display field details in table format', () => {
        const lines = service.formatTableSchema(mockSchema, false)
        const output = lines.join('\n')

        expect(output).toContain('number')
        expect(output).toContain('Number')
        expect(output).toContain('short_description')
        expect(output).toContain('Short description')
      })

      it('should display column headers', () => {
        const lines = service.formatTableSchema(mockSchema, false)
        const output = lines.join('\n')

        expect(output).toContain('Name')
        expect(output).toContain('Label')
        expect(output).toContain('Type')
        expect(output).toContain('Max Length')
        expect(output).toContain('Mandatory')
        expect(output).toContain('Read Only')
      })

      it('should show no fields message when fields array is empty', () => {
        const emptySchema = { table: 'empty_table', label: 'Empty', fields: [] }
        const lines = service.formatTableSchema(emptySchema, false)
        const output = lines.join('\n')

        expect(output).toContain('No fields found')
      })

      it('should handle schema without superClass', () => {
        const noSuperSchema = { table: 'custom_table', label: 'Custom', fields: [] }
        const lines = service.formatTableSchema(noSuperSchema, false)
        const output = lines.join('\n')

        expect(output).toContain('custom_table')
        expect(output).not.toContain('Super Class')
      })
    })
  })

  describe('formatFieldExplanation', () => {
    const mockField = {
      field: 'state',
      table: 'incident',
      label: 'State',
      type: 'integer',
      maxLength: 40,
      mandatory: false,
      readOnly: false,
      choices: [
        { label: 'New', value: '1' },
        { label: 'In Progress', value: '2' },
      ],
    }

    describe('JSON output', () => {
      it('should return field info as JSON string', () => {
        const lines = service.formatFieldExplanation(mockField, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.field).toBe('state')
        expect(parsed.table).toBe('incident')
        expect(parsed.label).toBe('State')
        expect(parsed.type).toBe('integer')
      })

      it('should include choices in JSON output', () => {
        const lines = service.formatFieldExplanation(mockField, true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.choices).toHaveLength(2)
        expect(parsed.choices[0].label).toBe('New')
        expect(parsed.choices[0].value).toBe('1')
        expect(parsed.choices[1].label).toBe('In Progress')
        expect(parsed.choices[1].value).toBe('2')
      })

      it('should handle field without choices as JSON', () => {
        const noChoicesField = { field: 'number', table: 'incident', label: 'Number', type: 'string' }
        const lines = service.formatFieldExplanation(noChoicesField, true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.field).toBe('number')
        expect(parsed.choices).toBeUndefined()
      })
    })

    describe('text output', () => {
      it('should display field name and label', () => {
        const lines = service.formatFieldExplanation(mockField, false)
        const output = lines.join('\n')

        expect(output).toContain('state')
        expect(output).toContain('State')
      })

      it('should display table name', () => {
        const lines = service.formatFieldExplanation(mockField, false)
        const output = lines.join('\n')

        expect(output).toContain('incident')
      })

      it('should display type', () => {
        const lines = service.formatFieldExplanation(mockField, false)
        const output = lines.join('\n')

        expect(output).toContain('integer')
      })

      it('should display max length', () => {
        const lines = service.formatFieldExplanation(mockField, false)
        const output = lines.join('\n')

        expect(output).toContain('40')
      })

      it('should display mandatory and read only status', () => {
        const lines = service.formatFieldExplanation(mockField, false)
        const output = lines.join('\n')

        expect(output).toContain('Mandatory:    false')
        expect(output).toContain('Read Only:    false')
      })

      it('should display choices when present', () => {
        const lines = service.formatFieldExplanation(mockField, false)
        const output = lines.join('\n')

        expect(output).toContain('Choices (2)')
        expect(output).toContain('New')
        expect(output).toContain('In Progress')
        expect(output).toContain('1')
        expect(output).toContain('2')
      })

      it('should not display choices section when no choices', () => {
        const noChoicesField = {
          field: 'number', table: 'incident', label: 'Number', type: 'string',
          mandatory: false, readOnly: true,
        }
        const lines = service.formatFieldExplanation(noChoicesField, false)
        const output = lines.join('\n')

        expect(output).not.toContain('Choices')
      })
    })
  })

  describe('formatCatalogValidation', () => {
    describe('JSON output', () => {
      it('should return valid result as JSON string', () => {
        const result = { valid: true, issues: [], warnings: 0, errors: 0 }
        const lines = service.formatCatalogValidation(result, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.valid).toBe(true)
        expect(parsed.issues).toHaveLength(0)
        expect(parsed.warnings).toBe(0)
        expect(parsed.errors).toBe(0)
      })

      it('should return invalid result with issues as JSON', () => {
        const result = {
          valid: false,
          issues: ['Missing variable set', 'Invalid workflow reference'],
          warnings: 1,
          errors: 1,
        }
        const lines = service.formatCatalogValidation(result, true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.valid).toBe(false)
        expect(parsed.issues).toHaveLength(2)
        expect(parsed.warnings).toBe(1)
        expect(parsed.errors).toBe(1)
      })
    })

    describe('text output', () => {
      it('should display valid status', () => {
        const result = { valid: true, issues: [], warnings: 0, errors: 0 }
        const lines = service.formatCatalogValidation(result, false)
        const output = lines.join('\n')

        expect(output).toContain('Valid:      Yes')
        expect(output).toContain('Warnings:   0')
        expect(output).toContain('Errors:     0')
      })

      it('should display invalid status', () => {
        const result = { valid: false, issues: ['Problem found'], warnings: 0, errors: 1 }
        const lines = service.formatCatalogValidation(result, false)
        const output = lines.join('\n')

        expect(output).toContain('Valid:      No')
        expect(output).toContain('Errors:     1')
      })

      it('should display no issues message when issues array is empty', () => {
        const result = { valid: true, issues: [], warnings: 0, errors: 0 }
        const lines = service.formatCatalogValidation(result, false)
        const output = lines.join('\n')

        expect(output).toContain('No issues found')
      })

      it('should display issues when present', () => {
        const result = {
          valid: false,
          issues: ['Missing variable set', 'Invalid workflow reference'],
          warnings: 1,
          errors: 1,
        }
        const lines = service.formatCatalogValidation(result, false)
        const output = lines.join('\n')

        expect(output).toContain('Issues (2)')
        expect(output).toContain('Missing variable set')
        expect(output).toContain('Invalid workflow reference')
      })

      it('should display warning and error counts', () => {
        const result = { valid: false, issues: ['Issue 1'], warnings: 3, errors: 2 }
        const lines = service.formatCatalogValidation(result, false)
        const output = lines.join('\n')

        expect(output).toContain('Warnings:   3')
        expect(output).toContain('Errors:     2')
      })
    })
  })
})
