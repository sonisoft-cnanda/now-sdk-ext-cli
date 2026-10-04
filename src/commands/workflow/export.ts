 
import { Args, Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'
import { writeFileSync } from 'node:fs'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'

export class Export extends AuthenticatedCommand<typeof Export> {

  static args = {
    workflow: Args.string({ description: 'Workflow name or sys_id, or a version sys_id', required: true }),
  }
static description = 'Export a legacy workflow version as one complete JSON definition. Read-only.\n\n' +
    'Includes the workflow and version properties (trigger condition, stages, inputs), every activity with its type, ' +
    'labelled variable values (defaults marked) and exits, the transitions, the activity types used (described from ' +
    'the instance, including whether they pause the workflow), display names for referenced records, the subflows it ' +
    'calls, and the catalog items and workflows that use it.\n\n' +
    'Exports your checked-out draft when you have one, otherwise the published version; --version chooses. ' +
    'The JSON goes to stdout (or --output). Turn it into an outline or graph with the legacy-workflow skill\'s ' +
    'workflow-graph.sh.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> "Laptop Request" --auth dev > laptop-request.json',
      description: 'Export a workflow',
    },
    {
      command: '<%= config.bin %> <%= command.id %> "Laptop Request" --version published -o laptop.json --auth dev',
      description: 'Export the published version to a file',
    },
  ]
static flags = {
    'output': Flags.string({ char: 'o', description: 'Write the JSON to this file instead of stdout' }),
    'version': Flags.option({
      default: 'current',
      description: 'current: your draft if you have one, else published',
      options: ['current', 'published', 'draft'] as const,
    })(),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Export)
    try {
      const exported = await new WorkflowManager(this.instance).exportWorkflow(args.workflow, { version: flags.version })
      const json = JSON.stringify(exported, null, 2)
      if (flags.output) {
        writeFileSync(flags.output, json + '\n', 'utf8')
        this.log(`Exported '${exported.workflow.name}' version ${exported.version.sysId} `
          + `(${exported.activities.length} activities, ${exported.transitions.length} transitions) to ${flags.output}`)
        return
      }

      console.log(json)
    } catch (error) {
      this._logger.error('Error occurred when exporting workflow.', error as Error)
      this.error(error as Error)
    }
  }
}
