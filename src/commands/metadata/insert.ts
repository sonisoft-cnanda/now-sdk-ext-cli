import {MetadataCommand, metadataFlags, metadataWriteFlags} from '../../common/metadata-command.js'

export default class MetadataInsert extends MetadataCommand<typeof MetadataInsert> {
  static description = 'Insert application metadata through a form and verify scope and capture.'
  static examples = ['<%= config.bin %> <%= command.id %> --table sys_script_include --scope x_example_app --fields-file ./fields.json --auth dev']
  static flags = {...metadataFlags, ...metadataWriteFlags}
  protected metadataAction = 'insert' as const
}
