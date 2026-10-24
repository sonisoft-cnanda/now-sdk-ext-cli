import {afterEach, describe, expect, it, jest} from '@jest/globals'
import {Command} from '@oclif/core'
import {ChoiceWriter, ColumnWriter, FormLayoutWriter, ListLayoutWriter, MetadataFormWriter, MetadataScopeError, policyRefusal} from '@sonisoft/now-sdk-ext-core'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {metadataOptions} from '../../../src/common/metadata-command.js'
import MetadataInsert from '../../../src/commands/metadata/insert.js'
import MetadataUpdate from '../../../src/commands/metadata/update.js'
import MetadataDelete from '../../../src/commands/metadata/delete.js'
import MetadataLayoutGet from '../../../src/commands/metadata/layout/get.js'
import MetadataLayoutSet, {layoutElements} from '../../../src/commands/metadata/layout/set.js'
import MetadataListLayoutGet from '../../../src/commands/metadata/list-layout/get.js'
import MetadataListLayoutSet, {listColumns} from '../../../src/commands/metadata/list-layout/set.js'
import MetadataColumnAdd from '../../../src/commands/metadata/column/add.js'
import MetadataColumnRemove from '../../../src/commands/metadata/column/remove.js'
import MetadataChoiceGet from '../../../src/commands/metadata/choice/get.js'
import MetadataChoiceRemove from '../../../src/commands/metadata/choice/remove.js'
import MetadataChoiceSet from '../../../src/commands/metadata/choice/set.js'
import {AuthenticatedCommand} from '../../../src/common/authenticated-command.js'

const ID = 'a'.repeat(32)
const flags = {table: 'sys_script_include', scope: 'x_test', fields: '{"active":false}', 'sys-id': ID}
afterEach(() => jest.restoreAllMocks())

