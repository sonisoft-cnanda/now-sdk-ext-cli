/**
 * NEX-3, end to end: nex must not write files into the directory it was run from.
 *
 * The bug was in core, but the guarantee is a property of the shipped CLI, and only
 * running the real binary proves it. A unit test on flag shapes would pass even if
 * `configureLogging` were never called — which is exactly the mistake this guards.
 *
 * Spawns bin/run.js in a temp cwd with an alias that cannot resolve. The command
 * failing is fine and deliberate: the failure path is the one that logs.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { execFile } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const REPO = process.cwd()
const RUN = path.join(REPO, 'bin', 'run.js')
const BUILT = fs.existsSync(path.join(REPO, 'dist', 'commands'))

/** Runs nex in `cwd`; resolves with output whether it exits zero or not. */
async function nex(
  cwd: string,
  args: string[],
  env: NodeJS.ProcessEnv = {},
): Promise<{stdout: string; stderr: string}> {
  // Jest sets NODE_ENV=test and JEST_WORKER_ID, and oclif reads those to decide it
  // should load TypeScript sources through ts-node instead of dist/. Inheriting them
  // means testing something the user never runs, and it fails on a missing .js import.
  const childEnv = {...process.env, ...env}
  delete childEnv.NODE_ENV
  for (const key of Object.keys(childEnv)) {
    if (key.startsWith('JEST_')) delete childEnv[key]
  }

  try {
    return await execFileAsync(process.execPath, [RUN, ...args], {
      cwd,
      env: childEnv,
      timeout: 60_000,
    })
  } catch (error) {
    const e = error as {stdout?: string; stderr?: string}
    return {stdout: e.stdout ?? '', stderr: e.stderr ?? ''}
  }
}

// Requires dist/. `npm run test:unit` does not build, so skip rather than fail
// misleadingly when someone runs tests on a clean checkout.
const maybe = BUILT ? describe : describe.skip

maybe('nex logging (end to end)', () => {
  let workdir: string
  let stateHome: string

  beforeAll(() => {
    workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'nex-e2e-'))
    stateHome = fs.mkdtempSync(path.join(os.tmpdir(), 'nex-state-'))
  })

  afterAll(() => {
    fs.rmSync(workdir, {force: true, recursive: true})
    fs.rmSync(stateHome, {force: true, recursive: true})
  })

  it('creates no logs/ directory in the working directory by default', async () => {
    await nex(workdir, ['health', 'check', '-a', 'no-such-alias-nex3'], {
      XDG_STATE_HOME: stateHome,
    })

    // This is the whole bug: a published CLI littering the user's project.
    expect(fs.existsSync(path.join(workdir, 'logs'))).toBe(false)
  })

  it('writes to the state directory, not the cwd, when --log-file is passed', async () => {
    await nex(workdir, ['health', 'check', '-a', 'no-such-alias-nex3', '--log-file'], {
      XDG_STATE_HOME: stateHome,
    })

    const logFile = path.join(stateHome, 'now-sdk-ext', 'logs', 'nex.log')
    expect(fs.existsSync(logFile)).toBe(true)
    expect(fs.readFileSync(logFile, 'utf8').length).toBeGreaterThan(0)
    expect(fs.existsSync(path.join(workdir, 'logs'))).toBe(false)
  })

  it('treats --log-dir as opting in, without also needing --log-file', async () => {
    const dir = path.join(workdir, 'chosen-logs')
    await nex(workdir, ['health', 'check', '-a', 'no-such-alias-nex3', '--log-dir', dir], {
      XDG_STATE_HOME: stateHome,
    })

    expect(fs.existsSync(path.join(dir, 'nex.log'))).toBe(true)
  })

  it('keeps stdout parseable under --json', async () => {
    const {stdout} = await nex(
      workdir,
      ['health', 'check', '-a', 'no-such-alias-nex3', '--json'],
      {XDG_STATE_HOME: stateHome},
    )

    // Anything winston puts on fd 1 breaks this, and would break MCP's JSON-RPC
    // framing the same way.
    if (stdout.trim().length > 0) {
      expect(() => JSON.parse(stdout) as unknown).not.toThrow()
    }
  })

  it('preserves redacted SDK credential-refresh errors on stderr in JSON mode', async () => {
    const preload = path.join(workdir, 'sdk-refresh.mjs')
    fs.writeFileSync(preload, `
import { createRequire } from 'node:module';
import { logger } from ${JSON.stringify(path.join(REPO, 'node_modules/@servicenow/sdk-cli/dist/logger/index.js'))};
const auth = createRequire(import.meta.url)(${JSON.stringify(path.join(REPO, 'node_modules/@servicenow/sdk-cli/dist/auth/index.js'))});
auth.getCredentials = async () => {
  logger.info('Access Token has expired, refreshing token');
  logger.error('Simulated refresh failure', {password: 'fixture-sdk-password'}, new Error('Bearer fixture-sdk-bearer'));
  return undefined;
};
`)
    const {stdout, stderr} = await nex(workdir, ['behavior', '--table', 'incident', '--auth', 'mock-refresh', '--json'], {
      NODE_OPTIONS: `--import=${preload}`,
      XDG_STATE_HOME: stateHome,
    })
    expect(stdout).not.toContain('[now-sdk]')
    expect(stdout + stderr).toContain('mock-refresh')
    expect(stderr).toContain('Simulated refresh failure')
    expect(stderr).toContain('[redacted]')
    expect(stderr).not.toContain('fixture-sdk-password')
    expect(stderr).not.toContain('fixture-sdk-bearer')
    if (stdout.trim()) expect(() => JSON.parse(stdout) as unknown).not.toThrow()
  })

  it('records something at --log-level trace instead of silently dropping everything', async () => {
    const dir = path.join(workdir, 'trace-logs')
    await nex(
      workdir,
      ['health', 'check', '-a', 'no-such-alias-nex3', '--log-dir', dir, '--log-level', 'trace'],
      {XDG_STATE_HOME: stateHome},
    )

    // 'trace' is not a winston level. It used to leave the threshold undefined on
    // the one transport that had no explicit level, so that transport dropped every
    // record while the others kept working — partial and invisible.
    expect(fs.readFileSync(path.join(dir, 'nex.log'), 'utf8').trim().length).toBeGreaterThan(0)
  })

  it('writes no credential material to the log', async () => {
    const dir = path.join(workdir, 'secret-scan-logs')
    await nex(
      workdir,
      ['health', 'check', '-a', 'no-such-alias-nex3', '--log-dir', dir, '--log-level', 'debug'],
      {XDG_STATE_HOME: stateHome},
    )

    const contents = fs.readFileSync(path.join(dir, 'nex.log'), 'utf8')
    for (const needle of ['JSESSIONID', 'glide_session_store', 'userToken', 'X-UserToken']) {
      expect(contents).not.toContain(needle)
    }
  })
})
