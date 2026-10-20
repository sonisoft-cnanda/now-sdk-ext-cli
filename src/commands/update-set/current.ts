 
import { Flags } from '@oclif/core'
import { UpdateSetManager, WorkingSetError, WorkingSetManager } from '@sonisoft/now-sdk-ext-core'

import { WorkingSetCommand } from '../../common/working-set-command.js'
import { UpdateSetDisplayService } from '../../services/update-set-display.service.js'
import { WorkingSetDisplayService } from '../../services/working-set-display.service.js'

export class Current extends WorkingSetCommand<typeof Current> {

  static args = {
  }
static description = `Get or set the current update set.

--set makes the set your working set for every later session: it also makes the set's application current
(apps.current_app), which a set of another application needs to stick. The previous working set is printed;
put it back with nex update-set restore.`
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
      description: 'sys_id of an In progress update set to make the working set',
      required: false,
    }),
  }
protected workingSetAction = 'current --set'

  async run(): Promise<void> {
    const { flags } = await this.parse(Current)
    const displayService = new UpdateSetDisplayService()

    try {
      const updateSetMgr = new UpdateSetManager(this.instance)

      const jsonOutput = flags.json ?? false

      if (flags.set) {
        // The picker call alone is undone by the next session for a set of another application.
        const result = await new WorkingSetManager(this.instance).useUpdateSet(flags.set, { allowDefault: true })
        if (jsonOutput) {
          console.log(JSON.stringify({ current: result.current, previous: result.previous }, null, 2))
        } else {
          for (const line of new WorkingSetDisplayService().used({ ...result, updateSet: new WorkingSetDisplayService().summary(result.updateSet) })) this.log(line)
        }
      } else {
        if (!jsonOutput) this.log('Fetching current update set...')
        const result: any = await updateSetMgr.getCurrentUpdateSet()

        const lines = displayService.formatCurrentUpdateSet(result, jsonOutput)
        for (const line of lines) {
          jsonOutput ? console.log(line) : this.log(line)
        }
      }
    } catch (error) {
      // A refused or unverified switch renders its code, detail and restore pair.
      if (error instanceof WorkingSetError) throw error
      this._logger.error("Error occurred when getting/setting current update set.", error as Error)
      this.error(error as Error)
    }
  }
}
