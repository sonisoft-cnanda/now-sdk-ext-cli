import {describe, expect, it} from '@jest/globals'
import {WorkingSetError} from '@sonisoft/now-sdk-ext-core'

import {projectWorkingSetError, WorkingSetDisplayService} from '../../src/services/working-set-display.service.js'

const SET = 'a'.repeat(32), APP = 'b'.repeat(32), OTHER = 'c'.repeat(32)
const summary = {sysId: SET, name: 'STORY-1 <form>', state: 'in progress', application: APP, isDefault: false}

describe('working set output', () => {
  it('projects a refusal with its detail and a remedy', () => {
    const failure = projectWorkingSetError(new WorkingSetError('capture_count_mismatch', {expected: 2, actual: 3}), 'complete')
    expect(failure).toMatchObject({action: 'complete', code: 'capture_count_mismatch', detail: {expected: 2, actual: 3}, type: 'WorkingSetError'})
    expect(failure.remediation[0]).toContain('List them again')
    expect(new WorkingSetDisplayService().failure(failure).join('\n')).toContain('Detail: {"expected":2,"actual":3}')
  })

  it('has a remedy for every core code', () => {
    for (const code of ['invalid_input', 'evidence_unavailable', 'update_set_not_found', 'update_set_exists', 'application_not_found',
      'create_not_applied', 'application_not_applied', 'update_set_closed', 'default_update_set', 'working_set_not_applied',
      'no_single_default', 'capture_not_in_source', 'scope_mismatch', 'duplicate_capture', 'newer_capture_exists', 'move_not_applied',
      'capture_count_mismatch', 'mixed_scope_capture', 'update_set_in_use', 'complete_not_applied', 'script_result_unavailable'] as const) {
      expect(projectWorkingSetError(new WorkingSetError(code), 'use').remediation[0]).not.toContain('Read the update set and preferences back')
    }
  })

  it('prints the restore command after use and warns after completion', () => {
    const display = new WorkingSetDisplayService()
    const used = display.used({previous: {application: 'global', updateSet: OTHER}, current: {application: APP, updateSet: SET}, updateSet: summary}).join('\n')
    expect(used).toContain(`nex update-set restore --application global --update-set ${OTHER}`)
    expect(used).toContain('STORY-1 <form>')
    expect(display.completed({...summary, state: 'complete'}).join('\n')).toContain('restore your previous working set')
    expect(display.restored({restored: {application: APP, updateSet: SET}, fallback: 'application_default'}).join('\n')).toContain('Default is current')
  })
})
