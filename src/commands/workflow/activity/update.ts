 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../../common/authenticated-command.js'
import { parseInput, parseVariables, resolveActivity, resolveDraftVersion } from '../../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../../services/workflow-display.service.js'

export class ActivityUpdate extends AuthenticatedCommand<typeof ActivityUpdate> {

  static args = {
  }
static description = 'Change an activity on your checked-out draft of a legacy workflow. Variables you do not pass keep their values.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --activity "Wait 1 day" --var duration=172800 --rename "Wait 2 days" --auth dev',
      description: 'Change a timer\'s duration and rename it',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --activity "Notify" --x 400 --y 200 --auth dev',
      description: 'Move an activity on the canvas',
    },
  ]
static flags = {
    'activity': Flags.string({ char: 'a', description: 'Activity name or sys_id', required: true }),
    'input': Flags.string({ description: 'Activity Designer input mapping as a JSON object' }),
    'rename': Flags.string({ description: 'New activity name' }),
    'stage': Flags.string({ description: 'Stage name, value or sys_id ("" clears it)' }),
    'var': Flags.string({ description: 'Variable value as element=value (repeatable)', multiple: true }),
    'vars-file': Flags.string({ description: 'JSON file with variable values keyed by element' }),
    'version': Flags.string({ char: 'v', description: 'Draft version sys_id' }),
    'workflow': Flags.string({ char: 'w', description: 'Workflow name or sys_id (uses your checked-out draft)' }),
    'x': Flags.integer({ description: 'Canvas x position' }),
    'y': Flags.integer({ description: 'Canvas y position' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ActivityUpdate)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const version = await resolveDraftVersion(wm, flags.workflow, flags.version)
      const activity = await resolveActivity(wm, version, flags.activity)
      await wm.updateActivity(activity, {
        input: parseInput(flags.input),
        name: flags.rename,
        stage: flags.stage,
        variables: parseVariables(flags.var, flags['vars-file']) as Parameters<WorkflowManager['updateActivity']>[1]['variables'],
        x: flags.x,
        y: flags.y,
      })
      for (const line of new WorkflowDisplayService().formatChange('Activity updated.', { activity }, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when updating activity.', error as Error)
      this.error(error as Error)
    }
  }
}
