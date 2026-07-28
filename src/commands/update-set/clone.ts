 
import { Flags } from '@oclif/core'
import { UpdateSetManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { UpdateSetDisplayService } from '../../services/update-set-display.service.js'

export class Clone extends AuthenticatedCommand<typeof Clone> {

  static args = {
  }
static description = 'Clone an update set and its records.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --source us-001 --name "Cloned Set" --auth dev-instance',
      description: 'Clone an update set',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --source us-001 --name "Cloned Set" --json --auth dev-instance',
      description: 'Clone with JSON output',
    },
  ]
static flags = {
    'name': Flags.string({
      char: 'n',
      description: 'Name for the cloned update set',
      required: true,
    }),
    'source': Flags.string({
      char: 's',
      description: 'Source update set sys_id',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Clone)
    const displayService = new UpdateSetDisplayService()

    try {
      const updateSetMgr = new UpdateSetManager(this.instance)

      this.log(`Cloning update set: ${flags.source} as "${flags.name}"`)
      const result: any = await updateSetMgr.cloneUpdateSet(flags.source, flags.name, (progress: any) => {
        this.log(progress)
      })

      const lines = displayService.formatCloneResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when cloning update set.", error as Error)
      this.error(error as Error)
    }
  }
}
