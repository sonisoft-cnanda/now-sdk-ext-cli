import {afterEach, describe, expect, it} from '@jest/globals'
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {audit} from '../../scripts/metadata/audit.mjs'
import {comparePreferences, hash, load, packageTreeDigest, PROTECTED, requireBaselineDestination, requireCandidate, requireFixture, requireFreshCapture, requireOwnedFixture, save} from '../../scripts/metadata/controls.mjs'
import {lifecycle} from '../../scripts/metadata/live-child.mjs'
import {runLive, runSequence} from '../../scripts/metadata/run-live.mjs'

const ids = {scope: 'a'.repeat(32), set: 'b'.repeat(32), record: 'c'.repeat(32), user: 'd'.repeat(32)}
const plan = {alias: 'dev206299', scopeId: ids.scope, scopeName: 'x_reviewed_test', updateSetId: ids.set,
  reviewReference: 'fixture-only-review', coordinatedWindow: 'fixture-only-window'}
const receipt = {sourceSha: 'e'.repeat(40), packageDigest: 'f'.repeat(64)}
const temporary: string[] = []
function directory() {
  const root = mkdtempSync(join(process.env.PAPERCLIP_SCRATCH_DIR || tmpdir(), 'metadata-controls-'))
  temporary.push(root)
  return root
}

afterEach(() => { for (const root of temporary.splice(0)) rmSync(root, {recursive: true, force: true}) })

function fixture(mode = 'success') {
  const root = directory()
  save(join(root, 'fixture.json'), plan)
  const preferences = [['apps.current_app', ids.scope], ['sys_update_set', ids.set], [`updateSetForScope${ids.scope}`, ids.set]]
    .map(([name, value], index) => ({sys_id: String(index).repeat(32), user: ids.user, name, value}))
  let record: any
  let version = 0
  let capture: any
  let deletes: any[] = []
  const calls: string[] = []
  const scope = {sys_id: ids.scope, scope: plan.scopeName, name: 'Safe test fixture', sys_class_name: 'sys_app'}
  const set = {sys_id: ids.set, application: ids.scope, state: 'in progress'}
  const read = {
    rows(table: string) {
      if (table === 'sys_user') return [{sys_id: ids.user, user_name: 'test'}]
      if (table === 'sys_user_preference') return preferences.map(row => ({...row}))
      if (table === 'sys_store_app') return []
      if (table === 'sys_script_include') return record ? [record] : []
      if (table === 'sys_update_xml') return capture ? [{...capture}] : []
      if (table === 'sys_metadata_delete') return deletes
      throw Error('unexpected_read')
    },
    exact(table: string) {
      if (table === 'sys_scope') return scope
      if (table === 'sys_update_set') return set
      if (table === 'sys_script_include') return record
      throw Error('unexpected_exact')
    },
  }
  const write = (args: string[]) => {
    const action = args[1]
    calls.push(action)
    const path = args.indexOf('--fields-file')
    const fields = path === -1 ? {} : load(args[path + 1])
    record = action === 'delete' ? undefined : {...record, ...fields, sys_id: ids.record, sys_scope: ids.scope, active: 'false'}
    if (mode === 'wrong_content') record.script = 'wrong'
    version++
    capture = {sys_id: 'f'.repeat(32), name: `sys_script_include_${ids.record}`, application: ids.scope, update_set: ids.set,
      action: action === 'delete' ? 'DELETE' : 'INSERT_OR_UPDATE', sys_mod_count: String(mode === 'stale_version' ? 1 : version),
      sys_updated_on: new Date().toISOString().slice(0, 19).replace('T', ' ')}
    if (action === 'delete' && mode !== 'missing_delete') deletes = [{sys_id: 'e'.repeat(32), sys_metadata: ids.record, sys_scope: ids.scope, sys_created_on: capture.sys_updated_on}]
    if (mode === 'uncertain') return {ok: false, status: 1, payload: {error: {metadata: {sysId: ids.record, writeAttempted: true}}}}
    return {ok: true, status: 0, payload: {action, table: 'sys_script_include', sysId: ids.record,
      scope: {sysId: ids.scope, scope: plan.scopeName}, capture: {updateSetSysId: ids.set}, messages: []}}
  }
  return {root, read, write, calls, scope, set, preferences}
}

