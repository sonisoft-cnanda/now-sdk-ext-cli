import {type ChildProcess, spawn} from 'node:child_process'
import {constants as fsConstants} from 'node:fs'
import {access} from 'node:fs/promises'
import {createServer} from 'node:net'
import {homedir} from 'node:os'
import {join} from 'node:path'

export type DesktopBrowserName = 'brave' | 'chrome' | 'edge'

export const BROWSER_LABELS: Record<DesktopBrowserName, string> = {
  brave: 'Brave',
  chrome: 'Chrome',
  edge: 'Edge',
}

const ALIAS_PATTERN = /^[A-Za-z0-9._-]+$/

export function isWsl(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.WSL_DISTRO_NAME || env.WSL_INTEROP)
}

export function profileDirectory(alias: string, env: NodeJS.ProcessEnv = process.env): string {
  if (!ALIAS_PATTERN.test(alias)) {
    throw new Error('Auth alias must contain only letters, digits, dots, underscores, or hyphens.')
  }

  const root = env.XDG_STATE_HOME || join(homedir(), '.local', 'state')
  return join(root, 'nex', 'ui-profiles', alias)
}

function toWslPath(windowsPath: string): string {
  const match = /^([A-Za-z]):[\\/](.*)$/.exec(windowsPath)
  if (!match) return windowsPath.replaceAll('\\', '/')
  return `/mnt/${match[1].toLowerCase()}/${match[2].replaceAll('\\', '/')}`
}

function windowsPaths(name: DesktopBrowserName, env: NodeJS.ProcessEnv): string[] {
  const programFiles = env.PROGRAMFILES || String.raw`C:\Program Files`
  const programFilesX86 = env['PROGRAMFILES(X86)'] || String.raw`C:\Program Files (x86)`
  const localAppData = env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
  if (name === 'edge') {
    return [
      `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
      `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
    ]
  }

  if (name === 'chrome') {
    return [
      `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
      `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
    ]
  }

  return [
    `${programFiles}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `${programFilesX86}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
    `${localAppData}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
  ]
}

function macPaths(name: DesktopBrowserName): string[] {
  if (name === 'edge') return ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
  if (name === 'chrome') return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
  return ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser']
}

function linuxPaths(name: DesktopBrowserName): string[] {
  if (name === 'edge') return ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/usr/bin/msedge']
  if (name === 'chrome') {
    return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  }

  return ['/usr/bin/brave-browser', '/usr/bin/brave']
}

export function browserCandidates(
  name: DesktopBrowserName,
  options: {env?: NodeJS.ProcessEnv; platform?: NodeJS.Platform} = {},
): string[] {
  const env = options.env ?? process.env
  const platform = options.platform ?? process.platform
  const windows = windowsPaths(name, env)
  if (platform === 'win32') return windows
  if (platform === 'darwin') return [...macPaths(name), ...linuxPaths(name)]
  const linux = linuxPaths(name)
  if (isWsl(env)) return [...windows.map(path => toWslPath(path)), ...linux]
  return linux
}

async function defaultExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function resolveBrowserBinary(
  name: DesktopBrowserName,
  options: {
    env?: NodeJS.ProcessEnv
    exists?: (path: string) => Promise<boolean>
    platform?: NodeJS.Platform
  } = {},
): Promise<string> {
  const exists = options.exists ?? defaultExists
  const matches = await Promise.all(
    browserCandidates(name, options).map(async candidate => ({candidate, ok: await exists(candidate)})),
  )
  const hit = matches.find(item => item.ok)
  if (hit) return hit.candidate

  throw new Error(
    `Could not find ${BROWSER_LABELS[name]}. Install it, or pass --cdp after starting the browser with --remote-debugging-port.`,
  )
}

export async function allocateLoopbackPort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(error => {
        if (error) reject(error)
        else if (!address || typeof address === 'string') reject(new Error('Could not allocate a loopback port.'))
        else resolve(address.port)
      })
    })
  })
}

export function browserLaunchArgs(port: number, userDataDir: string): string[] {
  return [
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`,
    '--remote-allow-origins=*',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ]
}

export function spawnDedicatedBrowser(options: {
  binary: string
  port: number
  spawn?: typeof spawn
  userDataDir: string
}): ChildProcess {
  const child = (options.spawn ?? spawn)(options.binary, browserLaunchArgs(options.port, options.userDataDir), {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  return child
}
