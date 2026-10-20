import {afterEach, describe, expect, it, jest} from '@jest/globals'
import {Command} from '@oclif/core'
import {FormLayoutWriter, MetadataFormWriter, MetadataScopeError, policyRefusal} from '@sonisoft/now-sdk-ext-core'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {metadataOptions} from '../../../src/common/metadata-command.js'
import MetadataInsert from '../../../src/commands/metadata/insert.js'
import MetadataUpdate from '../../../src/commands/metadata/update.js'
import MetadataDelete from '../../../src/commands/metadata/delete.js'
import MetadataLayoutGet from '../../../src/commands/metadata/layout/get.js'
import MetadataLayoutSet, {layoutElements} from '../../../src/commands/metadata/layout/set.js'
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
