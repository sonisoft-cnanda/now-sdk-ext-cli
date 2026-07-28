 
import { Flags } from '@oclif/core'
import { TaskOperations } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { isNilOrEmpty } from '../../common/utils.js'
import { TaskDisplayService } from '../../services/task-display.service.js'

export class Find extends AuthenticatedCommand<typeof Find> {

  static args = {
  }
static description = 'Find a ServiceNow task by its number.\n\n' +
    'This command looks up a task record by its number in the specified table. ' +
    'Returns the full task details including sys_id, description, state, and assignment information.\n\n' +
    'Features:\n' +
    '  - Look up any task by number\n' +
    '  - Supports any task-based table\n' +
    '  - JSON output for scripting and automation'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --number INC0010001 --auth dev',
      description: 'Find an incident by number',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -n CHG0010001 --table change_request --auth dev',
      description: 'Find a change request by number',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -n INC0010001 --json --auth dev',
      description: 'Find an incident and output as JSON',
    },
  ]
static flags = {
    'number': Flags.string({
      char: 'n',
      description: 'Task number (e.g., INC0010001, CHG0010001)',
      required: true,
    }),
    'table': Flags.string({
      default: 'task',
      description: 'ServiceNow table name',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Find)
    const displayService = new TaskDisplayService()

    try {
      const taskOps = new TaskOperations(this.instance)
      const table = flags.table as string
      const number = flags.number as string

      this.log(`Looking up task ${number} in table '${table}'...`)
      const result = await taskOps.findByNumber(table, number)

      if (!result || isNilOrEmpty(result.sys_id)) {
        this.error(`Task ${number} not found in table '${table}'.`)
        return
      }

      const lines = displayService.formatFindResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when finding task.", error as Error)
      this.error(error as Error)
    }
  }
}
