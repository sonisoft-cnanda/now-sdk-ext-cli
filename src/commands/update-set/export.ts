import {Args, Errors, Flags} from '@oclif/core'
import {flushLogs, UpdateSetExporter, UpdateSetExportError} from '@sonisoft/now-sdk-ext-core'
import {createHash} from 'node:crypto'
import {constants} from 'node:fs'
import {access, copyFile, link, open, rename, rm, stat} from 'node:fs/promises'
import {dirname, join, resolve} from 'node:path'

import {AuthenticatedCommand} from '../../common/authenticated-command.js'
import {projectExportError, UpdateSetExportDisplayService, type UpdateSetExportOutput} from '../../services/update-set-export-display.service.js'

const ID = /^[a-f\d]{32}$/i

/** A refusal about the local file, reported like the exporter's own. */
class ExportOutputError extends Error {
  constructor(public readonly code: 'invalid_input' | 'output_exists' | 'output_invalid' | 'output_write_failed') {
    super(`Update set export refused: ${code}`)
  }
}

export default class UpdateSetExport extends AuthenticatedCommand<typeof UpdateSetExport> {
  static args = {
    set: Args.string({description: 'sys_id of a sys_update_set, or of a Retrieved Update Set (sys_remote_update_set).', required: true}),
  }
  static description = `Export an update set to XML, as the platform's Export to XML does, and check the file.

A local set is exported with the platform's UpdateSetExport, through a temporary Retrieved Update Set copy
that the download deletes. nex reads the copy back and removes it if the platform did not. A batch base is
exported with its Complete children; a batch member is refused in favour of its base. A Loaded Retrieved
Update Set is a plain read.

Only Complete sets are exported unless --include-incomplete is passed. The file must hold exactly the sets
and records the instance counts, or nothing is written. It holds every record's full payload; the XML
is never printed.`
  static examples = [
    '<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef --auth dev',
    '<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef --output ./exports/ --json --auth dev',
    '<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef --output STORY-123.xml --force --auth dev',
  ]
  static flags = {
    force: Flags.boolean({default: false, description: 'Replace the output file if it exists.'}),
    'include-incomplete': Flags.boolean({default: false,
      description: 'Export a set (or batch members) that is not Complete: a snapshot of unfinished work.'}),
    output: Flags.string({char: 'o',
      description: 'File to write, or an existing directory for update-set-<sys_id>.xml. Default: that name in the current directory.'}),
  }

  protected async catch(error: Error & {exitCode?: number}): Promise<void> {
    if (!(error instanceof UpdateSetExportError) && !(error instanceof ExportOutputError)) return super.catch(error)
    const failure = projectExportError(error instanceof UpdateSetExportError ? error : {code: error.code as never, detail: undefined})
    await flushLogs()
    const message = this.jsonEnabled() ? failure.message : new UpdateSetExportDisplayService().failure(failure).join('\n')
    const safe = new Errors.CLIError(message, {code: failure.code, exit: 1, suggestions: failure.remediation})
    Object.assign(safe, {updateSetExport: failure})
    return super.catch(safe)
  }

  public async run(): Promise<UpdateSetExportOutput> {
    const set = this.args.set.trim().toLowerCase()
    if (!ID.test(set)) throw new ExportOutputError('invalid_input')
    const {force} = this.flags
    const file = await target(this.flags.output, set, force)
    const result = await new UpdateSetExporter(this.instance).exportUpdateSet(set, {includeIncomplete: this.flags['include-incomplete']})
    const bytes = Buffer.byteLength(result.xml, 'utf8')
    const sha256 = createHash('sha256').update(result.xml, 'utf8').digest('hex')
    await write(file, result.xml, force)
    const display = new UpdateSetExportDisplayService()
    const output = display.output(result, file, bytes, sha256)
    if (!this.jsonEnabled()) for (const line of display.success(output)) this.log(line)
    return output
  }
}

/** The file to write, checked before the instance is asked for anything. */
async function target(output: string | undefined, set: string, force: boolean): Promise<string> {
  const name = `update-set-${set}.xml`
  if (output === undefined || output.trim() === '') return checkFile(resolve(name), force)
  const path = resolve(output)
  const info = await stat(path).catch(() => {})
  if (info?.isDirectory()) return checkFile(join(path, name), force)
  if (/[/\\]$/.test(output)) throw new ExportOutputError('output_invalid')
  return checkFile(path, force)
}

async function checkFile(path: string, force: boolean): Promise<string> {
  const parent = await stat(dirname(path)).catch(() => {})
  if (!parent?.isDirectory()) throw new ExportOutputError('output_invalid')
  // The export runs on the instance before anything is written: find an unwritable directory first.
  if (!(await access(dirname(path), constants.W_OK).then(() => true, () => false))) throw new ExportOutputError('output_invalid')
  const existing = await stat(path).catch(() => {})
  if (existing?.isDirectory()) throw new ExportOutputError('output_invalid')
  if (existing && !force) throw new ExportOutputError('output_exists')
  return path
}

/**
 * Write beside the target, flush it, then move it into place, so a partial file never appears under the
 * name; owner-only, as it holds payloads. Without --force the name is created exclusively: by link(), or
 * where links are not supported, by an exclusive copy.
 */
async function write(path: string, xml: string, force: boolean): Promise<void> {
  const temporary = `${path}.${process.pid}.${Date.now()}.partial`
  try {
    const handle = await open(temporary, 'wx', 0o600)
    try {
      await handle.writeFile(xml, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }

    await (force ? rename(temporary, path) : publish(temporary, path));
  } catch (error) {
    if (error instanceof ExportOutputError) throw error
    throw new ExportOutputError('output_write_failed')
  } finally {
    await rm(temporary, {force: true}).catch(() => {})
  }
}

/** Create `path` from `temporary` without ever replacing a file that appeared since the check. */
async function publish(temporary: string, path: string): Promise<void> {
  try {
    await link(temporary, path)
  } catch (error) {
    const {code} = error as NodeJS.ErrnoException
    if (code === 'EEXIST') throw new ExportOutputError('output_exists')
    if (code !== 'EPERM' && code !== 'ENOTSUP' && code !== 'EOPNOTSUPP' && code !== 'ENOSYS') throw error
    try {
      await copyFile(temporary, path, constants.COPYFILE_EXCL)
    } catch (copyError) {
      if ((copyError as NodeJS.ErrnoException).code === 'EEXIST') throw new ExportOutputError('output_exists')
      throw copyError
    }
  }
}
