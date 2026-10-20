import {Flags} from '@oclif/core'

import {MetadataCommand, metadataFlags, metadataWriteFlags} from '../../common/metadata-command.js'

export default class MetadataUpdate extends MetadataCommand<typeof MetadataUpdate> {
  static description = 'Update application metadata through a form and verify scope and capture.'
  static examples = ['<%= config.bin %> <%= command.id %> --table sys_script_include --sys-id 0123456789abcdef0123456789abcdef --scope x_example_app --fields-file ./fields.json --auth dev']
  static flags = {...metadataFlags, ...metadataWriteFlags,
    'sys-id': Flags.string({description: 'Exact metadata record sys_id.', required: true})}
  protected metadataAction = 'update' as const
}
