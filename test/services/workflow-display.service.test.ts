import { describe, it, expect } from '@jest/globals'
import { WorkflowDisplayService } from '../../src/services/workflow-display.service.js'

describe('WorkflowDisplayService', () => {
  const service = new WorkflowDisplayService()

  describe('formatWorkflowResult', () => {
    const mockResult = {
      workflowSysId: 'wf-001',
      versionSysId: 'wfv-001',
      activitySysIds: { '0': 'act-001', '1': 'act-002' },
      transitionSysIds: ['tr-001'],
      published: false,
    }

    describe('JSON output', () => {
      it('should return result as JSON string', () => {
        const lines = service.formatWorkflowResult(mockResult, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.workflowSysId).toBe('wf-001')
        expect(parsed.versionSysId).toBe('wfv-001')
        expect(parsed.activitySysIds['0']).toBe('act-001')
        expect(parsed.activitySysIds['1']).toBe('act-002')
        expect(parsed.transitionSysIds).toHaveLength(1)
        expect(parsed.transitionSysIds[0]).toBe('tr-001')
        expect(parsed.published).toBe(false)
      })

      it('should handle result with no transitions', () => {
        const noTransitions = { ...mockResult, transitionSysIds: [] }
        const lines = service.formatWorkflowResult(noTransitions, true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.transitionSysIds).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should display header', () => {
        const lines = service.formatWorkflowResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Workflow Created')
      })

      it('should display workflow sys id', () => {
        const lines = service.formatWorkflowResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('wf-001')
      })

      it('should display version sys id', () => {
        const lines = service.formatWorkflowResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('wfv-001')
      })

      it('should display activity count and ids', () => {
        const lines = service.formatWorkflowResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Activities:       2')
        expect(output).toContain('act-001')
        expect(output).toContain('act-002')
      })

      it('should display transition count and ids', () => {
        const lines = service.formatWorkflowResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Transitions:      1')
        expect(output).toContain('tr-001')
      })

      it('should display published status', () => {
        const lines = service.formatWorkflowResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Published:        false')
      })

      it('should display success message', () => {
        const lines = service.formatWorkflowResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Workflow creation completed successfully')
      })
    })
  })

  describe('formatPublishResult', () => {
    describe('JSON output', () => {
      it('should return success JSON', () => {
        const lines = service.formatPublishResult(true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.message).toBe('Workflow published successfully.')
      })
    })

    describe('text output', () => {
      it('should display header', () => {
        const lines = service.formatPublishResult(false)
        const output = lines.join('\n')
        expect(output).toContain('Workflow Published')
      })

      it('should display success message', () => {
        const lines = service.formatPublishResult(false)
        const output = lines.join('\n')
        expect(output).toContain('Workflow version published successfully')
      })
    })
  })
})