describe('bounded metadata lifecycle controls', () => {
  it('runs insert, exact update, confirmed delete and separate audit once each', async () => {
    const state = fixture()
    const report = await lifecycle({...state, plan, receipt})
    expect(report.status).toBe('PASS')
    expect(report.retained).toEqual([])
    expect(state.calls).toEqual(['insert', 'update', 'delete'])
    const checked = audit({...state})
    expect(checked).toMatchObject({status: 'PASS', sourceSha: receipt.sourceSha, packageDigest: receipt.packageDigest, absent: ids.record})
    expect(() => audit({...state})).toThrow() // Audit evidence is one-time and cannot be overwritten.
    await expect(lifecycle({...state, plan, receipt})).rejects.toThrow()
    expect(state.calls).toEqual(['insert', 'update', 'delete'])
  })

  it.each([['uncertain', ['insert']], ['wrong_content', ['insert']], ['stale_version', ['insert', 'update']],
    ['missing_delete', ['insert', 'update', 'delete']]])('stops %s without replay or generic cleanup', async (mode, calls) => {
    const state = fixture(mode as string)
    await expect(lifecycle({...state, plan, receipt})).rejects.toThrow()
    expect(state.calls).toEqual(calls)
    const report = load(join(state.root, 'lifecycle-safe.json'))
    expect(report.status).toBe('INCOMPLETE')
    expect(report.retained).toEqual([ids.record])
    expect(() => audit({...state})).toThrow()
  })

  it('refuses unsafe baselines, shared scopes and unreviewed fixture contracts', () => {
    const state = fixture()
    for (const override of [{scopeName: 'global'}, {scopeName: 'x_g_enterprise'}, {scopeName: 'sn_apm_test'},
      {alias: 'production'}, {scopeId: 'bad'}, {reviewReference: ''}, {coordinatedWindow: ''}]) {
      expect(() => requireFixture({...plan, ...override})).toThrow()
    }
    requireBaselineDestination({...state, plan})
    expect(() => requireBaselineDestination({...state, plan, scope: {...state.scope, name: 'BCBS'}})).toThrow()
    expect(() => requireBaselineDestination({...state, plan, scope: {...state.scope, sys_class_name: 'sys_store_app'}})).toThrow()
    expect(() => requireBaselineDestination({...state, plan, set: {...state.set, state: 'complete'}})).toThrow()
    expect(() => requireBaselineDestination({...state, plan, preferences: []})).toThrow()
    expect(() => comparePreferences(state.preferences, state.preferences.map(row => ({...row, value: 'changed'})))).toThrow()
    expect(comparePreferences(state.preferences, state.preferences.map(row => ({...row, sys_id: 'new'}))).rowsReplaced).toHaveLength(3)
  })

  it('requires exact inactive, marked content and refuses protected or attempted records', () => {
    const entry = {table: 'sys_script_include', sysId: ids.record, scope: ids.scope, deleted: false, deleteAttempted: false}
    const row = {sys_id: ids.record, sys_scope: ids.scope, active: 'false', name: 'NEX125test', script: '// NEX125test'}
    const args = {entry, row, plan, prefix: row.name, script: row.script}
    requireOwnedFixture(args)
    for (const override of [{active: 'true'}, {name: 'existing'}, {script: 'wrong'}, {sys_scope: ids.set}]) {
      expect(() => requireOwnedFixture({...args, row: {...row, ...override}})).toThrow()
    }
    for (const override of [{deleteAttempted: true}, {deleted: true}, {sysId: [...PROTECTED][0]}, {table: 'incident'}]) {
      expect(() => requireOwnedFixture({...args, entry: {...entry, ...override}})).toThrow()
    }
  })

  it('requires fresh exact capture evidence and rejects missing or ambiguous evidence', () => {
    const row = {sys_id: ids.record, name: `sys_script_include_${ids.record}`, application: ids.scope, update_set: ids.set,
      action: 'DELETE', sys_mod_count: '2', sys_updated_on: new Date().toISOString().slice(0, 19).replace('T', ' ')}
    const options = {plan, sysId: ids.record, action: 'DELETE', started: new Date().toISOString()}
    requireFreshCapture([row], [], options)
    expect(() => requireFreshCapture([], [], options)).toThrow()
    expect(() => requireFreshCapture([row, row], [], options)).toThrow()
    expect(() => requireFreshCapture([row], [row], options)).toThrow()
    for (const override of [{application: ids.set}, {update_set: ids.scope}, {action: 'INSERT_OR_UPDATE'}, {sys_updated_on: '2000-01-01 00:00:00'}]) {
      expect(() => requireFreshCapture([{...row, ...override}], [], options)).toThrow()
    }
  })
})

