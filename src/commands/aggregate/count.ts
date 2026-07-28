/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { AggregateQuery } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { AggregateDisplayService } from '../../services/aggregate-display.service.js'

export class AggregateCount extends AuthenticatedCommand<typeof AggregateCount> {

  static args = {}
static description = 'Count records in a ServiceNow table.\n\n' +
    'Uses the Stats API to efficiently count records with optional encoded query filtering.\n\n' +
    'Features:\n' +
    '  \u2022 Fast record counting via Stats API\n' +
    '  \u2022 Optional encoded query filtering\n' +
    '  \u2022 JSON output for scripting';
static examples = [
    {
      description: 'Count all incidents',
      command: '<%= config.bin %> <%= command.id %> --table incident --auth dev',
    },
    {
      description: 'Count active critical incidents',
      command: '<%= config.bin %> <%= command.id %> --table incident --query "active=true^priority=1" --auth dev',
    },
    {
      description: 'Count as JSON',
      command: '<%= config.bin %> <%= command.id %> --table incident --query "active=true" --json --auth dev',
    },
  ]
static flags = {
    'table': Flags.string({
      char: 't',
      description: 'ServiceNow table name to count records in',
      required: true,
    }),
    'query': Flags.string({
      char: 'q',
      description: 'ServiceNow encoded query string to filter records',
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
    const { flags } = await this.parse(AggregateCount);
    const displayService = new AggregateDisplayService();

    try {
      const aggregateQuery = new AggregateQuery(this.instance);

      this.log(`Counting records in table: ${flags.table}`);

      const count = await aggregateQuery.count({
        table: flags.table,
        query: flags.query,
      });

      const lines = displayService.formatCountResult(count, flags.table, flags.query, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when counting records.", error as Error);
      this.error(error as Error);
    }
  }
}
