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
    ['domain_not_supported', 'global domain'],
    ['column_exists', 'Choose another name'],
    ['table_not_supported', 'schema tables'],
  ] as const)('tells the caller what to do about %s', (code, hint) => {
    const failure = projectMetadataError(new MetadataScopeError(code), context)
    expect(failure.remediation.join(' ')).toContain(hint)
    expect(new MetadataDisplayService().failure(failure).join('\n')).toContain(hint)
  })

  it('points an invalid option value at the option, and keeps the update set remedy otherwise', () => {
    expect(projectMetadataError(new MetadataScopeError('invalid_input', {field: 'label'}), {action: 'column add'}).remediation)
      .toEqual(['The value for label is not valid: check its format and limits in the command help.'])
    expect(projectMetadataError(new MetadataScopeError('invalid_input', {updateSetState: 'complete'}), {action: 'column add'}).remediation[0])
      .toContain('In progress update set')
  })

  it('calls a refused read a read, not a write', () => {
    expect(projectMetadataError(new MetadataScopeError('invalid_input'), {action: 'list-layout get'}).message).toBe('Metadata read refused: invalid_input.')
    expect(projectMetadataError(new MetadataScopeError('invalid_input'), {action: 'list-layout set'}).message)
      .toBe('Metadata write refused before submission: invalid_input.')
  })

  it('carries the sanitised refusal detail', () => {
    const failure = projectMetadataError(new MetadataScopeError('field_not_supported', {field: 'u_missing', table: 'incident'}), context)
    expect(failure.detail).toEqual({field: 'u_missing', table: 'incident'})
    expect(new MetadataDisplayService().failure(failure).join('\n')).toContain('Detail: {"field":"u_missing","table":"incident"}')
  })

  it('renders a list layout and a verified list change', () => {
    const display = new MetadataDisplayService()
    expect(display.listLayoutLines(display.listLayout({table: 'cmn_cost_center', view: '', exists: true, scope: 'global',
      sysId: ID, updateName: 'sys_ui_list_cmn_cost_center_null', columns: ['name', 'code']})).join('\n')).toMatch(/Default view[\s\S]*List: a+;[\s\S]*0 {2}name[\s\S]*1 {2}code/)
    expect(display.listLayoutLines({table: 't', view: 'ess', exists: false, columns: []}).join('\n')).toContain('no list of its own')
    const result = (previousColumns: string[], columns: string[], created = false) => display.listLayoutSuccess(display.listLayoutResult({table: 't',
      view: '', scope: {sysId: 'global', scope: 'global'}, sysId: ID, created, columns, previousColumns, capture})).join('\n')
    expect(result(['name', 'code'], ['name', 'manager'])).toContain('added: manager; removed: code')
    expect(result(['name', 'code'], ['code', 'name'])).toContain('order changed')
    expect(result(['name', 'code'], ['name', 'code', 'manager'])).not.toContain('order changed')
    expect(result(['name', 'code'], ['name'])).toContain('Previous columns (to put them back): name,code')
    const created = result([], ['name'], true)
    expect(created).toContain('created: the table had no list of its own')
    expect(created).toContain(`delete the new sys_ui_list row ${ID}`)
    expect(created).toContain('move its DELETE capture')
    expect(result(['name'], ['name', 'code'])).toContain(`List: ${ID}`)
  })

  it('renders a verified column, placed or not, without server markup', () => {
    const display = new MetadataDisplayService()
    const column = (formSections: string[]) => display.columnSuccess(display.columnResult({table: 'x_acme_ticket', column: 'triage_note', sysId: ID,
      label: 'Triage\u0007 note', type: 'string', scope: {sysId: ID, scope: 'x_acme'}, formSections, messages: ['<b>saved</b>'],
      captures: ['sys_dictionary_x_acme_ticket_triage_note', 'sys_documentation_x_acme_ticket_triage_note_en'], capture})).join('\n')
    const placed = column([ID])
    expect(placed).toContain('Verified column: x_acme_ticket.triage_note (string) labelled "Triage  note"')
    expect(placed).toContain(`appended to the end of section ${ID}`)
    expect(placed).toContain('nex metadata layout set')
    expect(placed).toContain('Captures: sys_dictionary_x_acme_ticket_triage_note, sys_documentation_x_acme_ticket_triage_note_en')
    expect(placed).toContain('[omitted]saved[omitted]')
    expect(placed).toContain('does not remove columns')
    const unplaced = column([])
    expect(unplaced).toContain('Form: not placed by this save')
    expect(unplaced).toContain('another application\'s table')
    expect(unplaced).toContain('already on the form')
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

  it('renders a choice list, its column setting and a verified choice change, without server markup', () => {
    const display = new MetadataDisplayService()
    const choice = (value: string, label: string, sequence?: number, inactive = false) => ({sysId: ID, value, label, inactive, hint: '', dependentValue: '',
      language: 'en', ...(sequence === undefined ? {} : {sequence})})
    const column = {table: 'x_acme_ticket', type: 'integer', choice: '1', scope: ID}
    const list = display.choiceList({table: 'x_acme_ticket', element: 'severity', language: 'en', column,
      choiceSet: {sysId: ID, scope: ID, updateName: 'sys_choice_x_acme_ticket_severity'}, choices: [choice('1', 'Low\u0007', 1), choice('9', 'Old', undefined, true)]})
    const lines = display.choiceListLines(list).join('\n')
    expect(lines).toContain('Choice list: x_acme_ticket.severity (en), 2 choice(s)')
    expect(lines).toContain('Choice: dropdown with -- None --')
    expect(lines).toContain(`Choice set: ${ID}; scope: ${ID} (change it with --scope-id ${ID}); update name: sys_choice_x_acme_ticket_severity`)
    expect(display.choiceListLines({...list, choiceSet: {sysId: ID, scope: 'global', updateName: 'n'}}).join('\n')).toContain('(change it with --scope global)')
    for (const [setting, text] of [['2', 'Choice: suggestion'], ['3', 'Choice: dropdown without -- None --'], ['0', 'Choice: none, so the form shows a plain field']]) {
      expect(display.choiceListLines({...list, column: {...column, choice: setting}}).join('\n')).toContain(text)
    }

    expect(display.choiceList({...list, choices: [{...choice('1', 'Low', 1), hint: 'a\u001B[2Jb'}]}).choices[0].hint).toBe('a [2Jb')
    expect(lines).toMatch(/ {4}1 {2}"1" "Low "/)
    expect(lines).toMatch(/ {4}- {2}"9" "Old" \(inactive\)/)
    const plain = display.choiceListLines({...list, column: {...column, choice: ''}, choiceSet: undefined}).join('\n')
    expect(plain).toContain('Choice: none, so the form shows a plain field')
    expect(plain).toContain(`the first choice creates one in the column's application (--scope-id ${ID})`)
    expect(display.choiceListLines({...list, column: {...column, table: 'task'}, choiceSet: undefined}).join('\n')).toContain('shows task\'s list')

    const result = (extra: object) => display.choiceSuccess(display.choiceResult({table: 'x_acme_ticket', element: 'severity', language: 'en', value: '2',
      sysId: ID, column, scope: {sysId: ID, scope: 'x_acme'}, capture, messages: ['<b>saved</b>'], choices: [choice('1', 'Low', 1), choice('2', 'Two', 2)],
      choiceSet: {sysId: ID, scope: ID, updateName: 'sys_choice_x_acme_ticket_severity', created: false}, action: 'insert', ...extra})).join('\n')
    const added = result({choice: choice('2', 'Two', 2), choiceSet: {sysId: ID, scope: ID, updateName: 'n', created: true}})
    expect(added).toContain(`Verified choice added: x_acme_ticket.severity value "2" (en); choice ${ID}`)
    expect(added).toContain('created by this save')
    expect(added).toContain('List now (2):')
    expect(added).toContain('[omitted]saved[omitted]')
    expect(added).toContain('Capture: INSERT_OR_UPDATE')
    const changed = result({action: 'update', previous: choice('2', 'Too', 5), choice: choice('2', 'Two', 2, true)})
    expect(changed).toMatch(/Before: +5 {2}"2" "Too"/)
    expect(changed).toMatch(/After: +2 {2}"2" "Two" \(inactive\)/)
    const removed = result({action: 'delete', previous: choice('2', 'Two', 2), inUse: 3, choiceSet: undefined, choices: []})
    expect(removed).toContain('Verified choice removed')
    expect(removed).toContain('Records holding the value: 3 (they keep it)')
    expect(removed).toContain('Choice set: none left')
    const emptied = result({action: 'delete', previous: choice('2', 'Two', 2), inUse: 0, choices: []})
    expect(emptied).toContain(`Choice set: ${ID}; scope: x_acme (${ID})`)
    expect(emptied).toContain('List now (0):')
    expect(emptied).toContain('Records holding the value: 0')
    expect(emptied).not.toContain('they keep it')
  })

  it.each([
    ['choice_in_use', '--inactive'],
    ['choice_list_inherited', '--table <detail.table>'],
    ['choice_not_found', 'nex metadata choice get'],
    ['choice_ambiguous', 'in the UI'],
    ['choice_unchanged', 'nothing was posted'],
    ['column_not_found', 'prefix included'],
    ['scope_mismatch', 'pass it as --scope-id'],
  ] as const)('gives %s its own remediation', (code, text) => {
    const failure = projectMetadataError(new MetadataScopeError(code, {table: 'task', field: 'approval', records: 3}), {action: 'choice set'})
    expect(failure.remediation[0]).toContain(text)
    expect(failure).toMatchObject({code, writeAttempted: false})
  })
})
