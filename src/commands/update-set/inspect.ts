 
import { Flags } from '@oclif/core'
import { UpdateSetManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { UpdateSetDisplayService } from '../../services/update-set-display.service.js'

export class Inspect extends AuthenticatedCommand<typeof Inspect> {

  static args = {
  }
static description = 'Inspect the components of an update set.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --sys-id us-001 --auth dev-instance',
      description: 'Inspect an update set by sys_id',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --sys-id us-001 --json --auth dev-instance',
      description: 'Inspect with JSON output',
    },
  ]
static flags = {
    'sys-id': Flags.string({
      char: 's',
      description: 'sys_id of the update set to inspect',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Inspect)
    const displayService = new UpdateSetDisplayService()

    try {
      const updateSetMgr = new UpdateSetManager(this.instance)

      this.log(`Inspecting update set: ${flags['sys-id']}`)
      const result: any = await updateSetMgr.inspectUpdateSet(flags['sys-id'])

      const lines = displayService.formatInspection(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when inspecting update set.", error as Error)
      this.error(error as Error)
    }
  }
}
