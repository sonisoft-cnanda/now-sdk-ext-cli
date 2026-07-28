/* eslint-disable perfectionist/sort-objects */

import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowTest extends AuthenticatedCommand<typeof FlowTest> {

  static args = {}
static description = 'Test a Flow Designer flow without requiring it to be published.\n\n' +
    'Invokes the same API as the "Test" button in Flow Designer, running the flow ' +
    'in its current saved (draft) state. Unlike `flow run` which requires a published ' +
    'flow and uses sn_fd.FlowAPI, `flow test` works on unpublished drafts via the ' +
    'ProcessFlow REST API.\n\n' +
    'Features:\n' +
    '  \u2022 Test flows by sys_id or scoped name\n' +
    '  \u2022 Pass trigger output values as JSON via --output-map\n' +
    '  \u2022 Auto-resolves scope from flow definition if not provided\n' +
    '  \u2022 Synchronous or asynchronous execution';
static examples = [
    {
      description: 'Test a flow by sys_id',
      command: '<%= config.bin %> <%= command.id %> --flow-id 887dda5583237210fdb8f7b6feaad32c --output-map \'{"current":"0ecd7552db252200a6a2b31be0b8f5e6","table_name":"change_request"}\' --auth dev',
    },
    {
      description: 'Test a flow by scoped name with explicit scope',
      command: '<%= config.bin %> <%= command.id %> -f x_myapp.my_flow -o \'{"current":"abc123","table_name":"incident"}\' --scope x_myapp --auth dev',
    },
    {
      description: 'Test with JSON output',
      command: '<%= config.bin %> <%= command.id %> -f 887dda5583237210fdb8f7b6feaad32c -o \'{"current":"abc123"}\' --json --auth dev',
    },
  ]
static flags = {
    'flow-id': Flags.string({
      char: 'f',
      description: 'Flow sys_id or scoped name (e.g. x_myapp.my_flow)',
      required: true,
    }),
    'output-map': Flags.string({
      char: 'o',
      description: 'JSON mapping of trigger output variable names to test values (e.g. \'{"current":"<sys_id>","table_name":"change_request"}\')',
      required: true,
    }),
    'scope': Flags.string({
      description: 'Scope sys_id for transaction scope (auto-resolved from flow definition if omitted)',
      required: false,
    }),
    'synchronous': Flags.boolean({
      description: 'Run test synchronously (default: true)',
      required: false,
      default: true,
      allowNo: true,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(FlowTest);
    const displayService = new FlowDisplayService();

    try {
      let outputMap: Record<string, string>;
      try {
        outputMap = JSON.parse(flags['output-map']);
      } catch {
        this.error('Invalid JSON in --output-map flag.');
      }

      // Constructor scope sets the auth/session context; testFlow scope sets the transaction scope
      const flowManager = new FlowManager(this.instance, flags.scope);

      this.log(`Testing flow: ${flags['flow-id']} (${flags.synchronous ? 'synchronous' : 'asynchronous'})`);

      const result = await flowManager.testFlow({
        flowId: flags['flow-id'],
        outputMap,
        scope: flags.scope,
        runOnThread: flags.synchronous,
      });

      const lines = displayService.formatTestResult(result, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error testing flow.", error as Error);
      this.error(error as Error);
    }
  }
}
