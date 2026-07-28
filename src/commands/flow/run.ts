/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowRun extends AuthenticatedCommand<typeof FlowRun> {

  static args = {}
static description = 'Execute a published Flow Designer flow by scoped name.\n\n' +
    'Runs a flow using the sn_fd.FlowAPI ScriptableFlowRunner. ' +
    'Supports foreground (synchronous) and background (asynchronous) execution modes.\n\n' +
    'Note: This command requires the flow to be published. For testing flows that ' +
    'are not yet published (draft/saved state), use `flow test` instead.\n\n' +
    'Features:\n' +
    '  \u2022 Execute flows by scoped name (e.g. global.my_flow)\n' +
    '  \u2022 Pass input values as JSON\n' +
    '  \u2022 Foreground or background execution mode\n' +
    '  \u2022 Quick mode to skip execution detail records\n' +
    '  \u2022 Returns context ID, outputs, and debug information';
static examples = [
    {
      description: 'Run a flow in foreground mode',
      command: '<%= config.bin %> <%= command.id %> --name global.my_flow --auth dev',
    },
    {
      description: 'Run with inputs',
      command: '<%= config.bin %> <%= command.id %> --name global.my_flow --inputs \'{"record_sys_id":"abc123"}\' --auth dev',
    },
    {
      description: 'Run in background mode',
      command: '<%= config.bin %> <%= command.id %> --name global.my_flow --mode background --auth dev',
    },
  ]
static flags = {
    'name': Flags.string({
      char: 'n',
      description: 'Scoped name of the flow (e.g. global.my_flow)',
      required: true,
    }),
    'inputs': Flags.string({
      char: 'i',
      description: 'JSON object of input name-value pairs',
      required: false,
    }),
    'mode': Flags.string({
      char: 'm',
      description: 'Execution mode',
      required: false,
      default: 'foreground',
      options: ['foreground', 'background'],
    }),
    'scope': Flags.string({
      description: 'Scope context for script execution (e.g. global, x_myapp)',
      required: false,
    }),
    'quick': Flags.boolean({
      description: 'Skip execution detail records for better performance',
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
    const { flags } = await this.parse(FlowRun);
    const displayService = new FlowDisplayService();

    try {
      let inputs: Record<string, unknown> | undefined;
      if (flags.inputs) {
        try {
          inputs = JSON.parse(flags.inputs);
        } catch {
          this.error('Invalid JSON in --inputs flag.');
          return;
        }
      }

      const flowManager = new FlowManager(this.instance, flags.scope);

      this.log(`Executing flow: ${flags.name} (${flags.mode})`);

      const result = await flowManager.executeFlow({
        scopedName: flags.name,
        inputs,
        mode: flags.mode as any,
        quick: flags.quick,
      });

      const lines = displayService.formatExecutionResult(result, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error executing flow.", error as Error);
      this.error(error as Error);
    }
  }
}
