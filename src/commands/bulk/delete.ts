/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { QueryBatchOperations } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { BulkDisplayService } from '../../services/bulk-display.service.js'

export class BulkDelete extends AuthenticatedCommand<typeof BulkDelete> {

  static args = {}
static description = 'Bulk delete records matching an encoded query.\n\n' +
    'Finds all records in a table matching the given query, then deletes each one. ' +
    'Defaults to dry-run mode — use --confirm to execute.\n\n' +
    'Features:\n' +
    '  \u2022 Safe dry-run by default (shows match count without deleting)\n' +
    '  \u2022 Encoded query filtering\n' +
    '  \u2022 Configurable record limit (default 200, max 10000)\n' +
    '  \u2022 Progress reporting for large operations\n' +
    '  \u2022 Error collection — operation continues even if individual records fail';
static examples = [
    {
      description: 'Dry run — see how many records would be deleted',
      command: '<%= config.bin %> <%= command.id %> --table u_temp_import --query "sys_created_on<2024-01-01" --auth dev',
    },
    {
      description: 'Execute the delete (requires --confirm)',
      command: '<%= config.bin %> <%= command.id %> --table u_temp_import --query "sys_created_on<2024-01-01" --confirm --auth dev',
    },
    {
      description: 'Delete with custom limit',
      command: '<%= config.bin %> <%= command.id %> --table incident --query "active=false^closed_at<2023-01-01" --limit 1000 --confirm --auth dev',
    },
    {
      description: 'Delete as JSON output',
      command: '<%= config.bin %> <%= command.id %> --table u_staging --query "processed=true" --confirm --json --auth dev',
    },
  ]
static flags = {
    'table': Flags.string({
      char: 't',
      description: 'Table name to delete records from',
      required: true,
    }),
    'query': Flags.string({
      char: 'q',
      description: 'Encoded query to match records for deletion',
      required: true,
    }),
    'confirm': Flags.boolean({
      description: 'Execute the delete (without this flag, performs a dry run)',
      required: false,
      default: false,
    }),
    'limit': Flags.integer({
      char: 'l',
      description: 'Maximum number of records to delete (default 200, max 10000)',
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
    const { flags } = await this.parse(BulkDelete);
    const displayService = new BulkDisplayService();

    try {
      const ops = new QueryBatchOperations(this.instance);

      if (flags.confirm) {
        this.log(`Executing bulk delete on table: ${flags.table}`);
      } else {
        this.log(`Dry run — bulk delete on table: ${flags.table}`);
      }

      const result = await ops.queryDelete({
        table: flags.table,
        query: flags.query,
        confirm: flags.confirm,
        limit: flags.limit,
        onProgress: (message: string) => {
          this.log(`  ${message}`);
        },
      });

      const lines = displayService.formatDeleteResult(result, flags.table, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred during bulk delete.", error as Error);
      this.error(error as Error);
    }
  }
}
