import {Flags} from '@oclif/core'
import {ListLayoutWriter, type ListLayoutWriteResult} from '@sonisoft/now-sdk-ext-core'
import {readFile} from 'node:fs/promises'

import {identifier, MetadataBaseCommand, type MetadataFlags, scopeFlags, scopeOptions} from '../../../common/metadata-command.js'
import {MetadataDisplayService, MetadataInputError, NAME} from '../../../services/metadata-display.service.js'

/** The whole column list, in order: comma-separated, or a JSON array of strings in a file. */
export async function listColumns(flags: MetadataFlags): Promise<string[]> {
  let columns: unknown
  if (flags['columns-file'] === undefined) {
    columns = typeof flags.columns === 'string' ? flags.columns.split(',').map(item => item.trim()) : undefined
  } else {
    try {
      columns = JSON.parse(await readFile(flags['columns-file'] as string, 'utf8'))
    } catch {
      throw new MetadataInputError('The columns file must be a readable JSON array of strings.')
    }
  }

  if (!Array.isArray(columns) || columns.length === 0 || !columns.every(item => typeof item === 'string' && /^[a-z\d_]+(\.[a-z\d_]+)*$/i.test(item))) {
    throw new MetadataInputError('Supply the whole column list as field names, dot-walked as field.field.')
  }

  return columns as string[]
}

export default class MetadataListLayoutSet extends MetadataBaseCommand<typeof MetadataListLayoutSet> {
  static description = `Replace a table's list columns for one view through the List Layout page and verify the order and its capture.

The platform captures the list as one List Layout file, sys_ui_list_<table>_<view> (null for the Default view), and
replaces the sys_ui_list record on every save. A table with no list of its own gets one. For a list of an installed
Store application, pass --acknowledge-upgrade-skip: upgrades of that application then skip the file.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --table cmn_cost_center --columns "name,code,manager,valid_from" --scope global --update-set 0123456789abcdef0123456789abcdef --auth dev',
    '<%= config.bin %> <%= command.id %> --table sn_grc_indicator --columns-file ./columns.json --scope sn_grc --update-set 0123456789abcdef0123456789abcdef --acknowledge-upgrade-skip --auth dev',
  ]
  static flags = {
    ...scopeFlags,
    columns: Flags.string({description: 'The whole new column list in order, comma-separated; dot-walked as field.field.', exclusive: ['columns-file']}),
    'columns-file': Flags.string({description: 'Read the columns from a JSON array of strings.', exclusive: ['columns']}),
    table: Flags.string({description: 'Table name.', required: true}),
    'update-set': Flags.string({description: 'In progress update set of the list\'s application. It must be the working set (nex update-set use).', required: true}),
    view: Flags.string({description: 'View name. Omit for the Default view.'}),
  }
protected metadataAction = 'list-layout set'
  protected metadataTable = 'sys_ui_list'

  public async run(): Promise<ListLayoutWriteResult> {
    const flags = this.flags as MetadataFlags
    const table = identifier(flags, 'table', NAME, true)!
    const view = identifier(flags, 'view', NAME) ?? ''
    const columns = await listColumns(flags)
    const options = scopeOptions(flags)
    const result = await new ListLayoutWriter(this.instance).setListLayout(table, {...options, columns, updateSet: options.updateSet!, view})
    const display = new MetadataDisplayService()
    const safe = display.listLayoutResult(result)
    if (!this.jsonEnabled()) for (const line of display.listLayoutSuccess(safe)) this.log(line)
    return safe
  }
}
