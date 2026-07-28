/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { SchemaDiscovery } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { QueryDisplayService } from '../../services/query-display.service.js'

export class QueryColumns extends AuthenticatedCommand<typeof QueryColumns> {

  static args = {}
static description = 'List and search columns (fields) on a ServiceNow table.\n\n' +
    'Retrieves all field definitions for a table from the sys_dictionary, with optional ' +
    'name/label filtering.\n\n' +
    'Features:\n' +
    '  \u2022 List all fields with types, lengths, and constraints\n' +
    '  \u2022 Search/filter fields by name or label\n' +
    '  \u2022 JSON output for scripting';
static examples = [
    {
      description: 'List all columns on the incident table',
      command: '<%= config.bin %> <%= command.id %> --table incident --auth dev',
    },
    {
      description: 'Search for date-related columns',
      command: '<%= config.bin %> <%= command.id %> --table incident --search "date" --auth dev',
    },
    {
      description: 'List columns as JSON',
      command: '<%= config.bin %> <%= command.id %> --table incident --json --auth dev',
    },
  ]
static flags = {
    'table': Flags.string({
      char: 't',
      description: 'ServiceNow table name to list columns for',
      required: true,
    }),
    'search': Flags.string({
      char: 's',
      description: 'Filter columns by name or label (case-insensitive)',
      required: false,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(QueryColumns);
    const displayService = new QueryDisplayService();

    try {
      const schemaDiscovery = new SchemaDiscovery(this.instance);

      this.log(`Listing columns for table: ${flags.table}`);

      const schema = await schemaDiscovery.discoverTableSchema(flags.table, {});

      if (!schema || !schema.fields) {
        this.error(`Failed to retrieve columns for table: ${flags.table}`);
        return;
      }

      let {fields} = schema;

      // Apply search filter if provided
      if (flags.search) {
        const searchLower = flags.search.toLowerCase();
        fields = fields.filter((f: any) =>
          (f.name || '').toLowerCase().includes(searchLower) ||
          (f.label || '').toLowerCase().includes(searchLower)
        );
      }

      const lines = displayService.formatColumnsResults(fields, flags.table, flags.search, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when listing table columns.", error as Error);
      this.error(error as Error);
    }
  }
}
