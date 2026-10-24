import {Flags} from '@oclif/core'
import {type ColumnRemoveResult, ColumnWriter} from '@sonisoft/now-sdk-ext-core'

import {identifier, MetadataBaseCommand, type MetadataFlags, scopeFlags, scopeOptions} from '../../../common/metadata-command.js'
import {MetadataDisplayService, MetadataInputError, NAME} from '../../../services/metadata-display.service.js'

export default class MetadataColumnRemove extends MetadataBaseCommand<typeof MetadataColumnRemove> {
  static description = `Remove a column through the dictionary form's Delete Column action, and verify what the platform did.

This deletes the column's data here and on every instance its DELETE capture is committed to. It needs --confirm
<table>.<column> naming the column exactly. Rows holding a value are counted first and need --acknowledge-data-loss.
The platform also deletes the onChange client scripts and UI policy actions that name the column; those need
--acknowledge-dependent-deletes, and another application's are refused. Only a column the platform itself allows to be
deleted is removed: a u_ column, or a scoped application's own column (never a vendor column). A u_ column of an
installed Store application needs --acknowledge-upgrade-skip.

The column's labels and those dependents are verified deleted, each with a DELETE capture in --update-set (which need
not be the working set). The platform leaves the column's choices, choice set, form elements and list elements behind;
the result lists them; other references (UI policies, ACLs, scripts) are not checked. createdInThisSet true means the
column was created in this set: if the set has never left this instance, move the DELETEs that replaced its own captures
to the application's Default (nex update-set move) rather than ship them. Otherwise committing the set deletes the column
wherever it exists.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --table x_acme_ticket --column triage_note --confirm x_acme_ticket.triage_note --scope x_acme --update-set 0123456789abcdef0123456789abcdef --auth dev',
    '<%= config.bin %> <%= command.id %> --table cmn_cost_center --column u_tier --confirm cmn_cost_center.u_tier --scope global --update-set 0123456789abcdef0123456789abcdef --auth dev',
  ]
  static flags = {
    ...scopeFlags,
    'acknowledge-data-loss': Flags.boolean({description: 'Required when rows hold a value in the column: the values are deleted with it.'}),
    'acknowledge-dependent-deletes': Flags.boolean({description: 'Required when the platform will delete client scripts or UI policy actions that name the column.'}),
    column: Flags.string({description: 'Column name, prefix included (u_ in Global).', required: true}),
    confirm: Flags.string({description: 'Type <table>.<column> exactly, to confirm the removal.', required: true}),
    table: Flags.string({description: 'Table name.', required: true}),
    'update-set': Flags.string({description: 'In progress update set of the column\'s application. The DELETE captures follow it.', required: true}),
  }
  protected metadataAction = 'column remove'
  protected metadataTable = 'sys_dictionary'

  public async run(): Promise<ColumnRemoveResult> {
    const flags = this.flags as MetadataFlags
    const table = identifier(flags, 'table', NAME, true)!
    const column = identifier(flags, 'column', /^[a-z][a-z\d_]*$/, true)!
    if (flags.confirm !== `${table}.${column}`) throw new MetadataInputError('--confirm must name the table and column being removed, as <table>.<column>.')
    const options = scopeOptions(flags)
    const result = await new ColumnWriter(this.instance).removeColumn(table, column, {...options, confirm: {column, table}, updateSet: options.updateSet!,
      ...(flags['acknowledge-data-loss'] === true ? {acknowledgeDataLoss: true} : {}),
      ...(flags['acknowledge-dependent-deletes'] === true ? {acknowledgeDependentDeletes: true} : {})})
    const display = new MetadataDisplayService()
    const safe = display.columnRemoveResult(result)
    if (!this.jsonEnabled()) for (const line of display.columnRemoveSuccess(safe)) this.log(line)
    return safe
  }
}
