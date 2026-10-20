import {describe, expect, it} from '@jest/globals'
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'

// Skipped, not passed, without the live opt-in: npm run test:integration selects this file by path.
const live = process.env.NEX_METADATA_LIVE === '1'
;(live ? describe : describe.skip)('guarded packed metadata lifecycle (needs NEX_METADATA_LIVE=1, SN_ACCESS, PRIVATE_DIR, PACKED_NEX)', () => {
  it('requires explicit live controls and a successful native lifecycle/audit', () => {
    for (const key of ['SN_ACCESS', 'PRIVATE_DIR', 'PACKED_NEX']) expect(process.env[key]).toBeTruthy()
    const result = spawnSync(process.execPath, [resolve('scripts/metadata/run-live.mjs'),
      '--access-helper', process.env.SN_ACCESS!, '--private-dir', process.env.PRIVATE_DIR!, '--cli-bin', process.env.PACKED_NEX!],
    {encoding: 'utf8', timeout: 30 * 60_000})
    expect(result.error).toBeUndefined()
    expect(result.signal).toBeNull()
    expect(result.status).toBe(0)
  }, 31 * 60_000)
})
