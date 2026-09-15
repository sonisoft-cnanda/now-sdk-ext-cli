import {describe, expect, it, jest} from '@jest/globals'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {
  allocateLoopbackPort,
  browserCandidates,
  browserLaunchArgs,
  isWindowsBrowserBinary,
  isWsl,
  parseDedicatedBrowserPort,
  parseProcNetRouteGateway,
  profileDirectory,
  resolveBrowserBinary,
  spawnDedicatedBrowser,
  startWslWindowsCdpBridge,
  toWslPath,
  windowsProfileDirectory,
  wslWindowsHost,
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

  it('maps WSL Windows binaries and the vEthernet gateway', () => {
    expect(isWindowsBrowserBinary('/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')).toBe(true)
    expect(isWindowsBrowserBinary('/tmp/msedge')).toBe(false)
    expect(windowsProfileDirectory('dev206299', 'C:\\Users\\me\\AppData\\Local'))
      .toBe(String.raw`C:\Users\me\AppData\Local\nex\ui-profiles\dev206299`)
    expect(toWslPath(String.raw`C:\Users\me\AppData\Local\Temp\nex-cdp-relay.cjs`))
      .toBe('/mnt/c/Users/me/AppData/Local/Temp/nex-cdp-relay.cjs')
    expect(parseProcNetRouteGateway([
      'Iface Destination Gateway Flags RefCnt Use Metric Mask',
      'eth0 00000000 01E01CAC 0003 0 0 0 00000000',
    ].join('\n'))).toBe('172.28.224.1')
    expect(wslWindowsHost({NEX_WSL_HOST: '172.28.224.1'})).toBe('172.28.224.1')
    expect(parseDedicatedBrowserPort(
      String.raw`"C:\Edge\msedge.exe" --user-data-dir=C:\Users\me\AppData\Local\nex\ui-profiles\dev206299 --remote-debugging-port=36389`,
      'dev206299',
    )).toBe(36389)
    expect(parseDedicatedBrowserPort(
      String.raw`"C:\Edge\msedge.exe" --user-data-dir=C:\Users\me\AppData\Local\Microsoft\Edge\User Data --remote-debugging-port=9222`,
      'dev206299',
    )).toBeUndefined()
  })

  it('bridges Windows Edge CDP through the WSL vEthernet address', async () => {
    const spawned: Array<{args: string[]; binary: string}> = []
    const child = {kill: jest.fn(), unref: jest.fn()}
    const written: string[] = []
    const dirs: string[] = []
    const bridge = await startWslWindowsCdpBridge('dev206299', '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', {
      exists: async () => true,
      host: '172.28.224.1',
      localAppData: 'C:\\Users\\me\\AppData\\Local',
      mkdir: (async (path: string) => {
        dirs.push(path)
      }) as typeof import('node:fs/promises').mkdir,
      nodeBinary: '/mnt/c/Program Files/nodejs/node.exe',
      port: 9333,
      spawn: ((binary: string, args: string[]) => {
        spawned.push({args, binary})
        return child
      }) as typeof import('node:child_process').spawn,
      writeFile: (async (path: string) => {
        written.push(String(path))
      }) as typeof import('node:fs/promises').writeFile,
    })
    expect(bridge.cdpUrl).toBe('http://172.28.224.1:9333')
    expect(bridge.userDataDir).toBe(String.raw`C:\Users\me\AppData\Local\nex\ui-profiles\dev206299`)
    expect(dirs).toContain('/mnt/c/Users/me/AppData/Local/nex/ui-profiles/dev206299')
    expect(written).toContain('/mnt/c/Users/me/AppData/Local/Temp/nex-cdp-relay.cjs')
    expect(spawned[0]?.args).toEqual(expect.arrayContaining([
      String.raw`--user-data-dir=C:\Users\me\AppData\Local\nex\ui-profiles\dev206299`,
      '--remote-debugging-port=9333',
    ]))
    expect(spawned[1]).toEqual({
      binary: '/mnt/c/Program Files/nodejs/node.exe',
      args: [String.raw`C:\Users\me\AppData\Local\Temp\nex-cdp-relay.cjs`, '172.28.224.1', '9333'],
    })
    expect(JSON.stringify(spawned)).not.toContain(cookieValue)
    bridge.dispose()
    expect(child.kill).toHaveBeenCalled()
  })

  it('reuses a dedicated Windows Edge that is already running', async () => {
    const spawned: Array<{args: string[]; binary: string}> = []
    const child = {kill: jest.fn(), unref: jest.fn()}
    const bridge = await startWslWindowsCdpBridge('dev206299', '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', {
      existingPort: 36389,
      exists: async () => true,
      host: '172.28.224.1',
      localAppData: 'C:\\Users\\me\\AppData\\Local',
      mkdir: (async () => undefined) as typeof import('node:fs/promises').mkdir,
      nodeBinary: '/mnt/c/Program Files/nodejs/node.exe',
      port: 36389,
      spawn: ((binary: string, args: string[]) => {
        spawned.push({args, binary})
        return child
      }) as typeof import('node:child_process').spawn,
      writeFile: (async () => undefined) as typeof import('node:fs/promises').writeFile,
    })
    expect(bridge.cdpUrl).toBe('http://172.28.224.1:36389')
    expect(spawned).toHaveLength(1)
    expect(spawned[0]?.args).toEqual([
      String.raw`C:\Users\me\AppData\Local\Temp\nex-cdp-relay.cjs`,
      '172.28.224.1',
      '36389',
    ])
    expect(JSON.stringify(spawned)).not.toContain(cookieValue)
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
