 
import { Flags } from '@oclif/core'
import { TaskOperations } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { isNilOrEmpty } from '../../common/utils.js'
import { TaskDisplayService } from '../../services/task-display.service.js'

export class Approve extends AuthenticatedCommand<typeof Approve> {

  static args = {
  }
static description = 'Approve a ServiceNow change request.\n\n' +
    'This command approves a change request identified by its number. ' +
    'You can optionally provide approval comments.\n\n' +
    'Features:\n' +
    '  - Approve change requests\n' +
    '  - Optionally add approval comments\n' +
    '  - Auto-resolves change request number to sys_id'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --number CHG0010001 --auth dev',
      description: 'Approve a change request',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -n CHG0010001 -c "Looks good, approved" --auth dev',
      description: 'Approve a change request with comments',
    },
  ]
static flags = {
    'comments': Flags.string({
      char: 'c',
      description: 'Approval comments',
      required: false,
    }),
    'number': Flags.string({
      char: 'n',
      description: 'Change request number (e.g., CHG0010001)',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Approve)
    const displayService = new TaskDisplayService()

    try {
      const taskOps = new TaskOperations(this.instance)
      const number = flags.number as string
      const {comments} = flags

      this.log(`Looking up change request ${number}...`)
      const record = await taskOps.findByNumber('change_request', number)

      if (!record || isNilOrEmpty(record.sys_id)) {
        this.error(`Change request ${number} not found.`)
        return
      }

      this.log(`Approving change request ${number}...`)
      const result = await taskOps.approveChange({
        comments,
        sysId: record.sys_id,
      })

      const lines = displayService.formatTaskResult(result, 'approve', (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when approving change request.", error as Error)
      this.error(error as Error)
    }
  }
}
