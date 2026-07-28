 
import { Flags } from '@oclif/core'
import { AttachmentManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { AttachmentDisplayService } from '../../services/attachment-display.service.js'

export class List extends AuthenticatedCommand<typeof List> {

  static args = {
  }
static description = 'List attachments on a ServiceNow record.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --table incident --record-id abc123 --auth dev',
      description: 'List attachments on an incident',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -t incident -r abc123 --limit 50 --json --auth dev',
      description: 'List up to 50 attachments as JSON',
    },
  ]
static flags = {
    'limit': Flags.integer({
      default: 20,
      description: 'Maximum number of attachments to return',
      required: false,
    }),
    'record-id': Flags.string({
      char: 'r',
      description: 'Sys ID of the record',
      required: true,
    }),
    'table': Flags.string({
      char: 't',
      description: 'Table name',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(List)
    const displayService = new AttachmentDisplayService()

    try {
      const attachmentMgr = new AttachmentManager(this.instance)
      const table = flags.table as string
      const recordId = flags['record-id'] as string
      const limit = flags.limit as number

      this.log(`Fetching attachments for ${table}/${recordId}...`)
      const attachments = await attachmentMgr.listAttachments({
        limit,
        recordSysId: recordId,
        tableName: table,
      })

      const lines = displayService.formatAttachmentList(attachments, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when listing attachments.", error as Error)
      this.error(error as Error)
    }
  }
}
