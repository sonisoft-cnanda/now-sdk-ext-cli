 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'
import { readFileSync } from 'node:fs'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { WorkflowDisplayService } from '../../services/workflow-display.service.js'

export class Create extends AuthenticatedCommand<typeof Create> {

  static args = {
  }
static description = 'Create a complete workflow from a JSON specification file.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --spec ./workflow.json --auth dev',
      description: 'Create a workflow from a JSON spec file',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -s ./workflow.json --json --auth dev',
      description: 'Create a workflow and output result as JSON',
    },
  ]
static flags = {
    'spec': Flags.string({
      char: 's',
      description: 'Path to workflow JSON specification file',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Create)
    const displayService = new WorkflowDisplayService()

    try {
      const workflowMgr = new WorkflowManager(this.instance)
      const specPath = flags.spec as string

      this.log(`Reading workflow specification from ${specPath}...`)
      const specContent = readFileSync(specPath, 'utf-8')
      const spec = JSON.parse(specContent)

      this.log('Creating workflow...')
      const result = await workflowMgr.createCompleteWorkflow(spec, (progress: string) => {
        this.log(progress)
      })

      const lines = displayService.formatWorkflowResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when creating workflow.", error as Error)
      this.error(error as Error)
    }
  }
}
