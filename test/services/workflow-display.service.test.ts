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

  describe('formatDefinition', () => {
    const definition: any = {
      workflowSysId: 'wf-1', versionSysId: 'v-1', name: 'Laptop Request', table: 'sc_req_item', description: '',
      condition: '', conditionType: '', published: false, active: true, checkedOut: '2026-10-04 10:00:00', checkedOutBy: 'u-1',
      start: 'a-b', fullSequences: [], stages: [],
      status: { readOnly: false, canCheckout: false, canForceCheckout: false, canPublish: true, statusDisplay: 'Checked out by me' },
      activities: [
        { sysId: 'a-b', name: 'Begin', definitionSysId: 'd-b', definitionName: 'Begin', x: 20, y: 20, input: '', variables: {},
          conditions: [{ sysId: 'c-b', name: 'Always' }] },
        { sysId: 'a-t', name: 'Wait', definitionSysId: 'd-t', definitionName: 'Timer', x: 200, y: 60, input: '{}',
          variables: { timer_type: 'script', script: 'answer =\n 10;', duration: '' }, conditions: [{ sysId: 'c-t', name: 'Always' }] },
        { sysId: 'a-e', name: 'End', definitionSysId: 'd-e', definitionName: 'End', input: '', variables: {}, conditions: [] },
      ],
      transitions: [
        { sysId: 't-1', from: 'a-b', to: 'a-t', condition: 'c-b' },
        { sysId: 't-2', from: 'a-t', to: 'a-e', condition: 'c-t' },
      ],
    }

    it('shows activities with exits and non-empty variables, and named transitions', () => {
      const text = service.formatDefinition(definition, false).join('\n')
      expect(text).toContain('=== Workflow: Laptop Request ===')
      expect(text).toContain('v-1 (draft)')
      expect(text).toContain('Status:           Checked out by me')
      expect(text).toContain('Wait  [Timer]  a-t @ 200,60')
      expect(text).toContain('timer_type = script')
      expect(text).toContain('script = answer = 10;')
      expect(text).not.toContain('duration =')
      expect(text).not.toContain('input = {}')
      expect(text).toContain('Begin -[Always]-> Wait  (t-1)')
      expect(text).toContain('Wait -[Always]-> End  (t-2)')
    })

    it('can hide variables, and returns JSON when asked', () => {
      expect(service.formatDefinition(definition, false, false).join('\n')).not.toContain('timer_type')
      expect(JSON.parse(service.formatDefinition(definition, true)[0]).versionSysId).toBe('v-1')
    })
  })

  describe('formatActivityType', () => {
    it('lists variables with choices, references and defaults, and the starting exits', () => {
      const text = service.formatActivityType({
        sysId: 'd-t', name: 'Timer', category: 'Timers', sysClassName: 'wf_activity_definition', defaultConditions: [], description: '', attributes: '',
        variables: [
          { sysId: '1', model: 'm', element: 'timer_type', label: 'Timer based on', internalType: 'string', defaultValue: '', mandatory: false, order: 1,
            choices: [{ value: '', label: 'A user specified duration' }, { value: 'script', label: 'Script' }] },
          { sysId: '2', model: 'm', element: 'relative_duration', label: 'Relative duration', internalType: 'reference', defaultValue: '', mandatory: true, order: 2, reference: 'cmn_relative_duration' },
          { sysId: '3', model: 'm', element: 'script', label: 'Script', internalType: 'script', defaultValue: 'answer = 0;', mandatory: false, order: 3 },
        ],
      }, false).join('\n')
      expect(text).toContain('Exits:      Always (true)')
      expect(text).toContain("choices: '' (A user specified duration) | script (Script)")
      expect(text).toContain('(mandatory)')
      expect(text).toContain('reference: cmn_relative_duration')
      expect(text).toContain('default: answer = 0;')
    })
  })

  describe('formatWorkflowList', () => {
    it('describes who holds a checkout', () => {
      const text = service.formatWorkflowList([
        { sysId: 'wf-1', name: 'Mine', table: 'incident', description: '', active: true, publishedVersionSysId: 'v',
          checkedOutVersion: { sysId: 'd', checkedOutBy: 'u', checkedOutOn: '', byCurrentUser: true } },
        { sysId: 'wf-2', name: 'Theirs', table: 'incident', description: '', active: false,
          checkedOutVersion: { sysId: 'd2', checkedOutBy: 'u2', checkedOutByName: 'Pat', checkedOutOn: '', byCurrentUser: false } },
      ], false).join('\n')
      expect(text).toContain('(published, checked out by you)')
      expect(text).toContain('(unpublished, checked out by Pat, inactive)')
    })
  })

  describe('formatPublish / formatValidation', () => {
    const warning = { type: 'ValidateTransitionIn', level: 'Warn', message: 'Missing input', details: 'result=invalid\nmsg=Missing transition into activity Orphan.' }

    it('lists accepted warnings', () => {
      const text = service.formatPublish({ versionSysId: 'v-1', warnings: [warning], fullSequences: [] }, false).join('\n')
      expect(text).toContain('Published with warnings:')
      expect(text).toContain('[Warn] ValidateTransitionIn: Missing input')
    })

    it('shows non-info findings with their detail line', () => {
      const text = service.formatValidation({
        versionSysId: 'v-1', summary: 'Validate Summary - contains Warnings', valid: false,
        items: [{ type: 'ValidateSingleEnd', level: 'Info', message: 'ok', details: '' }, warning],
      }, false).join('\n')
      expect(text).toContain('Validate Summary - contains Warnings')
      expect(text).not.toContain('ValidateSingleEnd')
      expect(text).toContain('Missing transition into activity Orphan.')
    })
  })

  describe('formatChange / formatCheckout / formatNewWorkflow', () => {
    it('prints details and skips undefined ones', () => {
      expect(service.formatChange('Activity added.', { activity: 'a-1', exits: ['Yes', 'No'], transitions: undefined }, false))
        .toEqual(['\nActivity added.', '  activity         a-1', '  exits            Yes, No'])
      expect(JSON.parse(service.formatChange('Done.', { x: 1 }, true)[0])).toEqual({ message: 'Done.', success: true, x: 1 })
    })

    it('says whether a checkout reused a draft', () => {
      expect(service.formatCheckout({ workflowSysId: 'wf', versionSysId: 'v', alreadyCheckedOut: true }, 'WF', false).join('\n'))
        .toContain('You already had this draft checked out.')
      expect(service.formatNewWorkflow({ workflowSysId: 'wf', versionSysId: 'v', beginActivitySysId: 'b', endActivitySysId: 'e',
        beginConditionSysId: 'c', transitionSysId: 't' }, 'WF', false).join('\n')).toContain('checked out to you')
    })
  })
})

