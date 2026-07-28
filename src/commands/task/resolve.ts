 
import { Flags } from '@oclif/core'
import { TaskOperations } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { isNilOrEmpty } from '../../common/utils.js'
import { TaskDisplayService } from '../../services/task-display.service.js'

export class Resolve extends AuthenticatedCommand<typeof Resolve> {

  static args = {
  }
static description = 'Resolve a ServiceNow incident with resolution notes.\n\n' +
    'This command resolves an incident identified by its number, setting the resolution notes ' +
    'and optionally a close code. The incident must be in a state that allows resolution.\n\n' +
    'Features:\n' +
    '  - Resolve incidents with resolution notes\n' +
    '  - Optionally specify a close code\n' +
    '  - Auto-resolves incident number to sys_id'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --number INC0010001 --notes "Issue resolved by restarting the service" --auth dev',
      description: 'Resolve an incident with resolution notes',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -n INC0010001 --notes "Fixed" --close-code "Solved (Permanently)" --auth dev',
      description: 'Resolve with a specific close code',
    },
  ]
static flags = {
    'close-code': Flags.string({
      description: 'Close code for the resolution',
      required: false,
    }),
    'notes': Flags.string({
      description: 'Resolution notes',
      required: true,
    }),
    'number': Flags.string({
      char: 'n',
      description: 'Incident number (e.g., INC0010001)',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Resolve)
    const displayService = new TaskDisplayService()

    try {
      const taskOps = new TaskOperations(this.instance)
      const number = flags.number as string
      const notes = flags.notes as string
      const closeCode = flags['close-code']

      this.log(`Looking up incident ${number}...`)
      const record = await taskOps.findByNumber('incident', number)

      if (!record || isNilOrEmpty(record.sys_id)) {
        this.error(`Incident ${number} not found.`)
        return
      }

      this.log(`Resolving incident ${number}...`)
      const result = await taskOps.resolveIncident({
        closeCode,
        resolutionNotes: notes,
        sysId: record.sys_id,
      })

      const lines = displayService.formatTaskResult(result, 'resolve', (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when resolving incident.", error as Error)
      this.error(error as Error)
    }
  }
}
