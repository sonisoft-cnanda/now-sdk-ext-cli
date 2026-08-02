/**
 * Running now-sdk.
 *
 * `@servicenow/sdk-cli` is a yargs + @inquirer/prompts CLI with no supported
 * programmatic API, so the SDK is always a CHILD PROCESS. Two modes:
 * streamed (piped stdio, lines into the pane) and foreground (the terminal
 * is handed over, for anything that prompts).
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import type { ApprovalRegistry, ApprovalSpec, ApprovalToken } from './approvals.js'
import type { ProjectInfo } from './project-detect.js'

export interface SdkBinary {
  args: string[]
  command: string
  /** Where it came from, for the pane header — versions can differ. */
  origin: 'bundled' | 'project'
  version?: string
}

export interface SdkRun {
  code: number
  lines: string[]
  ok: boolean
}

export interface RunOptions {
  argv: string[]
  /** Append --auth <alias>. Off for local-only commands, which reject it. */
  auth?: boolean
  cwd: string
  /** Use the project's npm script instead of the raw command. */
  npmScript?: string
  /** Called per output line so the pane can stream. */
  onLine?: (line: string) => void
}

/**
 * Resolve the now-sdk binary deterministically instead of trusting PATH.
 * A project-local install wins when present: that project pinned its SDK
 * version, and building it with a different one is exactly the kind of
 * silent mismatch this pane exists to prevent.
 */
export function resolveSdkBinary(project?: ProjectInfo): SdkBinary | undefined {
  if (project) {
    const local = join(project.root, 'node_modules', '@servicenow', 'sdk')
    const localBin = binFromPackage(local)
    if (localBin) return { args: [localBin], command: process.execPath, origin: 'project', version: versionOf(local) }
  }

  const bundled = bundledPackageDir()
  if (bundled) {
    const bin = binFromPackage(bundled)
    if (bin) return { args: [bin], command: process.execPath, origin: 'bundled', version: versionOf(bundled) }
  }

  return undefined
}

/**
 * Locate the bundled @servicenow/sdk package directory.
 *
 * `require.resolve('@servicenow/sdk/package.json')` does NOT work: the
 * package's `exports` map does not expose `./package.json`, so Node refuses
 * with ERR_PACKAGE_PATH_NOT_EXPORTED. Resolve a subpath that IS exported
 * and walk up to the package root instead.
 */
function bundledPackageDir(): string | undefined {
  const require = createRequire(import.meta.url)
  for (const subpath of ['@servicenow/sdk/global', '@servicenow/sdk/core', '@servicenow/sdk']) {
    let resolved: string
    try {
      resolved = require.resolve(subpath)
    } catch {
      continue
    }

    let dir = dirname(resolved)
    for (let i = 0; i < 8; i++) {
      const candidate = join(dir, 'package.json')
      if (existsSync(candidate)) {
        try {
          const {name} = (JSON.parse(readFileSync(candidate, 'utf8')) as { name?: string })
          if (name === '@servicenow/sdk') return dir
        } catch {
          // keep walking
        }
      }

      const parent = dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }

  return undefined
}

function binFromPackage(pkgDir: string): string | undefined {
  const pkgJson = join(pkgDir, 'package.json')
  if (!existsSync(pkgJson)) return undefined
  try {
    const pkg = JSON.parse(readFileSync(pkgJson, 'utf8')) as { bin?: Record<string, string> | string }
    const rel = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.['now-sdk']
    if (!rel) return undefined
    const full = join(pkgDir, rel)
    return existsSync(full) ? full : undefined
  } catch {
    return undefined
  }
}

function versionOf(pkgDir: string): string | undefined {
  try {
    return (JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')) as { version?: string }).version
  } catch {
    return undefined
  }
}

/**
 * Environment for a spawned SDK command.
 *
 * THE TRAP: `bin/credstore-boot.js` installs the sn-credstore keyring shim
 * in THIS process only, via a dynamic import of the register module. A
 * spawned now-sdk inherits none of it, silently falls back to the OS
 * keyring, and in a headless session reports "no credentials" — the exact
 * silent failure `AuthenticatedCommand.failAuth()` exists to explain. So
 * the shim has to be re-installed in the child through NODE_OPTIONS, and
 * the store selection has to travel with it.
 */
export function childEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base }
  if (base.NOW_SDK_KEYCHAIN_PATCHED === '1') {
    const register = '--import @sonisoft/sn-credstore/register'
    env.NODE_OPTIONS = base.NODE_OPTIONS ? `${base.NODE_OPTIONS} ${register}` : register
  }

  return env
}

export class SdkGateway {
  binary: SdkBinary | undefined

  constructor(
    private readonly approvals: ApprovalRegistry,
    private readonly alias: string,
  ) {}

  /** The argv actually executed, for the preview line and the approval. */
  commandFor(options: RunOptions): { args: string[]; command: string } {
    if (options.npmScript) {
      // The SDK guide: prefer the project's npm scripts — a complete app
      // may wire extra build steps into them, and running the raw command
      // silently skips those.
      return { args: ['run', options.npmScript], command: 'npm' }
    }

    const {binary} = this
    if (!binary) throw new Error('now-sdk binary could not be resolved')
    // Only commands that talk to the instance accept --auth; `explain`,
    // `pack` and `clean` reject an unknown option outright.
    const auth = options.auth ? ['--auth', this.alias] : []
    return { args: [...binary.args, ...options.argv, ...auth], command: binary.command }
  }

  /** Human-readable preview of what will run. */
  previewOf(options: RunOptions): string {
    const { args, command } = this.commandFor(options)
    const display = command === process.execPath ? 'now-sdk' : command
    const shown = command === process.execPath ? args.slice(1) : args
    return [display, ...shown].join(' ')
  }

  /**
   * Run a command, streaming output. Local-only commands pass `undefined`
   * for spec/token; anything that reaches the instance must supply both and
   * has its token consumed BEFORE the process starts.
   */
  async run(
    options: RunOptions,
    approval?: { spec: ApprovalSpec; token: ApprovalToken },
  ): Promise<SdkRun> {
    if (approval) this.approvals.consume(approval.token, approval.spec)

    const { args, command } = this.commandFor(options)
    return new Promise<SdkRun>((resolve) => {
      const lines: string[] = []
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: childEnv(),
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      const consume = (chunk: Buffer) => {
        for (const line of chunk.toString('utf8').split('\n')) {
          if (line.length === 0) continue
          // Strip ANSI: the SDK colourises, and raw escapes inside an ink
          // <Text> corrupt the frame.
          // eslint-disable-next-line no-control-regex
          const clean = line.replaceAll(/\[[\d;?]*[A-Za-z]/g, '').trimEnd()
          lines.push(clean)
          options.onLine?.(clean)
        }
      }

      child.stdout?.on('data', consume)
      child.stderr?.on('data', consume)
      child.on('error', (error) => {
        lines.push(`failed to start: ${error.message}`)
        resolve({ code: 1, lines, ok: false })
      })
      child.on('close', (code) => {
        resolve({ code: code ?? 0, lines, ok: (code ?? 0) === 0 })
      })
    })
  }
}
