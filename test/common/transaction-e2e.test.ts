import {describe, expect, it} from '@jest/globals'
import {execFile} from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {promisify} from 'node:util'

const execFileAsync = promisify(execFile)
const RUN = path.join(process.cwd(), 'bin', 'run.js')
const BUILT = fs.existsSync(path.join(process.cwd(), 'dist', 'commands'))

async function nex(args: string[]): Promise<string> {
  const childEnv = {...process.env}
  delete childEnv.NODE_ENV
  delete childEnv.SN_CRED_STORE_ENABLE
  childEnv.SN_CRED_STORE_DISABLE = '1'
  for (const key of Object.keys(childEnv)) if (key.startsWith('JEST_')) delete childEnv[key]

  try {
    const {stdout, stderr} = await execFileAsync(process.execPath, [RUN, ...args], {env: childEnv, timeout: 60_000})
    return stdout + stderr
  } catch (error) {
    const result = error as {stdout?: string; stderr?: string}
    return (result.stdout ?? '') + (result.stderr ?? '')
  }
}

const maybe = BUILT ? describe : describe.skip

maybe('transaction command help through the real binary', () => {
  it('documents the topic and both commands', async () => {
    const help = await nex(['transaction', '--help'])
    expect(help).toContain('List active transactions across all cluster nodes')
    expect(help).toMatch(/transaction list/)
    expect(help).toMatch(/transaction kill/)
  })

  it('documents list controls and inherited safety/output flags', async () => {
    const help = await nex(['transaction', 'list', '--help'])
    for (const flag of ['--poll-interval-ms', '--timeout-ms', '--query', '--limit', '--read-only', '--json']) expect(help).toContain(flag)
  })

  it('documents kill confirmation, deliberate selection and eventual consistency', async () => {
    const help = await nex(['transaction', 'kill', '--help'])
    expect(help).toContain('--transaction-id')
    expect(help).toContain('--confirm')
    expect(help).toContain('deliberately selected')
    expect(help).toContain('does not mean immediate removal')
  })
})
