import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises'
import {createServer} from 'node:http'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {promisify} from 'node:util'

const execute = promisify(execFile)
export const ids = {scope: 'a'.repeat(32), record: 'b'.repeat(32), set: 'c'.repeat(32), other: 'd'.repeat(32), user: 'e'.repeat(32), action: 'f'.repeat(32)}
export const SECRET = 'fabricated-password-never-print'
export const SCRIPT = 'var FabricatedSecretScript = "never print submitted source";'
const TABLE = 'sys_script_include'
const html = (scope: string, mode: string, newRecord: boolean): string => `<form>
<input name="sys_target" value="${TABLE}"><input name="sys_uniqueValue" value="${ids.record}">
<input name="sys_row" value="${newRecord ? '-1' : '0'}"><input name="sysparm_encoded_record" value="signed-fixture-state">
<input name="sysparm_transaction_scope" value="${scope}"><input name="${TABLE}.sys_scope" value="${scope}">
${mode === 'csrf_token_unavailable' ? '' : '<input name="sysparm_ck" value="fabricated-page-token">'}
<input name="${TABLE}.name" value="old"><textarea name="${TABLE}.script">old</textarea>
<input name="${TABLE}.active" value="false"><input name="${TABLE}.empty" value="old">
<input name="${TABLE}.count" value="0"><input name="${TABLE}.list" value="">
<div data-type="label" id="label.${TABLE}.duration" type="glide_duration"></div><input name="${TABLE}.duration" value="">
<textarea name="${TABLE}.inputs.var__m_${ids.action}.script"></textarea>
${mode === 'not_permitted' ? '' : ['sysverb_insert_and_stay', 'sysverb_update', 'sysverb_delete'].map(action => `<button data-action-name="${action}" gsft_id="${ids.action}"></button>`).join('')}</form>`

/** A loopback HTTP server exercises the released core and SDK without replacing requests. */
export async function metadataFixture(mode = 'success') {
  let posts = 0
  let authPosts = 0
  let preferences = 0
  let formLoaded = false
  let deleted = false
  let submitted: Record<string, string> = {}
  const requests: string[] = []
  const queries: string[] = []
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, 'http://127.0.0.1')
    requests.push(`${request.method} ${url.pathname}`)
    response.setHeader('Connection', 'close')
    const send = (status: number, data: unknown) => {
      response.statusCode = status
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify(data))
    }
    if (url.pathname === '/angular.do') {
      authPosts++
      for await (const _ of request) { /* drain fabricated login */ }
      response.setHeader('Set-Cookie', 'JSESSIONID=fabricated-session-cookie; Path=/')
      response.setHeader('x-usertoken-response', 'fabricated-session-token')
      return send(url.searchParams.get('sysparm_type') === 'get_user' ? 401 : mode === 'auth_failure' ? 403 : 200, {status: 'success'})
    }
    if (url.pathname === `/${TABLE}.do`) {
      if (request.method === 'POST') {
        posts++
        let body = ''
        for await (const chunk of request) body += chunk
        submitted = Object.fromEntries(new URLSearchParams(body))
        deleted = submitted.sys_action === 'sysverb_delete'
        if (mode === 'dropped_response') return request.socket.destroy()
        if (mode === 'post_401') return send(401, {error: 'fabricated-response-secret'})
        if (mode === 'csrf_rejected') {
          response.writeHead(302, {location: '/security_interceptor.do'})
          return response.end()
        }
        response.writeHead(302, {location: `/${TABLE}.do?sys_id=${ids.record}`})
        return response.end()
      }
      formLoaded = true
      queries.push(url.searchParams.get('sysparm_query') ?? '')
      response.setHeader('Content-Type', 'text/html')
      return response.end(html(mode === 'form_scope' ? ids.other : ids.scope, mode, url.searchParams.get('sys_id') === '-1'))
    }
    const table = url.pathname.split('/').at(-1)
    const query = url.searchParams.get('sysparm_query') || ''
    let rows: Array<Record<string, string>> = []
    if (table === 'sys_scope') rows = mode === 'scope_unknown' ? [] : [{sys_id: ids.scope, scope: 'x_test', active: 'true', sys_class_name: 'sys_app'}]
    if (table === 'sys_scope' && mode === 'scope_ambiguous') rows.push({...rows[0], sys_id: ids.other})
    if (table === 'sys_store_app' && mode === 'store_scope') rows = [{sys_id: ids.scope, scope: 'x_test'}]
    if (table === 'sys_db_object') rows = query.startsWith('name=') ?
      [{sys_id: '4'.repeat(32), name: query.slice(5).split('^')[0], super_class: '5'.repeat(32)}] :
      [{sys_id: '5'.repeat(32), name: mode === 'table_not_supported' ? 'incident' : 'sys_metadata', super_class: ''}]
    if (table === 'sys_user') rows = [{sys_id: ids.user}]
    if (table === 'sys_user_preference') {
      preferences++
      rows = [
        {sys_id: '1'.repeat(32), user: ids.user, name: `updateSetForScope${ids.scope}`, value: ids.set},
        {sys_id: '2'.repeat(32), user: ids.user, name: 'sys_update_set', value: posts ? ids.set : ids.other},
        {sys_id: '3'.repeat(32), user: ids.user, name: 'apps.current_app', value: (mode === 'session_changed' && posts) || (mode === 'pre_session_changed' && formLoaded) ? ids.scope : 'global'},
      ]
    }
    if (table === 'sys_update_set') rows = [{sys_id: query.slice(7).split('^')[0], name: 'Fixture set',
      application: mode === 'wrong_update_set' ? ids.other : ids.scope, state: 'in progress'}]
    if (table === 'sys_ui_action') rows = [{sys_id: ids.action, table: mode === 'delete_not_supported' ? TABLE : 'global', name: 'Delete', action_name: 'sysverb_delete', onclick: 'confirmAndDeleteFromForm();'}]
    if (table === 'sys_update_xml' && posts && mode !== 'not_captured') rows = [{sys_id: ids.action, name: `${TABLE}_${ids.record}`,
      update_set: mode === 'captured_elsewhere' ? ids.other : ids.set, application: mode === 'mixed_scope_capture' ? ids.other : ids.scope,
      action: deleted ? 'DELETE' : 'INSERT_OR_UPDATE', sys_mod_count: String(posts), sys_updated_on: mode === 'stale_capture' ? '2000-01-01 00:00:00' : '2099-01-01 00:00:00'}]
    if (table === 'sys_metadata_delete' && deleted && mode !== 'delete_not_captured') rows = [{sys_id: ids.action, sys_metadata: ids.record, sys_scope: ids.scope, sys_created_on: '2099-01-01 00:00:00'}]
    if (table === TABLE && !(deleted && mode !== 'delete_not_applied') && !(posts && mode === 'write_not_applied')) rows = [{sys_id: ids.record, sys_scope: mode === 'scope_mismatch' || (mode === 'scope_not_applied' && posts) ? ids.other : ids.scope}]
    if (mode === 'acl_failure' || (mode === 'verification_unavailable' && posts)) return send(403, {error: 'fabricated-read-secret'})
    if (mode !== 'evidence_unavailable') response.setHeader('x-total-count', String(rows.length))
    return send(200, {result: rows})
  })
  await new Promise<void>(resolveReady => server.listen(0, '127.0.0.1', resolveReady))
  const address = server.address() as {port: number}
  return {url: `http://127.0.0.1:${address.port}`, counts: () => ({posts, authPosts, preferences}), submitted: () => submitted, queries: () => queries, requests,
    close: () => new Promise<void>((resolveClosed, reject) => server.close(error => error ? reject(error) : resolveClosed()))}
}

