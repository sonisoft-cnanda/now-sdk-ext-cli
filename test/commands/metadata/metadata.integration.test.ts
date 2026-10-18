import {describe, expect, it} from '@jest/globals'
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'

describe('guarded packed metadata lifecycle', () => {
  it('requires explicit live controls and a successful native lifecycle/audit', () => {
    // Selecting this bridge without opt-in fails. It must never look like a live pass.
    expect(process.env.NEX_METADATA_LIVE).toBe('1')
    for (const key of ['SN_ACCESS', 'PRIVATE_DIR', 'PACKED_NEX']) expect(process.env[key]).toBeTruthy()
    const result = spawnSync(process.execPath, [resolve('scripts/metadata/run-live.mjs'),
      '--access-helper', process.env.SN_ACCESS!, '--private-dir', process.env.PRIVATE_DIR!, '--cli-bin', process.env.PACKED_NEX!],
    {encoding: 'utf8', timeout: 30 * 60_000})
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    expect(result.status).toBe(0)
  }, 31 * 60_000)
})
