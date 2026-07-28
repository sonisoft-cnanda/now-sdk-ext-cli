/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowCancel extends AuthenticatedCommand<typeof FlowCancel> {

  static args = {}
static description = 'Cancel a running or paused flow execution.\n\n' +
    'Cancels a flow context that is in QUEUED, IN_PROGRESS, or WAITING state.';
static examples = [
    {
      description: 'Cancel a running flow',
      command: '<%= config.bin %> <%= command.id %> --context-id abc123def456 --auth dev',
    },
    {
      description: 'Cancel with a reason',
      command: '<%= config.bin %> <%= command.id %> --context-id abc123def456 --reason "No longer needed" --auth dev',
    },
  ]
static flags = {
    'context-id': Flags.string({
      char: 'c',
      description: 'Flow execution context sys_id',
      required: true,
    }),
    'reason': Flags.string({
      char: 'r',
      description: 'Cancellation reason',
      required: false,
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
    const { flags } = await this.parse(FlowCancel);
    const displayService = new FlowDisplayService();

    try {
      const flowManager = new FlowManager(this.instance, flags.scope);

      this.log(`Cancelling flow context: ${flags['context-id']}`);

      const result = await flowManager.cancelFlow(flags['context-id'], flags.reason);

      const lines = displayService.formatCancelResult(result, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error cancelling flow.", error as Error);
      this.error(error as Error);
    }
  }
}
