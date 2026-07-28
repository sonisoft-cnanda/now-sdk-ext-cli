/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable perfectionist/sort-objects */
import {Args, Command, Flags} from '@oclif/core'
import { Logger, NowStringUtil, SCRIPT_TYPES, ScriptSync, ServiceNowInstance } from '@sonisoft/now-sdk-ext-core';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { ScriptSyncDisplayService } from '../../services/script-sync-display.service.js'

export class Sync extends AuthenticatedCommand<typeof Sync> {

  static args = {}
static description = 'Synchronize all scripts in a directory with a ServiceNow instance.\n\n' +
    'This command scans a local directory for script files and synchronizes them with the corresponding ' +
    'records on your ServiceNow instance. You can optionally filter by script types to synchronize only ' +
    'specific kinds of scripts.\n\n' +
    'Features:\n' +
    '  \u2022 Batch synchronization of all scripts in a directory\n' +
    '  \u2022 Filter by one or more script types\n' +
    '  \u2022 Summary report with success/failure counts\n' +
    '  \u2022 JSON output for CI/CD integration';
static examples = [
    {
      description: 'Sync all scripts in a directory',
      command: '<%= config.bin %> <%= command.id %> --directory ./scripts --auth dev-instance',
    },
    {
      description: 'Sync only Script Includes and Business Rules',
      command: '<%= config.bin %> <%= command.id %> --directory ./scripts --types sys_script_include --types sys_script --auth dev-instance',
    },
    {
      description: 'Sync with JSON output for CI/CD',
      command: '<%= config.bin %> <%= command.id %> -d ./scripts --json --auth dev-instance',
    },
  ]
static flags = {
    directory: Flags.string({
      char: 'd',
      description: 'Directory containing script files to synchronize',
      required: true,
    }),
    types: Flags.string({
      char: 't',
      description: 'Script types to synchronize. Can be specified multiple times to include multiple types.',
      required: false,
      multiple: true,
      options: ['sys_script_include', 'sys_script', 'sys_ui_script', 'sys_ui_action', 'sys_script_client'],
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Sync);
    const displayService = new ScriptSyncDisplayService();

    const { directory, types } = flags;

    try {
      this.log(`Synchronizing scripts in '${directory}' with instance...`);

      if (types && types.length > 0) {
        this.log(`Filtering by types: ${types.join(', ')}`);
      }

      const scriptSync = new ScriptSync(this.instance);
      const result = await scriptSync.syncAllScripts({
        directory,
        scriptTypes: types,
      });

      const lines = displayService.formatSyncAllResult(result, Boolean(flags.json));
      for (const line of lines) {
        flags.json ? console.log(line) : this.log(line);
      }
    } catch (error) {
      this._logger.error("Error occurred while synchronizing scripts.", error as Error);
      this.error(error as Error);
    }
  }
}
