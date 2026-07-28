 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { WorkflowDisplayService } from '../../services/workflow-display.service.js'

export class Publish extends AuthenticatedCommand<typeof Publish> {

  static args = {
  }
static description = 'Publish a workflow version.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --version-id wfv-001 --start-activity act-001 --auth dev',
      description: 'Publish a workflow version',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -v wfv-001 -s act-001 --json --auth dev',
      description: 'Publish a workflow version and output as JSON',
    },
  ]
static flags = {
    'start-activity': Flags.string({
      char: 's',
      description: 'Sys ID of the start activity',
      required: true,
    }),
    'version-id': Flags.string({
      char: 'v',
      description: 'Sys ID of the workflow version to publish',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Publish)
    const displayService = new WorkflowDisplayService()

    try {
      const workflowMgr = new WorkflowManager(this.instance)
      const versionId = flags['version-id'] as string
      const startActivity = flags['start-activity'] as string

      this.log(`Publishing workflow version ${versionId}...`)
      await workflowMgr.publishWorkflow({
        startActivitySysId: startActivity,
        versionSysId: versionId,
      })

      const lines = displayService.formatPublishResult((flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when publishing workflow.", error as Error)
      this.error(error as Error)
    }
  }
}
