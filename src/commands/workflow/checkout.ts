 
import { Args, Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { WorkflowDisplayService } from '../../services/workflow-display.service.js'

export class Checkout extends AuthenticatedCommand<typeof Checkout> {

  static args = {
    workflow: Args.string({ description: 'Workflow name or sys_id', required: true }),
  }
static description = 'Check out a legacy workflow for editing. Like the Workflow Editor, this creates a draft version — ' +
    'a full copy of the published one — checked out to you. If you already have a draft, it is reused.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> "Laptop Request" --auth dev',
      description: 'Check out a workflow',
    },
    {
      command: '<%= config.bin %> <%= command.id %> "Laptop Request" --force --auth dev',
      description: 'Take over a checkout held by another user',
    },
  ]
static flags = {
    'force': Flags.boolean({ default: false, description: 'Take over a checkout held by another user' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Checkout)
    const json = flags.json ?? false
    try {
      const result = await new WorkflowManager(this.instance).checkout(args.workflow, { force: flags.force })
      for (const line of new WorkflowDisplayService().formatCheckout(result, args.workflow, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when checking out workflow.', error as Error)
      this.error(error as Error)
    }
  }
}
