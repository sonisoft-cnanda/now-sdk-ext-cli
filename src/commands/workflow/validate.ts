 
import { Args, Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { resolveReadableVersion } from '../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../services/workflow-display.service.js'

export class Validate extends AuthenticatedCommand<typeof Validate> {

  static args = {
    workflow: Args.string({ description: 'Workflow name or sys_id (omit when using --version)', required: false }),
  }
static description = 'Run the Workflow Editor\'s validation on a workflow without publishing it.\n\n' +
    'Validates your checked-out draft when you have one, otherwise the published version.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> "Hardware Request" --auth dev',
      description: 'Validate your draft of a workflow',
    },
  ]
static flags = {
    'version': Flags.string({ char: 'v', description: 'Workflow version sys_id' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Validate)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const report = await wm.validateWorkflow(await resolveReadableVersion(wm, args.workflow, flags.version))
      for (const line of new WorkflowDisplayService().formatValidation(report, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when validating workflow.', error as Error)
      this.error(error as Error)
    }
  }
}
