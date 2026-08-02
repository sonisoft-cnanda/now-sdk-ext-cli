import { describe, expect, it } from '@jest/globals'

import type { ApprovalSpec } from '../../../src/tui/data/approvals.js'

import {
  ApprovalRegistry,
  ApprovalRequiredError,
  hashSpec,
  ReadOnlyError,
} from '../../../src/tui/data/approvals.js'

const spec = (over: Partial<ApprovalSpec> = {}): ApprovalSpec => ({
  actionKind: 'record.update',
  detail: [{ after: '1', before: '3', label: 'Priority' }],
  target: { count: 1, instance: 'https://dev.service-now.com', table: 'incident' },
  title: 'update 1 field',
  ...over,
})

const registry = (over: Partial<ConstructorParameters<typeof ApprovalRegistry>[0]> = {}) =>
  new ApprovalRegistry({ alias: 'dev', env: 'dev', ...over })

describe('tier classification', () => {
  it('routine single-record writes are remember-able on dev', () => {
    expect(registry().classify(spec())).toBe('remember')
  })

  it('destructive kinds are always-ask even on dev', () => {
    expect(registry().classify(spec({ actionKind: 'bulk.delete' }))).toBe('always')
    expect(registry().classify(spec({ actionKind: 'xml.import' }))).toBe('always')
    expect(registry().classify(spec({ actionKind: 'app.uninstall' }))).toBe('always')
  })

  it('EVERYTHING escalates to always-ask on prod', () => {
    const prod = registry({ env: 'prod' })
    expect(prod.classify(spec())).toBe('always')
    expect(prod.classify(spec({ actionKind: 'task.comment' }))).toBe('always')
  })

  it('an unclassified instance is treated exactly like prod', () => {
    expect(registry({ env: 'unknown' }).classify(spec())).toBe('always')
  })

  it('blast radius above the threshold escalates', () => {
    const dev = registry()
    expect(dev.classify(spec({ target: { count: 25, instance: 'h' } }))).toBe('remember')
    expect(dev.classify(spec({ target: { count: 26, instance: 'h' } }))).toBe('always')
  })
})

describe('session memory', () => {
  it('remembering suppresses the prompt for that kind only', () => {
    const reg = registry()
    expect(reg.needsPrompt(spec())).toBe(true)
    reg.remember('record.update')
    expect(reg.needsPrompt(spec())).toBe(false)
    // A different action kind is NOT covered.
    expect(reg.needsPrompt(spec({ actionKind: 'task.assign' }))).toBe(true)
  })

  it('never suppresses an always-ask tier', () => {
    const reg = registry()
    reg.remember('bulk.delete')
    expect(reg.needsPrompt(spec({ actionKind: 'bulk.delete' }))).toBe(true)
  })

  it('remember is not offered for always-ask specs', () => {
    const reg = registry()
    expect(reg.supportsRemember(spec())).toBe(true)
    expect(reg.supportsRemember(spec({ actionKind: 'bulk.update' }))).toBe(false)
  })

  it('clearMemory forgets everything (instance switch)', () => {
    const reg = registry()
    reg.remember('record.update')
    reg.clearMemory()
    expect(reg.needsPrompt(spec())).toBe(true)
  })
})

describe('--approve-all', () => {
  it('suppresses prompts for routine writes on dev', () => {
    expect(registry({ approveAll: true }).needsPrompt(spec())).toBe(false)
  })

  it('REFUSES to engage on prod', () => {
    const reg = registry({ approveAll: true, env: 'prod' })
    expect(reg.approveAll).toBe(false)
    expect(reg.needsPrompt(spec())).toBe(true)
  })

  it('REFUSES to engage on an unclassified instance', () => {
    expect(registry({ approveAll: true, env: 'unknown' }).approveAll).toBe(false)
  })

  it('still never covers destructive kinds', () => {
    expect(registry({ approveAll: true }).needsPrompt(spec({ actionKind: 'bulk.delete' }))).toBe(true)
  })
})

describe('token enforcement', () => {
  it('a minted token is accepted exactly once', () => {
    const reg = registry()
    const s = spec()
    const token = reg.mint(s)
    expect(() => reg.consume(token, s)).not.toThrow()
    expect(() => reg.consume(token, s)).toThrow(ApprovalRequiredError)
  })

  it('rejects a missing token', () => {
    expect(() => registry().consume(undefined, spec())).toThrow(ApprovalRequiredError)
  })

  it('rejects a token minted for a DIFFERENT operation', () => {
    const reg = registry()
    const approved = spec()
    const token = reg.mint(approved)
    // Same action kind, different values — the diff the user approved is
    // not the diff being executed.
    const swapped = spec({ detail: [{ after: '5', before: '3', label: 'Priority' }] })
    expect(() => reg.consume(token, swapped)).toThrow(/different operation/)
  })

  it('rejects a token minted for a different instance', () => {
    const reg = registry()
    const token = reg.mint(spec())
    const elsewhere = spec({ target: { count: 1, instance: 'https://prod.service-now.com', table: 'incident' } })
    expect(() => reg.consume(token, elsewhere)).toThrow(/different operation/)
  })

  it('read-only throws before any token check', () => {
    const reg = registry({ readOnly: true })
    const token = reg.mint(spec())
    expect(() => reg.consume(token, spec())).toThrow(ReadOnlyError)
  })
})

describe('hashSpec', () => {
  it('is stable across equal specs and sensitive to the diff', () => {
    expect(hashSpec(spec())).toBe(hashSpec(spec()))
    expect(hashSpec(spec())).not.toBe(hashSpec(spec({ detail: [{ after: '2', before: '3', label: 'Priority' }] })))
  })

  it('ignores presentation-only fields', () => {
    expect(hashSpec(spec())).toBe(hashSpec(spec({ title: 'a totally different title' })))
  })
})
