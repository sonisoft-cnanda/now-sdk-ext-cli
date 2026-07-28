/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowMessage extends AuthenticatedCommand<typeof FlowMessage> {

  static args = {}
static description = 'Send a message to a paused flow execution.\n\n' +
    'Sends a message to a flow context that is in a WAITING state ' +
    '(e.g. waiting on a "Wait for Message" action). Supports an optional JSON payload.';
static examples = [
    {
      description: 'Send a message to resume a waiting flow',
      command: '<%= config.bin %> <%= command.id %> --context-id abc123def456 --message "approved" --auth dev',
    },
    {
      description: 'Send a message with a JSON payload',
      command: '<%= config.bin %> <%= command.id %> --context-id abc123def456 --message "data_ready" --payload \'{"status":"ok"}\' --auth dev',
    },
  ]
static flags = {
    'context-id': Flags.string({
      char: 'c',
      description: 'Flow execution context sys_id',
      required: true,
    }),
    'message': Flags.string({
      char: 'm',
      description: 'Message to send to the flow',
      required: true,
    }),
    'payload': Flags.string({
      char: 'p',
      description: 'Optional JSON payload to include with the message',
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
    const { flags } = await this.parse(FlowMessage);
    const displayService = new FlowDisplayService();

    try {
      const flowManager = new FlowManager(this.instance, flags.scope);

      this.log(`Sending message to flow context: ${flags['context-id']}`);

      const result = await flowManager.sendFlowMessage(
        flags['context-id'],
        flags.message,
        flags.payload,
      );

      const lines = displayService.formatMessageResult(result, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error sending flow message.", error as Error);
      this.error(error as Error);
    }
  }
}
