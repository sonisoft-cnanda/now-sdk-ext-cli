import {Flags} from '@oclif/core'

import {MetadataCommand, metadataFlags} from '../../common/metadata-command.js'

export default class MetadataDelete extends MetadataCommand<typeof MetadataDelete> {
  static description = 'Delete one confirmed metadata record and verify absence and deletion capture.'
  static examples = ['<%= config.bin %> <%= command.id %> --table sys_script_include --sys-id 0123456789abcdef0123456789abcdef --scope x_example_app --confirm-table sys_script_include --confirm-sys-id 0123456789abcdef0123456789abcdef --auth dev']
  static flags = {...metadataFlags,
    'confirm-sys-id': Flags.string({description: 'Repeat the exact target sys_id.', required: true}),
    'confirm-table': Flags.string({description: 'Repeat the exact target table.', required: true}),
    'sys-id': Flags.string({description: 'Exact metadata record sys_id.', required: true})}
  protected metadataAction = 'delete' as const
}