describe('metadata CLI inputs', () => {
  it.each([
    [{scope: undefined}, 'exactly one'],
    [{'scope-id': ID}, 'exactly one'],
    [{scope: undefined, 'scope-id': 'abc'}, 'invalid identifier'],
    [{table: 'sys_scope^ORname=foo'}, 'invalid identifier'],
    [{'sys-id': 'abc'}, 'invalid identifier'],
    [{'update-set': 'abc'}, 'invalid identifier'],
    [{scope: ' x_test '}, 'invalid identifier'],
    [{fields: '[]'}, 'JSON object'],
    [{fields: 'null'}, 'JSON object'],
    [{fields: '{"script":"secret-script",'}, 'valid JSON'],
    [{fields: '{"__proto__":{}}'}, 'prohibited key'],
    [{fields: '{"constructor":"value"}'}, 'prohibited key'],
    [{fields: '{"name":{"unexpected":1}}'}, 'unsupported value'],
    [{fields: '{"duration":{"seconds":"3"}}'}, 'unsupported value'],
    [{fields: '{"duration":{}}'}, 'unsupported value'],
    [{fields: '{"duration":{"seconds":-1}}'}, 'unsupported value'],
    [{fields: '{"number":1e1000}'}, 'unsupported value'],
    [{fields: '{"list":[1]}'}, 'unsupported value'],
    [{fields: '{}'}, 'Supply fields'],
    [{fields: undefined}, 'Supply fields'],
    [{'fields-file': 'missing.json'}, 'one fields source'],
    [{'variable-field': 'inputs'}, 'requires variables'],
    [{variables: '{}', 'variables-file': 'missing.json'}, 'one variables source'],
  ])('rejects invalid input %j without echoing content', async (overrides, message) => {
    await expect(metadataOptions({...flags, ...overrides}, 'update')).rejects.toThrow(message)
  })

  it.each(['insert', 'update'] as const)('checks the initial query grammar for %s', async action => {
    const invalid = ['name=test^ORactive=true', 'name=test^NQactive=true', 'ORDERBYname=x',
      'ORDERBYDESCname=x', 'name!=x', 'nameLIKEfoo', 'name>1', 'sys_scope=global',
      'constructor=x', 'prototype=x', '__proto__=x', '', '^name=x', 'name=x^', 'name=x^^active=true',
      'Name=x', 'name=JavaScript:gs.getUserID()', 'name=x\n', 'name=x\u0000', 'name=x\u0085']
    for (const query of invalid) {
      await expect(metadataOptions({...flags, 'initial-query': query}, action)).rejects.toThrow('literal equality')
    }

    for (const query of ['name=Example^active=false', 'order=1', 'name=', 'name=a=b']) {
      expect(await metadataOptions({...flags, 'initial-query': query}, action)).toMatchObject({initialQuery: query})
    }
  })

  it('preserves all supported JSON values and maps the explicit scope', async () => {
    const values = {active: false, count: 0, duration: {days: 1, seconds: 2}, empty: null, list: ['one', 'two']}
    expect(await metadataOptions({...flags, fields: JSON.stringify(values), 'update-set': ID}, 'insert'))
      .toEqual({fields: values, scope: {scope: 'x_test'}, updateSet: ID})
    expect(await metadataOptions({...flags, scope: 'global'}, 'insert')).toMatchObject({scope: 'global'})
    expect(await metadataOptions({...flags, scope: undefined, 'scope-id': ID}, 'insert')).toMatchObject({scope: {sysId: ID}})
  })

  it('reads file input without printing paths or file contents on failure', async () => {
    const directory = await mkdtemp(join(process.env.PAPERCLIP_SCRATCH_DIR || tmpdir(), 'metadata-input-'))
    try {
      const file = join(directory, 'fields.json')
      await writeFile(file, '{"active":false}')
      expect(await metadataOptions({...flags, fields: undefined, 'fields-file': file}, 'update')).toMatchObject({fields: {active: false}})
      await writeFile(file, 'secret-script-not-json')
      await expect(metadataOptions({...flags, fields: undefined, 'fields-file': file}, 'update')).rejects.toThrow('valid JSON')
      await expect(metadataOptions({...flags, fields: undefined, 'fields-file': join(directory, 'missing')}, 'update')).rejects.toThrow('Cannot read the fields file.')
    } finally {
      await rm(directory, {force: true, recursive: true})
    }
  })

  it('supports variable-only and initial-query-only writes', async () => {
    expect(await metadataOptions({...flags, fields: undefined, variables: '{"script":"value"}', 'variable-field': 'inputs'}, 'insert'))
      .toEqual({scope: {scope: 'x_test'}, variables: {script: 'value'}, variableField: 'inputs'})
    expect(await metadataOptions({...flags, fields: undefined, 'initial-query': 'name=Example'}, 'update'))
      .toEqual({scope: {scope: 'x_test'}, initialQuery: 'name=Example'})
  })

  it('requires exact confirmation and no fields for delete', async () => {
    const deletion = {table: flags.table, scope: flags.scope, 'sys-id': ID, 'confirm-table': flags.table, 'confirm-sys-id': ID}
    expect(await metadataOptions(deletion, 'delete')).toEqual({scope: {scope: 'x_test'}, confirm: {table: flags.table, sysId: ID}})
    for (const mismatch of [{'confirm-table': flags.table.toUpperCase()}, {'confirm-sys-id': ID.toUpperCase()}, {'confirm-sys-id': `${ID} `}]) {
      await expect(metadataOptions({...deletion, ...mismatch}, 'delete')).rejects.toThrow('exactly')
    }
  })
})

describe('metadata writer dispatch', () => {
  it.each([
    [MetadataInsert, 'insert'], [MetadataUpdate, 'update'], [MetadataDelete, 'delete'],
  ] as const)('calls only the requested writer method for %s', async (Command, action) => {
    const result = {table: flags.table, sysId: ID, action, scope: {scope: 'x_test', sysId: ID}, messages: [],
      capture: {action: 'INSERT_OR_UPDATE', updateSetSysId: ID, updateSetName: 'Test', updateSetScope: ID,
        recordScope: ID, preferencesUnchanged: false, preferenceRowsReplaced: [], currentUpdateSet: {before: '', after: ID, switched: true}}}
    const methods = Object.fromEntries(['insert', 'update', 'delete'].map(name =>
      [name, jest.spyOn(MetadataFormWriter.prototype, name as 'insert').mockResolvedValue(result)]))
    const command = Object.create(Command.prototype)
    Object.assign(command, {metadataAction: action, flags: {...flags, 'confirm-table': flags.table, 'confirm-sys-id': ID}, instance: {}})
    command.jsonEnabled = () => true
    await expect(command.run()).resolves.toEqual(result)
    expect(methods[action]).toHaveBeenCalledTimes(1)
    for (const other of ['insert', 'update', 'delete'].filter(name => name !== action)) expect(methods[other]).not.toHaveBeenCalled()
    const options = methods[action].mock.calls[0].at(-1)
    expect(options).not.toHaveProperty('allowMixedScopeCapture')
  })
})

