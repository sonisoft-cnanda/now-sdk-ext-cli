import {Flags} from '@oclif/core'
import {type FormLayout, FormLayoutWriter} from '@sonisoft/now-sdk-ext-core'

import {identifier, MetadataBaseCommand, type MetadataFlags} from '../../../common/metadata-command.js'
import {ID, MetadataDisplayService} from '../../../services/metadata-display.service.js'

export default class MetadataLayoutGet extends MetadataBaseCommand<typeof MetadataLayoutGet> {
  static description = 'Read one form section layout in the Form Layout page notation that metadata layout set takes.'
  static examples = ['<%= config.bin %> <%= command.id %> --section 0123456789abcdef0123456789abcdef --auth dev --read-only']
  static flags = {
    section: Flags.string({description: 'sys_ui_section sys_id.', required: true}),
  }
protected metadataAction = 'layout get'
  protected metadataTable = 'sys_ui_section'

  public async run(): Promise<FormLayout> {
    const section = identifier(this.flags as MetadataFlags, 'section', ID, true)!
    const display = new MetadataDisplayService()
    const layout = display.layout(await new FormLayoutWriter(this.instance).getFormLayout(section))
    if (!this.jsonEnabled()) for (const line of display.layoutLines(layout)) this.log(line)
    return layout
  }
}
