import { describe, expect, it, jest } from '@jest/globals'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parseInput, parseVariables, resolveActivity, resolveDraftVersion, resolveReadableVersion } from '../../src/common/workflow-args.js'

const ID = 'a'.repeat(32)

function manager(overrides: Record<string, unknown> = {}): any {
  return {
    getDraftVersion: jest.fn<any>().mockResolvedValue('draft-1'),
    getWorkflowDefinition: jest.fn<any>().mockResolvedValue({
      activities: [{ name: 'Begin', sysId: 'b' }, { name: 'Wait', sysId: 'w1' }, { name: 'Twin', sysId: 't1' }, { name: 'twin', sysId: 't2' }],
    }),
    resolveWorkflow: jest.fn<any>(),
    ...overrides,
  }
}

describe('workflow-args', () => {
  describe('parseVariables', () => {
    it('merges a vars file with --var flags, flags winning, splitting at the first =', () => {
      const dir = mkdtempSync(join(tmpdir(), 'wfargs-'))
      const file = join(dir, 'vars.json')
      writeFileSync(file, JSON.stringify({ duration: 60, script: 'from file' }))
      expect(parseVariables(['script=answer = 1;', 'timer_type=script'], file)).toEqual({
        duration: 60, script: 'answer = 1;', timer_type: 'script',
      })
    })

    it('returns undefined when nothing is given and rejects malformed input', () => {
      expect(parseVariables(undefined, undefined)).toBeUndefined()
      expect(() => parseVariables(['novalue'], undefined)).toThrow('--var must be key=value')
      const dir = mkdtempSync(join(tmpdir(), 'wfargs-'))
      const file = join(dir, 'vars.json')
      writeFileSync(file, '[1,2]')
      expect(() => parseVariables(undefined, file)).toThrow(/JSON object/)
    })
  })

  it('parses --input as a JSON object only', () => {
    expect(parseInput('{"a":"b"}')).toEqual({ a: 'b' })
    expect(parseInput(undefined)).toBeUndefined()
    expect(() => parseInput('[]')).toThrow('--input must be a JSON object')
  })

  describe('versions', () => {
    it('uses --version as given, otherwise the current user\'s draft', async () => {
      const wm = manager()
      await expect(resolveDraftVersion(wm, 'WF', 'given')).resolves.toBe('given')
      await expect(resolveDraftVersion(wm, 'WF')).resolves.toBe('draft-1')
      await expect(resolveDraftVersion(wm)).rejects.toThrow(/Specify the workflow/)
    })

    it('reads the user\'s draft first, then the published version', async () => {
      const wm = manager()
      wm.resolveWorkflow.mockResolvedValueOnce({ checkedOutVersion: { byCurrentUser: true, sysId: 'mine' }, publishedVersionSysId: 'pub' })
      await expect(resolveReadableVersion(wm, 'WF')).resolves.toBe('mine')
      wm.resolveWorkflow.mockResolvedValueOnce({ checkedOutVersion: { byCurrentUser: false, sysId: 'theirs' }, publishedVersionSysId: 'pub' })
      await expect(resolveReadableVersion(wm, 'WF')).resolves.toBe('pub')
      wm.resolveWorkflow.mockResolvedValueOnce({ name: 'Empty' })
      await expect(resolveReadableVersion(wm, 'WF')).rejects.toThrow(/no published or checked-out version/)
    })
  })

  describe('resolveActivity', () => {
    it('passes sys_ids through and resolves unique names case-insensitively', async () => {
      const wm = manager()
      await expect(resolveActivity(wm, 'v', ID)).resolves.toBe(ID)
      expect(wm.getWorkflowDefinition).not.toHaveBeenCalled()
      await expect(resolveActivity(wm, 'v', 'wait')).resolves.toBe('w1')
    })

    it('explains missing and ambiguous names', async () => {
      const wm = manager()
      await expect(resolveActivity(wm, 'v', 'Nope')).rejects.toThrow("No activity named 'Nope'. Activities: Begin, Wait, Twin, twin")
      await expect(resolveActivity(wm, 'v', 'TWIN')).rejects.toThrow("2 activities are named 'TWIN'; use a sys_id: t1, t2")
    })
  })
})
