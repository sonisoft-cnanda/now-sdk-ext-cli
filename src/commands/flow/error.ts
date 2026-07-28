/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowError extends AuthenticatedCommand<typeof FlowError> {

  static args = {}
static description = 'Retrieve error details from a failed flow execution.\n\n' +
    'Gets the error message from a flow context that ended in an error state.';
static examples = [
    {
      description: 'Get flow error details',
      command: '<%= config.bin %> <%= command.id %> --context-id abc123def456 --auth dev',
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
    const { flags } = await this.parse(FlowError);
    const displayService = new FlowDisplayService();

    try {
      const flowManager = new FlowManager(this.instance, flags.scope);

      this.log(`Retrieving flow error: ${flags['context-id']}`);

      const result = await flowManager.getFlowError(flags['context-id']);

      const lines = displayService.formatErrorResult(result, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error getting flow error details.", error as Error);
      this.error(error as Error);
    }
  }
}
