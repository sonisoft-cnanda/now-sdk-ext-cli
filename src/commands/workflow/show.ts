 
import { Args, Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { resolveReadableVersion } from '../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../services/workflow-display.service.js'

export class Show extends AuthenticatedCommand<typeof Show> {

  static args = {
    workflow: Args.string({ description: 'Workflow name or sys_id (omit when using --version)', required: false }),
  }
static description = 'Show a legacy workflow: its activities with their exits and variable values, and its transitions.\n\n' +
    'Shows your checked-out draft when you have one, otherwise the published version. Use --version for any other version.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> "Hardware Request" --auth dev',
      description: 'Show a workflow',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --version <version_sys_id> --no-vars --auth dev',
      description: 'Show a specific version without variable values',
    },
  ]
static flags = {
    'vars': Flags.boolean({ allowNo: true, default: true, description: 'Include activity variable values' }),
    'version': Flags.string({ char: 'v', description: 'Workflow version sys_id' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Show)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const version = await resolveReadableVersion(wm, args.workflow, flags.version)
      const definition = await wm.getWorkflowDefinition(version, { includeVariables: flags.vars })
      for (const line of new WorkflowDisplayService().formatDefinition(definition, json, flags.vars)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when showing workflow.', error as Error)
      this.error(error as Error)
    }
  }
}
