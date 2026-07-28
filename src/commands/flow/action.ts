/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowAction extends AuthenticatedCommand<typeof FlowAction> {

  static args = {}
static description = 'Execute a Flow Designer action by scoped name.\n\n' +
    'Runs an action using the sn_fd.FlowAPI ScriptableFlowRunner.\n\n' +
    'Features:\n' +
    '  \u2022 Execute actions by scoped name\n' +
    '  \u2022 Pass input values as JSON\n' +
    '  \u2022 Foreground or background execution mode\n' +
    '  \u2022 Returns context ID, outputs, and debug information';
static examples = [
    {
      description: 'Run an action',
      command: '<%= config.bin %> <%= command.id %> --name global.create_record --inputs \'{"table":"incident","values":{"short_description":"Test"}}\' --auth dev',
    },
  ]
static flags = {
    'name': Flags.string({
      char: 'n',
      description: 'Scoped name of the action (e.g. global.create_record)',
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
      description: 'Scope context for script execution',
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
    const { flags } = await this.parse(FlowAction);
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

      this.log(`Executing action: ${flags.name} (${flags.mode})`);

      const result = await flowManager.executeAction({
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
      this._logger.error("Error executing action.", error as Error);
      this.error(error as Error);
    }
  }
}
