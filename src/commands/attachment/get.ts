 
import { Flags } from '@oclif/core'
import { AttachmentManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { AttachmentDisplayService } from '../../services/attachment-display.service.js'

export class Get extends AuthenticatedCommand<typeof Get> {

  static args = {
  }
static description = 'Get metadata for a specific attachment.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --sys-id att123 --auth dev',
      description: 'Get attachment metadata by sys_id',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -s att123 --json --auth dev',
      description: 'Get attachment metadata as JSON',
    },
  ]
static flags = {
    'sys-id': Flags.string({
      char: 's',
      description: 'Sys ID of the attachment',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Get)
    const displayService = new AttachmentDisplayService()

    try {
      const attachmentMgr = new AttachmentManager(this.instance)
      const sysId = flags['sys-id'] as string

      this.log(`Fetching attachment ${sysId}...`)
      const attachment = await attachmentMgr.getAttachment(sysId)

      const lines = displayService.formatAttachmentDetail(attachment, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when fetching attachment.", error as Error)
      this.error(error as Error)
    }
  }
}
