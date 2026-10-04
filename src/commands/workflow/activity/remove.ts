 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../../common/authenticated-command.js'
import { resolveActivity, resolveDraftVersion } from '../../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../../services/workflow-display.service.js'

export class ActivityRemove extends AuthenticatedCommand<typeof ActivityRemove> {

  static args = {
  }
static description = 'Remove an activity, with its exits and variables, from your checked-out draft of a legacy workflow.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --activity "Wait 1 day" --reconnect --auth dev',
      description: 'Remove an activity and join the line it sat on',
    },
  ]
static flags = {
    'activity': Flags.string({ char: 'a', description: 'Activity name or sys_id', required: true }),
    'reconnect': Flags.boolean({
      default: false,
      description: 'Join its single incoming and outgoing transitions so the flow stays connected',
    }),
    'version': Flags.string({ char: 'v', description: 'Draft version sys_id' }),
    'workflow': Flags.string({ char: 'w', description: 'Workflow name or sys_id (uses your checked-out draft)' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ActivityRemove)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const version = await resolveDraftVersion(wm, flags.workflow, flags.version)
      const activity = await resolveActivity(wm, version, flags.activity)
      await wm.removeActivity(activity, { reconnect: flags.reconnect })
      for (const line of new WorkflowDisplayService().formatChange('Activity removed.', { activity }, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when removing activity.', error as Error)
      this.error(error as Error)
    }
  }
}
