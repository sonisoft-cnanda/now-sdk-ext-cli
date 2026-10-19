import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {join} from 'node:path'

// Native Node keeps credential initialization outside Jest's ESM registry.
// Never print raw child stdout, stderr or exceptions: they can contain private data.
export function invoke(cliBin, args, {read = false, alias = 'dev206299'} = {}) {
  const entry = read ? [join(import.meta.dirname, 'read-evidence.mjs'), cliBin] : [cliBin]
  const result = spawnSync(process.execPath, [...process.execArgv, ...entry, ...args, '--auth', alias, '--cred-store', '--json', ...(read ? ['--read-only'] : [])],
    {encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024})
  let payload
  try {
    payload = JSON.parse(result.stdout)
  } catch { /* Missing evidence is a failure; never replay a child. */ }

  return {ok: !result.error && !result.signal && result.status === 0 && payload !== undefined,
    status: result.status, signal: result.signal, payload}
}

export function reader(cliBin, {alias = 'dev206299'} = {}) {
  const call = args => {
    const result = invoke(cliBin, args, {read: true, alias})
    assert.ok(result.ok, 'read_command_failed')
    return result.payload
  }

  const rows = (table, query, fields) => {
    const result = call(['--table', table, '--query', query, '--fields', fields])
    assert.ok(Array.isArray(result.records), 'read_records_missing')
    const scalar = value => value && typeof value === 'object' ? value.value : value
    const records = result.records.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, scalar(value)])))
    return records
  }

  const exact = (table, id, fields) => {
    const records = rows(table, `sys_id=${id}`, `sys_id,${fields}`)
    assert.ok(records.length <= 1 && records.every(row => row.sys_id === id), 'exact_identity')
    return records[0]
  }

  return {rows, exact, call}
}
