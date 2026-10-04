import { Args, Flags } from '@oclif/core'
import {
  analyzeWorkflow, renderWorkflowAnalysis, renderWorkflowMermaid, renderWorkflowNodes, renderWorkflowOutline, WorkflowManager,
} from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { loadWorkflowExport } from '../../common/workflow-args.js'

export class Outline extends AuthenticatedCommand<typeof Outline> {

  static args = {
    workflow: Args.string({ description: 'Workflow name or sys_id, or a version sys_id (or use --file)', required: false }),
  }
static description = 'Show a legacy workflow as a readable outline, a node list, a structural analysis or a Mermaid graph. Read-only.\n\n' +
    'The outline nests the workflow the way it runs: numbered steps in reading order, decisions with a block per exit ' +
    '(short exits as guard clauses), parallel lines closed at their Join, loops (↻), waits ([WAIT]), steps shared by ' +
    'several paths, dead exits and unreachable activities. Settings show only what differs from the defaults.\n\n' +
    '--analysis lists paths, decisions, parallel splits, loops, dead exits, scratchpad and catalog-variable use, ' +
    'scripts and subflows. Works on the instance (exporting the workflow) or offline on a `nex workflow export` file.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> "Laptop Request" --auth dev',
      description: 'Outline a workflow',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --file laptop.json --analysis',
      description: 'Analyse a saved export (no instance needed)',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --file laptop.json --flow-hints',
      description: 'Annotate steps with likely Flow Designer constructs',
    },
  ]
static flags = {
    'all-values': Flags.boolean({ description: 'Include settings left at their defaults' }),
    'analysis': Flags.boolean({ description: 'Structural analysis instead of the outline', exclusive: ['nodes', 'mermaid'] }),
    'file': Flags.string({ char: 'f', description: 'Read a `nex workflow export` JSON file instead of the instance' }),
    'flow-hints': Flags.boolean({ description: 'Annotate steps with the likely Flow Designer construct' }),
    'full-scripts': Flags.boolean({ description: 'Print scripts in full (default: the first 25 lines)' }),
    'mermaid': Flags.boolean({ description: 'A Mermaid flowchart instead of the outline', exclusive: ['analysis', 'nodes'] }),
    'nodes': Flags.boolean({ description: 'Every activity with its exits and where it is reached from', exclusive: ['analysis', 'mermaid'] }),
    'version': Flags.option({
      default: 'current',
      description: 'current: your draft if you have one, else published',
      options: ['current', 'published', 'draft'] as const,
    })(),
  }

  protected needsInstance(): boolean {
    return !this.flags.file && Boolean(this.args.workflow)
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Outline)
    try {
      if ((flags.analysis || flags.mermaid) && (flags['flow-hints'] || flags['all-values'] || flags['full-scripts'])) {
        throw new Error('--flow-hints, --all-values and --full-scripts apply to the outline and --nodes.')
      }

      const data = await loadWorkflowExport(() => new WorkflowManager(this.instance), args.workflow, flags.file, flags.version)
      if (flags.json && flags.analysis) {
        console.log(JSON.stringify(analyzeWorkflow(data), null, 2))
        return
      }

      const options = { allValues: flags['all-values'], flowHints: flags['flow-hints'], fullScripts: flags['full-scripts'] }
      const text = flags.analysis ? renderWorkflowAnalysis(data)
        : flags.nodes ? renderWorkflowNodes(data, options)
          : flags.mermaid ? renderWorkflowMermaid(data)
            : renderWorkflowOutline(data, options)
      if (flags.json) console.log(JSON.stringify({ text }, null, 2))
      else this.log(text)
    } catch (error) {
      this._logger.error('Error occurred when outlining workflow.', error as Error)
      this.error(error as Error)
    }
  }
}
