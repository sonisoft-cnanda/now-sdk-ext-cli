import {type ChildProcess, execFile, spawn} from 'node:child_process'
import {constants as fsConstants} from 'node:fs'
import {access, mkdir, readFile, writeFile} from 'node:fs/promises'
import {createServer} from 'node:net'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {promisify} from 'node:util'

export type DesktopBrowserName = 'brave' | 'chrome' | 'edge'

export const BROWSER_LABELS: Record<DesktopBrowserName, string> = {
  brave: 'Brave',
  chrome: 'Chrome',
  edge: 'Edge',
}

const ALIAS_PATTERN = /^[A-Za-z0-9._-]+$/
const execFileAsync = promisify(execFile)

/** User-mode TCP pipe so WSL can reach a Windows-loopback DevTools port. */
export const CDP_RELAY_SOURCE = `'use strict';
const net = require('net');
const listenHost = process.argv[2];
const port = Number(process.argv[3]);
if (!listenHost || !Number.isInteger(port)) process.exit(2);
const server = net.createServer((client) => {
  const upstream = net.connect(port, '127.0.0.1');
  const close = () => { client.destroy(); upstream.destroy(); };
  client.pipe(upstream);
  upstream.pipe(client);
  client.on('error', close);
  upstream.on('error', close);
});
server.on('error', () => process.exit(1));
server.listen(port, listenHost);
`

export function isWsl(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.WSL_DISTRO_NAME || env.WSL_INTEROP)
}

export function isWindowsBrowserBinary(binary: string): boolean {
  return /\.exe$/i.test(binary) || /^\/mnt\/[a-z]\//i.test(binary)
}

export function profileDirectory(alias: string, env: NodeJS.ProcessEnv = process.env): string {
  if (!ALIAS_PATTERN.test(alias)) {
    throw new Error('Auth alias must contain only letters, digits, dots, underscores, or hyphens.')
  }

  const root = env.XDG_STATE_HOME || join(homedir(), '.local', 'state')
  return join(root, 'nex', 'ui-profiles', alias)
}

export function toWslPath(windowsPath: string): string {
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

export function parseDedicatedBrowserPort(commandLine: string, alias: string): number | undefined {
  if (!ALIAS_PATTERN.test(alias)) return
  const marker = `nex\\ui-profiles\\${alias}`
  const posix = `nex/ui-profiles/${alias}`
  if (!commandLine.includes(marker) && !commandLine.includes(posix)) return
  const match = /--remote-debugging-port=(\d+)/.exec(commandLine)
  if (!match) return
  const port = Number(match[1])
  return Number.isInteger(port) && port > 0 ? port : undefined
}

export async function findDedicatedWindowsBrowserPort(
  alias: string,
  options: {
    commandLines?: string[]
    execFile?: typeof execFileAsync
  } = {},
): Promise<number | undefined> {
  const lines = options.commandLines ?? await listWindowsBrowserCommandLines(options.execFile)
  for (const line of lines) {
    const port = parseDedicatedBrowserPort(line, alias)
    if (port) return port
  }
}

async function listWindowsBrowserCommandLines(
  execFileImpl: typeof execFileAsync = execFileAsync,
): Promise<string[]> {
  try {
    const {stdout} = await execFileImpl(
      'powershell.exe',
      ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process -Filter "name=\'msedge.exe\'" | Select-Object -ExpandProperty CommandLine'],
      {cwd: '/mnt/c/Windows', timeout: 10_000},
    )
    return stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  } catch {
    return []
  }
}

export function windowsProfileDirectory(alias: string, localAppData: string): string {
  if (!ALIAS_PATTERN.test(alias)) {
    throw new Error('Auth alias must contain only letters, digits, dots, underscores, or hyphens.')
  }

  return `${localAppData}\\nex\\ui-profiles\\${alias}`
}

export function parseProcNetRouteGateway(table: string): string | undefined {
  for (const line of table.split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/)
    if (columns[1] !== '00000000' || !columns[2] || columns[2] === '00000000') continue
    const hex = columns[2]
    if (!/^[0-9A-Fa-f]{8}$/.test(hex)) continue
    return [hex.slice(6, 8), hex.slice(4, 6), hex.slice(2, 4), hex.slice(0, 2)]
      .map(part => Number.parseInt(part, 16))
      .join('.')
  }
}

