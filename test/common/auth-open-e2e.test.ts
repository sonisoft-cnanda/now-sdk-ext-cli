import {describe, expect, it} from '@jest/globals'
import {execFile} from 'node:child_process'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {promisify} from 'node:util'

import {listenCdp} from '../test_utils/cdp-fixture.js'
import {syntheticAuthPreload, syntheticFetchPreload} from '../test_utils/synthetic-auth-preload.js'

describe('auth open command', () => {
  it('opens metadata JSON and injects cookies without printing secrets', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'nex-auth-open-e2e-'))
    const root = resolve(process.cwd())
    const preload = join(directory, 'fixture.mjs')
    const cdp = await listenCdp()
    try {
      await writeFile(preload, `${syntheticAuthPreload(root)}${syntheticFetchPreload(true)}`)
      const env = {...process.env, SN_CRED_STORE: 'file', SN_CRED_STORE_PATH: join(directory, 'credentials.json'),
        SN_CRED_STORE_DISABLE: ''}
      delete env.NODE_ENV
      for (const key of Object.keys(env)) if (key.startsWith('JEST_')) delete env[key]
      const {stderr, stdout} = await promisify(execFile)(process.execPath,
        ['--import', preload, join(root, 'bin/run.js'), 'auth', 'open', '-a', 'fixture',
          '--cred-store', '--cdp', cdp.url, '--json'],
        {env, timeout: 30_000})
      const metadata = JSON.parse(stdout) as {result?: {cdpUrl?: string; instanceUrl?: string}}
      const result = metadata.result ?? metadata
      expect(result.instanceUrl).toBe('https://example.service-now.com')
      expect(result.cdpUrl).toBe(cdp.url)
      expect(stdout + stderr).not.toMatch(/synthetic-(access|refresh|cookie)/)
      expect(stdout).not.toContain('[now-sdk]')
      expect(cdp.messages.map(message => message.method)).toEqual(expect.arrayContaining([
        'Storage.setCookies',
        'Page.navigate',
      ]))
      expect(cdp.messages.find(message => message.method === 'Page.navigate')?.params)
        .toEqual({url: 'https://example.service-now.com'})
    } finally {
      await cdp.close()
      await rm(directory, {recursive: true, force: true})
    }
  }, 40_000)
})
