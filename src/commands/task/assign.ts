 
import { Flags } from '@oclif/core'
import { TaskOperations } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { isNilOrEmpty } from '../../common/utils.js'
import { TaskDisplayService } from '../../services/task-display.service.js'

export class Assign extends AuthenticatedCommand<typeof Assign> {

  static args = {
  }
static description = 'Assign a ServiceNow task to a user or group.\n\n' +
    'This command assigns a task record identified by its number to a specified user and/or group. ' +
    'You can assign to a user, a group, or both simultaneously.\n\n' +
    'Features:\n' +
    '  - Assign tasks to individual users\n' +
    '  - Assign tasks to assignment groups\n' +
    '  - Assign to both user and group at once\n' +
    '  - Supports any task-based table\n' +
    '  - Auto-resolves task number to sys_id'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --number INC0010001 --user admin --auth dev',
      description: 'Assign an incident to a user',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -n INC0010001 -u admin -g "Service Desk" --auth dev',
      description: 'Assign an incident to a user and group',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --number CHG0010001 --table change_request --user admin --auth dev',
      description: 'Assign a change request to a user',
    },
  ]
static flags = {
    'group': Flags.string({
      char: 'g',
      description: 'Assignment group',
      required: false,
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
    'user': Flags.string({
      char: 'u',
      description: 'User to assign the task to',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Assign)
    const displayService = new TaskDisplayService()

    try {
      const taskOps = new TaskOperations(this.instance)
      const table = flags.table as string
      const number = flags.number as string
      const user = flags.user as string
      const {group} = flags

      this.log(`Looking up task ${number} in table '${table}'...`)
      const record = await taskOps.findByNumber(table, number)

      if (!record || isNilOrEmpty(record.sys_id)) {
        this.error(`Task ${number} not found in table '${table}'.`)
        return
      }

      this.log(`Assigning ${number} to user '${user}'${group ? ` in group '${group}'` : ''}...`)
      const result = await taskOps.assignTask({
        assignedTo: user,
        assignmentGroup: group,
        recordSysId: record.sys_id,
        table,
      })

      const lines = displayService.formatTaskResult(result, 'assign', (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when assigning task.", error as Error)
      this.error(error as Error)
    }
  }
}
