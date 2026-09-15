import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals'
import {captureOutput} from '@oclif/test'

const cookieValue = 'synthetic-cookie'
const instanceUrl = 'https://example.service-now.com'
const session = {
  alias: 'fixture',
  createdAt: 0,
  instanceUrl,
  storageState: {
    origins: [],
    cookies: [{
      name: 'JSESSIONID', value: cookieValue, domain: 'example.service-now.com',
      path: '/', expires: -1, secure: true, httpOnly: true, sameSite: 'Lax',
    }],
  },
}

const createBrowserSession = jest.fn(async () => session)
const injectBrowserSessionCdp = jest.fn(async () => undefined)
const writeBrowserSession = jest.fn(async (_session: unknown, output: string) => output)
const resolveBrowser = jest.fn(async () => '/tmp/msedge')
const allocatePort = jest.fn(async () => 9333)
const spawnBrowser = jest.fn(() => undefined)
const isWsl = jest.fn(() => false)
const isWindowsBrowserBinary = jest.fn(() => false)
const disposeBridge = jest.fn()
const startBridge = jest.fn(async () => ({
  cdpUrl: 'http://172.28.224.1:9333',
  dispose: disposeBridge,
  userDataDir: String.raw`C:\Users\me\AppData\Local\nex\ui-profiles\fixture`,
}))

jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  createBrowserSession,
  injectBrowserSessionCdp,
}))
jest.unstable_mockModule('../../../src/services/browser-session-writer.js', () => ({
  writeBrowserSession,
}))
jest.unstable_mockModule('../../../src/services/desktop-browser.service.js', () => ({
  BROWSER_LABELS: {edge: 'Edge', chrome: 'Chrome', brave: 'Brave'},
  allocateLoopbackPort: allocatePort,
  isWindowsBrowserBinary,
  isWsl,
  profileDirectory: (alias: string) => `/tmp/nex/ui-profiles/${alias}`,
  resolveBrowserBinary: resolveBrowser,
  spawnDedicatedBrowser: spawnBrowser,
  startWslWindowsCdpBridge: startBridge,
}))

const {default: AuthOpen} = await import('../../../src/commands/auth/open.js')

const originalPatched = process.env.NOW_SDK_KEYCHAIN_PATCHED

beforeEach(() => {
  process.env.NOW_SDK_KEYCHAIN_PATCHED = '1'
  createBrowserSession.mockClear()
  injectBrowserSessionCdp.mockClear()
  writeBrowserSession.mockClear()
  resolveBrowser.mockClear()
  allocatePort.mockClear()
  spawnBrowser.mockClear()
  isWsl.mockClear().mockReturnValue(false)
  isWindowsBrowserBinary.mockClear().mockReturnValue(false)
  startBridge.mockClear()
  disposeBridge.mockClear()
})
afterEach(() => {
  if (originalPatched === undefined) delete process.env.NOW_SDK_KEYCHAIN_PATCHED
  else process.env.NOW_SDK_KEYCHAIN_PATCHED = originalPatched
})

