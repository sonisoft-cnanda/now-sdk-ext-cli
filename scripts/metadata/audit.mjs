import assert from 'node:assert/strict'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {reader} from './cli.mjs'
import {comparePreferences, hash, load, privateRoot, requireBaselineDestination, requireFreshCapture, requireLock, save, TABLE} from './controls.mjs'
import {readFileSync} from 'node:fs'

export function audit({root, cliBin, read = reader(cliBin)}) {
  const report = load(join(root, 'lifecycle-safe.json'))
  const plan = load(join(root, 'fixture.json'))
  assert.equal(report.ledger.length, 1, 'audit_ledger_missing')
  assert.equal(report.status, 'PASS', 'lifecycle_incomplete')
  assert.deepEqual(report.attempts.map(item => item.action), ['insert', 'update', 'delete'], 'audit_attempts')
  assert.deepEqual(report.stages.map(item => item.action), ['insert', 'update', 'delete'], 'audit_stages')
  const snapshot = report.snapshots.find(item => item.label === 'baseline')
  assert.ok(snapshot, 'audit_baseline_missing')
  for (const item of report.snapshots) assert.equal(hash(readFileSync(join(root, item.file))), item.sha256, 'snapshot_changed')
  const baseline = load(join(root, snapshot.file))
  const preferences = read.rows('sys_user_preference', `user=${report.userId}`, 'sys_id,user,name,value')
  assert.ok(preferences.length && preferences.every(row => row.user === report.userId), 'audit_preference_membership')
  const comparison = comparePreferences(baseline, preferences)
  save(join(root, 'audit-preferences.json'), preferences, true)
  requireBaselineDestination({plan, preferences, scope: read.exact('sys_scope', plan.scopeId, 'scope,name,sys_class_name'),
    set: read.exact('sys_update_set', plan.updateSetId, 'name,application,state')})
  const entry = report.ledger[0]
  assert.ok(entry.deleted && entry.deleteAttempted && report.retained.length === 0, 'audit_cleanup_incomplete')
  assert.equal(read.exact(TABLE, entry.sysId, 'sys_scope'), undefined, 'audit_retained_record')
  assert.equal(read.rows(TABLE, `name=${report.prefix}`, 'sys_id,name').length, 0, 'audit_named_record_retained')
  const captures = read.rows('sys_update_xml', `name=${TABLE}_${entry.sysId}`, 'sys_id,name,application,update_set,action,sys_updated_on,sys_mod_count')
  const capture = requireFreshCapture(captures, [], {plan, sysId: entry.sysId, action: 'DELETE', started: report.attempts.at(-1).started})
  assert.deepEqual(capture, report.stages.at(-1).readBack.capture, 'audit_capture_changed')
  const deletes = read.rows('sys_metadata_delete', `sys_metadata=${entry.sysId}`, 'sys_id,sys_metadata,sys_scope')
  assert.ok(deletes.length && deletes.every(row => row.sys_metadata === entry.sysId && row.sys_scope === plan.scopeId), 'audit_deletion_evidence')
  assert.deepEqual(deletes.map(row => row.sys_id).sort(), report.stages.at(-1).readBack.deletionIds.sort(), 'audit_deletion_changed')
  const result = {status: 'PASS', alias: plan.alias, sourceSha: report.sourceSha, packageDigest: report.packageDigest,
    completed: new Date().toISOString(), comparison, absent: entry.sysId, capture: capture.sys_id, deletionIds: deletes.map(row => row.sys_id)}
  save(join(root, 'lifecycle-audit-safe.json'), result, true)
  return result
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const root = privateRoot(process.env.NEX_METADATA_PRIVATE_DIR, resolve(import.meta.dirname, '../..'))
    requireLock(process.env.NEX_METADATA_ACCESS_HELPER)
    audit({root, cliBin: process.env.NEX_METADATA_CLI_BIN})
    process.stderr.write('Separate read-only metadata audit passed.\n')
  } catch {
    process.stderr.write('Metadata audit failed. Preserve the private evidence for review.\n')
    process.exitCode = 1
  }
}
