// Adapted from core's metadata controls (v6.8.0). No picker setup or restoration.
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync} from 'node:fs'
import {homedir} from 'node:os'
import {dirname, join, relative, resolve} from 'node:path'

export const TABLE = 'sys_script_include'
export const PROTECTED = new Set(['2dd18dcc538c9754b6d61901a0490e29', 'f853090c53cc9754b6d61901a0490ef6', '5c2d67e053c89f54b6d61901a0490ebd'])
export const ID = /^[a-f0-9]{32}$/
export const hash = value => createHash('sha256').update(value).digest('hex')
export const load = file => JSON.parse(readFileSync(file, 'utf8'))
export const save = (file, value, exclusive = false) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {mode: 0o600, flag: exclusive ? 'wx' : 'w'})
const within = (parent, child) => relative(parent, child) === '' || (!relative(parent, child).startsWith('..') && !relative(parent, child).startsWith('/'))

export function privateRoot(directory, repository) {
  assert.ok(directory && directory.startsWith('/'), 'explicit_private_directory_required')
  mkdirSync(directory, {recursive: true, mode: 0o700})
  assert.ok(!lstatSync(directory).isSymbolicLink(), 'private_directory_symlink')
  const root = realpathSync(directory)
  assert.ok(!within(realpathSync(repository), root), 'private_directory_outside_repository_required')
  for (const temporary of ['/tmp', '/var/tmp']) assert.ok(!within(temporary, root), 'persistent_directory_required')
  for (const key of ['PAPERCLIP_SCRATCH_DIR', 'PAPERCLIP_RUN_SCRATCH_DIR', 'TMPDIR']) {
    if (process.env[key] && existsSync(process.env[key])) assert.ok(!within(realpathSync(process.env[key]), root), 'persistent_directory_required')
  }

  assert.equal(lstatSync(root).mode & 0o777, 0o700, 'private_directory_permissions')
  assert.equal(lstatSync(root).uid, process.getuid(), 'private_directory_owner')
  return root
}

// The reviewed fixture names the alias; its endpoint is that PDI unless the fixture says otherwise.
export function fixtureOrigin(plan) {
  return plan.origin ?? `https://${plan.alias}.service-now.com`
}

/** Whether a version satisfies a caret range (^x.y.z), as npm resolves it into a fresh prefix with no lockfile. */
export function satisfiesCaret(version, range) {
  const parse = text => /^(\d+)\.(\d+)\.(\d+)$/.exec(text ?? '')?.slice(1).map(Number)
  const have = parse(version), want = typeof range === 'string' && range.startsWith('^') ? parse(range.slice(1)) : undefined
  if (!have || !want) return false
  // The leftmost non-zero part is fixed; the parts after it may only rise.
  const fixed = want.findIndex(part => part !== 0) + 1 || 3
  if (have.slice(0, fixed).some((part, index) => part !== want[index])) return false
  for (let index = 0; index < 3; index++) if (have[index] !== want[index]) return have[index] > want[index]
  return true
}

