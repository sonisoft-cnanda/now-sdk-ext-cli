 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../../common/authenticated-command.js'
import { resolveActivity, resolveDraftVersion, resolveExit } from '../../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../../services/workflow-display.service.js'

export class ConditionUpdate extends AuthenticatedCommand<typeof ConditionUpdate> {

  static args = {
  }
static description = 'Change an exit (condition) of an activity on your checked-out draft of a legacy workflow.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --activity "Check stock" --exit Backordered --condition "activity.result == \'backorder\'" --auth dev',
      description: 'Change an exit\'s condition',
    },
  ]
static flags = {
    'activity': Flags.string({ char: 'a', description: 'Activity name or sys_id', required: true }),
    'condition': Flags.string({ char: 'c', description: 'New JavaScript condition' }),
    'exit': Flags.string({ char: 'e', description: 'Exit name or sys_id', required: true }),
    'order': Flags.integer({ description: 'New evaluation order' }),
    'rename': Flags.string({ description: 'New exit name' }),
    'version': Flags.string({ char: 'v', description: 'Draft version sys_id' }),
    'workflow': Flags.string({ char: 'w', description: 'Workflow name or sys_id (uses your checked-out draft)' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ConditionUpdate)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const version = await resolveDraftVersion(wm, flags.workflow, flags.version)
      const activity = await resolveActivity(wm, version, flags.activity)
      const condition = await resolveExit(wm, version, activity, flags.exit)
      await wm.updateCondition(condition, { condition: flags.condition, name: flags.rename, order: flags.order })
      for (const line of new WorkflowDisplayService().formatChange('Exit updated.', { condition }, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when updating exit.', error as Error)
      this.error(error as Error)
    }
  }
}