describe('nex auth open', () => {
  it('launches a dedicated browser then injects the session', async () => {
    const lines: string[] = []
    const original = AuthOpen.prototype.log
    AuthOpen.prototype.log = (message?: string, ...args: unknown[]) => {
      lines.push([message, ...args].map(String).join(' '))
    }
    try {
      const {stdout, stderr} = await captureOutput(async () => {
        const result = await AuthOpen.run(['-a', 'fixture', '--cred-store'], process.cwd())
        expect(result).toMatchObject({
          alias: 'fixture',
          browser: 'edge',
          cdpUrl: 'http://127.0.0.1:9333',
          instanceUrl,
        })
        expect(JSON.stringify(result)).not.toContain(cookieValue)
        expect(result).not.toHaveProperty('path')
      })
      expect(resolveBrowser).toHaveBeenCalledWith('edge')
      expect(spawnBrowser).toHaveBeenCalledWith(expect.objectContaining({
        binary: '/tmp/msedge',
        port: 9333,
        userDataDir: '/tmp/nex/ui-profiles/fixture',
      }))
      expect(injectBrowserSessionCdp).toHaveBeenCalledWith({
        cdpUrl: 'http://127.0.0.1:9333',
        session,
      })
      expect(lines.join('\n')).toContain(`Opened ${instanceUrl} in Edge`)
      expect(stdout + stderr + lines.join('\n')).not.toContain(cookieValue)
      expect(writeBrowserSession).not.toHaveBeenCalled()
    } finally {
      AuthOpen.prototype.log = original
    }
  })

  it('skips spawn when --cdp is set', async () => {
    await captureOutput(async () => {
      await AuthOpen.run(['-a', 'fixture', '--cdp', 'http://127.0.0.1:9222', '--json'], process.cwd())
    })
    expect(resolveBrowser).not.toHaveBeenCalled()
    expect(spawnBrowser).not.toHaveBeenCalled()
    expect(injectBrowserSessionCdp).toHaveBeenCalledWith({
      cdpUrl: 'http://127.0.0.1:9222',
      session,
    })
  })

  it('uses the WSL CDP bridge when the resolved binary is Windows Edge', async () => {
    isWsl.mockReturnValue(true)
    isWindowsBrowserBinary.mockReturnValue(true)
    resolveBrowser.mockResolvedValueOnce(
      '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    )
    await captureOutput(async () => {
      const result = await AuthOpen.run(['-a', 'fixture', '--cred-store'], process.cwd())
      expect(result).toMatchObject({
        cdpUrl: 'http://172.28.224.1:9333',
        instanceUrl,
      })
    })
    expect(startBridge).toHaveBeenCalledWith(
      'fixture',
      '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    )
    expect(spawnBrowser).not.toHaveBeenCalled()
    expect(injectBrowserSessionCdp).toHaveBeenCalledWith({
      cdpUrl: 'http://172.28.224.1:9333',
      session,
      timeoutMs: 30_000,
    })
    expect(disposeBridge).toHaveBeenCalled()
  })

  it('honors --browser when launching and records chrome in metadata', async () => {
    await captureOutput(async () => {
      const result = await AuthOpen.run(['-a', 'fixture', '--browser', 'chrome', '--cred-store'], process.cwd())
      expect(result).toMatchObject({browser: 'chrome', cdpUrl: 'http://127.0.0.1:9333'})
    })
    expect(resolveBrowser).toHaveBeenCalledWith('chrome')
    expect(spawnBrowser).toHaveBeenCalled()
  })

  it('writes an optional storage-state file and includes path in metadata', async () => {
    await captureOutput(async () => {
      const result = await AuthOpen.run([
        '-a', 'fixture', '--cdp', 'http://127.0.0.1:9222',
        '--output', '/tmp/nex-open-state.json', '--force', '--json',
      ], process.cwd())
      expect(result).toMatchObject({path: '/tmp/nex-open-state.json'})
    })
    expect(writeBrowserSession).toHaveBeenCalledWith(session, '/tmp/nex-open-state.json', true)
    expect(resolveBrowser).not.toHaveBeenCalled()
  })

  it('includes oauthExpiresAt in metadata when the session has it', async () => {
    createBrowserSession.mockResolvedValueOnce({...session, oauthExpiresAt: 1_800_000_000})
    await captureOutput(async () => {
      const result = await AuthOpen.run(['-a', 'fixture', '--cdp', 'http://127.0.0.1:9222', '--json'], process.cwd())
      expect(result).toMatchObject({oauthExpiresAt: 1_800_000_000})
      expect(JSON.stringify(result)).not.toContain(cookieValue)
    })
  })

  it('refuses --cred-store when the shim is inactive', async () => {
    delete process.env.NOW_SDK_KEYCHAIN_PATCHED
    const {error} = await captureOutput(async () => {
      await AuthOpen.run(['-a', 'fixture', '--cred-store'], process.cwd())
    })
    expect(error?.message).toMatch(/credential store is inactive/)
    expect(createBrowserSession).not.toHaveBeenCalled()
  })

  it('surfaces desktop and session remediations without cookie values', async () => {
    injectBrowserSessionCdp.mockRejectedValueOnce({
      code: 'NEX_BROWSER_UNAVAILABLE',
      remediation: 'Confirm the debug port is reachable and retry.',
    })
    const desktop = await captureOutput(async () => {
      await AuthOpen.run(['-a', 'fixture', '--cdp', 'http://127.0.0.1:9222', '--json'], process.cwd())
    })
    expect(desktop.error?.message ?? desktop.stdout).toMatch(/debug port/)
    expect(JSON.stringify(desktop)).not.toContain(cookieValue)
    createBrowserSession.mockRejectedValueOnce({
      code: 'NEX_AUTH_INVALID',
      remediation: 'Check the selected alias and credential backend.',
    })
    const auth = await captureOutput(async () => {
      await AuthOpen.run(['-a', 'fixture', '--cdp', 'http://127.0.0.1:9222', '--json'], process.cwd())
    })
    expect(auth.error?.message ?? auth.stdout).toMatch(/selected alias/)
    expect(JSON.stringify(auth)).not.toContain(cookieValue)
  })
})
