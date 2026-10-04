 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../../common/authenticated-command.js'
import { resolveActivity, resolveDraftVersion } from '../../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../../services/workflow-display.service.js'

export class ConditionAdd extends AuthenticatedCommand<typeof ConditionAdd> {

  static args = {
  }
static description = 'Add an exit (condition) to an activity on your checked-out draft of a legacy workflow.\n\n' +
    'An exit is a JavaScript condition evaluated when the activity finishes, usually against activity.result ' +
    '(core activities) or activityOutput.<name> (Activity Designer activities). Connect it with "workflow transition add".'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --activity "Check stock" --name Backordered --condition "activity.result == \'backordered\'" --auth dev',
      description: 'Add a custom exit that a Run Script activity can take by setting activity.result',
    },
  ]
static flags = {
    'activity': Flags.string({ char: 'a', description: 'Activity name or sys_id', required: true }),
    'condition': Flags.string({ char: 'c', description: 'JavaScript condition, e.g. activity.result == \'skipped\'', required: true }),
    'else': Flags.boolean({ default: false, description: 'Taken when no other exit matches' }),
    'error': Flags.boolean({ default: false, description: 'Taken when the activity faults' }),
    'name': Flags.string({ char: 'n', description: 'Exit name', required: true }),
    'order': Flags.integer({ description: 'Evaluation order' }),
    'version': Flags.string({ char: 'v', description: 'Draft version sys_id' }),
    'workflow': Flags.string({ char: 'w', description: 'Workflow name or sys_id (uses your checked-out draft)' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ConditionAdd)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const version = await resolveDraftVersion(wm, flags.workflow, flags.version)
      const condition = await wm.addCondition({
        activity: await resolveActivity(wm, version, flags.activity),
        condition: flags.condition,
        elseFlag: flags.else || undefined,
        error: flags.error || undefined,
        name: flags.name,
        order: flags.order,
      })
      for (const line of new WorkflowDisplayService().formatChange(`Exit '${flags.name}' added.`, { condition }, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when adding exit.', error as Error)
      this.error(error as Error)
    }
  }
}
