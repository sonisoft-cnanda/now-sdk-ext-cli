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

describe('metadata output for applications we do not own', () => {
  const capture = {action: 'INSERT_OR_UPDATE', updateSetSysId: ID, updateSetName: 'Release <2026-Q4>', updateSetScope: ID,
    recordScope: ID, updateName: `sys_ui_section_${ID}`, preferencesUnchanged: true, preferenceRowsReplaced: [],
    currentUpdateSet: {before: ID, after: ID, switched: false}, customization: {storeApplication: true as const, replaceOnUpgrade: false, baselineVersion: true}}

  it('keeps update set names as the instance has them', () => {
    const result = new MetadataDisplayService().result({action: 'update', table: context.table, sysId: ID, scope: {scope: 'x_test', sysId: ID}, messages: ['<b>note</b>'], capture})
    expect(result.capture.updateSetName).toBe('Release <2026-Q4>')
    expect(result.messages).toEqual(['[omitted]note[omitted]'])
  })

  it('reports the update name and the upgrade-skip consequence', () => {
    const result = {action: 'update' as const, table: context.table, sysId: ID, scope: {scope: 'sn_test', sysId: ID}, messages: [], capture}
    const projected = new MetadataDisplayService().result(result)
    expect(projected.capture).toMatchObject({updateName: `sys_ui_section_${ID}`, customization: {storeApplication: true, replaceOnUpgrade: false, baselineVersion: true}})
    const lines = new MetadataDisplayService().success(projected).join('\n')
    expect(lines).toContain(`Update name: sys_ui_section_${ID}`)
    expect(lines).toContain('replace on upgrade false; vendor baseline true')
    expect(lines).toContain('Upgrades of this application will skip this file')
  })

  it.each([
    ['store_scope', '--acknowledge-upgrade-skip'],
    ['update_set_required', '--update-set'],
    ['update_set_not_current', 'nex update-set use'],
    ['protected_record', 'sys_policy'],
    ['section_not_supported', 'Form Layout UI'],
  ] as const)('tells the caller what to do about %s', (code, hint) => {
    const failure = projectMetadataError(new MetadataScopeError(code), context)
    expect(failure.remediation.join(' ')).toContain(hint)
    expect(new MetadataDisplayService().failure(failure).join('\n')).toContain(hint)
  })

  it('carries the sanitised refusal detail', () => {
    const failure = projectMetadataError(new MetadataScopeError('field_not_supported', {field: 'u_missing', table: 'incident'}), context)
    expect(failure.detail).toEqual({field: 'u_missing', table: 'incident'})
    expect(new MetadataDisplayService().failure(failure).join('\n')).toContain('Detail: {"field":"u_missing","table":"incident"}')
  })

  it('renders a layout and a verified layout change', () => {
    const display = new MetadataDisplayService()
    expect(display.layoutLines({section: ID, table: 'sn_test', view: '', caption: '', scope: ID, elements: ['name', '.split']}).join('\n'))
      .toMatch(/Default view[\s\S]*0 {2}name[\s\S]*1 {2}\.split/)
    const lines = display.layoutSuccess(display.layoutResult({section: ID, table: 'sn_test', view: '', scope: {sysId: ID, scope: 'sn_test'},
      elements: ['name', 'url'], previousElements: ['name', 'type'], capture})).join('\n')
    expect(lines).toContain('added: url; removed: type')
    expect(lines).toContain('Previous layout (to put it back): name,type')
    const repeated = display.layoutSuccess(display.layoutResult({section: ID, table: 'sn_test', view: '', scope: {sysId: ID, scope: 'sn_test'},
      elements: ['name', '.split', 'type', 'url'], previousElements: ['name', '.split', 'type', '.split', 'url'], capture})).join('\n')
    expect(repeated).toContain('added: (none); removed: .split')
    const moved = display.layoutSuccess(display.layoutResult({section: ID, table: 'sn_test', view: '', scope: {sysId: ID, scope: 'sn_test'},
      elements: ['name', 'description', 'owner'], previousElements: ['name', 'owner', 'description'], capture})).join('\n')
    expect(moved).toContain('added: (none); removed: (none); order changed')
    expect(lines).not.toContain('order changed')
    expect(repeated).not.toContain('order changed')
    const summary = (previousElements: string[], elements: string[]) => display.layoutSuccess(display.layoutResult({section: ID, table: 'sn_test',
      view: '', scope: {sysId: ID, scope: 'sn_test'}, elements, previousElements, capture})).join('\n')
    // Only a real move reports a reorder, whatever is added or removed alongside it, repeated splits included.
    for (const [before, after, changed] of [
      [['name', '.split', 'type'], ['name', '.split', 'type', '.split'], false],
      [['.split', 'a', '.split', 'b'], ['.split', 'a', 'b'], false],
      [['name', 'type'], ['name', 'url'], false],
      [['name', 'owner'], ['owner', 'priority', 'name'], true],
      [['name', 'owner', 'priority'], ['priority', 'name'], true],
      [['a', '.split', 'b', '.split', 'c'], ['a', '.split', 'c', '.split', 'b'], true],
    ] as const) expect(summary([...before], [...after]).includes('order changed')).toBe(changed)
  })
})
