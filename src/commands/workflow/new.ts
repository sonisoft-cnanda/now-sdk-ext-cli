 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { WorkflowDisplayService } from '../../services/workflow-display.service.js'

export class New extends AuthenticatedCommand<typeof New> {

  static args = {
  }
static description = 'Create a legacy workflow the way the Workflow Editor does: Begin and End joined by a transition, ' +
    'checked out to you for editing.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --name "Laptop Request" --table sc_req_item --auth dev',
      description: 'Create a catalog item workflow',
    },
  ]
static flags = {
    'condition': Flags.string({ description: 'Trigger condition (encoded query)' }),
    'condition-type': Flags.string({ description: 'Trigger condition type (e.g. run_match)' }),
    'description': Flags.string({ char: 'd', description: 'Workflow description' }),
    'name': Flags.string({ char: 'n', description: 'Workflow name (must be unique)', required: true }),
    'table': Flags.string({ char: 't', description: 'Table the workflow runs on', required: true }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(New)
    const json = flags.json ?? false
    try {
      const result = await new WorkflowManager(this.instance).newWorkflow({
        condition: flags.condition,
        conditionType: flags['condition-type'],
        description: flags.description,
        name: flags.name,
        table: flags.table,
      })
      for (const line of new WorkflowDisplayService().formatNewWorkflow(result, flags.name, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when creating workflow.', error as Error)
      this.error(error as Error)
    }
  }
}
