import {Flags} from '@oclif/core'
import {type ChoiceList, ChoiceWriter} from '@sonisoft/now-sdk-ext-core'

import {identifier, MetadataBaseCommand, type MetadataFlags} from '../../../common/metadata-command.js'
import {LANGUAGE, MetadataDisplayService, NAME} from '../../../services/metadata-display.service.js'

export default class MetadataChoiceGet extends MetadataBaseCommand<typeof MetadataChoiceGet> {
  static description = `Read a column's choice list in one language, in list order, with the column's dictionary Choice setting.

"choiceSet" is the list's application file (sys_choice_set): its scope is the application to change the list in. A
table without one shows the list of the table that defines the column. Choices show on the form only when the
column's Choice setting is a dropdown or suggestion.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --table incident --column state --auth dev --read-only',
    '<%= config.bin %> <%= command.id %> --table x_acme_ticket --column severity --language fr --auth dev --read-only --json',
  ]
  static flags = {
    column: Flags.string({description: 'Column name, prefix included (u_ in Global).', required: true}),
    language: Flags.string({default: 'en', description: 'Choice language (sys_choice.language).'}),
    table: Flags.string({description: 'Table name.', required: true}),
  }
  protected metadataAction = 'choice get'
  protected metadataTable = 'sys_choice'

  public async run(): Promise<ChoiceList> {
    const flags = this.flags as MetadataFlags
    const table = identifier(flags, 'table', NAME, true)!
    const column = identifier(flags, 'column', NAME, true)!
    const language = identifier(flags, 'language', LANGUAGE, true)!
    const display = new MetadataDisplayService()
    const list = display.choiceList(await new ChoiceWriter(this.instance).getChoices(table, column, {language}))
    if (!this.jsonEnabled()) for (const line of display.choiceListLines(list)) this.log(line)
    return list
  }
}
