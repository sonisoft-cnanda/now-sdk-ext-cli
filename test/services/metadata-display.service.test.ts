import {describe, expect, it} from '@jest/globals'
import {MetadataScopeError, MetadataVerificationError} from '@sonisoft/now-sdk-ext-core'

import {MetadataDisplayService, projectMetadataError} from '../../src/services/metadata-display.service.js'

const ID = 'a'.repeat(32)
const context = {action: 'insert', table: 'sys_script_include'}

describe('metadata output', () => {
  it.each(['scope_required', 'scope_unknown', 'scope_ambiguous', 'scope_mismatch', 'scope_not_applied',
    'store_scope', 'table_not_supported', 'field_not_supported', 'delete_not_supported', 'not_permitted',
    'csrf_token_unavailable', 'invalid_input', 'evidence_unavailable'] as const)('projects public refusal %s', code => {
    expect(projectMetadataError(new MetadataScopeError(code), context)).toMatchObject({code, writeAttempted: false})
  })

  it('preserves partial evidence, false values, and empty preferences', () => {
    const error = new MetadataVerificationError('session_changed', context.table, ID,
      {preferencesUnchanged: false, preferenceRowsReplaced: [], currentUpdateSet: {before: '', after: '', switched: false}}, [], false)
    Object.assign(error, {request: {password: 'fabricated-secret'}, cause: 'private-script', html: '<form>private</form>'})
    const safe = projectMetadataError(error, context)
    expect(safe).toMatchObject({code: 'session_changed', verification: 'failed', writeAttempted: false,
      capture: {preferencesUnchanged: false, preferenceRowsReplaced: [], currentUpdateSet: {before: '', after: '', switched: false}}})
    expect(safe.capture).not.toHaveProperty('updateSetSysId')
    expect(JSON.stringify(safe)).not.toMatch(/fabricated-secret|private-script|<form>/)
    expect(safe.remediation.join(' ')).toContain('Read its exact table/ID')
    expect(new MetadataDisplayService().failure(safe).join('\n')).toContain('Write attempted: false')
    expect(new MetadataDisplayService().failure(safe).join('\n')).toContain('"preferencesUnchanged":false')
  })

  it('reports refusal before submission and safe unknown errors', () => {
    expect(projectMetadataError(new MetadataScopeError('store_scope'), context)).toMatchObject({code: 'store_scope', writeAttempted: false})
    const safe = projectMetadataError(new Error('private-script password=secret'), context)
    expect(safe.message).toBe('Metadata command failed.')
    expect(safe).not.toHaveProperty('writeAttempted')
    expect(JSON.stringify(safe)).not.toContain('private-script')
    expect(projectMetadataError({remediation: 'Run nex auth doctor.'}, context).remediation).toEqual(['Run nex auth doctor.'])
  })

  it('renders a verified current-set change as success and distinguishes absent from empty', () => {
    const result = {action: 'insert' as const, table: context.table, sysId: ID, scope: {scope: 'x_test', sysId: ID}, messages: [],
      capture: {action: 'INSERT_OR_UPDATE', updateSetSysId: ID, updateSetName: 'Fixture', updateSetScope: ID,
        recordScope: ID, preferencesUnchanged: false, preferenceRowsReplaced: [], currentUpdateSet: {before: '', after: ID, switched: true}}}
    const lines = new MetadataDisplayService().success(result).join('\n')
    expect(lines).toContain('Verified metadata insert')
    expect(lines).toContain('Preferences unchanged: false')
    expect(lines).toContain('Current update set: "" ->')
    expect(lines).toContain('switched: true')
    expect(lines).toContain('Predicted update set: (not available)')
  })
})
