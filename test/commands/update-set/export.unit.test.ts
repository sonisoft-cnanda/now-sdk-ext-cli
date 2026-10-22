import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals'
import {ServiceNowInstance, UpdateSetExporter, UpdateSetExportError, type UpdateSetExportResult} from '@sonisoft/now-sdk-ext-core'
import {createHash} from 'node:crypto'
import {chmod, mkdtemp, readdir, readFile, rm, stat, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import UpdateSetExport from '../../../src/commands/update-set/export.js'
import {AuthenticatedCommand} from '../../../src/common/authenticated-command.js'
import {projectExportError, UpdateSetExportDisplayService} from '../../../src/services/update-set-export-display.service.js'

const SET = 'a'.repeat(32), BASE = 'b'.repeat(32), TEMP = 'c'.repeat(32)
const XML = '<?xml version="1.0" encoding="UTF-8"?><unload unload_date="2026-10-22 00:00:00"></unload>'
const result: UpdateSetExportResult = {
  cleanup: {removedBy: 'platform', temporarySysId: TEMP}, excluded: [], kind: 'single', messages: [], recordCount: 2,
  sets: [{name: 'STORY-1', records: 2, state: 'complete', sysId: SET}], source: 'local',
  updateSet: {application: 'global', name: 'STORY-1', state: 'complete', sysId: SET}, xml: XML,
}
let dir: string
const command = (args: object, flags: object) => Object.assign(Object.create(UpdateSetExport.prototype),
  {args, flags: {force: false, 'include-incomplete': false, ...flags}, instance: new ServiceNowInstance({alias: 'unit-test'}), jsonEnabled: () => true})
const refusal = async (promise: Promise<unknown>) => promise.then(() => 'resolved', (error: any) => error.code)

beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'nex-export-')) })
afterEach(async () => {
  jest.restoreAllMocks()
  await rm(dir, {force: true, recursive: true})
})

describe('nex update-set export', () => {
  it('writes the XML owner-only to update-set-<sys_id>.xml in a directory and returns everything but the XML', async () => {
    const exporter = jest.spyOn(UpdateSetExporter.prototype, 'exportUpdateSet').mockResolvedValue(result)
    const output = await command({set: SET.toUpperCase()}, {output: dir}).run()
    expect(exporter).toHaveBeenCalledWith(SET, {includeIncomplete: false})
    const file = join(dir, `update-set-${SET}.xml`)
    expect(output).toEqual({bytes: XML.length, cleanup: result.cleanup, excluded: [], file, kind: 'single', messages: [], recordCount: 2,
      sets: result.sets, sha256: createHash('sha256').update(XML).digest('hex'), source: 'local', updateSet: result.updateSet})
    expect(output).not.toHaveProperty('xml')
    await expect(readFile(file, 'utf8')).resolves.toBe(XML)
    expect((await stat(file)).mode & 0o777).toBe(0o600)
    expect(await readdir(dir)).toEqual([`update-set-${SET}.xml`])
  })

  it('prints a summary without the XML in text mode', async () => {
    jest.spyOn(UpdateSetExporter.prototype, 'exportUpdateSet').mockResolvedValue(result)
    const lines: string[] = []
    const target = Object.assign(command({set: SET}, {output: dir}), {jsonEnabled: () => false, log: (line: string) => lines.push(line)})
    await target.run()
    expect(lines[0]).toBe(`Exported update set STORY-1 (${SET}); state: complete`)
    expect(lines.join('\n')).not.toContain('<unload')
  })

  it('writes update-set-<sys_id>.xml in the current directory by default', async () => {
    jest.spyOn(UpdateSetExporter.prototype, 'exportUpdateSet').mockResolvedValue(result)
    const cwd = process.cwd()
    process.chdir(dir)
    try {
      const output = await command({set: SET}, {}).run()
      expect(output.file).toBe(join(await import('node:fs/promises').then(fs => fs.realpath(dir)), `update-set-${SET}.xml`))
    } finally {
      process.chdir(cwd)
    }

    expect(await readdir(dir)).toEqual([`update-set-${SET}.xml`])
  })

  it('refuses an unwritable directory before asking the instance', async () => {
    if (process.getuid?.() === 0) return
    const exporter = jest.spyOn(UpdateSetExporter.prototype, 'exportUpdateSet').mockResolvedValue(result)
    await chmod(dir, 0o500)
    try {
      await expect(refusal(command({set: SET}, {output: dir}).run())).resolves.toBe('output_invalid')
    } finally {
      await chmod(dir, 0o700)
    }

    expect(exporter).not.toHaveBeenCalled()
  })

  it('passes --include-incomplete through', async () => {
    const exporter = jest.spyOn(UpdateSetExporter.prototype, 'exportUpdateSet').mockResolvedValue(result)
    await command({set: SET}, {'include-incomplete': true, output: join(dir, 'x.xml')}).run()
    expect(exporter).toHaveBeenCalledWith(SET, {includeIncomplete: true})
  })

  it('refuses an existing file before asking the instance, and replaces it with --force', async () => {
    const exporter = jest.spyOn(UpdateSetExporter.prototype, 'exportUpdateSet').mockResolvedValue(result)
    const file = join(dir, 'STORY-1.xml')
    await writeFile(file, 'old')
    await expect(refusal(command({set: SET}, {output: file}).run())).resolves.toBe('output_exists')
    expect(exporter).not.toHaveBeenCalled()
    await expect(readFile(file, 'utf8')).resolves.toBe('old')
    await chmod(file, 0o644)
    await command({set: SET}, {force: true, output: file}).run()
    await expect(readFile(file, 'utf8')).resolves.toBe(XML)
    expect((await stat(file)).mode & 0o777).toBe(0o600)
    expect(await readdir(dir)).toEqual(['STORY-1.xml'])
  })

  it('never replaces a file that appeared during the export', async () => {
    const file = join(dir, 'race.xml')
    jest.spyOn(UpdateSetExporter.prototype, 'exportUpdateSet').mockImplementation(async () => {
      await writeFile(file, 'theirs')
      return result
    })
    await expect(refusal(command({set: SET}, {output: file}).run())).resolves.toBe('output_exists')
    await expect(readFile(file, 'utf8')).resolves.toBe('theirs')
    expect(await readdir(dir)).toEqual(['race.xml'])
  })

  it('refuses a missing directory and a malformed sys_id before asking the instance', async () => {
    const exporter = jest.spyOn(UpdateSetExporter.prototype, 'exportUpdateSet').mockResolvedValue(result)
    await expect(refusal(command({set: SET}, {output: join(dir, 'missing', 'x.xml')}).run())).resolves.toBe('output_invalid')
    await expect(refusal(command({set: SET}, {output: `${join(dir, 'missing')}/`}).run())).resolves.toBe('output_invalid')
    await expect(refusal(command({set: '../../etc/passwd'}, {output: dir}).run())).resolves.toBe('invalid_input')
    expect(exporter).not.toHaveBeenCalled()
  })

  it('writes nothing when the exporter refuses', async () => {
    jest.spyOn(UpdateSetExporter.prototype, 'exportUpdateSet').mockRejectedValue(new UpdateSetExportError('export_mismatch', {actual: 1, expected: 2, updateSet: SET}))
    await expect(refusal(command({set: SET}, {output: dir}).run())).resolves.toBe('export_mismatch')
    expect(await readdir(dir)).toEqual([])
  })

  it('renders an exporter refusal as its code, detail and remediation, and passes anything else on', async () => {
    const parent = jest.spyOn(AuthenticatedCommand.prototype as any, 'catch').mockResolvedValue(undefined)
    const target = command({set: SET}, {})
    await target.catch(new UpdateSetExportError('batch_member', {base: BASE, updateSet: SET}))
    const rendered = parent.mock.calls[0][0] as any
    expect(rendered.updateSetExport).toMatchObject({code: 'batch_member', detail: {base: BASE, updateSet: SET}})
    expect(rendered.updateSetExport.remediation).toContain(`nex update-set export ${BASE}`)
    const other = new Error('boom')
    await target.catch(other)
    expect(parent.mock.calls[1][0]).toBe(other)
    const text = Object.assign(command({set: SET}, {}), {jsonEnabled: () => false})
    await text.catch(new UpdateSetExportError('cleanup_unverified', {temporary: [TEMP]}))
    expect((parent.mock.calls[2][0] as Error).message).toContain(`Detail: {"temporary":["${TEMP}"]}`)
  })
})

