/* eslint-disable perfectionist/sort-objects */

import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowDetails extends AuthenticatedCommand<typeof FlowDetails> {

  static args = {}
  static description = 'Get rich execution details for a flow context.\n\n' +
    'Returns per-action timing, inputs, outputs, and high-level metadata ' +
    '(state, runtime, who ran it, test vs production). This is the primary ' +
    'diagnostic command after flow test or flow run.\n\n' +
    'Uses the ProcessFlow operations API (GET /api/now/processflow/operations/' +
    'flow/context/{id}), the same endpoint Flow Designer uses to display ' +
    'execution details.\n\n' +
    'NOTE: Requires flow operations logging to be enabled on the instance. If ' +
    'the execution report is unavailable, a notice will explain why.\n\n' +
    'Typical workflow:\n' +
    '  flow test \u2192 flow details \u2192 diagnose \u2192 modify flow \u2192 flow test again'
  static examples = [
    {
      description: 'Get execution details after testing a flow',
      command: '<%= config.bin %> <%= command.id %> --context-id d4e5f6789012345678abcdef01234567 --auth dev',
    },
    {
      description: 'Get details with explicit scope',
      command: '<%= config.bin %> <%= command.id %> -c d4e5f6789012345678abcdef01234567 --scope x_myapp --auth dev',
    },
    {
      description: 'Get details with JSON output for scripting',
      command: '<%= config.bin %> <%= command.id %> -c d4e5f6789012345678abcdef01234567 --json --auth dev',
    },
  ]
  static flags = {
    'context-id': Flags.string({
      char: 'c',
      description: 'Flow context sys_id returned by flow test, flow run, flow subflow, or flow action',
      required: true,
    }),
    'scope': Flags.string({
      description: 'Scope sys_id for the ProcessFlow API transaction scope parameter',
      required: false,
    }),
    'include-definition': Flags.boolean({
      char: 'd',
      description: 'Include the full flow definition snapshot in the response',
      required: false,
      default: false,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(FlowDetails);
    const displayService = new FlowDisplayService();

    try {
      // No scope in constructor — getFlowContextDetails uses the ProcessFlow REST API directly
      const flowManager = new FlowManager(this.instance);

      this.log(`Retrieving execution details for context: ${flags['context-id']}`);

      const result = await flowManager.getFlowContextDetails(
        flags['context-id'],
        flags.scope,
        flags['include-definition'],
      );

      const lines = displayService.formatDetailsResult(result, flags.json);
      for (const line of lines) {
        flags.json ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error retrieving flow execution details.", error as Error);
      this.error(error as Error);
    }
  }
}
