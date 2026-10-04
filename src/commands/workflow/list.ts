 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { WorkflowDisplayService } from '../../services/workflow-display.service.js'

export class List extends AuthenticatedCommand<typeof List> {

  static args = {
  }
static description = 'List legacy workflows with the state of their published and checked-out versions.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --name "Hardware" --auth dev',
      description: 'List workflows whose name contains "Hardware"',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --table sc_req_item --json --auth dev',
      description: 'List catalog item workflows as JSON',
    },
  ]
static flags = {
    'limit': Flags.integer({ default: 50, description: 'Maximum number of workflows to list' }),
    'name': Flags.string({ char: 'n', description: 'Name contains this text' }),
    'query': Flags.string({ char: 'q', description: 'Additional encoded query on wf_workflow' }),
    'table': Flags.string({ char: 't', description: 'Workflow table (e.g. incident, sc_req_item)' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(List)
    const json = flags.json ?? false
    try {
      const workflows = await new WorkflowManager(this.instance).findWorkflows({
        limit: flags.limit, name: flags.name, query: flags.query, table: flags.table,
      })
      for (const line of new WorkflowDisplayService().formatWorkflowList(workflows, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when listing workflows.', error as Error)
      this.error(error as Error)
    }
  }
}
