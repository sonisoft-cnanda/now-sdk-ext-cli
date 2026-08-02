/**
 * The three failure modes the now-sdk CLI cannot catch, because it only
 * ever sees one invocation. The pane owns the session, so it can.
 *
 * All pure/IO-only helpers — no React, no ink — so they unit-test directly.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import type { ProjectInfo } from './project-detect.js'

import { newestSourceMtime } from './project-detect.js'

export const KEYS_FILE = 'src/fluent/generated/keys.ts'

export interface BuildRecord {
  finishedAt: number
  ok: boolean
}

export type InstallReadiness =
  | { builtAt: number; kind: 'failed-build'; }
  | { builtAt: number; kind: 'stale'; newestSourceAt: number; }
  | { kind: 'never-built' }
  | { kind: 'ok' }

/**
 * Is it safe to install?
 *
 * The SDK guide: "MUST: Ensure build has passed before deploying! A failed
 * build leaves the previous artifacts in place, so deploying without
 * rebuilding pushes stale output." The CLI cannot enforce this — it sees
 * one command at a time. Installing anyway stays allowed; doing it
 * unknowingly does not.
 */
export function installReadiness(project: ProjectInfo, lastBuild: BuildRecord | undefined): InstallReadiness {
  if (!lastBuild) return { kind: 'never-built' }
  if (!lastBuild.ok) return { kind: 'failed-build', builtAt: lastBuild.finishedAt }
  const newest = newestSourceMtime(project)
  if (newest > lastBuild.finishedAt) {
    return { kind: 'stale', builtAt: lastBuild.finishedAt, newestSourceAt: newest }
  }

  return { kind: 'ok' }
}

/** One-line explanation for the approval body / pane header. */
export function describeReadiness(readiness: InstallReadiness): string | undefined {
  switch (readiness.kind) {
    case 'failed-build': {
      return 'the last build FAILED — installing now pushes the previous build output'
    }

    case 'never-built': {
      return 'no build has run in this session — the artifacts on disk may be stale'
    }

    case 'ok': {
      return undefined
    }

    case 'stale': {
      return 'sources have changed since the last build — installing now pushes stale output'
    }
  }
}

/**
 * Is keys.ts modified but uncommitted?
 *
 * From the CI guide: when keys.ts is not committed, "Deploys produce
 * different sys_ids on every machine… Updates become inserts… corrupting
 * the target instance." `--frozenKeys` is the CI-side guard; locally
 * nothing tells you, so this does.
 *
 * Returns undefined when the answer is unknowable (not a git repo, git
 * missing) — an unknown is not a warning.
 */
export function keysFileDirty(projectRoot: string): boolean | undefined {
  if (!existsSync(join(projectRoot, KEYS_FILE))) return undefined
  try {
    const out = execFileSync('git', ['status', '--porcelain', '--', KEYS_FILE], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out.trim().length > 0
  } catch {
    return undefined
  }
}

/**
 * XML files under metadata/ that now have a Fluent twin.
 *
 * "Records that exist as both a fluent entity (.now.ts) and an XML file in
 * metadata will use the XML version on build. Remove converted XML files to
 * avoid conflicts." So a SUCCESSFUL transform can leave the project in a
 * state where the Fluent source it just generated is silently ignored.
 *
 * Matching is by basename: transform names the Fluent file after the record,
 * and the XML carries the same stem.
 */
export function findShadowingXml(project: ProjectInfo): string[] {
  const metadataDir = join(project.root, 'metadata')
  if (!existsSync(metadataDir)) return []

  const fluentStems = new Set<string>()
  for (const dir of project.sourceDirs) collectStems(dir, '.now.ts', fluentStems)
  if (fluentStems.size === 0) return []

  const shadowing: string[] = []
  walk(metadataDir, (file) => {
    if (!file.endsWith('.xml')) return
    const stem = basenameStem(file, '.xml')
    if (fluentStems.has(stem)) shadowing.push(relative(project.root, file))
  })
  return shadowing.sort()
}

function basenameStem(file: string, ext: string): string {
  const base = file.split(/[/\\]/).pop() ?? file
  return base.endsWith(ext) ? base.slice(0, -ext.length) : base
}

function collectStems(dir: string, ext: string, into: Set<string>): void {
  walk(dir, (file) => {
    if (file.endsWith(ext)) into.add(basenameStem(file, ext))
  })
}

function walk(dir: string, visit: (file: string) => void, depth = 0): void {
  if (depth > 8 || !existsSync(dir)) return
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    try {
      if (statSync(full).isDirectory()) walk(full, visit, depth + 1)
      else visit(full)
    } catch {
      // unreadable entry — skip
    }
  }
}