describe('metadata writes in applications we do not own', () => {
  it('maps --acknowledge-upgrade-skip to the Store opt-in and leaves it off otherwise', async () => {
    expect(await metadataOptions({...flags, 'acknowledge-upgrade-skip': true, 'update-set': ID}, 'update'))
      .toMatchObject({storeCustomization: {acknowledgeUpgradeSkip: true}, updateSet: ID})
    expect(await metadataOptions({...flags, 'acknowledge-upgrade-skip': false}, 'update')).not.toHaveProperty('storeCustomization')
  })

  it('takes a whole layout from the flag or a JSON file', async () => {
    expect(await layoutElements({elements: 'name, .begin_split ,url,.formatter.' + ID})).toEqual(['name', '.begin_split', 'url', `.formatter.${ID}`])
    for (const elements of ['', 'name,,url', 'name;drop', 'a b']) await expect(layoutElements({elements})).rejects.toThrow('whole layout')
    await expect(layoutElements({'elements-file': 'missing.json'})).rejects.toThrow('JSON array')
  })

  it('reads and writes a layout through FormLayoutWriter', async () => {
    const layout = {section: ID, table: 'sn_test', view: '', caption: '', scope: ID, elements: ['name']}
    const get = jest.spyOn(FormLayoutWriter.prototype, 'getFormLayout').mockResolvedValue(layout)
    const reader = Object.assign(Object.create(MetadataLayoutGet.prototype), {flags: {section: ID}, instance: {}, jsonEnabled: () => true})
    await expect(reader.run()).resolves.toEqual(layout)
    expect(get).toHaveBeenCalledWith(ID)
    const result = {section: ID, table: 'sn_test', view: '', scope: {sysId: ID, scope: 'sn_test'}, elements: ['name', 'url'], previousElements: ['name'],
      capture: {action: 'INSERT_OR_UPDATE', updateSetSysId: ID, updateSetName: 'S', updateSetScope: ID, recordScope: ID, preferencesUnchanged: true,
        preferenceRowsReplaced: [], currentUpdateSet: {switched: false}}}
    const set = jest.spyOn(FormLayoutWriter.prototype, 'setFormLayout').mockResolvedValue(result)
    const writer = Object.assign(Object.create(MetadataLayoutSet.prototype), {instance: {}, jsonEnabled: () => true,
      flags: {section: ID, elements: 'name,url', 'scope-id': ID, 'update-set': ID, 'acknowledge-upgrade-skip': true}})
    await expect(writer.run()).resolves.toMatchObject({elements: ['name', 'url']})
    expect(set).toHaveBeenCalledWith(ID, {elements: ['name', 'url'], scope: {sysId: ID}, updateSet: ID, storeCustomization: {acknowledgeUpgradeSkip: true}})
  })
})

