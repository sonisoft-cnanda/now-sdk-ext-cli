/**
 * The permission surface, through the real binary.
 *
 * A unit test on `buildLayers` passes even if `init()` never installs the policy — so
 * these spawn `bin/run.js` and assert on what a user actually gets. `nex policy status`
 * is used as the probe because it needs no credentials, which keeps these runnable in
 * any checkout rather than only where an instance is configured.
 */

import {describe, it, expect} from '@jest/globals'
import {execFile} from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {promisify} from 'node:util'

const execFileAsync = promisify(execFile)

const REPO = process.cwd()
const RUN = path.join(REPO, 'bin', 'run.js')
const BUILT = fs.existsSync(path.join(REPO, 'dist', 'commands'))

async function nex(args: string[], env: NodeJS.ProcessEnv = {}): Promise<{stdout: string; stderr: string}> {
  // Jest sets NODE_ENV/JEST_*, and oclif reads those to decide it should load
  // TypeScript sources through ts-node instead of dist/ — testing something no user runs.
  const childEnv = {...process.env, ...env}
  delete childEnv.NODE_ENV
  for (const key of Object.keys(childEnv)) if (key.startsWith('JEST_')) delete childEnv[key]

  try {
    return await execFileAsync(process.execPath, [RUN, ...args], {env: childEnv, timeout: 60_000})
  } catch (error) {
    const e = error as {stdout?: string; stderr?: string}
    return {stderr: e.stderr ?? '', stdout: e.stdout ?? ''}
  }
}

const maybe = BUILT ? describe : describe.skip

maybe('nex policy status', () => {
  it('permits changes by default', async () => {
    const {stdout} = await nex(['policy', 'status'], {NEX_POLICY_DENY: ''})
    expect(stdout).toMatch(/write\s+permitted/)
    expect(stdout).toMatch(/execute\s+permitted/)
  }, 90_000)

  it('refuses both verbs under --read-only', async () => {
    const {stdout} = await nex(['policy', 'status', '--read-only'], {NEX_POLICY_DENY: ''})
    expect(stdout).toMatch(/write\s+REFUSED/)
    expect(stdout).toMatch(/execute\s+REFUSED/)
  }, 90_000)

  it('refuses only the named verb under --deny-write', async () => {
    const {stdout} = await nex(['policy', 'status', '--deny-write'], {NEX_POLICY_DENY: ''})
    expect(stdout).toMatch(/write\s+REFUSED/)
    expect(stdout).toMatch(/execute\s+permitted/)
  }, 90_000)

  it('lets the environment refuse what no flag asked to refuse', async () => {
    const {stdout} = await nex(['policy', 'status'], {NEX_POLICY_DENY: 'write'})
    expect(stdout).toMatch(/write\s+REFUSED/)
    expect(stdout).toContain('NEX_POLICY_DENY')
  }, 90_000)

  it('FAILS CLOSED on a malformed environment value', async () => {
    // A typo in the variable protecting production must not quietly protect nothing.
    const {stdout} = await nex(['policy', 'status'], {NEX_POLICY_DENY: 'wrtie'})
    expect(stdout).toMatch(/write\s+REFUSED/)
    expect(stdout).toMatch(/execute\s+REFUSED/)
  }, 90_000)

  it('names the deciding layer, so a refusal is diagnosable', async () => {
    const {stdout} = await nex(['policy', 'status', '--read-only'], {NEX_POLICY_DENY: ''})
    expect(stdout).toContain('command-line flag')
  }, 90_000)

  it('emits parseable JSON under --json', async () => {
    const {stdout} = await nex(['policy', 'status', '--json'], {NEX_POLICY_DENY: 'all'})
    const parsed = JSON.parse(stdout) as {permitted: Record<string, {allowed: boolean}>}
    expect(parsed.permitted.write.allowed).toBe(false)
    expect(parsed.permitted.execute.allowed).toBe(false)
  }, 90_000)
})

maybe('global flags reach every command', () => {
  it('offers the deny flags in help for an unrelated command', async () => {
    // baseFlags inheritance is the mechanism; this proves it reaches a real command
    // rather than only the base class.
    const {stdout, stderr} = await nex(['query', '--help'])
    const help = stdout + stderr
    expect(help).toContain('--read-only')
    expect(help).toContain('--deny-write')
    expect(help).toContain('--deny-execute')
  }, 90_000)

  it('does not advertise allow flags while the default is permissive', async () => {
    const {stdout, stderr} = await nex(['query', '--help'])
    expect(stdout + stderr).not.toContain('--allow-write')
  }, 90_000)
})
