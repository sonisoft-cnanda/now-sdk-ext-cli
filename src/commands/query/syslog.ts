/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { SyslogReader } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { QueryDisplayService } from '../../services/query-display.service.js'

export class QuerySyslog extends AuthenticatedCommand<typeof QuerySyslog> {

  static args = {}
static description = 'Query ServiceNow system logs (one-shot, non-tailing).\n\n' +
    'Retrieves syslog records with optional encoded query filtering and configurable limits. ' +
    'For real-time log tailing, use the "log tail" command instead.\n\n' +
    'Features:\n' +
    '  \u2022 Query syslog with encoded query strings\n' +
    '  \u2022 Configurable record limit\n' +
    '  \u2022 Formatted table output with timestamps, levels, and sources\n' +
    '  \u2022 JSON output for scripting';
static examples = [
    {
      description: 'Query recent error logs',
      command: '<%= config.bin %> <%= command.id %> --query "level=2" --limit 20 --auth dev',
    },
    {
      description: 'Query all recent syslog entries',
      command: '<%= config.bin %> <%= command.id %> --limit 50 --auth dev',
    },
    {
      description: 'Query syslog as JSON',
      command: '<%= config.bin %> <%= command.id %> --query "sourceLIKEincident" --json --auth dev',
    },
  ]
static flags = {
    'query': Flags.string({
      char: 'q',
      description: 'ServiceNow encoded query string for filtering syslog records',
      required: false,
    }),
    'limit': Flags.integer({
      char: 'l',
      description: 'Maximum number of syslog records to return',
      required: false,
      default: 100,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(QuerySyslog);
    const displayService = new QueryDisplayService();

    try {
      const syslogReader = new SyslogReader(this.instance);

      this.log('Querying syslog records...');

      const records = await syslogReader.querySyslog(flags.query, flags.limit);

      const lines = displayService.formatSyslogResults(records, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when querying syslog.", error as Error);
      this.error(error as Error);
    }
  }
}
