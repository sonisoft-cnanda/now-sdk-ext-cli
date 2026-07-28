/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowOutputs extends AuthenticatedCommand<typeof FlowOutputs> {

  static args = {}
static description = 'Retrieve outputs from a completed flow execution.\n\n' +
    'Gets the output name-value pairs from a flow, subflow, or action execution context.';
static examples = [
    {
      description: 'Get flow outputs',
      command: '<%= config.bin %> <%= command.id %> --context-id abc123def456 --auth dev',
    },
    {
      description: 'Get outputs as JSON',
      command: '<%= config.bin %> <%= command.id %> --context-id abc123def456 --json --auth dev',
    },
  ]
static flags = {
    'context-id': Flags.string({
      char: 'c',
      description: 'Flow execution context sys_id',
      required: true,
    }),
    'scope': Flags.string({
      description: 'Scope context for script execution',
      required: false,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(FlowOutputs);
    const displayService = new FlowDisplayService();

    try {
      const flowManager = new FlowManager(this.instance, flags.scope);

      this.log(`Retrieving flow outputs: ${flags['context-id']}`);

      const result = await flowManager.getFlowOutputs(flags['context-id']);

      const lines = displayService.formatOutputsResult(result, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error getting flow outputs.", error as Error);
      this.error(error as Error);
    }
  }
}