describe('metadata list-layout', () => {
  it('takes a whole column list from the flag or a JSON file', async () => {
    expect(await listColumns({columns: 'name, caller_id.email ,state'})).toEqual(['name', 'caller_id.email', 'state'])
    for (const columns of ['', 'name,,state', 'name;drop', 'a b', '.split', 'name.']) await expect(listColumns({columns})).rejects.toThrow('whole column list')
    await expect(listColumns({'columns-file': 'missing.json'})).rejects.toThrow('JSON array')
    const dir = await mkdtemp(join(tmpdir(), 'nex-list-'))
    try {
      await writeFile(join(dir, 'c.json'), '["name","code"]')
      expect(await listColumns({'columns-file': join(dir, 'c.json')})).toEqual(['name', 'code'])
      await writeFile(join(dir, 'bad.json'), '{"name":1}')
      await expect(listColumns({'columns-file': join(dir, 'bad.json')})).rejects.toThrow('whole column list')
    } finally {
      await rm(dir, {force: true, recursive: true})
    }
  })

  it('reads and writes a list through ListLayoutWriter', async () => {
    const layout = {table: 'cmn_cost_center', view: '', exists: true, scope: 'global', updateName: 'sys_ui_list_cmn_cost_center_null', columns: ['name']}
    const get = jest.spyOn(ListLayoutWriter.prototype, 'getListLayout').mockResolvedValue(layout)
    const reader = Object.assign(Object.create(MetadataListLayoutGet.prototype), {flags: {table: 'cmn_cost_center', view: 'ess'}, instance: {}, jsonEnabled: () => true})
    await expect(reader.run()).resolves.toEqual(layout)
    expect(get).toHaveBeenCalledWith('cmn_cost_center', 'ess')
    const result = {table: 'cmn_cost_center', view: '', scope: {sysId: 'global', scope: 'global'}, sysId: ID, previousSysId: ID, created: false,
      columns: ['name', 'code'], previousColumns: ['name'],
      capture: {action: 'INSERT_OR_UPDATE', updateSetSysId: ID, updateSetName: 'S', updateSetScope: 'global', recordScope: 'global', preferencesUnchanged: true,
        preferenceRowsReplaced: [], currentUpdateSet: {switched: false}}}
    const set = jest.spyOn(ListLayoutWriter.prototype, 'setListLayout').mockResolvedValue(result)
    const writer = Object.assign(Object.create(MetadataListLayoutSet.prototype), {instance: {}, jsonEnabled: () => true,
      flags: {table: 'cmn_cost_center', columns: 'name,code', scope: 'global', 'update-set': ID}})
    await expect(writer.run()).resolves.toMatchObject({columns: ['name', 'code'], created: false})
    expect(set).toHaveBeenCalledWith('cmn_cost_center', {columns: ['name', 'code'], scope: 'global', updateSet: ID, view: ''})
    const store = Object.assign(Object.create(MetadataListLayoutSet.prototype), {instance: {}, jsonEnabled: () => true,
      flags: {table: 'sn_grc_indicator', columns: 'name', 'scope-id': ID, 'update-set': ID, view: 'sow', 'acknowledge-upgrade-skip': true}})
    await store.run()
    expect(set).toHaveBeenLastCalledWith('sn_grc_indicator', {columns: ['name'], scope: {sysId: ID}, updateSet: ID, view: 'sow',
      storeCustomization: {acknowledgeUpgradeSkip: true}})
    const plain = Object.assign(Object.create(MetadataListLayoutGet.prototype), {flags: {table: 'cmn_cost_center'}, instance: {}, jsonEnabled: () => true})
    await plain.run()
    expect(get).toHaveBeenLastCalledWith('cmn_cost_center', '')
  })

  it.each([
    [{table: 'bad^table'}, 'invalid identifier'],
    [{view: 'a^b'}, 'invalid identifier'],
    [{'update-set': 'abc'}, 'invalid identifier'],
    [{scope: undefined}, 'exactly one'],
  ])('refuses %o before any request', async (extra, message) => {
    const set = jest.spyOn(ListLayoutWriter.prototype, 'setListLayout')
    const writer = Object.assign(Object.create(MetadataListLayoutSet.prototype), {instance: {}, jsonEnabled: () => true,
      flags: {table: 'cmn_cost_center', columns: 'name', scope: 'global', 'update-set': ID, ...extra}})
    await expect(writer.run()).rejects.toThrow(message)
    expect(set).not.toHaveBeenCalled()
  })
})

