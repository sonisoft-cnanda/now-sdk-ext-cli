import {Flags} from '@oclif/core'
import {type ListLayout, ListLayoutWriter} from '@sonisoft/now-sdk-ext-core'

import {identifier, MetadataBaseCommand, type MetadataFlags} from '../../../common/metadata-command.js'
import {MetadataDisplayService, NAME} from '../../../services/metadata-display.service.js'

export default class MetadataListLayoutGet extends MetadataBaseCommand<typeof MetadataListLayoutGet> {
  static description = `Read a table's list columns for one view, in the order metadata list-layout set takes.

Only the table's own list: not a related list and not a user's personalized list. "exists": false means the table
shows its parent's list.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --table cmn_cost_center --auth dev --read-only',
    '<%= config.bin %> <%= command.id %> --table incident --view ess --auth dev --read-only',
  ]
  static flags = {
    table: Flags.string({description: 'Table name.', required: true}),
    view: Flags.string({description: 'View name. Omit for the Default view.'}),
  }
protected metadataAction = 'list-layout get'
  protected metadataTable = 'sys_ui_list'

  public async run(): Promise<ListLayout> {
    const flags = this.flags as MetadataFlags
    const table = identifier(flags, 'table', NAME, true)!
    const view = identifier(flags, 'view', NAME) ?? ''
    const display = new MetadataDisplayService()
    const layout = display.listLayout(await new ListLayoutWriter(this.instance).getListLayout(table, view))
    if (!this.jsonEnabled()) for (const line of display.listLayoutLines(layout)) this.log(line)
    return layout
  }
}
