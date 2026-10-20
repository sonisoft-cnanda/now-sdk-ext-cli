import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {dirname, join, resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

// Read raw evidence before the ordinary query/count commands apply defaults.
// Only GET requests are available here. Writes still use the packed nex binary.
try {
  const [, , cliBin, ...args] = process.argv
  const root = resolve(dirname(cliBin), '..')
  process.argv = [process.execPath, cliBin, ...args]
  await import(pathToFileURL(join(root, 'bin/argv-guard.js')).href)
  await import(pathToFileURL(join(root, 'bin/credstore-boot.js')).href)
  const require = createRequire(resolve(cliBin))
  const {Flags} = await import(pathToFileURL(require.resolve('@oclif/core')).href)
  const {flushLogs, ServiceNowRequest} = await import(pathToFileURL(require.resolve('@sonisoft/now-sdk-ext-core')).href)
  const {AuthenticatedCommand} = await import(pathToFileURL(join(root, 'dist/common/authenticated-command.js')).href)

  class ReadEvidence extends AuthenticatedCommand {
    static flags = {
      table: Flags.string({required: true}),
      query: Flags.string({required: true}),
      fields: Flags.string({required: true}),
    }

    // Do not send raw responses or exceptions through the shared error logger.
    async catch() {
      await flushLogs()
      throw new Error('read_evidence_failed')
    }

    async run() {
      assert.equal(this.flags['read-only'], true, 'read_only_required')
      const {table, query, fields} = this.flags
      assert.match(table, /^[a-z][a-z0-9_]*$/, 'read_table_invalid')
      const request = new ServiceNowRequest(this.instance)
      const get = async (path, params) => {
        const response = await request.get({path, method: 'get',
          headers: {Accept: 'application/json'}, query: params, body: null})
        assert.equal(response.status, 200, 'read_status_invalid')
        return response.bodyObject ?? response.data
      }

      const count = async () => {
        const data = await get(`/api/now/stats/${table}`, {sysparm_count: 'true', sysparm_query: query})
        const raw = data?.result?.stats?.count
        // No coercion of null, booleans, whitespace, fractions or partial numbers.
        assert.ok(typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw)), 'read_count_missing')
        const value = Number(raw)
        assert.ok(Number.isSafeInteger(value) && value >= 0, 'read_count_invalid')
        return value
      }

      const before = await count()
      const data = await get(`/api/now/table/${table}`, {sysparm_query: query, sysparm_fields: fields,
        sysparm_limit: 1000, sysparm_display_value: 'false'})
      assert.ok(Array.isArray(data?.result), 'read_records_missing')
      assert.ok(data.result.every(row => row && typeof row === 'object' && !Array.isArray(row)), 'read_record_invalid')
      assert.equal(data.result.length, before, 'read_incomplete')
      assert.equal(await count(), before, 'read_changed')
      return {records: data.result}
    }
  }

  await ReadEvidence.run(args, root)
} catch {
  process.stderr.write('Metadata read evidence failed. No absence result is available.\n')
  process.exitCode = 1
}
