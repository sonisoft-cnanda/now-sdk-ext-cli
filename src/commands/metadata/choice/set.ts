import {Flags} from '@oclif/core'
import {ChoiceWriter, type ChoiceWriteResult} from '@sonisoft/now-sdk-ext-core'

import {choiceText, identifier, MetadataBaseCommand, type MetadataFlags, scopeFlags, scopeOptions} from '../../../common/metadata-command.js'
import {LANGUAGE, MetadataDisplayService, NAME} from '../../../services/metadata-display.service.js'

export default class MetadataChoiceSet extends MetadataBaseCommand<typeof MetadataChoiceSet> {
  static description = `Add a choice to a column's choice list, or change the one with that value, through the choice form, and verify it.

With a value the list does not have, --label is required and the choice is added. With one it has, only the options
given that differ are changed: --label, --sequence (the order), --inactive / --no-inactive, --hint. Inactivating
keeps the choice for the records that hold it and hides it from new selections. The list must belong to the
application given (a table with no list yet takes the column's application); a table that only shows the list of a
table it extends is refused: change that table's list. The one Choice list capture, sys_choice_<table>_<column>,
which holds the whole list, is checked to be in --update-set. The set need not be the working set. A list of an
installed Store application needs --acknowledge-upgrade-skip.

Choices show on the form only when the column's dictionary Choice setting is a dropdown or suggestion; the result
says when it is not.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --table x_acme_ticket --column severity --value 4 --label "Severity 4" --sequence 4 --scope x_acme --update-set 0123456789abcdef0123456789abcdef --auth dev',
    '<%= config.bin %> <%= command.id %> --table cmn_cost_center --column u_tier --value gold --inactive --scope global --update-set 0123456789abcdef0123456789abcdef --auth dev',
  ]
  static flags = {
    ...scopeFlags,
    column: Flags.string({description: 'Column name, prefix included (u_ in Global).', required: true}),
    hint: Flags.string({description: 'Hint shown for the choice.'}),
    inactive: Flags.boolean({allowNo: true, description: 'Inactivate (--inactive) or reactivate (--no-inactive) the choice.'}),
    label: Flags.string({description: 'Label. Required to add a choice.'}),
    language: Flags.string({default: 'en', description: 'Choice language (sys_choice.language).'}),
    sequence: Flags.integer({description: 'Position in the list (sys_choice.sequence).', max: 2_147_483_647, min: -2_147_483_647}),
    table: Flags.string({description: 'Table name.', required: true}),
    'update-set': Flags.string({description: 'In progress update set of the list\'s application. The capture follows it.', required: true}),
    value: Flags.string({description: 'The stored value; it identifies the choice in the list. No ^ or javascript:.', required: true}),
  }
  protected metadataAction = 'choice set'
  protected metadataTable = 'sys_choice'

  public async run(): Promise<ChoiceWriteResult> {
    const flags = this.flags as MetadataFlags
    const table = identifier(flags, 'table', NAME, true)!
    const column = identifier(flags, 'column', NAME, true)!
    const language = identifier(flags, 'language', LANGUAGE, true)!
    const value = choiceText(flags, 'value', {max: 4000, query: true, required: true})!
    const label = choiceText(flags, 'label', {max: 100})
    const hint = choiceText(flags, 'hint', {allowEmpty: true, max: 255})
    const sequence = flags.sequence as number | undefined
    const inactive = flags.inactive as boolean | undefined
    const options = scopeOptions(flags)
    const result = await new ChoiceWriter(this.instance).setChoice(table, column, {...options, language, updateSet: options.updateSet!, value,
      ...(label === undefined ? {} : {label}), ...(sequence === undefined ? {} : {sequence}), ...(inactive === undefined ? {} : {inactive}),
      ...(hint === undefined ? {} : {hint})})
    const display = new MetadataDisplayService()
    const safe = display.choiceResult(result)
    if (!this.jsonEnabled()) for (const line of display.choiceSuccess(safe)) this.log(line)
    return safe
  }
}
