/**
 * The safety nets. Each of these guards a documented failure mode the
 * now-sdk CLI cannot catch, because it only ever sees one invocation.
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ProjectInfo } from '../../../src/tui/data/project-detect.js'

import { detectProject } from '../../../src/tui/data/project-detect.js'
import {
  compareAppIdentity,
  describeAppIdentity,
  describeReadiness,
  findShadowingXml,
  installReadiness,
  keysFileDirty,
} from '../../../src/tui/data/project-health.js'

let root: string

const write = (rel: string, content = 'x') => {
  const full = join(root, rel)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, content)
  return full
}

const project = (): ProjectInfo => detectProject(root)!

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'nex-proj-'))
  write('now.config.json', JSON.stringify({ scope: 'x_acme_app', scopeId: 'a'.repeat(32) }))
  write('package.json', JSON.stringify({ name: 'acme', scripts: { build: 'now-sdk build' } }))
  write('src/fluent/index.now.ts')
})

afterEach(() => {
  rmSync(root, { force: true, recursive: true })
})

describe('detectProject', () => {
  it('finds the project from a nested directory', () => {
    mkdirSync(join(root, 'src/fluent/deep'), { recursive: true })
    const found = detectProject(join(root, 'src/fluent/deep'))
    expect(found?.root).toBe(root)
    expect(found?.config.scope).toBe('x_acme_app')
  })

  it('records which npm scripts exist — they may wrap the raw commands', () => {
    const p = project()
    expect(p.hasScript.build).toBe(true)
    expect(p.hasScript.deploy).toBe(false)
  })

  it('returns undefined outside a project', () => {
    const empty = mkdtempSync(join(tmpdir(), 'nex-empty-'))
    expect(detectProject(empty)).toBeUndefined()
    rmSync(empty, { force: true, recursive: true })
  })

  it('returns undefined for an unparseable config rather than half-rendering', () => {
    write('now.config.json', '{ not json')
    expect(detectProject(root)).toBeUndefined()
  })
})

describe('installReadiness — the build→install ordering guard', () => {
  it('flags never-built', () => {
    expect(installReadiness(project(), undefined)).toEqual({ kind: 'never-built' })
  })

  it('flags a failed build — installing pushes the PREVIOUS artifacts', () => {
    const r = installReadiness(project(), { finishedAt: Date.now(), ok: false })
    expect(r.kind).toBe('failed-build')
    expect(describeReadiness(r)).toMatch(/FAILED/)
  })

  it('flags stale when a source changed after the last good build', () => {
    const built = Date.now()
    const file = join(root, 'src/fluent/index.now.ts')
    const later = new Date(built + 60_000)
    utimesSync(file, later, later)
    const r = installReadiness(project(), { finishedAt: built, ok: true })
    expect(r.kind).toBe('stale')
    expect(describeReadiness(r)).toMatch(/stale output/)
  })

  it('is ok when the build is newer than every source', () => {
    const past = new Date(Date.now() - 60_000)
    utimesSync(join(root, 'src/fluent/index.now.ts'), past, past)
    const r = installReadiness(project(), { finishedAt: Date.now(), ok: true })
    expect(r).toEqual({ kind: 'ok' })
    expect(describeReadiness(r)).toBeUndefined()
  })
})

describe('keysFileDirty — "updates become inserts" guard', () => {
  it('is unknowable without the file, and an unknown is not a warning', () => {
    expect(keysFileDirty(root)).toBeUndefined()
  })

  it('is unknowable outside a git repo', () => {
    write('src/fluent/generated/keys.ts', 'export {}')
    expect(keysFileDirty(root)).toBeUndefined()
  })

  it('detects an uncommitted change, and clears once committed', () => {
    write('src/fluent/generated/keys.ts', 'export const a = 1')
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
    git('init', '-q')
    git('config', 'user.email', 't@t')
    git('config', 'user.name', 'T')

    // Untracked counts as dirty — it is not committed.
    expect(keysFileDirty(root)).toBe(true)

    git('add', '-A')
    git('commit', '-qm', 'add keys')
    expect(keysFileDirty(root)).toBe(false)

    write('src/fluent/generated/keys.ts', 'export const a = 2')
    expect(keysFileDirty(root)).toBe(true)
  })
})

describe('compareAppIdentity — is this the instance you think it is?', () => {
  const withVersion = (version: string) => {
    write('now.config.json', JSON.stringify({ scope: 'x_acme_app', scopeId: 'a'.repeat(32), version }))
    return project()
  }

  it('reports absent when the instance has no app with that scopeId', () => {
    const p = project()
    expect(compareAppIdentity(p, undefined)).toEqual({ kind: 'absent' })
    expect(describeAppIdentity({ kind: 'absent' }, p, 'dev1')).toMatch(/not installed on dev1/)
  })

  it('reports mismatch when the scopeId belongs to a DIFFERENT scope — the wrong-instance catch', () => {
    const p = project()
    const identity = compareAppIdentity(p, { scope: 'x_other_app', version: '2.0.0' })
    expect(identity).toEqual({ kind: 'mismatch', remoteScope: 'x_other_app' })
    expect(describeAppIdentity(identity, p, 'prod')).toMatch(/wrong instance/)
  })

  it('matches without drift when the versions agree, and says nothing', () => {
    const p = withVersion('1.0.0')
    const identity = compareAppIdentity(p, { scope: 'x_acme_app', version: '1.0.0' })
    expect(identity).toEqual({ drift: false, kind: 'match', remoteVersion: '1.0.0' })
    expect(describeAppIdentity(identity, p, 'dev1')).toBeUndefined()
  })

  it('matches WITH drift when the installed version differs, and shows both', () => {
    const p = withVersion('1.2.0')
    const identity = compareAppIdentity(p, { scope: 'x_acme_app', version: '1.0.0' })
    expect(identity).toEqual({ drift: true, kind: 'match', remoteVersion: '1.0.0' })
    expect(describeAppIdentity(identity, p, 'dev1')).toBe('installed on dev1 at 1.0.0 · local is 1.2.0')
  })

  it('is unknown without a scopeId — an unanswerable question is not a warning', () => {
    write('now.config.json', JSON.stringify({ scope: 'x_acme_app' }))
    const p = project()
    expect(compareAppIdentity(p, { scope: 'x_other' })).toEqual({ kind: 'unknown' })
    expect(describeAppIdentity({ kind: 'unknown' }, p, 'dev1')).toBeUndefined()
  })
})

describe('findShadowingXml — a successful transform can silently break the build', () => {
  it('finds XML in metadata/ that shadows generated Fluent source', () => {
    write('src/fluent/AcmeRule.now.ts')
    write('metadata/sys_script/AcmeRule.xml')
    expect(findShadowingXml(project())).toEqual([join('metadata', 'sys_script', 'AcmeRule.xml')])
  })

  it('ignores XML with no Fluent twin', () => {
    write('src/fluent/AcmeRule.now.ts')
    write('metadata/sys_script/SomethingElse.xml')
    expect(findShadowingXml(project())).toEqual([])
  })

  it('returns nothing when there is no metadata directory', () => {
    expect(findShadowingXml(project())).toEqual([])
  })

  it('returns nothing when no Fluent source exists yet', () => {
    rmSync(join(root, 'src/fluent/index.now.ts'))
    write('metadata/sys_script/AcmeRule.xml')
    expect(findShadowingXml(project())).toEqual([])
  })
})