describe('metadata column add', () => {
  const result = {table: 'x_acme_ticket', column: 'triage_note', sysId: ID, label: 'Triage note', type: 'string', scope: {sysId: ID, scope: 'x_acme'},
    formSections: [ID], captures: ['sys_dictionary_x_acme_ticket_triage_note', 'sys_documentation_x_acme_ticket_triage_note_en', `sys_ui_section_${ID}`], messages: [],
    capture: {action: 'INSERT_OR_UPDATE', updateSetSysId: ID, updateSetName: 'S', updateSetScope: ID, recordScope: ID, preferencesUnchanged: true,
      preferenceRowsReplaced: [], currentUpdateSet: {switched: false}}}
  const command = (extra: object) => Object.assign(Object.create(MetadataColumnAdd.prototype), {instance: {}, jsonEnabled: () => true,
    flags: {table: 'x_acme_ticket', column: 'triage_note', label: 'Triage note', type: 'string', scope: 'x_acme', 'update-set': ID, ...extra}})

  it('adds a column through ColumnWriter with the scope, set and options given', async () => {
    const add = jest.spyOn(ColumnWriter.prototype, 'addColumn').mockResolvedValue(result)
    await expect(command({'max-length': 100}).run()).resolves.toMatchObject({column: 'triage_note', formSections: [ID]})
    expect(add).toHaveBeenCalledWith('x_acme_ticket', {column: 'triage_note', label: 'Triage note', type: 'string', maxLength: 100, scope: {scope: 'x_acme'}, updateSet: ID})
    await command({type: 'glide_list', reference: 'sys_user', scope: undefined, 'scope-id': ID, 'acknowledge-upgrade-skip': true}).run()
    expect(add).toHaveBeenLastCalledWith('x_acme_ticket', {column: 'triage_note', label: 'Triage note', type: 'glide_list', reference: 'sys_user',
      scope: {sysId: ID}, updateSet: ID, storeCustomization: {acknowledgeUpgradeSkip: true}})
  })

  it.each([
    [{table: 'bad^table'}, 'invalid identifier'],
    [{column: 'Triage'}, 'invalid identifier'],
    [{column: 'triage note'}, 'invalid identifier'],
    [{type: 'string;'}, 'invalid identifier'],
    [{reference: 'a b'}, 'invalid identifier'],
    [{label: ' '}, 'non-empty text'],
    [{label: 'a\nb'}, 'non-empty text'],
    [{label: 'a<b'}, 'without < or >'],
    [{label: 'x'.repeat(81)}, 'at most 80'],
    [{reference: 'sys_user'}, 'only for --type reference'],
    [{type: 'reference'}, 'needs --reference'],
    [{'update-set': 'abc'}, 'invalid identifier'],
    [{scope: undefined}, 'exactly one'],
  ])('refuses %o before any request', async (extra, message) => {
    const add = jest.spyOn(ColumnWriter.prototype, 'addColumn')
    await expect(command(extra).run()).rejects.toThrow(message)
    expect(add).not.toHaveBeenCalled()
  })
})

describe('metadata column remove', () => {
  const capture = {action: 'DELETE', updateSetSysId: ID, updateSetName: 'S', updateSetScope: ID, recordScope: ID, preferencesUnchanged: true,
    preferenceRowsReplaced: [], currentUpdateSet: {switched: false}}
  const result = {table: 'x_acme_ticket', column: 'triage_note', sysId: ID, scope: {sysId: ID, scope: 'x_acme'}, records: 3, createdInThisSet: false,
    deleted: {labels: ['sys_documentation_x_acme_ticket_triage_note_en'], clientScripts: [], uiPolicyActions: []},
    captures: ['sys_dictionary_x_acme_ticket_triage_note'], leftovers: {choices: 0, formElements: [], listElements: []}, capture, messages: []}
  const command = (extra: object) => Object.assign(Object.create(MetadataColumnRemove.prototype), {instance: {}, jsonEnabled: () => true,
    flags: {table: 'x_acme_ticket', column: 'triage_note', confirm: 'x_acme_ticket.triage_note', scope: 'x_acme', 'update-set': ID, ...extra}})

  it('removes through ColumnWriter with the confirmation, and passes each acknowledgement only when given', async () => {
    const remove = jest.spyOn(ColumnWriter.prototype, 'removeColumn').mockResolvedValue(result)
    await expect(command({}).run()).resolves.toMatchObject({column: 'triage_note', records: 3})
    expect(remove).toHaveBeenCalledWith('x_acme_ticket', 'triage_note', {confirm: {column: 'triage_note', table: 'x_acme_ticket'}, scope: {scope: 'x_acme'}, updateSet: ID})
    await command({'acknowledge-data-loss': true, 'acknowledge-dependent-deletes': true, 'acknowledge-upgrade-skip': true}).run()
    expect(remove).toHaveBeenLastCalledWith('x_acme_ticket', 'triage_note', {confirm: {column: 'triage_note', table: 'x_acme_ticket'}, scope: {scope: 'x_acme'},
      updateSet: ID, acknowledgeDataLoss: true, acknowledgeDependentDeletes: true, storeCustomization: {acknowledgeUpgradeSkip: true}})
  })

  it.each([
    [{confirm: 'triage_note'}, '--confirm must be exactly x_acme_ticket.triage_note'],
    [{confirm: 'x_acme_ticket.other'}, '--confirm must be exactly'],
    [{confirm: 'X_ACME_TICKET.triage_note'}, '--confirm must be exactly'],
    [{table: 'bad^table'}, 'invalid identifier'],
    [{column: 'Triage'}, 'invalid identifier'],
    [{'update-set': 'abc'}, 'invalid identifier'],
    [{scope: undefined}, 'exactly one'],
  ])('refuses %o before any request', async (extra, message) => {
    const remove = jest.spyOn(ColumnWriter.prototype, 'removeColumn')
    await expect(command(extra).run()).rejects.toThrow(message)
    expect(remove).not.toHaveBeenCalled()
  })
})

