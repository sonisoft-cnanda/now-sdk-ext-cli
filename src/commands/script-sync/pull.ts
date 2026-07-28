/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable perfectionist/sort-objects */
import {Args, Command, Flags} from '@oclif/core'
import { Logger, NowStringUtil, SCRIPT_TYPES, ScriptSync, ServiceNowInstance } from '@sonisoft/now-sdk-ext-core';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { ScriptSyncDisplayService } from '../../services/script-sync-display.service.js'

export class Pull extends AuthenticatedCommand<typeof Pull> {

  static args = {}
static description = 'Pull a script from a ServiceNow instance to a local file.\n\n' +
    'This command downloads a script record from your ServiceNow instance and saves it as a local file. ' +
    'Supports multiple script types including Script Includes, Business Rules, UI Scripts, UI Actions, ' +
    'and Client Scripts.\n\n' +
    'Features:\n' +
    '  \u2022 Download scripts by name and type\n' +
    '  \u2022 Custom output file path support\n' +
    '  \u2022 Auto-generated file names based on script name and type\n' +
    '  \u2022 JSON output for CI/CD integration';
static examples = [
    {
      description: 'Pull a Script Include to auto-generated file name',
      command: '<%= config.bin %> <%= command.id %> --name MyScriptInclude --type sys_script_include --auth dev-instance',
    },
    {
      description: 'Pull a Business Rule to a specific file',
      command: '<%= config.bin %> <%= command.id %> --name MyBusinessRule --type sys_script --output ./scripts/my-rule.js --auth dev-instance',
    },
    {
      description: 'Pull a Client Script with JSON output',
      command: '<%= config.bin %> <%= command.id %> -n MyClientScript -t sys_script_client --json --auth dev-instance',
    },
  ]
static flags = {
    name: Flags.string({
      char: 'n',
      description: 'Name of the script to pull',
      required: true,
    }),
    type: Flags.string({
      char: 't',
      description: 'Type of script to pull',
      required: true,
      options: ['sys_script_include', 'sys_script', 'sys_ui_script', 'sys_ui_action', 'sys_script_client'],
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output file path. If not specified, a file name is auto-generated.',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Pull);
    const displayService = new ScriptSyncDisplayService();

    const { name, type, output } = flags;

    try {
      this.log(`Pulling script '${name}' (${type}) from instance...`);

      const scriptSync = new ScriptSync(this.instance);
      const filePath = output || ScriptSync.generateFileName(name, type);
      const result = await scriptSync.pullScript({
        scriptName: name,
        scriptType: type,
        filePath,
      });

      const lines = displayService.formatSyncResult(result, Boolean(flags.json));
      for (const line of lines) {
        flags.json ? console.log(line) : this.log(line);
      }
    } catch (error) {
      this._logger.error("Error occurred while pulling script.", error as Error);
      this.error(error as Error);
    }
  }
}
