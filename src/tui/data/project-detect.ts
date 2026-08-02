/**
 * Fluent-project detection.
 *
 * Reads `now.config.json` and `package.json` directly rather than binding to
 * `@servicenow/sdk-project`: that package is only a TRANSITIVE dependency at
 * 3.0.3 while the direct SDK line is 4.9.2, so its internals are the wrong
 * thing to depend on. The two files are a stable, documented contract.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'

/** now.config.json — scope and scopeId are both REQUIRED by its schema. */
export interface NowConfig {
  appOutputDir?: string
  clientDir?: string
  description?: string
  fluentDir?: string
  name?: string
  scope: string
  scopeId: string
  version?: string
}

export interface ProjectInfo {
  config: NowConfig
  /** Absolute path to now.config.json. */
  configPath: string
  /**
   * The SDK guide is explicit that a project's npm scripts may wrap the
   * raw commands with extra steps, so we record which ones exist.
   */
  hasScript: { build: boolean; deploy: boolean; install: boolean }
  packageName?: string
  /** Absolute project root (the directory holding now.config.json). */
  root: string
  /** Source directories to watch for staleness, absolute. */
  sourceDirs: string[]
}

const MAX_WALK_UP = 12

/** Walk up from `startDir` looking for now.config.json. */
export function findProjectRoot(startDir: string): string | undefined {
  let dir = startDir
  const { root } = parse(dir)
  for (let i = 0; i < MAX_WALK_UP; i++) {
    if (existsSync(join(dir, 'now.config.json'))) return dir
    if (dir === root) break
    dir = dirname(dir)
  }

  return undefined
}

/**
 * Detect a Fluent project at or above `startDir`. Returns undefined when
 * there is none — the Project pane is hidden entirely in that case rather
 * than shown broken.
 */
export function detectProject(startDir: string = process.cwd()): ProjectInfo | undefined {
  const root = findProjectRoot(startDir)
  if (!root) return undefined

  const configPath = join(root, 'now.config.json')
  let config: NowConfig
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8')) as NowConfig
  } catch {
    // A now.config.json we cannot parse is not a usable project. Better to
    // hide the pane than to render half of it against garbage.
    return undefined
  }

  if (!config.scope) return undefined

  let scripts: Record<string, unknown> = {}
  let packageName: string | undefined
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      name?: string
      scripts?: Record<string, unknown>
    }
    scripts = pkg.scripts ?? {}
    packageName = pkg.name
  } catch {
    // package.json is conventional but not required for detection.
  }

  const info: ProjectInfo = {
    config,
    configPath,
    hasScript: {
      build: typeof scripts.build === 'string',
      deploy: typeof scripts.deploy === 'string',
      install: typeof scripts.install === 'string',
    },
    root,
    sourceDirs: [config.fluentDir ?? 'src/fluent', config.clientDir ?? 'src/client']
      .map((d) => join(root, d))
      .filter((d) => existsSync(d)),
  }
  if (packageName) info.packageName = packageName
  return info
}

/** Newest mtime under the project's source directories, or 0. */
export function newestSourceMtime(project: ProjectInfo): number {
  let newest = 0
  const walk = (dir: string, depth = 0): void => {
    if (depth > 8) return
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const full = join(dir, entry)
      let stat
      try {
        stat = statSync(full)
      } catch {
        continue
      }

      if (stat.isDirectory()) walk(full, depth + 1)
      else if (stat.mtimeMs > newest) newest = stat.mtimeMs
    }
  }

  for (const dir of project.sourceDirs) walk(dir)
  return newest
}

