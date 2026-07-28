/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { AggregateQuery } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { AggregateDisplayService } from '../../services/aggregate-display.service.js'

export class AggregateGroup extends AuthenticatedCommand<typeof AggregateGroup> {

  static args = {}
static description = 'Run a grouped aggregate query on a ServiceNow table.\n\n' +
    'Compute aggregate statistics (COUNT, AVG, MIN, MAX, SUM) grouped by one or more fields ' +
    'using the Stats API. Supports HAVING clauses for filtering groups.\n\n' +
    'Features:\n' +
    '  \u2022 GROUP BY one or more fields\n' +
    '  \u2022 Compute AVG, MIN, MAX, SUM per group\n' +
    '  \u2022 HAVING clause for group filtering\n' +
    '  \u2022 Display values for reference fields\n' +
    '  \u2022 JSON output for scripting';
static examples = [
    {
      description: 'Count incidents grouped by priority',
      command: '<%= config.bin %> <%= command.id %> --table incident --group-by priority --count --auth dev',
    },
    {
      description: 'Average reassignment count grouped by priority and assignment group',
      command: '<%= config.bin %> <%= command.id %> --table incident --group-by priority --group-by assignment_group --avg reassignment_count --count --display-value --auth dev',
    },
    {
      description: 'Groups with HAVING clause',
      command: '<%= config.bin %> <%= command.id %> --table incident --group-by priority --count --having "count>10" --auth dev',
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
      description: 'ServiceNow encoded query string to filter records before grouping',
      required: false,
    }),
    'group-by': Flags.string({
      char: 'g',
      description: 'Field name(s) to group by',
      required: true,
      multiple: true,
    }),
    'count': Flags.boolean({
      char: 'c',
      description: 'Include record count per group',
      required: false,
      default: false,
    }),
    'avg': Flags.string({
      description: 'Comma-separated field names to compute AVG on per group',
      required: false,
      multiple: true,
    }),
    'min': Flags.string({
      description: 'Comma-separated field names to compute MIN on per group',
      required: false,
      multiple: true,
    }),
    'max': Flags.string({
      description: 'Comma-separated field names to compute MAX on per group',
      required: false,
      multiple: true,
    }),
    'sum': Flags.string({
      description: 'Comma-separated field names to compute SUM on per group',
      required: false,
      multiple: true,
    }),
    'having': Flags.string({
      description: 'HAVING clause to filter groups (e.g. "count>10")',
      required: false,
    }),
    'display-value': Flags.boolean({
      char: 'd',
      description: 'Return display values for group-by fields',
      required: false,
      default: false,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(AggregateGroup);
    const displayService = new AggregateDisplayService();

    try {
      const aggregateQuery = new AggregateQuery(this.instance);

      this.log(`Running grouped aggregate on table: ${flags.table} (group by: ${flags['group-by'].join(', ')})`);

      const result = await aggregateQuery.groupBy({
        table: flags.table,
        query: flags.query,
        groupBy: flags['group-by'],
        count: flags.count,
        avgFields: flags.avg,
        minFields: flags.min,
        maxFields: flags.max,
        sumFields: flags.sum,
        having: flags.having,
        displayValue: flags['display-value'] ? 'all' : undefined,
      });

      const lines = displayService.formatGroupedResult(result.groups, flags.table, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when running grouped aggregate query.", error as Error);
      this.error(error as Error);
    }
  }
}