export function requireLock(helper, alias) {
  let pid = process.ppid
  let owner
  for (let depth = 0; depth < 12 && pid > 1; depth++) {
    const args = readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0')
    if (args.includes(helper) && args.some((arg, index) => arg === '--alias' && args[index + 1] === alias)) {
      owner = pid
      break
    }

    pid = Number(readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ')[1])
  }

  assert.ok(owner, 'access_helper_ancestor_required')
  const locks = join(process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state'), 'sn-access')
  assert.equal(readdirSync(locks).filter(name => name.endsWith('.lock')).filter(name => load(join(locks, name)).pid === owner).length, 1, 'owned_alias_lock_required')
}

export function requireFixture(plan) {
  assert.ok(typeof plan.alias === 'string' && /^[a-z0-9][a-z0-9-]{0,62}$/.test(plan.alias), 'fixture_alias_required')
  assert.ok(plan.origin === undefined || /^https:\/\/[a-z0-9-]+\.service-now\.com$/.test(plan.origin), 'fixture_origin_required')
  assert.ok(ID.test(plan.scopeId) && ID.test(plan.updateSetId), 'fixture_ids_required')
  assert.ok(/^[a-z][a-z0-9_]*$/.test(plan.scopeName) && plan.scopeName !== 'global', 'scoped_fixture_required')
  assert.ok(!/^(x_g|sn_apm)/i.test(plan.scopeName), 'excluded_scope')
  assert.ok(typeof plan.reviewReference === 'string' && plan.reviewReference.trim(), 'architect_review_reference_required')
  assert.ok(typeof plan.coordinatedWindow === 'string' && plan.coordinatedWindow.trim(), 'coordinated_window_required')
}

export function preferenceValue(rows, name) {
  const selected = rows.filter(row => row.name === name)
  assert.equal(selected.length, 1, 'preference_destination_ambiguous')
  return selected[0].value
}

export function requireBaselineDestination({plan, scope, set, preferences}) {
  requireFixture(plan)
  assert.ok(scope && scope.sys_id === plan.scopeId && scope.scope === plan.scopeName, 'scope_identity')
  assert.ok(!/enterprise architecture|bcbs/i.test(scope.name), 'excluded_scope')
  assert.ok(scope.sys_class_name === 'sys_app', 'developed_application_required')
  assert.ok(set && set.sys_id === plan.updateSetId && set.application === plan.scopeId && set.state === 'in progress', 'baseline_current_set_destination')
  assert.equal(preferenceValue(preferences, 'apps.current_app'), plan.scopeId, 'coherent_current_application_required')
  assert.equal(preferenceValue(preferences, 'sys_update_set'), plan.updateSetId, 'coherent_current_set_required')
  assert.equal(preferenceValue(preferences, `updateSetForScope${plan.scopeId}`), plan.updateSetId, 'coherent_scope_set_required')
}

export function comparePreferences(before, after) {
  const normalized = rows => rows.map(({sys_id, ...row}) => JSON.stringify(Object.entries(row).sort())).sort()
  assert.deepEqual(normalized(after), normalized(before), 'unexpected_preference_changes')
  return {valuesUnchanged: true, rowsReplaced: before.filter(row => !after.some(next => next.sys_id === row.sys_id)).map(row => row.sys_id)}
}

export function requireOwnedFixture({entry, row, plan, prefix, script}) {
  assert.ok(entry && ID.test(entry.sysId) && !PROTECTED.has(entry.sysId) && !entry.deleteAttempted && !entry.deleted, 'cleanup_ownership')
  assert.equal(entry.table, TABLE, 'cleanup_table')
  assert.equal(entry.scope, plan.scopeId, 'cleanup_ledger_scope')
  assert.ok(row && row.sys_id === entry.sysId && row.sys_scope === plan.scopeId, 'cleanup_scope')
  assert.ok(row.active === 'false' && row.name === prefix && row.script === script && row.script.includes(prefix), 'cleanup_inactive_marker_content')
}

export function requireFreshCapture(rows, baseline, {plan, sysId, action, started}) {
  assert.ok(ID.test(sysId) && !PROTECTED.has(sysId), 'capture_target')
  assert.equal(rows.length, 1, 'capture_ambiguous_or_missing')
  const row = rows[0]
  const complete = item => ID.test(item.sys_id ?? '') && /^\d+$/.test(String(item.sys_mod_count)) && Number.isSafeInteger(Number(item.sys_mod_count))
  assert.ok(complete(row) && baseline.every(complete), 'capture_version_evidence_missing')
  assert.ok(row.name === `${TABLE}_${sysId}` && row.application === plan.scopeId && row.update_set === plan.updateSetId && row.action === action, 'capture_destination')
  const timestamp = Date.parse(row.sys_updated_on.replace(' ', 'T') + 'Z')
  assert.ok(Number.isFinite(timestamp) && timestamp >= Date.parse(started) - 1000 && timestamp <= Date.now() + 60_000, 'capture_clock_or_freshness')
  assert.ok(!baseline.some(old => old.sys_id === row.sys_id && Number(row.sys_mod_count) <= Number(old.sys_mod_count)), 'capture_version_unchanged')
  return row
}

export function requireClock(serverDate, clientNow = Date.now()) {
  const serverUtc = Date.parse(serverDate)
  assert.ok(Number.isFinite(serverUtc) && Number.isFinite(clientNow) && Math.abs(serverUtc - clientNow) <= 2000, 'client_server_clock_required')
  return {clientUtc: new Date(clientNow).toISOString(), serverUtc: new Date(serverUtc).toISOString()}
}

export function packageTreeDigest(root) {
  const files = []
  const walk = directory => {
    for (const entry of readdirSync(directory, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name)
      assert.ok(!entry.isSymbolicLink(), 'candidate_symlink')
      if (entry.isDirectory()) walk(path)
      else files.push([relative(root, path), hash(readFileSync(path))])
    }
  }

  for (const path of ['bin', 'dist']) walk(join(root, path))
  for (const path of ['package.json', 'oclif.manifest.json']) files.push([path, hash(readFileSync(join(root, path)))])
  return hash(JSON.stringify(files))
}

export function requireCandidate(cliBin, sourceSha) {
  assert.ok(cliBin && cliBin.startsWith('/'), 'explicit_candidate_executable_required')
  const binary = realpathSync(cliBin)
  const packageRoot = resolve(dirname(binary), '..')
  const receipt = load(resolve(packageRoot, '../../..', 'candidate.json'))
  assert.equal(realpathSync(receipt.cliBin), binary, 'candidate_binary_mismatch')
  assert.equal(receipt.sourceSha, sourceSha, 'candidate_source_mismatch')
  assert.equal(receipt.sourceDirty, false, 'clean_candidate_required')
  assert.ok(satisfiesCaret(receipt.core, load(join(packageRoot, 'package.json')).dependencies?.['@sonisoft/now-sdk-ext-core']), 'candidate_core_version')
  assert.equal(hash(readFileSync(receipt.tarball)), receipt.packageDigest, 'candidate_package_digest')
  assert.equal(packageTreeDigest(packageRoot), receipt.packageTreeDigest, 'candidate_tree_changed')
  assert.ok(load(join(packageRoot, 'oclif.manifest.json')).commands['metadata:insert'], 'candidate_manifest')
  return receipt
}
