import {describe, expect, it} from '@jest/globals'
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'

import {SN_INSTANCE_ALIAS} from '../../test_utils/test_config.js'

/*
 * nex store repair through the nex binary, live. A repair rewrites an app's files, so this runs only
 * through `npm run test:live` (or NEX_LIVE=1), which builds first, and only on dev206299. It repairs
 * "Bubble trend" (sn_bubble_trend 1.0.0): three files, no dependencies, no demo data, used by nothing,
 * and left as it was by a repair.
 */
const live = (process.env.NEX_LIVE === '1' || process.env.npm_lifecycle_event === 'test:live') && SN_INSTANCE_ALIAS === 'dev206299'
const MINUTE = 60_000
const BIN = resolve('bin/run.js')
const APP = 'dfdf3c79ff4422104e80ffffffffffb7'

// Jest sets NODE_ENV=test, which makes oclif load src/*.ts instead of the built commands.
const ENV = Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_ENV' && !key.startsWith('JEST_')))

interface Result {json: any; status: null | number; stderr: string}
function nex(args: string[], extra: string[] = []): Result {
  const store = process.env.SN_CRED_STORE ? ['--cred-store'] : []
  const run = spawnSync(process.execPath, [BIN, ...args, '-a', SN_INSTANCE_ALIAS, '--json', ...store, ...extra],
    {encoding: 'utf8', env: ENV, maxBuffer: 8 * 1024 * 1024, timeout: 25 * MINUTE})
  let json: unknown
  try {
    json = JSON.parse(run.stdout)
  } catch {
    json = undefined
  }

  return {json, status: run.status, stderr: run.stderr.slice(-2000)}
}

;(live ? describe : describe.skip)(`nex store repair (${SN_INSTANCE_ALIAS}, live)`, () => {
  it('--read-only and --deny-write refuse a repair at the HTTP layer', () => {
    for (const flag of ['--read-only', '--deny-write']) {
      const refused = nex(['store', 'repair', 'sn_bubble_trend'], [flag])
      expect(refused.status).not.toBe(0)
      expect(refused.stderr).toMatch(/denied by a flag/)
    }
  }, 5 * MINUTE)

  it('refuses an app developed on the instance with its code', () => {
    const refused = nex(['store', 'repair', 'x_2115789_flowdbg'])
    expect(refused.status).toBe(1)
    expect(refused.json?.error?.code).toBe('not_a_store_app')
    expect(refused.json?.error?.storeAppRepair?.remediation?.[0]).toContain('developed on this instance')
  }, 5 * MINUTE)

  it('repairs an installed store app and reports the finished upgrade history', () => {
    // Below the spawn limit, so a slow queue ends as timed_out rather than a killed process.
    const result = nex(['store', 'repair', APP, '--timeout', String(20 * MINUTE)])
    if (result.status !== 0) throw new Error(`nex failed (${result.status}): ${JSON.stringify(result.json?.error ?? result.stderr)}`)
    expect(result.json).toMatchObject({app: {scope: 'sn_bubble_trend', sysId: APP, version: '1.0.0'}, repaired: true, success: true, warnings: []})
    expect(result.json.history.status).toBe('complete')
    expect(result.json.history.skippedFiles).toEqual([])
  }, 25 * MINUTE)
})
