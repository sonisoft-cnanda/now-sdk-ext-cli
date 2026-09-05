/**
 * NEX-110 tooling eval: exercise the published nex binary against an
 * isolated @sonisoft/sn-credstore file backend.
 *
 * Every fixture value is fabricated. Each test owns its store path, which is
 * passed explicitly so this suite can never read or mutate a developer's real
 * credential store.
 */

import {afterEach, beforeAll, describe, expect, it} from '@jest/globals'
import {execFile} from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {promisify} from 'node:util'

const execFileAsync = promisify(execFile)
const REPO = process.cwd()
const RUN = path.join(REPO, 'bin', 'run.js')
const SECRET = 'fabricated-password-never-print'

interface NexResult {
  exitCode: number
  stderr: string
  stdout: string
}

function cleanChildEnv(overrides: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = {...process.env, ...overrides}
  delete env.NODE_ENV
  for (const key of Object.keys(env)) {
    if (key.startsWith('JEST_')) delete env[key]
  }

  return env
}

async function nex(args: string[], env: NodeJS.ProcessEnv): Promise<NexResult> {
  try {
    const result = await execFileAsync(process.execPath, [RUN, ...args], {
      env: cleanChildEnv(env),
      timeout: 60_000,
    })
    return {...result, exitCode: 0}
  } catch (error) {
    const result = error as {code?: number; stderr?: string; stdout?: string}
    return {
      exitCode: result.code ?? 1,
      stderr: result.stderr ?? '',
      stdout: result.stdout ?? '',
    }
  }
}

function writeFixture(storePath: string): void {
  fs.writeFileSync(storePath, JSON.stringify({
    'eval-alias': {
      alias: 'eval-alias',
      creds: {
        instanceUrl: 'https://example.invalid',
        password: SECRET,
        type: 'basic',
        username: 'fabricated-user',
      },
      isDefault: true,
    },
  }), {mode: 0o600})
}

describe('credential-store tooling eval', () => {
  let runDir: string
  let storePath: string

  beforeAll(() => {
    expect(process.version).toMatch(/^v2[6-9]\./)
  })

  afterEach(() => {
    if (runDir) fs.rmSync(runDir, {force: true, recursive: true})
  })

  function isolatedEnv(): NodeJS.ProcessEnv {
    runDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nex-credstore-eval-'))
    storePath = path.join(runDir, 'credentials.json')
    return {
      HOME: runDir,
      SN_CRED_STORE: 'file',
      SN_CRED_STORE_ALLOW_PLAINTEXT: '1',
      SN_CRED_STORE_ENABLE: '1',
      SN_CRED_STORE_PATH: storePath,
      XDG_CONFIG_HOME: path.join(runDir, 'config'),
      XDG_STATE_HOME: path.join(runDir, 'state'),
    }
  }

  it('installs the shim and reports the run-owned file store', async () => {
    const env = isolatedEnv()
    writeFixture(storePath)

    const result = await nex(['auth', 'doctor', '--json', '--cred-store'], env)

    expect(result.exitCode).toBe(0)
    const report = JSON.parse(result.stdout) as {path: string; shimActive: boolean; store: string}
    expect(report.shimActive).toBe(true)
    expect(report.store).toBe('file')
    expect(report.path).toBe(storePath)
    expect(result.stdout + result.stderr).not.toContain(SECRET)
  })

  it('discovers a fabricated alias through the real nex binary without exposing its secret', async () => {
    const env = isolatedEnv()
    writeFixture(storePath)

    const result = await nex(['auth', 'list', '--json', '--cred-store'], env)

    expect(result.exitCode).toBe(0)
    const report = JSON.parse(result.stdout) as {aliases: Array<{alias: string}>; path: string}
    expect(report.aliases.map(({alias}) => alias)).toEqual(['eval-alias'])
    expect(report.path).toBe(storePath)
    expect(result.stdout + result.stderr).not.toContain(SECRET)
  })

  it('fails closed with remediation when the isolated store is corrupt', async () => {
    const env = isolatedEnv()
    fs.writeFileSync(storePath, '{not valid json', {mode: 0o600})

    const result = await nex(['health', 'check', '--auth', 'eval-alias', '--cred-store'], env)

    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain('Credential lookup or renewal failed')
    expect(result.stderr).toContain('nex auth doctor')
    expect(result.stderr).not.toContain('Reauthenticate')
    expect(fs.readFileSync(storePath, 'utf8')).toBe('{not valid json')
    expect(fs.readdirSync(runDir).some((name) => name.startsWith('credentials.json.corrupt.'))).toBe(true)
    expect(result.stdout + result.stderr).not.toContain(SECRET)
  })

  it('honours the hard-disable switch ahead of the enable switch', async () => {
    const env = {...isolatedEnv(), SN_CRED_STORE_DISABLE: '1'}
    writeFixture(storePath)

    const result = await nex(['auth', 'doctor', '--json', '--cred-store'], env)

    expect(result.exitCode).toBe(0)
    const report = JSON.parse(result.stdout) as {shimActive: boolean}
    expect(report.shimActive).toBe(false)
    expect(result.stdout + result.stderr).not.toContain(SECRET)
  })
})
