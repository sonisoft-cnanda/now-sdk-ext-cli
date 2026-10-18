import {describe, expect, it} from '@jest/globals'
import {readdir, writeFile} from 'node:fs/promises'
import {join, resolve} from 'node:path'

import {ids, isolatedCli, metadataFixture, SCRIPT, SECRET, writeArgs} from '../test_utils/metadata-http-fixture.js'

const binary = resolve(process.env.NEX_METADATA_CLI_BIN || 'bin/run.js')

async function scenario(mode: string, action: string, check: (result: any, fixture: Awaited<ReturnType<typeof metadataFixture>>, cli: Awaited<ReturnType<typeof isolatedCli>>) => Promise<void> | void) {
  const fixture = await metadataFixture(mode)
  let cli: Awaited<ReturnType<typeof isolatedCli>> | undefined
  try {
    cli = await isolatedCli(binary, fixture)
    const result = await cli.nex(writeArgs(action))
    const observed = result.stdout + result.stderr + await cli.logs()
    for (const secret of [SECRET, SCRIPT, 'fabricated-page-token', 'fabricated-session-cookie', 'fabricated-session-token', 'fabricated-response-secret', 'fabricated-read-secret']) expect(observed).not.toContain(secret)
    await check(result, fixture, cli)
  } finally {
    await cli?.close()
    await fixture.close()
  }
}

