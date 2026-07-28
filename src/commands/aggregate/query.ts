/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { AggregateQuery } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { AggregateDisplayService } from '../../services/aggregate-display.service.js'

export class AggregateQueryCmd extends AuthenticatedCommand<typeof AggregateQueryCmd> {

  static args = {}
static description = 'Run aggregate statistics on a ServiceNow table.\n\n' +
    'Compute AVG, MIN, MAX, and SUM on specified fields using the Stats API. ' +
    'Optionally include a record count.\n\n' +
    'Features:\n' +
    '  \u2022 Compute AVG, MIN, MAX, SUM on any numeric field\n' +
    '  \u2022 Optional record count\n' +
    '  \u2022 Filter with encoded queries\n' +
    '  \u2022 JSON output for scripting';
static examples = [
    {
      description: 'Get average reassignment count for incidents',
      command: '<%= config.bin %> <%= command.id %> --table incident --avg reassignment_count --auth dev',
    },
    {
      description: 'Get min, max, and average for active incidents',
      command: '<%= config.bin %> <%= command.id %> --table incident --query "active=true" --avg reassignment_count --min reassignment_count --max reassignment_count --count --auth dev',
    },
    {
      description: 'Get sum as JSON',
      command: '<%= config.bin %> <%= command.id %> --table incident --sum reassignment_count --json --auth dev',
    },
  ]
static flags = {
    'table': Flags.string({
      char: 't',
      description: 'ServiceNow table name to aggregate',
      required: true,
    }),
    'query': Flags.string({
      char: 'q',
      description: 'ServiceNow encoded query string to filter records',
      required: false,
    }),
    'count': Flags.boolean({
      char: 'c',
      description: 'Include record count in the result',
      required: false,
      default: false,
    }),
    'avg': Flags.string({
      description: 'Comma-separated field names to compute AVG on',
      required: false,
      multiple: true,
    }),
    'min': Flags.string({
      description: 'Comma-separated field names to compute MIN on',
      required: false,
      multiple: true,
    }),
    'max': Flags.string({
      description: 'Comma-separated field names to compute MAX on',
      required: false,
      multiple: true,
    }),
    'sum': Flags.string({
      description: 'Comma-separated field names to compute SUM on',
      required: false,
      multiple: true,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AggregateQueryCmd);
    const displayService = new AggregateDisplayService();

    try {
      const aggregateQuery = new AggregateQuery(this.instance);

      this.log(`Running aggregate query on table: ${flags.table}`);

      const result = await aggregateQuery.aggregate({
        table: flags.table,
        query: flags.query,
        count: flags.count,
        avgFields: flags.avg,
        minFields: flags.min,
        maxFields: flags.max,
        sumFields: flags.sum,
      });

      const lines = displayService.formatAggregateResult(result.stats, flags.table, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when running aggregate query.", error as Error);
      this.error(error as Error);
    }
  }
}
