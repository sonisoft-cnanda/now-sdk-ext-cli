import {afterEach, describe, expect, it} from '@jest/globals'
import {mkdtemp, readFile, rm, stat, symlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {writeBrowserSession} from '../../../src/services/browser-session-writer.js'
import type {BrowserSession} from '@sonisoft/now-sdk-ext-core'

const directories: string[] = []
const session: BrowserSession = {
  alias: 'test', instanceUrl: 'https://example.service-now.com', createdAt: 0,
  storageState: {origins: [], cookies: [{
    name: 'JSESSIONID', value: 'synthetic-cookie', domain: 'example.service-now.com',
    path: '/', expires: -1, secure: true, httpOnly: true, sameSite: 'Lax',
  }]},
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map(path => rm(path, {recursive: true, force: true})))
})
describe('browser-session output', () => {
  it('writes only storageState with owner-only permissions', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'nex-browser-')); directories.push(dir)
    const path = await writeBrowserSession(session, join(dir, 'auth', 'state.json'))
    expect((await stat(path)).mode & 0o777).toBe(0o600)
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(session.storageState)
    await expect(writeBrowserSession(session, path)).rejects.toThrow('exists')
    await writeBrowserSession(session, path, true)
  })
  it('refuses symlinks even with force', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'nex-browser-')); directories.push(dir)
    const target = await writeBrowserSession(session, join(dir, 'target.json'))
    const link = join(dir, 'link.json')
    await symlink(target, link)
    await expect(writeBrowserSession(session, link, true)).rejects.toThrow('regular file')
    expect(JSON.parse(await readFile(target, 'utf8'))).toEqual(session.storageState)
  })
  it('allows only one concurrent creator of an output path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'nex-browser-')); directories.push(dir)
    const outcomes = await Promise.allSettled(Array.from({length: 8}, () =>
      writeBrowserSession(session, join(dir, 'shared.json'))))
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  })
})
