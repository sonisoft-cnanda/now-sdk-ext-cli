import {Flags} from '@oclif/core'
import {ChoiceWriter, type ChoiceWriteResult} from '@sonisoft/now-sdk-ext-core'

import {choiceText, identifier, MetadataBaseCommand, type MetadataFlags, scopeFlags, scopeOptions} from '../../../common/metadata-command.js'
import {LANGUAGE, MetadataDisplayService, NAME} from '../../../services/metadata-display.service.js'

export default class MetadataChoiceRemove extends MetadataBaseCommand<typeof MetadataChoiceRemove> {
  static description = `Remove a choice from a column's choice list through the choice form, and verify it.

The records holding the value are counted first. While any do, the removal is refused unless --confirm-in-use is
given: those records keep the value, which then has no choice in the list. Inactivating it instead (nex metadata
choice set --inactive) keeps its label and hides it from new selections. The one Choice list capture,
sys_choice_<table>_<column>, is checked to be in --update-set and no longer to hold the choice. Removing the last
choice keeps the list's choice set.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --table x_acme_ticket --column severity --value 4 --scope x_acme --update-set 0123456789abcdef0123456789abcdef --auth dev',
  ]
  static flags = {
    ...scopeFlags,
    column: Flags.string({description: 'Column name, prefix included (u_ in Global).', required: true}),
    'confirm-in-use': Flags.boolean({description: 'Remove the choice even though records hold its value.'}),
    language: Flags.string({default: 'en', description: 'Choice language (sys_choice.language).'}),
    table: Flags.string({description: 'Table name.', required: true}),
    'update-set': Flags.string({description: 'In progress update set of the list\'s application. The capture follows it.', required: true}),
    value: Flags.string({description: 'The stored value of the choice to remove.', required: true}),
  }
  protected metadataAction = 'choice remove'
  protected metadataTable = 'sys_choice'

  public async run(): Promise<ChoiceWriteResult> {
    const flags = this.flags as MetadataFlags
    const table = identifier(flags, 'table', NAME, true)!
    const column = identifier(flags, 'column', NAME, true)!
    const language = identifier(flags, 'language', LANGUAGE, true)!
    const value = choiceText(flags, 'value', {max: 4000, query: true, required: true})!
    const options = scopeOptions(flags)
    const result = await new ChoiceWriter(this.instance).removeChoice(table, column, {...options, language, updateSet: options.updateSet!, value,
      ...(flags['confirm-in-use'] === true ? {confirmInUse: true} : {})})
    const display = new MetadataDisplayService()
    const safe = display.choiceResult(result)
    if (!this.jsonEnabled()) for (const line of display.choiceSuccess(safe)) this.log(line)
    return safe
  }
}