describe('metadata choice', () => {
  const column = {table: 'x_acme_ticket', type: 'integer', choice: '1', scope: ID}
  const capture = {action: 'INSERT_OR_UPDATE', updateSetSysId: ID, updateSetName: 'S', updateSetScope: ID, recordScope: ID, preferencesUnchanged: true,
    preferenceRowsReplaced: [], currentUpdateSet: {switched: false}}
  const result = {table: 'x_acme_ticket', element: 'severity', language: 'en', value: '4', action: 'insert' as const, sysId: ID, column, capture, messages: [],
    scope: {sysId: ID, scope: 'x_acme'}, choices: [], choiceSet: {sysId: ID, scope: ID, updateName: 'sys_choice_x_acme_ticket_severity', created: false}}
  const command = (type: any, extra: object) => Object.assign(Object.create(type.prototype), {instance: {}, jsonEnabled: () => true,
    flags: {table: 'x_acme_ticket', column: 'severity', language: 'en', value: '4', scope: 'x_acme', 'update-set': ID, ...extra}})

  it('reads a list through ChoiceWriter in the language given', async () => {
    const get = jest.spyOn(ChoiceWriter.prototype, 'getChoices').mockResolvedValue({table: 'x_acme_ticket', element: 'severity', language: 'fr', column, choices: []})
    await expect(command(MetadataChoiceGet, {language: 'fr'}).run()).resolves.toMatchObject({language: 'fr', choices: []})
    expect(get).toHaveBeenCalledWith('x_acme_ticket', 'severity', {language: 'fr'})
  })

  it('sets a choice with only the options given, the scope and the set', async () => {
    const set = jest.spyOn(ChoiceWriter.prototype, 'setChoice').mockResolvedValue(result)
    await expect(command(MetadataChoiceSet, {label: 'Severity 4', sequence: 4}).run()).resolves.toMatchObject({action: 'insert', value: '4'})
    expect(set).toHaveBeenCalledWith('x_acme_ticket', 'severity', {language: 'en', label: 'Severity 4', sequence: 4, scope: {scope: 'x_acme'}, updateSet: ID, value: '4'})
    await command(MetadataChoiceSet, {inactive: true, sequence: 0}).run()
    expect(set).toHaveBeenLastCalledWith('x_acme_ticket', 'severity', {language: 'en', inactive: true, sequence: 0, scope: {scope: 'x_acme'}, updateSet: ID, value: '4'})
    await command(MetadataChoiceSet, {inactive: false, hint: '', scope: undefined, 'scope-id': ID, 'acknowledge-upgrade-skip': true}).run()
    expect(set).toHaveBeenLastCalledWith('x_acme_ticket', 'severity', {language: 'en', inactive: false, hint: '', scope: {sysId: ID}, updateSet: ID, value: '4',
      storeCustomization: {acknowledgeUpgradeSkip: true}})
  })

  it('removes a choice, passing --confirm-in-use only when given', async () => {
    const remove = jest.spyOn(ChoiceWriter.prototype, 'removeChoice').mockResolvedValue({...result, action: 'delete', inUse: 2})
    await expect(command(MetadataChoiceRemove, {}).run()).resolves.toMatchObject({action: 'delete', inUse: 2})
    expect(remove).toHaveBeenCalledWith('x_acme_ticket', 'severity', {language: 'en', scope: {scope: 'x_acme'}, updateSet: ID, value: '4'})
    await command(MetadataChoiceRemove, {'confirm-in-use': true}).run()
    expect(remove).toHaveBeenLastCalledWith('x_acme_ticket', 'severity', {language: 'en', scope: {scope: 'x_acme'}, updateSet: ID, value: '4', confirmInUse: true})
  })

  it.each([
    [MetadataChoiceSet, {table: 'bad^table'}, 'invalid identifier'],
    [MetadataChoiceSet, {column: 'a b'}, 'invalid identifier'],
    [MetadataChoiceSet, {language: 'e n'}, 'invalid identifier'],
    [MetadataChoiceSet, {value: ''}, 'non-empty text'],
    [MetadataChoiceSet, {value: ' 4'}, 'surrounding spaces'],
    [MetadataChoiceSet, {value: '4\n'}, 'control characters'],
    [MetadataChoiceSet, {label: 'x'.repeat(101)}, 'at most 100'],
    [MetadataChoiceSet, {hint: 'x'.repeat(256)}, 'at most 255'],
    [MetadataChoiceSet, {'update-set': 'abc'}, 'invalid identifier'],
    [MetadataChoiceSet, {scope: undefined}, 'exactly one'],
    [MetadataChoiceRemove, {value: '\u0007'}, 'control characters'],
    [MetadataChoiceSet, {value: 'a^b'}, 'cannot contain ^ or javascript:'],
    [MetadataChoiceRemove, {value: 'JavaScript:gs.log(1)'}, 'cannot contain ^ or javascript:'],
    [MetadataChoiceSet, {hint: 'a\u001B[2J'}, 'control characters'],
    [MetadataChoiceGet, {column: 'x;y'}, 'invalid identifier'],
  ])('refuses bad input before any request (%#)', async (type, extra, message) => {
    const calls = [jest.spyOn(ChoiceWriter.prototype, 'getChoices'), jest.spyOn(ChoiceWriter.prototype, 'setChoice'), jest.spyOn(ChoiceWriter.prototype, 'removeChoice')]
    await expect(command(type, extra).run()).rejects.toThrow(message)
    for (const call of calls) expect(call).not.toHaveBeenCalled()
  })
})

