/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable perfectionist/sort-objects */
import {Args, Command, Flags} from '@oclif/core'
import { Logger, NowStringUtil, SCRIPT_TYPES, ScriptSync, ServiceNowInstance } from '@sonisoft/now-sdk-ext-core';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { ScriptSyncDisplayService } from '../../services/script-sync-display.service.js'

export class Push extends AuthenticatedCommand<typeof Push> {

  static args = {}
static description = 'Push a local script file to a ServiceNow instance.\n\n' +
    'This command uploads a local script file to your ServiceNow instance, updating the corresponding ' +
    'script record. Supports multiple script types including Script Includes, Business Rules, UI Scripts, ' +
    'UI Actions, and Client Scripts.\n\n' +
    'Features:\n' +
    '  \u2022 Upload scripts by name and type\n' +
    '  \u2022 Specify the local file to push\n' +
    '  \u2022 JSON output for CI/CD integration\n' +
    '  \u2022 Detailed push result reporting';
static examples = [
    {
      description: 'Push a Script Include from a local file',
      command: '<%= config.bin %> <%= command.id %> --name MyScriptInclude --type sys_script_include --file ./scripts/MyScriptInclude.js --auth dev-instance',
    },
    {
      description: 'Push a Business Rule with short flags',
      command: '<%= config.bin %> <%= command.id %> -n MyBusinessRule -t sys_script -f ./scripts/my-rule.js -a dev-instance',
    },
    {
      description: 'Push a UI Script with JSON output',
      command: '<%= config.bin %> <%= command.id %> -n MyUIScript -t sys_ui_script -f ./scripts/ui-script.js --json --auth dev-instance',
    },
  ]
static flags = {
    name: Flags.string({
      char: 'n',
      description: 'Name of the script to push',
      required: true,
    }),
    type: Flags.string({
      char: 't',
      description: 'Type of script to push',
      required: true,
      options: ['sys_script_include', 'sys_script', 'sys_ui_script', 'sys_ui_action', 'sys_script_client'],
    }),
    file: Flags.string({
      char: 'f',
      description: 'Path to the local script file to push',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Push);
    const displayService = new ScriptSyncDisplayService();

    const { name, type, file } = flags;

    try {
      this.log(`Pushing script '${name}' (${type}) to instance...`);

      const scriptSync = new ScriptSync(this.instance);
      const result = await scriptSync.pushScript({
        scriptName: name,
        scriptType: type,
        filePath: file,
      });

      const lines = displayService.formatSyncResult(result, Boolean(flags.json));
      for (const line of lines) {
        flags.json ? console.log(line) : this.log(line);
      }
    } catch (error) {
      this._logger.error("Error occurred while pushing script.", error as Error);
      this.error(error as Error);
    }
  }
}
