/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { QueryBatchOperations } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { BulkDisplayService } from '../../services/bulk-display.service.js'

export class BulkUpdate extends AuthenticatedCommand<typeof BulkUpdate> {

  static args = {}
static description = 'Bulk update records matching an encoded query.\n\n' +
    'Finds all records in a table matching the given query, then applies field updates to each one. ' +
    'Defaults to dry-run mode — use --confirm to execute.\n\n' +
    'Features:\n' +
    '  \u2022 Safe dry-run by default (shows match count without modifying data)\n' +
    '  \u2022 Encoded query filtering\n' +
    '  \u2022 JSON field=value pairs for update data\n' +
    '  \u2022 Configurable record limit (default 200, max 10000)\n' +
    '  \u2022 Progress reporting for large operations\n' +
    '  \u2022 Error collection — operation continues even if individual records fail';
static examples = [
    {
      description: 'Dry run — see how many records would be updated',
      command: '<%= config.bin %> <%= command.id %> --table incident --query "active=true^priority=5" --data \'{"priority":"4"}\' --auth dev',
    },
    {
      description: 'Execute the update (requires --confirm)',
      command: '<%= config.bin %> <%= command.id %> --table incident --query "active=true^priority=5" --data \'{"priority":"4"}\' --confirm --auth dev',
    },
    {
      description: 'Update with custom limit',
      command: '<%= config.bin %> <%= command.id %> --table incident --query "state=1" --data \'{"assignment_group":"group-sys-id"}\' --limit 500 --confirm --auth dev',
    },
    {
      description: 'Update as JSON output',
      command: '<%= config.bin %> <%= command.id %> --table incident --query "active=true" --data \'{"state":"6"}\' --confirm --json --auth dev',
    },
  ]
static flags = {
    'table': Flags.string({
      char: 't',
      description: 'Table name to update records in',
      required: true,
    }),
    'query': Flags.string({
      char: 'q',
      description: 'Encoded query to match records',
      required: true,
    }),
    'data': Flags.string({
      char: 'd',
      description: 'JSON object of field=value pairs to apply (e.g. \'{"priority":"4","state":"2"}\')',
      required: true,
    }),
    'confirm': Flags.boolean({
      description: 'Execute the update (without this flag, performs a dry run)',
      required: false,
      default: false,
    }),
    'limit': Flags.integer({
      char: 'l',
      description: 'Maximum number of records to update (default 200, max 10000)',
      required: false,
      default: 200,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(BulkUpdate);
    const displayService = new BulkDisplayService();

    try {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(flags.data);
      } catch {
        this.error('Invalid JSON in --data flag. Provide a valid JSON object, e.g. \'{"field":"value"}\'');
        return;
      }

      const ops = new QueryBatchOperations(this.instance);

      if (flags.confirm) {
        this.log(`Executing bulk update on table: ${flags.table}`);
      } else {
        this.log(`Dry run — bulk update on table: ${flags.table}`);
      }

      const result = await ops.queryUpdate({
        table: flags.table,
        query: flags.query,
        data,
        confirm: flags.confirm,
        limit: flags.limit,
        onProgress: (message: string) => {
          this.log(`  ${message}`);
        },
      });

      const lines = displayService.formatUpdateResult(result, flags.table, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred during bulk update.", error as Error);
      this.error(error as Error);
    }
  }
}
