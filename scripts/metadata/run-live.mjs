import assert from 'node:assert/strict'
import {spawn, spawnSync} from 'node:child_process'
import {closeSync, existsSync, openSync, realpathSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {parseArgs} from 'node:util'
import {load, privateRoot, requireCandidate, requireFixture} from './controls.mjs'

export function runHelper(helper, command, env) {
  return new Promise(resolveResult => {
    // Preserve helper sync/lock warnings and recovery paths in restricted evidence.
    const phase = command.at(-1).endsWith('/audit.mjs') ? 'audit' : 'lifecycle'
    const log = openSync(join(env.NEX_METADATA_PRIVATE_DIR, `access-helper-${phase}.log`), 'wx', 0o600)
    const child = spawn(process.execPath, [helper, 'run', '--alias', 'dev206299', '--', ...command], {env, stdio: ['ignore', log, log]})
    closeSync(log)
    let interrupted
    const forward = signal => {
      interrupted = signal
      child.kill(signal)
    }
    const interrupt = () => forward('SIGINT')
    const terminate = () => forward('SIGTERM')
    process.on('SIGINT', interrupt)
    process.on('SIGTERM', terminate)
    const timer = setTimeout(terminate, 20 * 60_000)
    const finish = result => {
      clearTimeout(timer)
      process.off('SIGINT', interrupt)
      process.off('SIGTERM', terminate)
      resolveResult({...result, ...(interrupted ? {code: 1, signal: interrupted} : {})})
    }

    child.on('error', () => finish({code: 1}))
    child.on('close', (code, signal) => finish({code: code ?? 1, signal}))
  })
}

// Kept separate for deterministic runner tests. A failed lifecycle is never rerun.
export async function runSequence({run, lifecycleCommand, auditCommand, hasReport, reportPassed, auditPassed}) {
  const lifecycle = await run(lifecycleCommand)
  if (lifecycle.signal || !hasReport()) return 1
  // The first helper has exited and released its alias lock before this audit.
  const audit = await run(auditCommand)
  return lifecycle.code === 0 && reportPassed() && audit.code === 0 && !audit.signal && auditPassed() ? 0 : 1
}

export async function runLive({accessHelper, privateDir, cliBin}) {
  assert.equal(process.env.NEX_METADATA_LIVE, '1', 'explicit_live_opt_in_required')
  assert.ok(accessHelper && existsSync(accessHelper), 'access_helper_required')
  const helper = realpathSync(accessHelper)
  assert.ok(helper.endsWith('/sn-access.mjs'), 'supported_access_helper_required')
  const repository = resolve(import.meta.dirname, '../..')
  const root = privateRoot(privateDir, repository)
  assert.ok(!existsSync(join(root, 'lifecycle-attempt.json')) && !existsSync(join(root, 'lifecycle-safe.json')), 'fresh_private_directory_required')
  const git = args => {
    const result = spawnSync('git', args, {cwd: repository, encoding: 'utf8'})
    assert.equal(result.status, 0, 'source_identity_failed')
    return result.stdout.trim()
  }

  assert.equal(git(['status', '--porcelain', '--untracked-files=normal']), '', 'clean_source_required')
  const receipt = requireCandidate(cliBin, git(['rev-parse', 'HEAD']))
  const plan = load(join(root, 'fixture.json'))
  requireFixture(plan)
  const env = {...process.env, NEX_METADATA_CLI_BIN: receipt.cliBin, NEX_METADATA_SOURCE_SHA: receipt.sourceSha,
    NEX_METADATA_PRIVATE_DIR: root, NEX_METADATA_ACCESS_HELPER: helper}
  return runSequence({run: command => runHelper(helper, command, env),
    lifecycleCommand: [process.execPath, join(import.meta.dirname, 'live-child.mjs')],
    auditCommand: [process.execPath, join(import.meta.dirname, 'audit.mjs')],
    hasReport: () => existsSync(join(root, 'lifecycle-safe.json')),
    reportPassed: () => load(join(root, 'lifecycle-safe.json')).status === 'PASS',
    auditPassed: () => {
      if (!existsSync(join(root, 'lifecycle-audit-safe.json'))) return false
      const audit = load(join(root, 'lifecycle-audit-safe.json'))
      return audit.status === 'PASS' && audit.sourceSha === receipt.sourceSha && audit.packageDigest === receipt.packageDigest
    }})
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const {values} = parseArgs({options: {'access-helper': {type: 'string'}, 'private-dir': {type: 'string'}, 'cli-bin': {type: 'string'}}})
    process.exitCode = await runLive({accessHelper: values['access-helper'], privateDir: values['private-dir'], cliBin: values['cli-bin']})
    process.stderr.write(process.exitCode === 0 ? 'Metadata lifecycle and audit passed.\n' : 'Metadata lifecycle or audit failed. Do not repeat writes.\n')
  } catch {
    process.stderr.write('Metadata live controls refused execution. Check the reviewed fixture, candidate receipt, and private evidence.\n')
    process.exitCode = 1
  }
}