export function wslWindowsHost(
  env: NodeJS.ProcessEnv = process.env,
  routeTable?: string,
): string | undefined {
  const override = env.NEX_WSL_HOST?.trim()
  if (override) return override
  if (routeTable === undefined) return
  return parseProcNetRouteGateway(routeTable)
}

export async function resolveWindowsLocalAppData(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const fromEnv = env.LOCALAPPDATA?.trim()
  if (fromEnv) return fromEnv
  const {stdout} = await execFileAsync('cmd.exe', ['/c', 'echo %LOCALAPPDATA%'], {
    cwd: '/mnt/c/Windows',
    timeout: 10_000,
  })
  const value = stdout.trim()
  if (!value || value.includes('%LOCALAPPDATA%')) {
    throw new Error('Could not resolve %LOCALAPPDATA% for a Windows browser profile.')
  }

  return value
}

function windowsNodeCandidates(localAppData: string): string[] {
  return [
    '/mnt/c/Program Files/nodejs/node.exe',
    `${toWslPath(localAppData)}/hermes/node/node.exe`,
  ]
}

async function resolveWindowsNodeBinary(
  localAppData: string,
  exists: (path: string) => Promise<boolean>,
): Promise<string> {
  const matches = await Promise.all(
    windowsNodeCandidates(localAppData).map(async candidate => ({candidate, ok: await exists(candidate)})),
  )
  const hit = matches.find(item => item.ok)
  if (hit) return hit.candidate
  throw new Error(
    'WSL cannot reach Windows Edge DevTools on 127.0.0.1. Install Node.js on Windows for the localhost relay, or pass --cdp after starting Edge with --remote-debugging-port.',
  )
}

export async function readWslWindowsHost(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const override = wslWindowsHost(env)
  if (override) return override
  const table = await readFile('/proc/net/route', 'utf8')
  const host = parseProcNetRouteGateway(table)
  if (!host) {
    throw new Error(
      'Could not find the Windows host address from WSL. Set NEX_WSL_HOST or pass --cdp after starting the browser with --remote-debugging-port.',
    )
  }

  return host
}

export async function startWslWindowsCdpBridge(
  alias: string,
  binary: string,
  options: {
    env?: NodeJS.ProcessEnv
    existingPort?: number
    exists?: (path: string) => Promise<boolean>
    host?: string
    localAppData?: string
    mkdir?: typeof mkdir
    nodeBinary?: string
    port?: number
    spawn?: typeof spawn
    writeFile?: typeof writeFile
  } = {},
): Promise<{cdpUrl: string; dispose: () => void; userDataDir: string}> {
  const env = options.env ?? process.env
  const exists = options.exists ?? defaultExists
  const makeDirectory = options.mkdir ?? mkdir
  const write = options.writeFile ?? writeFile
  const localAppData = options.localAppData ?? await resolveWindowsLocalAppData(env)
  const host = options.host ?? await readWslWindowsHost(env)
  const existingPort = options.existingPort ?? (
    options.port === undefined ? await findDedicatedWindowsBrowserPort(alias) : undefined
  )
  const port = options.port ?? existingPort ?? await allocateLoopbackPort()
  const userDataDir = windowsProfileDirectory(alias, localAppData)
  const profileOnWsl = toWslPath(userDataDir)
  await makeDirectory(profileOnWsl, {mode: 0o700, recursive: true})
  if (existingPort === undefined) {
    spawnDedicatedBrowser({
      binary,
      port,
      spawn: options.spawn,
      userDataDir,
    })
  }

  const nodeBinary = options.nodeBinary ?? await resolveWindowsNodeBinary(localAppData, exists)
  const relayWindowsPath = `${localAppData}\\Temp\\nex-cdp-relay.cjs`
  await write(toWslPath(relayWindowsPath), CDP_RELAY_SOURCE, 'utf8')
  const relay = (options.spawn ?? spawn)(nodeBinary, [relayWindowsPath, host, String(port)], {
    stdio: 'ignore',
    windowsHide: true,
  })
  return {
    cdpUrl: `http://${host}:${port}`,
    dispose() {
      relay.kill()
    },
    userDataDir,
  }
}