describe('update set export display', () => {
  const display = new UpdateSetExportDisplayService()

  it('says what was checked, where it went and that the file is sensitive', () => {
    const lines = display.success(display.output({...result, excluded: [{name: 'WIP', state: 'in progress', sysId: BASE}],
      messages: ['note']}, '/tmp/x.xml', 10, 'f'.repeat(64)))
    const text = lines.join('\n')
    expect(text).toContain(`Exported update set STORY-1 (${SET}); state: complete`)
    expect(text).toContain('File: /tmp/x.xml (10 bytes')
    expect(text).toContain('Single set, 2 record(s), checked against the instance')
    expect(text).toContain(`Left out (not Complete):\n  WIP (${BASE}); in progress`)
    expect(text).toContain(`Temporary copy ${TEMP} removed by the platform; none remains.`)
    expect(text).toContain('note')
    expect(lines.at(-1)).toContain('full payload')
  })

  it('names a retrieved export and a batch, and strips control characters from names', () => {
    const output = display.output({...result, cleanup: undefined, kind: 'batch', source: 'retrieved',
      updateSet: {...result.updateSet, name: 'bad\u001B[2Jname'}}, '/tmp/x.xml', 1, 'f'.repeat(64))
    expect(output.updateSet.name).toBe('bad [2Jname')
    expect(display.output({...result, updateSet: {...result.updateSet, state: 'x\nFile: forged'}}, '/f', 1, 'f').updateSet.state).toBe('x File: forged')
    const text = display.success(output).join('\n')
    expect(text).toContain('Exported Retrieved Update Set bad [2Jname')
    expect(text).toContain('Batch of 1 sets')
    expect(text).not.toContain('Temporary copy')
  })

  it('gives every core code a remediation, and offers the base command only for a hex sys_id', () => {
    for (const code of ['invalid_input', 'update_set_not_found', 'update_set_incomplete', 'batch_member', 'retrieved_state', 'evidence_unavailable',
      'script_result_unavailable', 'export_failed', 'export_mismatch', 'cleanup_unverified', 'output_exists', 'output_invalid', 'output_write_failed']) {
      expect(projectExportError({code: code as any, detail: undefined}).remediation[0]).not.toContain('Read the update set back')
    }
    expect(projectExportError({code: 'batch_member', detail: {base: '$(rm -rf /)'}}).remediation).toHaveLength(1)
    expect(display.failure(projectExportError({code: 'cleanup_unverified', detail: {temporary: [TEMP]}})))
      .toEqual(['Update set export refused: cleanup_unverified.', `Detail: {"temporary":["${TEMP}"]}`, expect.stringContaining('Retrieved Update Sets')])
  })
})
