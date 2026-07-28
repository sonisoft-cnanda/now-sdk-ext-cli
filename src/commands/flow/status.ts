/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowStatus extends AuthenticatedCommand<typeof FlowStatus> {

  static args = {}
static description = 'Get the status of a flow execution context.\n\n' +
    'Queries sys_flow_context to retrieve the current state of a flow execution.\n\n' +
    'Possible states: QUEUED, IN_PROGRESS, WAITING, COMPLETE, CANCELLED, ERROR';
static examples = [
    {
      description: 'Check flow execution status',
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
    const { flags } = await this.parse(FlowStatus);
    const displayService = new FlowDisplayService();

    try {
      const flowManager = new FlowManager(this.instance, flags.scope);

      this.log(`Checking flow context status: ${flags['context-id']}`);

      const result = await flowManager.getFlowContextStatus(flags['context-id']);

      const lines = displayService.formatStatusResult(result, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error getting flow status.", error as Error);
      this.error(error as Error);
    }
  }
}
