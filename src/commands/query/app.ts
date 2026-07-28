/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { TableAPIRequest } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { QueryDisplayService } from '../../services/query-display.service.js'

export class QueryApp extends AuthenticatedCommand<typeof QueryApp> {

  static args = {}
static description = 'Search for applications by name across scoped apps and plugins.\n\n' +
    'Searches the sys_scope table for applications matching the provided search term.\n\n' +
    'Features:\n' +
    '  \u2022 Search by name (case-insensitive contains)\n' +
    '  \u2022 Filter active/inactive applications\n' +
    '  \u2022 Configurable result limit\n' +
    '  \u2022 JSON output for scripting';
static examples = [
    {
      description: 'Search for ITSM applications',
      command: '<%= config.bin %> <%= command.id %> --search "ITSM" --auth dev',
    },
    {
      description: 'Search active apps only',
      command: '<%= config.bin %> <%= command.id %> --search "HR" --active --auth dev',
    },
  ]
static flags = {
    'search': Flags.string({
      char: 's',
      description: 'Application name search term',
      required: true,
    }),
    'active': Flags.boolean({
      char: 'a',
      description: 'Only show active applications',
      required: false,
      default: false,
    }),
    'limit': Flags.integer({
      char: 'l',
      description: 'Maximum number of results to return',
      required: false,
      default: 20,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(QueryApp);
    const displayService = new QueryDisplayService();

    try {
      const tableAPI = new TableAPIRequest(this.instance);

      this.log(`Searching for applications matching: "${flags.search}"`);

      let query = `nameLIKE${flags.search}`;
      if (flags.active) {
        query += '^active=true';
      }

      const queryParams: Record<string, any> = {
        sysparm_query: query,
        sysparm_limit: flags.limit,
        sysparm_display_value: 'false',
        sysparm_fields: 'sys_id,name,scope,version,active,short_description',
      };

      const response = await tableAPI.get<{ result: any[] }>('sys_scope', queryParams);
      const records = response?.data?.result ?? response?.bodyObject?.result ?? [];

      // Add source field for display
      const apps = records.map((r: any) => ({ ...r, source: 'sys_scope' }));

      const lines = displayService.formatAppResults(apps, flags.search, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when searching for applications.", error as Error);
      this.error(error as Error);
    }
  }
}
