import { describe, it, expect } from '@jest/globals'
import { TaskDisplayService } from '../../src/services/task-display.service.js'

describe('TaskDisplayService', () => {
  const service = new TaskDisplayService()

  describe('formatTaskResult', () => {
    describe('JSON output', () => {
      it('should return JSON string for comment result', () => {
        const result = { sys_id: 'task-001', number: 'INC0010001' }
        const lines = service.formatTaskResult(result, 'comment', true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.sys_id).toBe('task-001')
        expect(parsed.number).toBe('INC0010001')
      })

      it('should return JSON string for assign result', () => {
        const result = { sys_id: 'task-001', number: 'INC0010001', assigned_to: 'admin' }
        const lines = service.formatTaskResult(result, 'assign', true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.assigned_to).toBe('admin')
      })

      it('should return JSON string for resolve result', () => {
        const result = { sys_id: 'task-001', number: 'INC0010001', state: '6' }
        const lines = service.formatTaskResult(result, 'resolve', true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.state).toBe('6')
      })

      it('should return JSON string for close result', () => {
        const result = { sys_id: 'task-001', number: 'INC0010001', state: '7' }
        const lines = service.formatTaskResult(result, 'close', true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.state).toBe('7')
      })

      it('should return JSON string for approve result', () => {
        const result = { sys_id: 'chg-001', number: 'CHG0010001', approval: 'approved' }
        const lines = service.formatTaskResult(result, 'approve', true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.approval).toBe('approved')
      })
    })

    describe('text output', () => {
      it('should format comment result with number and sys_id', () => {
        const result = { sys_id: 'task-001', number: 'INC0010001' }
        const lines = service.formatTaskResult(result, 'comment', false)
        const output = lines.join('\n')

        expect(output).toContain('Comment Result')
        expect(output).toContain('INC0010001')
        expect(output).toContain('task-001')
        expect(output).toContain("Operation 'comment' completed successfully.")
      })

      it('should format assign result with assigned_to and group', () => {
        const result = {
          sys_id: 'task-001',
          number: 'INC0010001',
          assigned_to: 'admin',
          assignment_group: 'Service Desk',
        }
        const lines = service.formatTaskResult(result, 'assign', false)
        const output = lines.join('\n')

        expect(output).toContain('Assign Result')
        expect(output).toContain('admin')
        expect(output).toContain('Service Desk')
      })

      it('should format resolve result with state', () => {
        const result = { sys_id: 'task-001', number: 'INC0010001', state: '6' }
        const lines = service.formatTaskResult(result, 'resolve', false)
        const output = lines.join('\n')

        expect(output).toContain('Resolve Result')
        expect(output).toContain('6')
      })

      it('should format close result with state', () => {
        const result = { sys_id: 'task-001', number: 'INC0010001', state: '7' }
        const lines = service.formatTaskResult(result, 'close', false)
        const output = lines.join('\n')

        expect(output).toContain('Close Result')
        expect(output).toContain('7')
      })

      it('should format approve result with approval status', () => {
        const result = { sys_id: 'chg-001', number: 'CHG0010001', approval: 'approved' }
        const lines = service.formatTaskResult(result, 'approve', false)
        const output = lines.join('\n')

        expect(output).toContain('Approve Result')
        expect(output).toContain('approved')
      })

      it('should handle null result', () => {
        const lines = service.formatTaskResult(null, 'comment', false)
        const output = lines.join('\n')
        expect(output).toContain('No result returned from comment operation.')
      })

      it('should handle undefined result', () => {
        const lines = service.formatTaskResult(undefined, 'assign', false)
        const output = lines.join('\n')
        expect(output).toContain('No result returned from assign operation.')
      })

      it('should capitalize operation name in heading', () => {
        const result = { sys_id: 'task-001', number: 'INC0010001' }
        const lines = service.formatTaskResult(result, 'resolve', false)
        const output = lines.join('\n')
        expect(output).toContain('Resolve Result')
      })
    })
  })

  describe('formatFindResult', () => {
    describe('JSON output', () => {
      it('should return JSON string for find result', () => {
        const result = {
          sys_id: 'task-001',
          number: 'INC0010001',
          short_description: 'Test incident',
        }
        const lines = service.formatFindResult(result, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.sys_id).toBe('task-001')
        expect(parsed.number).toBe('INC0010001')
        expect(parsed.short_description).toBe('Test incident')
      })

      it('should return JSON string for result with all fields', () => {
        const result = {
          sys_id: 'task-001',
          number: 'INC0010001',
          short_description: 'Test incident',
          state: '1',
          priority: '2',
          assigned_to: 'admin',
          assignment_group: 'Service Desk',
          opened_at: '2025-01-01 12:00:00',
          sys_class_name: 'incident',
        }
        const lines = service.formatFindResult(result, true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.state).toBe('1')
        expect(parsed.priority).toBe('2')
        expect(parsed.assigned_to).toBe('admin')
        expect(parsed.assignment_group).toBe('Service Desk')
        expect(parsed.opened_at).toBe('2025-01-01 12:00:00')
        expect(parsed.sys_class_name).toBe('incident')
      })
    })

    describe('text output', () => {
      it('should format find result with basic fields', () => {
        const result = {
          sys_id: 'task-001',
          number: 'INC0010001',
          short_description: 'Test incident',
        }
        const lines = service.formatFindResult(result, false)
        const output = lines.join('\n')

        expect(output).toContain('Task Details')
        expect(output).toContain('INC0010001')
        expect(output).toContain('task-001')
        expect(output).toContain('Test incident')
      })

      it('should format find result with all fields', () => {
        const result = {
          sys_id: 'task-001',
          number: 'INC0010001',
          short_description: 'Test incident',
          state: '1',
          priority: '2',
          assigned_to: 'admin',
          assignment_group: 'Service Desk',
          opened_at: '2025-01-01 12:00:00',
          sys_class_name: 'incident',
        }
        const lines = service.formatFindResult(result, false)
        const output = lines.join('\n')

        expect(output).toContain('State:             1')
        expect(output).toContain('Priority:          2')
        expect(output).toContain('Assigned To:       admin')
        expect(output).toContain('Assignment Group:  Service Desk')
        expect(output).toContain('Opened At:         2025-01-01 12:00:00')
        expect(output).toContain('Class:             incident')
      })

      it('should handle null result', () => {
        const lines = service.formatFindResult(null, false)
        const output = lines.join('\n')
        expect(output).toContain('No task found matching the specified number.')
      })

      it('should handle undefined result', () => {
        const lines = service.formatFindResult(undefined, false)
        const output = lines.join('\n')
        expect(output).toContain('No task found matching the specified number.')
      })

      it('should only show fields that are present', () => {
        const result = {
          sys_id: 'task-001',
          number: 'INC0010001',
        }
        const lines = service.formatFindResult(result, false)
        const output = lines.join('\n')

        expect(output).toContain('INC0010001')
        expect(output).toContain('task-001')
        expect(output).not.toContain('Description:')
        expect(output).not.toContain('State:')
        expect(output).not.toContain('Priority:')
      })
    })
  })
})
