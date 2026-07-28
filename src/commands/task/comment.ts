 
import { Flags } from '@oclif/core'
import { TaskOperations } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { isNilOrEmpty } from '../../common/utils.js'
import { TaskDisplayService } from '../../services/task-display.service.js'

export class Comment extends AuthenticatedCommand<typeof Comment> {

  static args = {
  }
static description = 'Add a comment or work note to a ServiceNow task.\n\n' +
    'This command adds a comment or work note to a task record identified by its number. ' +
    'By default, comments are added as customer-visible comments. Use the --work-note flag ' +
    'to add an internal work note instead.\n\n' +
    'Features:\n' +
    '  - Add customer-visible comments to any task\n' +
    '  - Add internal work notes visible only to fulfiller teams\n' +
    '  - Supports any task-based table (incident, change_request, etc.)\n' +
    '  - Auto-resolves task number to sys_id'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --number INC0010001 --comment "Investigating the issue" --auth dev',
      description: 'Add a comment to an incident',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -n INC0010001 -c "Internal update" --work-note --auth dev',
      description: 'Add a work note to an incident',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --number CHG0010001 --table change_request --comment "Approved" --auth dev',
      description: 'Add a comment to a change request',
    },
  ]
static flags = {
    'comment': Flags.string({
      char: 'c',
      description: 'Comment text to add',
      required: true,
    }),
    'number': Flags.string({
      char: 'n',
      description: 'Task number (e.g., INC0010001)',
      required: true,
    }),
    'table': Flags.string({
      default: 'task',
      description: 'ServiceNow table name',
      required: false,
    }),
    'work-note': Flags.boolean({
      default: false,
      description: 'Add as work note instead of comment',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Comment)
    const displayService = new TaskDisplayService()

    try {
      const taskOps = new TaskOperations(this.instance)
      const table = flags.table as string
      const number = flags.number as string
      const comment = flags.comment as string
      const isWorkNote = flags['work-note']

      this.log(`Looking up task ${number} in table '${table}'...`)
      const record = await taskOps.findByNumber(table, number)

      if (!record || isNilOrEmpty(record.sys_id)) {
        this.error(`Task ${number} not found in table '${table}'.`)
        return
      }

      this.log(`Adding ${isWorkNote ? 'work note' : 'comment'} to ${number}...`)
      const result = await taskOps.addComment({
        comment,
        isWorkNote,
        recordSysId: record.sys_id,
        table,
      })

      const lines = displayService.formatTaskResult(result, 'comment', (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when adding comment to task.", error as Error)
      this.error(error as Error)
    }
  }
}
