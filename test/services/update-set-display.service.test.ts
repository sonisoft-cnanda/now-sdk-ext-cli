import { describe, it, expect } from '@jest/globals'
import { UpdateSetDisplayService } from '../../src/services/update-set-display.service.js'

describe('UpdateSetDisplayService', () => {
  const service = new UpdateSetDisplayService()

  describe('formatUpdateSetList', () => {
    const mockSets = [
      { sys_id: 'us-001', name: 'Default', state: 'in progress' },
      { sys_id: 'us-002', name: 'Feature Set', state: 'in progress' },
    ]

    describe('JSON output', () => {
      it('should format update sets as JSON', () => {
        const lines = service.formatUpdateSetList(mockSets, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.total).toBe(2)
        expect(parsed.updateSets).toHaveLength(2)
        expect(parsed.updateSets[0].name).toBe('Default')
        expect(parsed.updateSets[0].sys_id).toBe('us-001')
        expect(parsed.updateSets[0].state).toBe('in progress')
      })

      it('should handle empty list as JSON', () => {
        const lines = service.formatUpdateSetList([], true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.total).toBe(0)
        expect(parsed.updateSets).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should show update set count', () => {
        const lines = service.formatUpdateSetList(mockSets, false)
        const output = lines.join('\n')
        expect(output).toContain('Found 2 update set(s)')
      })

      it('should show update set details', () => {
        const lines = service.formatUpdateSetList(mockSets, false)
        const output = lines.join('\n')
        expect(output).toContain('Default')
        expect(output).toContain('us-001')
        expect(output).toContain('in progress')
        expect(output).toContain('Feature Set')
        expect(output).toContain('us-002')
      })

      it('should show no-results message when list is empty', () => {
        const lines = service.formatUpdateSetList([], false)
        const output = lines.join('\n')
        expect(output).toContain('No update sets found')
      })

      it('should show total count at the end', () => {
        const lines = service.formatUpdateSetList(mockSets, false)
        const output = lines.join('\n')
        expect(output).toContain('Total: 2 update set(s)')
      })
    })
  })

  describe('formatCurrentUpdateSet', () => {
    const mockSet = { sys_id: 'us-001', name: 'Default', state: 'in progress' }

    describe('JSON output', () => {
      it('should format current update set as JSON', () => {
        const lines = service.formatCurrentUpdateSet(mockSet, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.currentUpdateSet.name).toBe('Default')
        expect(parsed.currentUpdateSet.sys_id).toBe('us-001')
        expect(parsed.currentUpdateSet.state).toBe('in progress')
      })
    })

    describe('text output', () => {
      it('should show current update set details', () => {
        const lines = service.formatCurrentUpdateSet(mockSet, false)
        const output = lines.join('\n')
        expect(output).toContain('Current Update Set:')
        expect(output).toContain('Default')
        expect(output).toContain('us-001')
        expect(output).toContain('in progress')
      })
    })
  })

  describe('formatInspection', () => {
    const mockResult = {
      updateSet: { sys_id: 'us-001', name: 'Default', state: 'in progress' },
      totalRecords: 3,
      components: [
        { type: 'Business Rule', count: 2, items: ['rule1', 'rule2'] },
        { type: 'Script Include', count: 1, items: ['script1'] },
      ],
    }

    describe('JSON output', () => {
      it('should format inspection as JSON', () => {
        const lines = service.formatInspection(mockResult, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.updateSet.name).toBe('Default')
        expect(parsed.totalRecords).toBe(3)
        expect(parsed.components).toHaveLength(2)
        expect(parsed.components[0].type).toBe('Business Rule')
        expect(parsed.components[0].count).toBe(2)
      })
    })

    describe('text output', () => {
      it('should show update set info and components', () => {
        const lines = service.formatInspection(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Update Set: Default')
        expect(output).toContain('us-001')
        expect(output).toContain('Total Records: 3')
        expect(output).toContain('Components:')
        expect(output).toContain('Business Rule (2)')
        expect(output).toContain('rule1')
        expect(output).toContain('rule2')
        expect(output).toContain('Script Include (1)')
        expect(output).toContain('script1')
      })

      it('should handle empty components', () => {
        const emptyResult = {
          updateSet: { sys_id: 'us-001', name: 'Default', state: 'in progress' },
          totalRecords: 0,
          components: [],
        }
        const lines = service.formatInspection(emptyResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Total Records: 0')
        expect(output).not.toContain('Components:')
      })
    })
  })

  describe('formatMoveResult', () => {
    const mockResult = { moved: 2, failed: 0, records: [], errors: [] }

    describe('JSON output', () => {
      it('should format move result as JSON', () => {
        const lines = service.formatMoveResult(mockResult, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.moved).toBe(2)
        expect(parsed.failed).toBe(0)
        expect(parsed.records).toEqual([])
        expect(parsed.errors).toEqual([])
      })
    })

    describe('text output', () => {
      it('should show move summary', () => {
        const lines = service.formatMoveResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Move Records Result:')
        expect(output).toContain('Moved:   2')
        expect(output).toContain('Failed:  0')
      })

      it('should show errors when present', () => {
        const resultWithErrors = { moved: 1, failed: 1, records: [], errors: ['Record not found'] }
        const lines = service.formatMoveResult(resultWithErrors, false)
        const output = lines.join('\n')
        expect(output).toContain('Errors:')
        expect(output).toContain('Record not found')
      })

      it('should not show errors section when no errors', () => {
        const lines = service.formatMoveResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).not.toContain('Errors:')
      })
    })
  })

  describe('formatCloneResult', () => {
    const mockResult = {
      newUpdateSetId: 'us-004',
      newUpdateSetName: 'Cloned Set',
      sourceUpdateSetId: 'us-001',
      sourceUpdateSetName: 'Default',
      recordsCloned: 5,
      totalSourceRecords: 5,
    }

    describe('JSON output', () => {
      it('should format clone result as JSON', () => {
        const lines = service.formatCloneResult(mockResult, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.newUpdateSetId).toBe('us-004')
        expect(parsed.newUpdateSetName).toBe('Cloned Set')
        expect(parsed.sourceUpdateSetId).toBe('us-001')
        expect(parsed.sourceUpdateSetName).toBe('Default')
        expect(parsed.recordsCloned).toBe(5)
        expect(parsed.totalSourceRecords).toBe(5)
      })
    })

    describe('text output', () => {
      it('should show clone summary', () => {
        const lines = service.formatCloneResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Clone Result:')
        expect(output).toContain('Default (us-001)')
        expect(output).toContain('Cloned Set (us-004)')
        expect(output).toContain('Records Cloned:  5 / 5')
      })
    })
  })

  describe('formatCreateResult', () => {
    const mockResult = { sys_id: 'us-003', name: 'New Set', state: 'in progress' }

    describe('JSON output', () => {
      it('should format create result as JSON', () => {
        const lines = service.formatCreateResult(mockResult, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.sys_id).toBe('us-003')
        expect(parsed.name).toBe('New Set')
        expect(parsed.state).toBe('in progress')
      })
    })

    describe('text output', () => {
      it('should show create confirmation', () => {
        const lines = service.formatCreateResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Update set created successfully!')
        expect(output).toContain('New Set')
        expect(output).toContain('us-003')
        expect(output).toContain('in progress')
      })
    })
  })
})