describe('metadata failure routing', () => {
  const command = (executing: boolean) => Object.assign(Object.create(MetadataInsert.prototype), {metadataAction: 'insert', executing,
    flags: {table: flags.table}, jsonEnabled: () => true, _logger: {debug: jest.fn()}})

  it('leaves usage and credential errors raised before execution to oclif and failAuth', async () => {
    const parent = jest.spyOn(AuthenticatedCommand.prototype as any, 'catch').mockResolvedValue(undefined)
    const usage = Object.assign(new Error('Missing required flag table'), {oclif: {exit: 2}})
    await command(false).catch(usage)
    expect(parent).toHaveBeenCalledWith(usage)
  })

  it('logs a policy refusal at warn and keeps its public code', async () => {
    const parent = jest.spyOn(AuthenticatedCommand.prototype as any, 'catch').mockResolvedValue(undefined)
    const base = jest.spyOn(Command.prototype as any, 'catch').mockResolvedValue(undefined)
    const target = Object.assign(command(true), {authLogger: {warn: jest.fn()}})
    await target.catch(policyRefusal({allowed: false, verbs: ['write'], decidingLayer: 'flag'} as any))
    expect(target.authLogger.warn).toHaveBeenCalledWith('Refused by policy.', expect.anything())
    expect(parent).not.toHaveBeenCalled()
    expect((base.mock.calls[0][0] as any).metadata).toMatchObject({code: 'policy_refused'})
  })

  it('projects execution errors and logs the redacted original at debug', async () => {
    const parent = jest.spyOn(AuthenticatedCommand.prototype as any, 'catch').mockResolvedValue(undefined)
    const target = command(true)
    await target.catch(new MetadataScopeError('store_scope'))
    const safe = parent.mock.calls[0][0] as any
    expect(safe.metadata).toMatchObject({code: 'store_scope', writeAttempted: false})
    await target.catch(new Error('connect ECONNREFUSED 10.0.0.1:443 password=hunter2'))
    expect(target._logger.debug).toHaveBeenCalledWith('Metadata command error before projection.', expect.objectContaining({name: 'Error'}))
    expect(JSON.stringify(target._logger.debug.mock.calls.at(-1))).not.toContain('hunter2')
    expect((parent.mock.calls[1][0] as any).metadata.message).toBe('Metadata command failed.')
  })
})
