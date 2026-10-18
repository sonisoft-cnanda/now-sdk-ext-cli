import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'

// Native Node keeps credential initialization outside Jest's ESM registry.
// Never print raw child stdout, stderr or exceptions: they can contain private data.
export function invoke(cliBin, args, {read = false} = {}) {
  const result = spawnSync(process.execPath, [cliBin, ...args, '--auth', 'dev206299', '--cred-store', '--json', ...(read ? ['--read-only'] : [])],
    {encoding: 'utf8', timeout: 120_000, maxBuffer: 8 * 1024 * 1024})
  let payload
  try {
    // Existing query/count commands print a preamble. Metadata emits one envelope.
    const start = read ? result.stdout.search(/^\s*\{/m) : 0
    payload = JSON.parse(result.stdout.slice(start))
  } catch { /* Missing evidence is a failure; never replay a child. */ }

  return {ok: !result.error && !result.signal && result.status === 0 && payload !== undefined,
    status: result.status, signal: result.signal, payload}
}

export function reader(cliBin) {
  const call = args => {
    const result = invoke(cliBin, args, {read: true})
    assert.ok(result.ok, 'read_command_failed')
    return result.payload
  }

  const rows = (table, query, fields) => {
    const count = () => {
      const result = call(['aggregate', 'count', '-t', table, '-q', query])
      assert.ok(Number.isSafeInteger(Number(result.count)) && Number(result.count) >= 0, 'read_count_missing')
      return Number(result.count)
    }

    const before = count()
    const result = call(['query', '-t', table, '-q', query, '-f', fields, '-l', '1000'])
    assert.ok(Array.isArray(result.records), 'read_records_missing')
    const scalar = value => value && typeof value === 'object' ? value.value : value
    const records = result.records.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, scalar(value)])))
    assert.equal(records.length, before, 'read_incomplete')
    assert.equal(count(), before, 'read_changed')
    return records
  }

  const exact = (table, id, fields) => {
    const records = rows(table, `sys_id=${id}`, `sys_id,${fields}`)
    assert.ok(records.length <= 1 && records.every(row => row.sys_id === id), 'exact_identity')
    return records[0]
  }

  return {rows, exact, call}
}
