 
import { Flags } from '@oclif/core'
import { AttachmentManager } from '@sonisoft/now-sdk-ext-core'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { AttachmentDisplayService } from '../../services/attachment-display.service.js'

export class Upload extends AuthenticatedCommand<typeof Upload> {

  static args = {
  }
static description = 'Upload a file as an attachment to a ServiceNow record.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --table incident --record-id abc123 --file ./report.pdf --auth dev',
      description: 'Upload a PDF to an incident record',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -t incident -r abc123 -f ./data.csv --content-type text/csv --auth dev',
      description: 'Upload a CSV with explicit content type',
    },
  ]
static flags = {
    'content-type': Flags.string({
      description: 'MIME content type of the file',
      required: false,
    }),
    'file': Flags.string({
      char: 'f',
      description: 'Path to the file to upload',
      required: true,
    }),
    'record-id': Flags.string({
      char: 'r',
      description: 'Sys ID of the target record',
      required: true,
    }),
    'table': Flags.string({
      char: 't',
      description: 'Target table name',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Upload)
    const displayService = new AttachmentDisplayService()

    try {
      const attachmentMgr = new AttachmentManager(this.instance)
      const table = flags.table as string
      const recordId = flags['record-id'] as string
      const file = flags.file as string
      const contentType = flags['content-type']

      this.log(`Reading file ${file}...`)
      const fileData = readFileSync(file)

      this.log(`Uploading ${path.basename(file)} to ${table}/${recordId}...`)
      const result = await attachmentMgr.uploadAttachment({
        contentType: contentType || 'application/octet-stream',
        data: fileData,
        fileName: path.basename(file),
        recordSysId: recordId,
        tableName: table,
      })

      const lines = displayService.formatUploadResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when uploading attachment.", error as Error)
      this.error(error as Error)
    }
  }
}
