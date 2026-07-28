 
import { Flags } from '@oclif/core'
import { UpdateSetManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { UpdateSetDisplayService } from '../../services/update-set-display.service.js'

export class UpdateSet extends AuthenticatedCommand<typeof UpdateSet> {

  static args = {
  }
static description = 'List update sets on a ServiceNow instance.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --auth dev-instance',
      description: 'List update sets with default limit',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --query "state=in progress" --limit 50 --auth dev-instance',
      description: 'List update sets with a custom query filter',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --json --auth dev-instance',
      description: 'List update sets with JSON output',
    },
  ]
static flags = {
    'limit': Flags.integer({
      default: 20,
      description: 'Maximum number of update sets to return',
      required: false,
    }),
    'query': Flags.string({
      char: 'q',
      description: 'Encoded query filter',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(UpdateSet)
    const displayService = new UpdateSetDisplayService()

    try {
      const updateSetMgr = new UpdateSetManager(this.instance)

      this.log('Fetching update sets...')
      const results: any = await updateSetMgr.listUpdateSets({
        encodedQuery: flags.query,
        limit: flags.limit,
      })

      const sets = Array.isArray(results) ? results : []
      const lines = displayService.formatUpdateSetList(sets, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when listing update sets.", error as Error)
      this.error(error as Error)
    }
  }
}
