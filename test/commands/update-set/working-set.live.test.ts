import {afterAll, beforeAll, describe, expect, it} from '@jest/globals'
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'

import {SN_INSTANCE_ALIAS} from '../../test_utils/test_config.js'

/*
 * NSE-15 use case through the nex binary, live: change configuration in an installed Store application and in Global,
 * in an update set we create for that application, prove what was captured, and close the set.
 *
 * Runs only through `npm run test:live` (or NEX_LIVE=1), which builds first; `npm run test:integration` skips it.
 * Store application: GRC (sn_compliance), Policy form (sn_compliance_policy, Default view, main section): one field is
 * added and removed again, which leaves the section customized (replace_on_upgrade=false). Global: an inactive Script
 * Include, inserted and deleted. Each run leaves two Complete "nex-it NSE-15 CLI ... (test only, do not promote)" sets;
 * a set left In progress by a failure is set to Ignore; nothing is deleted; the working set is restored.
 */
const live = process.env.NEX_LIVE === '1' || process.env.npm_lifecycle_event === 'test:live'
const MINUTE = 60_000
const BIN = resolve('bin/run.js')
const STAMP = new Date().toISOString().slice(0, 19).replaceAll(/[-:T]/g, '')
const FIELD = 'url'
const NOTE = 'NSE-15 CLI integration test (test only, do not promote).'

// Jest sets NODE_ENV=test, which makes oclif load src/*.ts instead of the built commands.
const ENV = Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_ENV' && !key.startsWith('JEST_')))

interface Result {json: any; status: null | number; stderr: string}
function nex(args: string[], {read = false} = {}): Result {
  const run = spawnSync(process.execPath, [BIN, ...args, '-a', SN_INSTANCE_ALIAS, '--json', ...(read ? ['--read-only'] : [])],
    {encoding: 'utf8', env: ENV, maxBuffer: 32 * 1024 * 1024, timeout: 5 * MINUTE})
  let json: unknown
  try {
    json = JSON.parse(run.stdout)
  } catch {
    json = undefined
  }

  return {json, status: run.status, stderr: run.stderr.slice(-2000)}
}

const code = (result: Result): string | undefined =>
  result.json?.error?.metadata?.code ?? result.json?.error?.updateSet?.code ?? result.json?.error?.code
const ok = (result: Result): any => {
  if (result.status !== 0) throw new Error(`nex failed (${result.status}): ${JSON.stringify(result.json?.error ?? result.stderr)}`)
  return result.json
}

const records = (table: string, query: string, fields: string): any[] =>
  ok(nex(['query', '-t', table, '-q', query, '-f', fields, '-l', '100'], {read: true})).records
    .map((row: Record<string, any>) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value?.value ?? value])))

const store = live ? records('sys_scope', 'scope=sn_compliance^active=true', 'sys_id,sys_class_name').find(row => row.sys_class_name === 'sys_store_app') : undefined
const section = store ? records('sys_ui_section', `name=sn_compliance_policy^view=Default view^captionISEMPTY^sys_scope=${store.sys_id}`, 'sys_id')[0] : undefined
if (live && !section) console.warn(`[working-set.live] ${SN_INSTANCE_ALIAS} has no sn_compliance Policy form section: skipped`)

