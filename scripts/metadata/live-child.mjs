import assert from 'node:assert/strict'
import {existsSync, readFileSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {invoke, reader} from './cli.mjs'
import {comparePreferences, hash, ID, load, privateRoot, PROTECTED, requireBaselineDestination, requireCandidate, requireFreshCapture, requireLock, requireOwnedFixture, save, TABLE} from './controls.mjs'

export async function lifecycle({root, plan, cliBin, receipt, read = reader(cliBin), write = args => invoke(cliBin, args)}) {
  const report = {alias: plan.alias, sourceSha: receipt.sourceSha, packageDigest: receipt.packageDigest, started: new Date().toISOString(),
    status: 'INCOMPLETE', stages: [], ledger: [], snapshots: [], attempts: []}
  const persist = () => save(join(root, 'lifecycle-safe.json'), report)
  // This marker survives failure, including preflight failures. Never reuse this directory.
  save(join(root, 'lifecycle-attempt.json'), {started: report.started, sourceSha: receipt.sourceSha, packageDigest: receipt.packageDigest}, true)
  persist()
  let baseline
  let userId
  const snapshot = label => {
    const rows = read.rows('sys_user_preference', `user=${userId}`, 'sys_id,user,name,value')
    assert.ok(rows.length && rows.every(row => row.user === userId), 'preference_membership')
    const file = `preferences-${report.snapshots.length}.json`
    save(join(root, file), rows, true)
    report.snapshots.push({label, file, count: rows.length, sha256: hash(readFileSync(join(root, file)))})
    persist()
    return rows
  }

  const captures = sysId => {
    const rows = read.rows('sys_update_xml', `name=${TABLE}_${sysId}`, 'sys_id,name,application,update_set,action,sys_updated_on,sys_mod_count')
    assert.ok(rows.every(row => row.name === `${TABLE}_${sysId}`), 'capture_membership')
    return rows
  }

  const once = (action, args) => {
    assert.ok(!report.attempts.some(attempt => attempt.action === action), 'operation_already_attempted')
    comparePreferences(baseline, snapshot(`before_${action}`))
    const started = new Date().toISOString()
    report.attempts.push({action, started})
    persist() // Persist intent before the child can submit anything.
    const result = write(['metadata', action, '--table', TABLE, '--scope-id', plan.scopeId, '--update-set', plan.updateSetId, ...args])
    const identity = result.payload?.sysId ?? result.payload?.error?.metadata?.sysId
    if (ID.test(identity ?? '') && !PROTECTED.has(identity) && !report.ledger.length) {
      report.ledger.push({table: TABLE, sysId: identity, scope: plan.scopeId, deleteAttempted: false, deleted: false})
    }

    persist()
    assert.ok(result.ok && result.payload?.action === action && result.payload?.table === TABLE, 'cli_write_or_verification_failed')
    assert.ok(ID.test(result.payload.sysId) && !PROTECTED.has(result.payload.sysId), 'returned_identity')
    assert.equal(result.payload.scope.sysId, plan.scopeId, 'returned_scope')
    assert.equal(result.payload.capture.updateSetSysId, plan.updateSetId, 'returned_capture')
    report.stages.push({action, result: result.payload})
    persist()
    const preferences = snapshot(`after_${action}`)
    report.stages.at(-1).preferences = comparePreferences(baseline, preferences)
    persist()
    return {result: result.payload, started}
  }

  try {
    const users = read.rows('sys_user', 'sys_id=javascript:gs.getUserID()', 'sys_id,user_name')
    assert.ok(users.length === 1 && ID.test(users[0].sys_id), 'authenticated_user_required')
    userId = users[0].sys_id
    report.userId = userId
    baseline = snapshot('baseline')
    const scope = read.exact('sys_scope', plan.scopeId, 'scope,name,sys_class_name')
    const set = read.exact('sys_update_set', plan.updateSetId, 'name,application,state')
    assert.equal(read.rows('sys_store_app', `sys_id=${plan.scopeId}`, 'sys_id').length, 0, 'store_scope_refused')
    requireBaselineDestination({plan, scope, set, preferences: baseline})
    const prefix = `NEX125${report.started.replace(/\D/g, '')}${hash(receipt.packageDigest).slice(0, 8)}`
    report.prefix = prefix
    const script = `var ${prefix} = Class.create(); ${prefix}.prototype = { type: '${prefix}' };`
    const updated = `${script}\n// ${prefix} updated`
    // Avoid overwriting a colliding name. Initial capture/record baselines must be empty.
    assert.equal(read.rows(TABLE, `name=${prefix}`, 'sys_id,name').length, 0, 'run_name_collision')
    const fieldsFile = join(root, 'insert-fields.json')
    save(fieldsFile, {name: prefix, active: false, script}, true)
    const inserted = once('insert', ['--fields-file', fieldsFile])
    const entry = report.ledger[0]
    assert.ok(entry && entry.sysId === inserted.result.sysId, 'insert_identity_ledger')
    const row = read.exact(TABLE, entry.sysId, 'name,active,sys_scope,script')
    requireOwnedFixture({entry, row, plan, prefix, script})
    const firstCapture = requireFreshCapture(captures(entry.sysId), [], {plan, sysId: entry.sysId, action: 'INSERT_OR_UPDATE', started: inserted.started})
    report.stages.at(-1).readBack = {exactContent: true, capture: firstCapture}
    persist()
    const updateFile = join(root, 'update-fields.json')
    save(updateFile, {script: updated}, true)
    const changed = once('update', ['--sys-id', entry.sysId, '--fields-file', updateFile])
    assert.equal(changed.result.sysId, entry.sysId, 'update_identity')
    requireOwnedFixture({entry, row: read.exact(TABLE, entry.sysId, 'name,active,sys_scope,script'), plan, prefix, script: updated})
    const nextCapture = requireFreshCapture(captures(entry.sysId), [firstCapture], {plan, sysId: entry.sysId, action: 'INSERT_OR_UPDATE', started: changed.started})
    report.stages.at(-1).readBack = {exactContent: true, capture: nextCapture}
    persist()
    const deletionBaseline = read.rows('sys_metadata_delete', `sys_metadata=${entry.sysId}`, 'sys_id,sys_metadata,sys_scope,sys_created_on')
    assert.equal(deletionBaseline.length, 0, 'unexpected_existing_deletion_evidence')
    requireOwnedFixture({entry, row: read.exact(TABLE, entry.sysId, 'name,active,sys_scope,script'), plan, prefix, script: updated})
    entry.deleteAttempted = true
    persist()
    const deleted = once('delete', ['--sys-id', entry.sysId, '--confirm-table', TABLE, '--confirm-sys-id', entry.sysId])
    assert.equal(deleted.result.sysId, entry.sysId, 'delete_identity')
    assert.equal(read.exact(TABLE, entry.sysId, 'sys_scope'), undefined, 'delete_absence')
    const deletionCapture = requireFreshCapture(captures(entry.sysId), [nextCapture], {plan, sysId: entry.sysId, action: 'DELETE', started: deleted.started})
    const evidence = read.rows('sys_metadata_delete', `sys_metadata=${entry.sysId}`, 'sys_id,sys_metadata,sys_scope,sys_created_on')
    assert.ok(evidence.length > 0 && evidence.every(row => row.sys_metadata === entry.sysId && row.sys_scope === plan.scopeId &&
      Date.parse(row.sys_created_on.replace(' ', 'T') + 'Z') >= Date.parse(deleted.started) - 1000), 'deletion_evidence')
    report.stages.at(-1).readBack = {absent: true, capture: deletionCapture, deletionIds: evidence.map(row => row.sys_id)}
    entry.deleted = true
    comparePreferences(baseline, snapshot('final'))
    report.status = 'PASS'
  } catch (error) {
    // Read only the exact returned identity after uncertainty. Never continue writes.
    const entry = report.ledger[0]
    if (entry) {
      try {
        const row = read.exact(TABLE, entry.sysId, 'name,active,sys_scope,script')
        report.failureEvidence = {sysId: entry.sysId, present: Boolean(row),
          scope: row?.sys_scope, inactive: row?.active === 'false',
          capture: captures(entry.sysId), preferenceSnapshot: snapshot('failure').length}
      } catch { report.failureEvidence = {sysId: entry.sysId, unavailable: true} }
    }

    throw error
  } finally {
    report.completed = new Date().toISOString()
    report.retained = report.ledger.filter(entry => !entry.deleted).map(entry => entry.sysId)
    // Failure leaves evidence for a reviewed ownership/cleanup decision. No generic cleanup.
    persist()
  }

  return report
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = privateRoot(process.env.NEX_METADATA_PRIVATE_DIR, resolve(import.meta.dirname, '../..'))
    requireLock(process.env.NEX_METADATA_ACCESS_HELPER)
    const plan = load(join(root, 'fixture.json'))
    const receipt = requireCandidate(process.env.NEX_METADATA_CLI_BIN, process.env.NEX_METADATA_SOURCE_SHA)
    assert.ok(!existsSync(join(root, 'lifecycle-attempt.json')), 'lifecycle_already_attempted')
    // Verify the selected alias endpoint without printing credentials.
    await import('../../bin/credstore-boot.js')
    const {configureLogging, resolveSessionCredentials, ServiceNowInstance, TableAPIRequest} = await import('@sonisoft/now-sdk-ext-core')
    configureLogging({file: false, console: false})
    const credential = await resolveSessionCredentials('dev206299')
    const endpoint = new URL(credential.instanceUrl)
    assert.ok(endpoint.origin === 'https://dev206299.service-now.com' && endpoint.pathname === '/', 'authorized_endpoint_required')
    const request = new TableAPIRequest(new ServiceNowInstance({alias: 'dev206299', credential}))
    const clock = await request.get('sys_user', {sysparm_limit: 1, sysparm_fields: 'sys_id'})
    const serverUtc = Date.parse(clock.headers.date)
    assert.ok(clock.status === 200 && Number.isFinite(serverUtc) && Math.abs(serverUtc - Date.now()) <= 60_000, 'client_server_clock_required')
    save(join(root, 'clock-safe.json'), {clientUtc: new Date().toISOString(), serverUtc: new Date(serverUtc).toISOString()}, true)
    await lifecycle({root, plan, cliBin: receipt.cliBin, receipt})
    process.stderr.write('Bounded metadata lifecycle passed. Private evidence saved.\n')
  } catch {
    process.stderr.write('Metadata lifecycle failed. Read the private evidence. Do not repeat writes or run generic cleanup.\n')
    process.exitCode = 1
  }
}
