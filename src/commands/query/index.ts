/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { TableAPIRequest } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { QueryDisplayService } from '../../services/query-display.service.js'

export class Query extends AuthenticatedCommand<typeof Query> {

  static args = {}
static description = 'Query any ServiceNow table using the Table API.\n\n' +
    'Retrieve records from any table with support for encoded queries, field selection, ' +
    'display values, and configurable limits.\n\n' +
    'Features:\n' +
    '  \u2022 Query any table with encoded query strings\n' +
    '  \u2022 Select specific fields to return\n' +
    '  \u2022 Toggle display values vs. internal values\n' +
    '  \u2022 Configurable record limit\n' +
    '  \u2022 JSON output for scripting and CI/CD';
static examples = [
    {
      description: 'Query active incidents',
      command: '<%= config.bin %> <%= command.id %> --table incident --query "active=true" --limit 10 --auth dev',
    },
    {
      description: 'Query with specific fields and display values',
      command: '<%= config.bin %> <%= command.id %> --table incident --query "priority=1" --fields "number,short_description,state" --display-value --auth dev',
    },
    {
      description: 'Query as JSON output',
      command: '<%= config.bin %> <%= command.id %> --table sys_user --query "active=true" --limit 5 --json --auth dev',
    },
  ]
static flags = {
    'table': Flags.string({
      char: 't',
      description: 'ServiceNow table name to query',
      required: true,
    }),
    'query': Flags.string({
      char: 'q',
      description: 'ServiceNow encoded query string',
      required: false,
      default: '',
    }),
    'fields': Flags.string({
      char: 'f',
      description: 'Comma-separated list of fields to return',
      required: false,
    }),
    'display-value': Flags.boolean({
      char: 'd',
      description: 'Return display values instead of internal values',
      required: false,
      default: false,
    }),
    'limit': Flags.integer({
      char: 'l',
      description: 'Maximum number of records to return',
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
    const { flags } = await this.parse(Query);
    const displayService = new QueryDisplayService();

    try {
      const tableAPI = new TableAPIRequest(this.instance);

      this.log(`Querying table: ${flags.table}`);

      const queryParams: Record<string, any> = {
        sysparm_query: flags.query || '',
        sysparm_limit: flags.limit,
        sysparm_display_value: flags['display-value'] ? 'true' : 'false',
      };

      if (flags.fields) {
        queryParams.sysparm_fields = flags.fields;
      }

      const response = await tableAPI.get<{ result: any[] }>(flags.table, queryParams);
      const records = response?.data?.result ?? response?.bodyObject?.result ?? [];

      const lines = displayService.formatTableResults(records, flags.table, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when querying table.", error as Error);
      this.error(error as Error);
    }
  }
}