describe('metadata binary tooling evaluations', () => {
  it.each(['insert', 'update', 'delete'])('verifies %s through the released core with one form POST', async action => {
    await scenario('success', action, async (result, fixture, cli) => {
      expect(result.exitCode).toBe(0)
      expect(JSON.parse(result.stdout)).toMatchObject({action, table: 'sys_script_include', sysId: ids.record,
        capture: {preferencesUnchanged: false, currentUpdateSet: {switched: true}}})
      expect(fixture.counts().posts).toBe(1)
      expect(fixture.submitted().sysparm_transaction_scope).toBe(ids.scope)
      expect(fixture.submitted().sysparm_transaction_update_set).toBe(ids.set)
      expect(await readdir(cli.directory)).not.toContain('logs')
      expect(await cli.logs()).toBe('')
    })
  })

  it.each([
    ['scope_unknown', 'scope_unknown', 'insert'], ['scope_ambiguous', 'scope_ambiguous', 'insert'],
    ['store_scope', 'store_scope', 'insert'], ['table_not_supported', 'table_not_supported', 'insert'],
    ['scope_mismatch', 'scope_mismatch', 'update'], ['form_scope', 'scope_not_applied', 'insert'],
    ['not_permitted', 'not_permitted', 'update'], ['delete_not_supported', 'delete_not_supported', 'delete'],
    ['wrong_update_set', 'invalid_input', 'insert'], ['csrf_token_unavailable', 'csrf_token_unavailable', 'insert'],
    ['evidence_unavailable', 'evidence_unavailable', 'insert'], ['acl_failure', 'evidence_unavailable', 'insert'],
    ['auth_failure', 'evidence_unavailable', 'insert'], ['pre_session_changed', 'session_changed', 'insert'],
  ])('refuses %s without a metadata POST', async (mode, code, action) => {
    await scenario(mode, action, (result, fixture) => {
      expect(result.exitCode).not.toBe(0)
      expect(JSON.parse(result.stdout).error.metadata).toMatchObject({code, writeAttempted: false})
      expect(fixture.counts().posts).toBe(0)
    })
  })

  it.each([
    ['not_captured', 'not_captured', 'insert'], ['stale_capture', 'not_captured', 'insert'],
    ['captured_elsewhere', 'captured_elsewhere', 'insert'], ['mixed_scope_capture', 'mixed_scope_capture', 'insert'],
    ['scope_not_applied', 'scope_not_applied', 'insert'], ['session_changed', 'session_changed', 'insert'],
    ['write_not_applied', 'write_not_applied', 'insert'], ['verification_unavailable', 'verification_unavailable', 'insert'],
    ['delete_not_applied', 'delete_not_applied', 'delete'], ['delete_not_captured', 'delete_not_captured', 'delete'],
    ['post_401', 'verification_unavailable', 'insert'], ['dropped_response', 'verification_unavailable', 'insert'],
    ['csrf_rejected', 'csrf_rejected', 'insert'],
  ])('preserves %s evidence and never replays the POST', async (mode, code, action) => {
    await scenario(mode, action, (result, fixture) => {
      expect(result.exitCode).not.toBe(0)
      expect(JSON.parse(result.stdout).error.metadata).toMatchObject({code, verification: 'failed', writeAttempted: true, sysId: ids.record})
      expect(fixture.counts().posts).toBe(1)
      expect(fixture.counts().authPosts).toBe(2)
    })
  })

  it('refuses malformed input, unknown variables, system fields and unsafe initial queries before submission', async () => {
    const fixture = await metadataFixture()
    const cli = await isolatedCli(binary, fixture)
    try {
      const cases = [
        ['--fields', '{"sys_scope":"global"}'], ['--variables', '{"unknown":"value"}'],
        ['--initial-query', 'name=javascript:gs.getUserID()'],
        ['--fields', '{"__proto__":{"private":"value"}}'], ['--fields', '[]'],
      ]
      for (const extra of cases) {
        const result = await cli.nex(['metadata', 'insert', '--table', 'sys_script_include', '--scope', 'x_test', ...extra, '--auth', 'metadata-fixture', '--json'])
        expect(result.exitCode).not.toBe(0)
        expect(JSON.parse(result.stdout)).toHaveProperty('error.metadata')
      }
      expect(fixture.counts().posts).toBe(0)
    } finally {
      await cli.close()
      await fixture.close()
    }
  })

  it('refuses an initial-query disjunction before the metadata POST', async () => {
    const fixture = await metadataFixture()
    const cli = await isolatedCli(binary, fixture)
    try {
      const result = await cli.nex(['metadata', 'insert', '--table', 'sys_script_include', '--scope', 'x_test',
        '--initial-query', 'name=test^ORactive=true', '--auth', 'metadata-fixture', '--json'])
      expect(fixture.counts().posts).toBe(0)
      expect(result.exitCode).not.toBe(0)
    } finally {
      await cli.close()
      await fixture.close()
    }
  })

  it.each(['insert', 'update'])('refuses encoded operators and unsafe literals on %s with zero POSTs', async action => {
    const fixture = await metadataFixture()
    const cli = await isolatedCli(binary, fixture)
    try {
      const invalid = ['name=test^ORactive=true', 'name=test^NQactive=true', 'ORDERBYname=x',
        'ORDERBYDESCname=x', 'name!=x', 'nameLIKEfoo', 'name>1', 'sys_scope=global',
        'constructor=x', 'prototype=x', '__proto__=x', '', '^name=x', 'name=x^', 'name=x^^active=true',
        'Name=x', 'name=JavaScript:gs.getUserID()', 'name=x\n', 'name=x\u0000', 'name=x\u0085']
      for (const query of invalid) {
        // NUL cannot appear in OS argv. A newline and C1 control exercise the binary boundary.
        if (query.includes('\u0000')) continue
        const result = await cli.nex([...writeArgs(action), '--initial-query', query])
        expect(result.exitCode).not.toBe(0)
        expect(JSON.parse(result.stdout).error.metadata).toMatchObject({code: 'invalid_input', writeAttempted: false})
        expect(result.stdout + result.stderr + await cli.logs()).not.toContain(query || 'fabricated-password')
        expect(fixture.counts().posts).toBe(0)
      }
    } finally {
      await cli.close()
      await fixture.close()
    }
  }, 180_000)

  it.each(['insert', 'update'])('preserves literal equality queries on %s', async action => {
    const fixture = await metadataFixture()
    const cli = await isolatedCli(binary, fixture)
    try {
      for (const query of ['name=Example^active=false', 'order=1', 'name=', 'name=a=b']) {
        const before = fixture.counts().posts
        const beforeQueries = fixture.queries().length
        const result = await cli.nex([...writeArgs(action), '--initial-query', query])
        expect(result.exitCode).toBe(0)
        expect(fixture.counts().posts).toBe(before + 1)
        expect(fixture.queries()[beforeQueries]).toBe(query)
      }
    } finally {
      await cli.close()
      await fixture.close()
    }
  })

  it('preserves file/inline values, variable-only input, human output and debug file privacy', async () => {
    const fixture = await metadataFixture()
    const cli = await isolatedCli(binary, fixture)
    try {
      const fields = join(cli.directory, 'fields.json')
      await writeFile(fields, JSON.stringify({active: false, count: 0, empty: null, duration: {days: 1, seconds: 2}, list: ['one', 'two'], script: SCRIPT}))
      const common = ['metadata', 'insert', '--table', 'sys_script_include', '--scope', 'x_test', '--auth', 'metadata-fixture']
      const result = await cli.nex([...common, '--fields-file', fields, '--log-level', 'debug', '--log-dir', join(cli.directory, 'logs')])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Verified metadata insert')
      expect(result.stdout).toContain('switched: true')
      expect(fixture.submitted()).toMatchObject({'sys_script_include.active': 'false', 'sys_script_include.count': '0', 'sys_script_include.empty': '', 'sys_script_include.list': 'one,two', 'sys_script_include.duration': '1 00:00:02'})
      const variable = await cli.nex([...common, '--variables', '{"script":"variable-input"}', '--variable-field', 'inputs', '--json'])
      expect(variable.exitCode).toBe(0)
      expect(fixture.submitted()[`sys_script_include.inputs.var__m_${ids.action}.script`]).toBe('variable-input')
      const observed = result.stdout + result.stderr + variable.stdout + variable.stderr + await cli.logs()
      for (const secret of [SECRET, SCRIPT, 'fabricated-page-token', 'fabricated-session-cookie', 'fabricated-session-token']) expect(observed).not.toContain(secret)
    } finally {
      await cli.close()
      await fixture.close()
    }
  })

  it('enforces CLI policy before metadata submission', async () => {
    const fixture = await metadataFixture()
    const cli = await isolatedCli(binary, fixture)
    try {
      const result = await cli.nex([...writeArgs(), '--read-only', '--log-level', 'debug', '--log-dir', join(cli.directory, 'logs')])
      expect(result.exitCode).not.toBe(0)
      expect(JSON.parse(result.stdout).error.metadata.code).toBe('policy_refused')
      expect(fixture.counts().posts).toBe(0)
      const observed = result.stdout + result.stderr + await cli.logs()
      for (const secret of [SECRET, SCRIPT, 'fabricated-page-token', 'fabricated-session-cookie', 'fabricated-session-token']) expect(observed).not.toContain(secret)
    } finally {
      await cli.close()
      await fixture.close()
    }
  })
})
