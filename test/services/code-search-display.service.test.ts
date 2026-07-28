import { describe, it, expect } from '@jest/globals'
import { CodeSearchDisplayService } from '../../src/services/code-search-display.service.js'

describe('CodeSearchDisplayService', () => {
  const service = new CodeSearchDisplayService()

  describe('formatSearchResults', () => {
    const mockResults = [
      {
        name: 'MyScriptInclude',
        table: 'sys_script_include',
        sys_id: 'abc123',
        field: 'script',
        match: 'GlideRecord',
        context: 'var gr = new GlideRecord("incident");',
      },
      {
        name: 'OnBeforeInsert',
        table: 'sys_script',
        sys_id: 'def456',
        field: 'script',
        match: 'GlideRecord',
        context: 'current.update();',
      },
    ]

    it('should format results as text with all fields', () => {
      const lines = service.formatSearchResults(mockResults, false)
      const output = lines.join('\n')

      expect(output).toContain('=== Code Search Results (2) ===')
      expect(output).toContain('1. MyScriptInclude')
      expect(output).toContain('Table:    sys_script_include')
      expect(output).toContain('Sys ID:   abc123')
      expect(output).toContain('Field:    script')
      expect(output).toContain('Match:    GlideRecord')
      expect(output).toContain('Context:  var gr = new GlideRecord("incident");')
      expect(output).toContain('2. OnBeforeInsert')
      expect(output).toContain('Total: 2 result(s)')
    })

    it('should format results as JSON', () => {
      const lines = service.formatSearchResults(mockResults, true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed).toHaveLength(2)
      expect(parsed[0].name).toBe('MyScriptInclude')
      expect(parsed[0].table).toBe('sys_script_include')
      expect(parsed[1].name).toBe('OnBeforeInsert')
    })

    it('should handle empty results as text', () => {
      const lines = service.formatSearchResults([], false)
      const output = lines.join('\n')
      expect(output).toContain('No search results found.')
    })

    it('should handle empty results as JSON', () => {
      const lines = service.formatSearchResults([], true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed).toHaveLength(0)
    })

    it('should handle results with missing optional fields', () => {
      const sparseResults = [{ name: 'SparseResult', sys_id: 'xyz789' }]
      const lines = service.formatSearchResults(sparseResults, false)
      const output = lines.join('\n')

      expect(output).toContain('1. SparseResult')
      expect(output).toContain('Sys ID:   xyz789')
      expect(output).not.toContain('Table:')
      expect(output).not.toContain('Field:')
      expect(output).not.toContain('Match:')
      expect(output).not.toContain('Context:')
    })

    it('should handle results without a name', () => {
      const noNameResults = [{ sys_id: 'no-name-001' }]
      const lines = service.formatSearchResults(noNameResults, false)
      const output = lines.join('\n')
      expect(output).toContain('1. Unnamed')
    })
  })

  describe('formatSearchGroups', () => {
    const mockGroups = [
      {
        name: 'Script Includes',
        sys_id: 'group-001',
        description: 'All script include tables',
        order: 100,
      },
      {
        name: 'Business Rules',
        sys_id: 'group-002',
        description: 'Business rule tables',
        order: 200,
      },
    ]

    it('should format groups as text with all fields', () => {
      const lines = service.formatSearchGroups(mockGroups, false)
      const output = lines.join('\n')

      expect(output).toContain('=== Search Groups (2) ===')
      expect(output).toContain('1. Script Includes')
      expect(output).toContain('Sys ID:       group-001')
      expect(output).toContain('Description:  All script include tables')
      expect(output).toContain('Order:        100')
      expect(output).toContain('2. Business Rules')
      expect(output).toContain('Total: 2 group(s)')
    })

    it('should format groups as JSON', () => {
      const lines = service.formatSearchGroups(mockGroups, true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed).toHaveLength(2)
      expect(parsed[0].name).toBe('Script Includes')
      expect(parsed[1].name).toBe('Business Rules')
    })

    it('should handle empty groups as text', () => {
      const lines = service.formatSearchGroups([], false)
      const output = lines.join('\n')
      expect(output).toContain('No search groups found.')
    })

    it('should handle empty groups as JSON', () => {
      const lines = service.formatSearchGroups([], true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed).toHaveLength(0)
    })

    it('should fall back to label when name is not present', () => {
      const groupsWithLabel = [{ label: 'Custom Label', sys_id: 'g-001' }]
      const lines = service.formatSearchGroups(groupsWithLabel, false)
      const output = lines.join('\n')
      expect(output).toContain('1. Custom Label')
    })

    it('should show Unnamed when neither name nor label is present', () => {
      const unnamedGroups = [{ sys_id: 'g-anon' }]
      const lines = service.formatSearchGroups(unnamedGroups, false)
      const output = lines.join('\n')
      expect(output).toContain('1. Unnamed')
    })

    it('should handle groups without optional fields', () => {
      const sparseGroups = [{ name: 'Minimal Group' }]
      const lines = service.formatSearchGroups(sparseGroups, false)
      const output = lines.join('\n')

      expect(output).toContain('1. Minimal Group')
      expect(output).not.toContain('Sys ID:')
      expect(output).not.toContain('Description:')
      expect(output).not.toContain('Order:')
    })
  })

  describe('formatTablesForGroup', () => {
    const mockTables = [
      {
        name: 'sys_script_include',
        sys_id: 'table-001',
        search_fields: 'script',
        table: 'sys_script_include',
      },
      {
        name: 'sys_script',
        sys_id: 'table-002',
        search_fields: 'script,condition',
        table: 'sys_script',
      },
    ]

    it('should format tables as text with group name', () => {
      const lines = service.formatTablesForGroup(mockTables, 'Script Includes', false)
      const output = lines.join('\n')

      expect(output).toContain('=== Tables in Search Group "Script Includes" (2) ===')
      expect(output).toContain('1. sys_script_include')
      expect(output).toContain('Sys ID:          table-001')
      expect(output).toContain('Search Fields:   script')
      expect(output).toContain('2. sys_script')
      expect(output).toContain('Search Fields:   script,condition')
      expect(output).toContain('Total: 2 table(s)')
    })

    it('should format tables as JSON with group name', () => {
      const lines = service.formatTablesForGroup(mockTables, 'Script Includes', true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed.group).toBe('Script Includes')
      expect(parsed.tables).toHaveLength(2)
      expect(parsed.tables[0].name).toBe('sys_script_include')
    })

    it('should handle empty tables as text', () => {
      const lines = service.formatTablesForGroup([], 'Empty Group', false)
      const output = lines.join('\n')
      expect(output).toContain('No tables found for search group "Empty Group".')
    })

    it('should handle empty tables as JSON', () => {
      const lines = service.formatTablesForGroup([], 'Empty Group', true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed.group).toBe('Empty Group')
      expect(parsed.tables).toHaveLength(0)
    })

    it('should fall back to label when name is not present', () => {
      const tablesWithLabel = [{ label: 'Script Include Table', sys_id: 't-001' }]
      const lines = service.formatTablesForGroup(tablesWithLabel, 'Group', false)
      const output = lines.join('\n')
      expect(output).toContain('1. Script Include Table')
    })

    it('should handle tables without optional fields', () => {
      const sparseTables = [{ name: 'Minimal Table' }]
      const lines = service.formatTablesForGroup(sparseTables, 'Group', false)
      const output = lines.join('\n')

      expect(output).toContain('1. Minimal Table')
      expect(output).not.toContain('Sys ID:')
      expect(output).not.toContain('Search Fields:')
      expect(output).not.toContain('Table:')
    })
  })

  describe('formatAddTableResult', () => {
    const successResult = {
      table: 'u_custom_script',
      search_fields: 'script,description',
      search_group: 'Custom Scripts',
      sys_id: 'new-001',
    }

    it('should format successful add table result as text', () => {
      const lines = service.formatAddTableResult(successResult, false)
      const output = lines.join('\n')

      expect(output).toContain('Table added to search group successfully!')
      expect(output).toContain('Table:          u_custom_script')
      expect(output).toContain('Search Fields:  script,description')
      expect(output).toContain('Search Group:   Custom Scripts')
      expect(output).toContain('Sys ID:         new-001')
    })

    it('should format successful result as JSON', () => {
      const lines = service.formatAddTableResult(successResult, true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed.table).toBe('u_custom_script')
      expect(parsed.search_fields).toBe('script,description')
      expect(parsed.search_group).toBe('Custom Scripts')
      expect(parsed.sys_id).toBe('new-001')
    })

    it('should format error result as text', () => {
      const errorResult = { error: 'Table already exists in search group' }
      const lines = service.formatAddTableResult(errorResult, false)
      const output = lines.join('\n')

      expect(output).toContain('Failed to add table: Table already exists in search group')
    })

    it('should format error result as JSON', () => {
      const errorResult = { error: 'Table already exists in search group' }
      const lines = service.formatAddTableResult(errorResult, true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed.error).toBe('Table already exists in search group')
    })

    it('should handle result with only some fields', () => {
      const partialResult = { table: 'sys_script' }
      const lines = service.formatAddTableResult(partialResult, false)
      const output = lines.join('\n')

      expect(output).toContain('Table added to search group successfully!')
      expect(output).toContain('Table:          sys_script')
      expect(output).not.toContain('Search Fields:')
      expect(output).not.toContain('Search Group:')
      expect(output).not.toContain('Sys ID:')
    })
  })
})
