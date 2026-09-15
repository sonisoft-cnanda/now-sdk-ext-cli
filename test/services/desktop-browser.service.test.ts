import {describe, expect, it, jest} from '@jest/globals'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {
  allocateLoopbackPort,
  browserCandidates,
  browserLaunchArgs,
  isWsl,
  profileDirectory,
  resolveBrowserBinary,
  spawnDedicatedBrowser,
} from '../../src/services/desktop-browser.service.js'

const cookieValue = 'synthetic-cookie'

describe('desktop browser discovery', () => {
  it('prefers Windows Edge paths under WSL', () => {
    const candidates = browserCandidates('edge', {
      env: {WSL_DISTRO_NAME: 'Ubuntu', PROGRAMFILES: 'C:\\Program Files', 'PROGRAMFILES(X86)': 'C:\\Program Files (x86)'},
      platform: 'linux',
    })
    expect(candidates[0]).toBe('/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
    expect(candidates).toContain('/usr/bin/microsoft-edge')
  })

  it('lists Chrome and Brave install locations', () => {
    expect(browserCandidates('chrome', {env: {}, platform: 'darwin'})[0])
      .toContain('Google Chrome.app')
    expect(browserCandidates('brave', {
      env: {LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local'},
      platform: 'win32',
    })).toContain('C:\\Users\\me\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe')
  })

  it('keeps profiles under XDG state and rejects path-like aliases', () => {
    expect(profileDirectory('bcbsscdev', {XDG_STATE_HOME: '/tmp/state'}))
      .toBe(join('/tmp/state', 'nex', 'ui-profiles', 'bcbsscdev'))
    expect(() => profileDirectory('../etc', {})).toThrow(/letters/)
  })

  it('resolves the first existing candidate and builds isolated launch args', async () => {
    const exists = jest.fn(async (path: string) => path.endsWith('msedge.exe'))
    await expect(resolveBrowserBinary('edge', {
      exists,
      env: {WSL_DISTRO_NAME: 'Ubuntu'},
      platform: 'linux',
    })).resolves.toBe('/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')
    const dir = join(tmpdir(), 'nex-ui')
    const args = browserLaunchArgs(9222, dir)
    expect(args).toEqual(expect.arrayContaining([
      `--user-data-dir=${dir}`,
      '--remote-debugging-port=9222',
      '--remote-allow-origins=*',
      'about:blank',
    ]))
    expect(JSON.stringify(args)).not.toContain(cookieValue)
  })

  it('allocates a loopback port and fails when no browser binary exists', async () => {
    const port = await allocateLoopbackPort()
    expect(Number.isInteger(port)).toBe(true)
    expect(port).toBeGreaterThan(0)
    expect(isWsl({WSL_DISTRO_NAME: 'Ubuntu'})).toBe(true)
    expect(isWsl({})).toBe(false)
    await expect(resolveBrowserBinary('edge', {
      env: {},
      exists: async () => false,
      platform: 'linux',
    })).rejects.toThrow(/Could not find Edge/)
  })

  it('lists native Linux and Windows Edge locations', () => {
    expect(browserCandidates('edge', {env: {}, platform: 'linux'})).toEqual([
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/usr/bin/msedge',
    ])
    expect(browserCandidates('edge', {
      env: {PROGRAMFILES: 'C:\\Program Files', 'PROGRAMFILES(X86)': 'C:\\Program Files (x86)'},
      platform: 'win32',
    })[0]).toBe(String.raw`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`)
  })

  it('spawns detached without cookie values on argv', () => {
    const spawned: Array<{binary: string; args: string[]}> = []
    const child = {unref: jest.fn()}
    spawnDedicatedBrowser({
      binary: '/tmp/msedge',
      port: 9222,
      userDataDir: '/tmp/profile',
      spawn: ((binary: string, args: string[]) => {
        spawned.push({binary, args})
        return child
      }) as typeof import('node:child_process').spawn,
    })
    expect(spawned).toEqual([{
      binary: '/tmp/msedge',
      args: browserLaunchArgs(9222, '/tmp/profile'),
    }])
    expect(child.unref).toHaveBeenCalled()
    expect(JSON.stringify(spawned)).not.toContain(cookieValue)
  })
})
