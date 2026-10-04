 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../../common/authenticated-command.js'
import { resolveActivity, resolveDraftVersion } from '../../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../../services/workflow-display.service.js'

export class TransitionAdd extends AuthenticatedCommand<typeof TransitionAdd> {

  static args = {
  }
static description = 'Add a transition between two activities on your checked-out draft of a legacy workflow.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --from "Manager approval" --exit Rejected --to End --auth dev',
      description: 'Send the Rejected exit to End',
    },
  ]
static flags = {
    'exit': Flags.string({ description: 'Exit of --from to leave by (required when it has several)' }),
    'from': Flags.string({ description: 'Source activity (name or sys_id)', required: true }),
    'to': Flags.string({ description: 'Target activity (name or sys_id)', required: true }),
    'version': Flags.string({ char: 'v', description: 'Draft version sys_id' }),
    'workflow': Flags.string({ char: 'w', description: 'Workflow name or sys_id (uses your checked-out draft)' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(TransitionAdd)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const version = await resolveDraftVersion(wm, flags.workflow, flags.version)
      const transition = await wm.addTransition({
        condition: flags.exit,
        from: await resolveActivity(wm, version, flags.from),
        to: await resolveActivity(wm, version, flags.to),
      })
      for (const line of new WorkflowDisplayService().formatChange('Transition added.', { transition }, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when adding transition.', error as Error)
      this.error(error as Error)
    }
  }
}
