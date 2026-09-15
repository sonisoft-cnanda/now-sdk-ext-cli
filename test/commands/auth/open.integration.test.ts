/**
 * Live proof that `nex auth open` mints a cookie session for the configured
 * alias and injects it through a real DevTools endpoint.
 *
 * Instance comes from SN_INSTANCE_ALIAS (default in test/test_utils/test_config.ts).
 * CI runs `npm run test:unit` and does not execute this file.
 */
import {describe, expect, it} from '@jest/globals'
import {execFile} from 'node:child_process'
import {join, resolve} from 'node:path'
import {promisify} from 'node:util'

import {listenCdp} from '../../test_utils/cdp-fixture.js'
import {SN_INSTANCE_ALIAS} from '../../test_utils/test_config.js'

const SECONDS = 1000

function liveEnv(): NodeJS.ProcessEnv {
  const env = {...process.env}
  delete env.NODE_ENV
  delete env.SN_CRED_STORE_DISABLE
  for (const key of Object.keys(env)) if (key.startsWith('JEST_')) delete env[key]
  return env
}

describe('nex auth open (live alias)', () => {
  it('injects a verified session for the configured alias without printing secrets', async () => {
    const cdp = await listenCdp()
    try {
      const {stderr, stdout} = await promisify(execFile)(process.execPath, [
        join(resolve(process.cwd()), 'bin/run.js'),
        'auth',
        'open',
        '-a',
        SN_INSTANCE_ALIAS,
        '--cred-store',
        '--cdp',
        cdp.url,
        '--json',
      ], {env: liveEnv(), timeout: 90_000})
      const jsonStart = stdout.indexOf('{')
      const jsonEnd = stdout.lastIndexOf('}')
      expect(jsonStart).toBeGreaterThanOrEqual(0)
      const metadata = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)) as {result?: Record<string, unknown>}
      const result = metadata.result ?? metadata as Record<string, unknown>
      expect(result.alias).toBe(SN_INSTANCE_ALIAS)
      expect(result.instanceUrl).toEqual(expect.stringMatching(/^https:\/\//))
      expect(result.cdpUrl).toBe(cdp.url)
      expect(result.browser).toBe('edge')
      expect(JSON.stringify(result)).not.toMatch(/JSESSIONID=/)
      expect(stdout + stderr).not.toMatch(/JSESSIONID=/)
      expect(stdout).not.toContain('[now-sdk]')
      expect(cdp.messages.map(message => message.method)).toEqual(expect.arrayContaining([
        'Storage.setCookies',
        'Page.navigate',
      ]))
      expect(cdp.messages.find(message => message.method === 'Page.navigate')?.params)
        .toEqual({url: result.instanceUrl})
    } finally {
      await cdp.close()
    }
  }, 90 * SECONDS)
})