describe('candidate and native runner gates', () => {
  it('rejects a non-candidate executable, dirty receipt and changed package bytes', () => {
    expect(() => requireCandidate('/missing/nex', receipt.sourceSha)).toThrow()
    const root = directory()
    const packageRoot = join(root, 'node_modules/@sonisoft/now-sdk-ext-cli')
    mkdirSync(join(packageRoot, 'bin'), {recursive: true})
    mkdirSync(join(packageRoot, 'dist'))
    const cliBin = join(packageRoot, 'bin/run.js')
    writeFileSync(cliBin, '// candidate')
    save(join(packageRoot, 'package.json'), {})
    save(join(packageRoot, 'oclif.manifest.json'), {commands: {'metadata:insert': {}}})
    const tarball = join(root, 'candidate.tgz')
    writeFileSync(tarball, 'candidate')
    const candidate = {...receipt, cliBin, tarball, sourceDirty: false, core: '6.8.0', packageDigest: hash(readFileSync(tarball)), packageTreeDigest: packageTreeDigest(packageRoot)}
    save(join(root, 'candidate.json'), candidate)
    expect(requireCandidate(cliBin, receipt.sourceSha).sourceDirty).toBe(false)
    save(join(root, 'candidate.json'), {...candidate, sourceDirty: true})
    expect(() => requireCandidate(cliBin, receipt.sourceSha)).toThrow('clean_candidate')
    save(join(root, 'candidate.json'), candidate)
    writeFileSync(cliBin, '// changed')
    expect(() => requireCandidate(cliBin, receipt.sourceSha)).toThrow('candidate_tree_changed')
  })

  it.each(['success', 'lifecycle_failure', 'signal', 'missing_report', 'audit_failure', 'missing_audit'])('fails closed for %s and never retries a helper', async mode => {
    const commands: string[][] = []
    const result = await runSequence({run: async (command: string[]) => {
      commands.push(command)
      return {code: (mode === 'lifecycle_failure' && commands.length === 1) || (mode === 'audit_failure' && commands.length === 2) ? 1 : 0,
        signal: mode === 'signal' ? 'SIGTERM' : undefined}
    }, lifecycleCommand: ['lifecycle'], auditCommand: ['audit'], hasReport: () => mode !== 'missing_report',
    reportPassed: () => mode !== 'lifecycle_failure', auditPassed: () => mode !== 'missing_audit'})
    expect(result).toBe(mode === 'success' ? 0 : 1)
    expect(commands.filter(command => command[0] === 'lifecycle')).toHaveLength(1)
    expect(commands).toHaveLength(['signal', 'missing_report'].includes(mode) ? 1 : 2)
  })

  it('requires live opt-in before any helper or credential access', async () => {
    const original = process.env.NEX_METADATA_LIVE
    delete process.env.NEX_METADATA_LIVE
    try { await expect(runLive({})).rejects.toThrow('explicit_live_opt_in_required') }
    finally { if (original !== undefined) process.env.NEX_METADATA_LIVE = original }
  })
})
