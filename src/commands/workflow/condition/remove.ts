 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../../common/authenticated-command.js'
import { resolveActivity, resolveDraftVersion, resolveExit } from '../../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../../services/workflow-display.service.js'

export class ConditionRemove extends AuthenticatedCommand<typeof ConditionRemove> {

  static args = {
  }
static description = 'Remove an exit (condition), and the transitions leaving from it, from an activity on your checked-out draft.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --activity "Manager approval" --exit Skipped --auth dev',
      description: 'Remove an approval\'s Skipped exit',
    },
  ]
static flags = {
    'activity': Flags.string({ char: 'a', description: 'Activity name or sys_id', required: true }),
    'exit': Flags.string({ char: 'e', description: 'Exit name or sys_id', required: true }),
    'version': Flags.string({ char: 'v', description: 'Draft version sys_id' }),
    'workflow': Flags.string({ char: 'w', description: 'Workflow name or sys_id (uses your checked-out draft)' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ConditionRemove)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const version = await resolveDraftVersion(wm, flags.workflow, flags.version)
      const activity = await resolveActivity(wm, version, flags.activity)
      const condition = await resolveExit(wm, version, activity, flags.exit)
      await wm.removeCondition(condition)
      for (const line of new WorkflowDisplayService().formatChange('Exit removed.', { condition }, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when removing exit.', error as Error)
      this.error(error as Error)
    }
  }
}