export async function isolatedCli(cliBin: string, fixture: Awaited<ReturnType<typeof metadataFixture>>) {
  const directory = await mkdtemp(join(process.env.PAPERCLIP_SCRATCH_DIR || tmpdir(), 'nex-metadata-eval-'))
  const store = join(directory, 'credentials.json')
  // Only explicit, fabricated child state. No inherited SDK aliases, auth or policy.
  const env: NodeJS.ProcessEnv = {PATH: process.env.PATH, HOME: directory, LANG: 'C.UTF-8', NO_COLOR: '1',
    XDG_CONFIG_HOME: join(directory, 'config'), XDG_STATE_HOME: join(directory, 'state'),
    SN_CRED_STORE: 'file', SN_CRED_STORE_ALLOW_PLAINTEXT: '1', SN_CRED_STORE_ENABLE: '1', SN_CRED_STORE_PATH: store}
  const nex = async (args: string[]) => {
    try {
      const result = await execute(process.execPath, ['--permission', '--allow-fs-read=*', `--allow-fs-write=${directory}`, '--allow-addons',
        `--allow-net=${new URL(fixture.url).host}`, resolve(cliBin), ...args], {cwd: directory, env, timeout: 30_000})
      return {...result, exitCode: 0}
    } catch (error) {
      const result = error as {code?: number; stdout?: string; stderr?: string}
      return {exitCode: result.code || 1, stdout: result.stdout || '', stderr: result.stderr || ''}
    }
  }
  try {
    const doctor = await nex(['auth', 'doctor', '--json', '--cred-store'])
    assert.equal(doctor.exitCode, 0, `isolated doctor failed: ${doctor.stderr}`)
    assert.equal(JSON.parse(doctor.stdout).path, store)
    assert.equal(JSON.parse(doctor.stdout).shimActive, true)
    await writeFile(store, JSON.stringify({'metadata-fixture': {alias: 'metadata-fixture', isDefault: true,
      creds: {instanceUrl: fixture.url, type: 'basic', username: 'fabricated-user', password: SECRET}}}), {mode: 0o600})
  } catch (error) {
    await rm(directory, {force: true, recursive: true})
    throw error
  }
  const logs = async (root = directory): Promise<string> => {
    let text = ''
    for (const entry of await readdir(root, {withFileTypes: true})) {
      const path = join(root, entry.name)
      if (entry.isDirectory()) text += await logs(path)
      else if (entry.name.endsWith('.log')) text += await readFile(path, 'utf8')
    }
    return text
  }
  return {directory, nex, logs, close: () => rm(directory, {force: true, recursive: true})}
}

export function writeArgs(action = 'insert'): string[] {
  return ['metadata', action, '--table', TABLE, '--scope', 'x_test', '--update-set', ids.set,
    ...(action === 'insert' ? [] : ['--sys-id', ids.record]),
    ...(action === 'delete' ? ['--confirm-table', TABLE, '--confirm-sys-id', ids.record] : ['--fields', JSON.stringify({name: 'Fixture', active: false, script: SCRIPT})]),
    '--auth', 'metadata-fixture', '--cred-store', '--json']
}