;(section ? describe : describe.skip)(`nex: changes in applications we do not own (${SN_INSTANCE_ALIAS}, live)`, () => {
  const app: string = store?.sys_id
  const sectionId: string = section?.sys_id
  const created: string[] = []
  let previous: undefined | {application: string; updateSet: string}
  let original: string[] = []
  let changed: string[] = []
  let storeSet = ''
  let globalSet = ''
  let scriptInclude: string | undefined
  const layoutSet = (elements: string[], extra: string[] = ['--acknowledge-upgrade-skip'], set = storeSet) =>
    nex(['metadata', 'layout', 'set', '--section', sectionId, '--elements', elements.join(','), '--scope-id', app, '--update-set', set, ...extra])
  const state = (id: string): string => records('sys_update_set', `sys_id=${id}`, 'sys_id,state')[0]?.state
  const layout = (): string[] => ok(nex(['metadata', 'layout', 'get', '--section', sectionId], {read: true})).elements

  beforeAll(async () => {
    // The working set as the platform persists it (apps.current_app + sys_update_set), before any change.
    const {resolveSessionCredentials, ServiceNowInstance, WorkingSetManager} = await import('@sonisoft/now-sdk-ext-core')
    const credential = await resolveSessionCredentials(SN_INSTANCE_ALIAS)
    previous = await new WorkingSetManager(new ServiceNowInstance({alias: SN_INSTANCE_ALIAS, credential})).getWorkingSet()
    original = layout()
    changed = original.includes(FIELD) ? original.filter(item => item !== FIELD) : [...original, FIELD]
  }, 3 * MINUTE)

  afterAll(async () => {
    // Each step is independent and the first error is rethrown at the end. A cleanup change goes into a set of its own,
    // set to Ignore below, whenever the test's own set has closed.
    const errors: unknown[] = []
    const step = async (work: () => Promise<void> | void) => {
      try {
        await work()
      } catch (error) {
        errors.push(error)
      }
    }

    const openSet = (own: string, application: string): string => {
      if (own && state(own) === 'in progress') return own
      const set = ok(nex(['update-set', 'create', '-n', `nex-it NSE-15 CLI cleanup ${STAMP}`, '-d', `${NOTE} Puts back what a failed run left behind.`,
        '--application', application])).sys_id
      created.push(set)
      return set
    }

    await step(() => {
      if (!original.length || JSON.stringify(layout()) === JSON.stringify(original)) return
      const set = openSet(storeSet, app)
      ok(nex(['update-set', 'use', set]))
      ok(layoutSet(original, ['--acknowledge-upgrade-skip'], set))
    })
    await step(() => {
      if (!scriptInclude || records('sys_script_include', `sys_id=${scriptInclude}`, 'sys_id').length === 0) return
      const set = openSet(globalSet, 'global')
      ok(nex(['update-set', 'use', set]))
      ok(nex(['metadata', 'delete', '--table', 'sys_script_include', '--sys-id', scriptInclude, '--scope', 'global', '--update-set', set,
        '--confirm-table', 'sys_script_include', '--confirm-sys-id', scriptInclude]))
    })
    await step(async () => {
      const left = created.length ? records('sys_update_set', `sys_idIN${created.join(',')}^state=in progress`, 'sys_id') : []
      if (left.length === 0) return
      // Only this run's own sets, never their captures. Over the Table API a scoped set is editable only with its app current.
      const {resolveSessionCredentials, ServiceNowInstance, TableAPIRequest} = await import('@sonisoft/now-sdk-ext-core')
      const credential = await resolveSessionCredentials(SN_INSTANCE_ALIAS)
      const table = new TableAPIRequest(new ServiceNowInstance({alias: SN_INSTANCE_ALIAS, credential}))
      for (const {sys_id: id} of left) {
        ok(nex(['update-set', 'use', id]))
        // eslint-disable-next-line no-await-in-loop
        await table.put('sys_update_set', id, {state: 'ignore'})
        if (state(id) !== 'ignore') throw new Error(`could not set ${id} to Ignore`)
      }
    })
    // Last, so no cleanup step above can leave the user in a test set.
    await step(() => {
      if (previous) ok(nex(['update-set', 'restore', '--application', previous.application || 'global', '--update-set', previous.updateSet]))
    })
    if (errors.length > 0) throw errors[0]
  }, 20 * MINUTE)

  it('creates an update set in the Store application and makes it current', () => {
    const set = ok(nex(['update-set', 'create', '-n', `nex-it NSE-15 CLI sn_compliance ${STAMP}`, '-d',
      `${NOTE} Customizes sn_compliance_policy Default view (sys_ui_section ${sectionId}); upgrades skip it.`, '--application', app]))
    storeSet = set.sys_id
    created.push(storeSet)
    expect(set).toMatchObject({application: app, state: 'in progress'})
    expect(code(layoutSet(changed))).toBe('update_set_not_current')
    const used = ok(nex(['update-set', 'use', storeSet]))
    expect(used.previous).toEqual(previous)
    expect(used.current).toEqual({application: app, updateSet: storeSet})
    expect(ok(nex(['update-set', 'current'], {read: true})).currentUpdateSet).toMatchObject({application: app, sys_id: storeSet})
  }, 5 * MINUTE)

  it('refuses the Store write without --acknowledge-upgrade-skip', () => {
    const refused = layoutSet(changed, [])
    expect(refused.status).not.toBe(0)
    expect(code(refused)).toBe('store_scope')
    expect(refused.json.error.metadata.remediation.join(' ')).toContain('--acknowledge-upgrade-skip')
  }, 3 * MINUTE)

  it('changes the form layout and puts it back, captured once in our set', () => {
    const result = ok(layoutSet(changed))
    expect(result.elements).toEqual(changed)
    expect(result.capture).toMatchObject({updateSetSysId: storeSet, updateName: `sys_ui_section_${sectionId}`,
      customization: {storeApplication: true, replaceOnUpgrade: false}})
    expect(ok(layoutSet(result.previousElements)).elements).toEqual(original)
    const captures = records('sys_update_xml', `update_set=${storeSet}`, 'sys_id,name,application,replace_on_upgrade')
    expect(captures).toEqual([expect.objectContaining({application: app, name: `sys_ui_section_${sectionId}`, replace_on_upgrade: 'false'})])
  }, 5 * MINUTE)

  it('refuses a cross-application move and a wrong count, then completes', () => {
    const global = ok(nex(['update-set', 'create', '-n', `nex-it NSE-15 CLI global ${STAMP}`, '-d', `${NOTE} Inactive Script Include inserted and deleted.`,
      '--application', 'global']))
    globalSet = global.sys_id
    created.push(globalSet)
    // Never complete a set over a layout that was not put back, and never let the refusal call itself complete it.
    expect(layout()).toEqual(original)
    const captured = records('sys_update_xml', `update_set=${storeSet}`, 'sys_id')
    expect(captured).toHaveLength(1)
    const [capture] = captured
    const move = nex(['update-set', 'move-capture', '--capture', capture.sys_id, '--source', storeSet, '--target', globalSet, '--reason', 'NSE-15 CLI negative test'])
    expect(code(move)).toBe('scope_mismatch')
    const wrong = nex(['update-set', 'complete', storeSet, '--expected-captures', '2'])
    expect(code(wrong)).toBe('capture_count_mismatch')
    expect(wrong.json.error.updateSet.detail).toMatchObject({actual: 1, expected: 2})
    expect(ok(nex(['update-set', 'complete', storeSet, '--expected-captures', '1']))).toMatchObject({state: 'complete'})
  }, 5 * MINUTE)

  it('runs the same lifecycle in Global', () => {
    expect(ok(nex(['update-set', 'use', globalSet])).current).toEqual({application: 'global', updateSet: globalSet})
    const insert = nex(['metadata', 'insert', '--table', 'sys_script_include', '--scope', 'global', '--update-set', globalSet, '--fields',
      JSON.stringify({active: false, description: NOTE, name: `NexItNse15Cli${STAMP}`, script: '// NSE-15 CLI integration test'})])
    // A failed verification can still leave the record: keep its id for cleanup either way.
    scriptInclude = insert.json?.sysId ?? insert.json?.error?.metadata?.sysId
    const inserted = ok(insert)
    expect(inserted.capture).toMatchObject({recordScope: 'global', updateName: `sys_script_include_${inserted.sysId}`, updateSetSysId: globalSet})
    const removed = ok(nex(['metadata', 'delete', '--table', 'sys_script_include', '--sys-id', inserted.sysId, '--scope', 'global',
      '--update-set', globalSet, '--confirm-table', 'sys_script_include', '--confirm-sys-id', inserted.sysId]))
    expect(removed.capture).toMatchObject({action: 'DELETE', updateSetSysId: globalSet})
    scriptInclude = undefined
    expect(ok(nex(['update-set', 'complete', globalSet, '--expected-captures', '1']))).toMatchObject({state: 'complete'})
  }, 5 * MINUTE)

  it('restores the working set it found', () => {
    const restored = ok(nex(['update-set', 'restore', '--application', previous!.application || 'global', '--update-set', previous!.updateSet]))
    // The set it found is still In progress, so it comes back exactly, with no fallback to a Default.
    expect(restored).toEqual({restored: {application: previous!.application || 'global', updateSet: previous!.updateSet}})
    expect(ok(nex(['update-set', 'current'], {read: true})).currentUpdateSet.sys_id).toBe(previous!.updateSet)
    // previous stays set: afterAll restores again after any cleanup change.
  }, 3 * MINUTE)
})
