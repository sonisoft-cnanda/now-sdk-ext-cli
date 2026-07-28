 
import { Flags } from '@oclif/core'
import { UpdateSetManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { UpdateSetDisplayService } from '../../services/update-set-display.service.js'

export class Current extends AuthenticatedCommand<typeof Current> {

  static args = {
  }
static description = 'Get or set the current update set.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --auth dev-instance',
      description: 'Get the current update set',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --set us-001 --auth dev-instance',
      description: 'Set the current update set by sys_id',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --json --auth dev-instance',
      description: 'Get the current update set as JSON',
    },
  ]
static flags = {
    'set': Flags.string({
      char: 's',
      description: 'sys_id of update set to make current',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Current)
    const displayService = new UpdateSetDisplayService()

    try {
      const updateSetMgr = new UpdateSetManager(this.instance)

      const jsonOutput = flags.json ?? false

      if (flags.set) {
        this.log(`Setting current update set to: ${flags.set}`)
        await updateSetMgr.setCurrentUpdateSet({ name: flags.set, sysId: flags.set })
        this.log('Current update set updated successfully.')
      } else {
        this.log('Fetching current update set...')
        const result: any = await updateSetMgr.getCurrentUpdateSet()

        const lines = displayService.formatCurrentUpdateSet(result, jsonOutput)
        for (const line of lines) {
          jsonOutput ? console.log(line) : this.log(line)
        }
      }
    } catch (error) {
      this._logger.error("Error occurred when getting/setting current update set.", error as Error)
      this.error(error as Error)
    }
  }
}
