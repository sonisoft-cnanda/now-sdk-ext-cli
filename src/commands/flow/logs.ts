/* eslint-disable perfectionist/sort-objects */

import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowLogs extends AuthenticatedCommand<typeof FlowLogs> {

  static args = {}
  static description = 'Retrieve flow execution log entries for a given context.\n\n' +
    'Log entries include error messages, step-level debug output, and cancellation ' +
    'reasons. Use this alongside flow details to get the full picture of what ' +
    'happened during an execution.\n\n' +
    'Queries sys_flow_log entries and maps numeric log levels to human-readable ' +
    'names (ERROR, WARN, INFO, DEBUG).\n\n' +
    'NOTE: Log entries may be empty for simple successful executions, or if the ' +
    'flow reporting level is set to NONE. Errors and warnings are always logged ' +
    'regardless of the reporting level setting.'
  static examples = [
    {
      description: 'Get flow execution logs',
      command: '<%= config.bin %> <%= command.id %> --context-id d4e5f6789012345678abcdef01234567 --auth dev',
    },
    {
      description: 'Get latest 10 log entries in reverse order',
      command: '<%= config.bin %> <%= command.id %> -c d4e5f6789012345678abcdef01234567 --limit 10 --order desc --auth dev',
    },
    {
      description: 'Get logs with JSON output for scripting',
      command: '<%= config.bin %> <%= command.id %> -c d4e5f6789012345678abcdef01234567 --json --auth dev',
    },
  ]
  static flags = {
    'context-id': Flags.string({
      char: 'c',
      description: 'Flow context sys_id returned by flow test, flow run, flow subflow, or flow action',
      required: true,
    }),
    'limit': Flags.integer({
      char: 'l',
      description: 'Maximum number of log entries to return',
      required: false,
      default: 100,
    }),
    'order': Flags.option({
      char: 'o',
      description: 'Order direction: asc (oldest first) or desc (newest first)',
      required: false,
      default: 'asc' as const,
      options: ['asc', 'desc'] as const,
    })(),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(FlowLogs);
    const displayService = new FlowDisplayService();

    try {
      // No scope in constructor — getFlowLogs queries sys_flow_log via Table API
      const flowManager = new FlowManager(this.instance);

      this.log(`Retrieving execution logs for context: ${flags['context-id']}`);

      const result = await flowManager.getFlowLogs(flags['context-id'], {
        limit: flags.limit,
        orderDirection: flags.order,
      });

      const lines = displayService.formatLogsResult(result, flags.json);
      for (const line of lines) {
        flags.json ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error retrieving flow logs.", error as Error);
      this.error(error as Error);
    }
  }
}
