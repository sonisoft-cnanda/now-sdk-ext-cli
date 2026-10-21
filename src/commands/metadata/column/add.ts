import {Flags} from '@oclif/core'
import {ColumnWriter, type ColumnWriteResult} from '@sonisoft/now-sdk-ext-core'

import {identifier, MetadataBaseCommand, type MetadataFlags, scopeFlags, scopeOptions} from '../../../common/metadata-command.js'
import {MetadataDisplayService, MetadataInputError, NAME} from '../../../services/metadata-display.service.js'

export default class MetadataColumnAdd extends MetadataBaseCommand<typeof MetadataColumnAdd> {
  static description = `Add a column to a table through the dictionary form and verify the column, its label, its form placement and their captures.

The platform names the column: u_<name> in Global and in an installed Store application, <scope>_<name> when an
application adds it to another application's table, and <name> unchanged on a scoped application's own table. The
prefix is added for you; the result names the column as saved. On Global tables and an application's own tables the
platform also appends the field to the end of the Default view's main section (move it with nex metadata layout set),
unless a field of that name is already on the form, as after re-adding a deleted column. Every capture (Dictionary,
Field Label, and Form Layout when the field was placed) is checked to be in --update-set, which must be the working set.
A column in an installed Store application needs --acknowledge-upgrade-skip: its files are customizations of that
application, and so is the form section when the field is placed on it; upgrades skip customized files.

Removing a column deletes its data and is not part of this command.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --table x_acme_ticket --column triage_note --label "Triage note" --max-length 100 --scope x_acme --update-set 0123456789abcdef0123456789abcdef --auth dev',
    '<%= config.bin %> <%= command.id %> --table cmn_cost_center --column approver --label Approver --type reference --reference sys_user --scope global --update-set 0123456789abcdef0123456789abcdef --auth dev',
  ]
  static flags = {
    ...scopeFlags,
    column: Flags.string({description: 'Column name, lower case. The platform\'s prefix is added when missing.', required: true}),
    label: Flags.string({description: 'Column label.', required: true}),
    'max-length': Flags.integer({description: 'Maximum length, for string types. The type\'s default applies when omitted.', max: 65_000, min: 1}),
    reference: Flags.string({description: 'Referenced table: required for --type reference, optional for glide_list.'}),
    table: Flags.string({description: 'Table name.', required: true}),
    type: Flags.string({default: 'string', description: 'Column type: a sys_glide_object name such as string, integer, boolean, glide_date_time or reference.'}),
    'update-set': Flags.string({description: 'In progress update set of the application. It must be the working set (nex update-set use).', required: true}),
  }
  protected metadataAction = 'column add'
  protected metadataTable = 'sys_dictionary'

  public async run(): Promise<ColumnWriteResult> {
    const flags = this.flags as MetadataFlags
    const table = identifier(flags, 'table', NAME, true)!
    const column = identifier(flags, 'column', /^[a-z][a-z\d_]*$/, true)!
    const type = identifier(flags, 'type', NAME, true)!
    const reference = identifier(flags, 'reference', NAME)
    const {label} = flags
    if (typeof label !== 'string' || label.trim() === '' || label.length > 80 || /[\p{Cc}<>]/u.test(label)) {
      throw new MetadataInputError('--label must be non-empty text of at most 80 characters, without < or >.')
    }

    if (reference !== undefined && type !== 'reference' && type !== 'glide_list') throw new MetadataInputError('--reference is only for --type reference or glide_list.')
    if (reference === undefined && type === 'reference') throw new MetadataInputError('--type reference needs --reference <table>.')
    const maxLength = flags['max-length'] as number | undefined
    const options = scopeOptions(flags)
    const result = await new ColumnWriter(this.instance).addColumn(table, {...options, column, label, type, updateSet: options.updateSet!,
      ...(maxLength === undefined ? {} : {maxLength}), ...(reference === undefined ? {} : {reference})})
    const display = new MetadataDisplayService()
    const safe = display.columnResult(result)
    if (!this.jsonEnabled()) for (const line of display.columnSuccess(safe)) this.log(line)
    return safe
  }
}
