/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable perfectionist/sort-objects */
import {Args, Command, Flags} from '@oclif/core'
import { Logger, SyslogReader } from '@sonisoft/now-sdk-ext-core';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FilterRule, LogFilterService } from '../../services/log-filter.service.js'
import { LogFormatterService } from '../../services/log-formatter.service.js'

export class Log extends AuthenticatedCommand<typeof Log> {

  static args = {}
static description = 'Tail and monitor ServiceNow system logs in real-time with beautiful formatting.\n\n' +
    'This command provides real-time log monitoring with enhanced visual formatting using color-coded ' +
    'output that makes logs easy to scan and understand at a glance. Automatically highlights errors, ' +
    'warnings, success messages, and important keywords.\n\n' +
    'Key Features:\n' +
    '  • Real-time log tailing (like Unix tail -f)\n' +
    '  • Powerful filtering with multiple operators (CONTAINS, REGEX, EQUALS, etc.)\n' +
    '  • Smart keyword highlighting (errors in red, warnings in yellow, etc.)\n' +
    '  • Beautiful color-coded console output with chalk\n' +
    '  • Export logs to file with automatic appending\n' +
    '  • Fast 1-second default polling interval\n' +
    '  • Timestamps and sequence numbers for each log\n' +
    '  • Graceful shutdown with Ctrl+C\n' +
    '  • Clean output without colors (--no-color flag)\n\n' +
    'Smart Highlighting:\n' +
    '  • Error terms (error, exception, failed) - highlighted in RED\n' +
    '  • Warning terms (warn, warning, deprecated) - highlighted in YELLOW\n' +
    '  • Success terms (success, completed, done) - highlighted in GREEN\n' +
    '  • System terms (system, user, transaction) - highlighted in BLUE\n\n' +
    'Filtering:\n' +
    '  • Apply filters using --filter flag with syntax: "field OPERATOR value"\n' +
    '  • Supports case-sensitive and case-insensitive operations\n' +
    '  • Multiple filters are combined with AND logic\n' +
    '  • Operators: CONTAINS, CONTAINS_CI, EQUALS, EQUALS_CI, STARTS_WITH, STARTS_WITH_CI,\n' +
    '    ENDS_WITH, ENDS_WITH_CI, REGEX, NOT_CONTAINS, NOT_CONTAINS_CI, NOT_EQUALS, NOT_EQUALS_CI\n\n' +
    'Use Cases:\n' +
    '  • Monitor logs during application development\n' +
    '  • Debug issues in real-time\n' +
    '  • Track system events during deployments\n' +
    '  • Filter logs for specific application or component\n' +
    '  • Quickly spot errors and warnings\n' +
    '  • Collect logs for analysis or audit trails\n\n' +
    '⚠️  IMPORTANT NOTES:\n' +
    '  • Press Ctrl+C to stop tailing and exit gracefully\n' +
    '  • Log files are created/appended automatically\n' +
    '  • Uses ChannelAjax when available for better performance\n' +
    '  • Default poll interval is 1 second for real-time monitoring';
static examples = [
    {
      description: 'Tail all logs in real-time',
      command: '<%= config.bin %> <%= command.id %> --auth dev-instance',
    },
    {
      description: 'Tail logs and save to a file',
      command: '<%= config.bin %> <%= command.id %> --output ./logs/instance-logs.txt --auth dev-instance',
    },
    {
      description: 'Tail logs with custom polling interval (500ms for faster updates)',
      command: '<%= config.bin %> <%= command.id %> --interval 500 --auth dev-instance',
    },
    {
      description: 'Filter logs containing specific text (case-insensitive)',
      command: '<%= config.bin %> <%= command.id %> --filter "message CONTAINS_CI error" --auth dev-instance',
    },
    {
      description: 'Filter logs with multiple conditions (AND logic)',
      command: '<%= config.bin %> <%= command.id %> --filter "message CONTAINS x_acme_app" --filter "message CONTAINS error" --auth dev-instance',
    },
    {
      description: 'Filter logs using regex pattern',
      command: '<%= config.bin %> <%= command.id %> --filter "message REGEX .*exception.*" --auth dev-instance',
    },
    {
      description: 'Filter logs by message starting with a pattern',
      command: '<%= config.bin %> <%= command.id %> --filter "message STARTS_WITH [ERROR]" --auth dev-instance',
    },
    {
      description: 'Tail logs without colored output',
      command: '<%= config.bin %> <%= command.id %> --no-color --auth dev-instance',
    },
  ]
static flags = {
    'output': Flags.string({
      char: 'o',
      description: 'Output file path to save logs. Creates parent directories if needed.',
      required: false
    }),
    'interval': Flags.integer({
      char: 'i',
      description: 'Polling interval in milliseconds',
      required: false,
      default: 1000
    }),
    'no-color': Flags.boolean({
      description: 'Disable colored output',
      required: false,
      default: false
    }),
    'filter': Flags.string({
      char: 'f',
      description: 'Filter logs by field and value. Syntax: field OPERATOR value. ' +
        'Operators: CONTAINS, CONTAINS_CI (case-insensitive), EQUALS, EQUALS_CI, ' +
        'STARTS_WITH, STARTS_WITH_CI, ENDS_WITH, ENDS_WITH_CI, REGEX, NOT_CONTAINS, NOT_EQUALS. ' +
        'Field defaults to "message" if omitted. Multiple filters are combined with AND logic.',
      required: false,
      multiple: true
    }),
  }
private filterRules: FilterRule[] = [];
  private filterService!: LogFilterService;
  private formatter!: LogFormatterService;
  private syslogReader?: SyslogReader;

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Log);

    this.filterService = new LogFilterService(this._logger);
    this.formatter = new LogFormatterService({ noColor: Boolean(flags['no-color']) });

    try {
      // Parse filter rules if provided
      if (flags.filter && flags.filter.length > 0) {
        this.filterRules = flags.filter.map(f => this.filterService.parseFilter(f));
        this._logger.info(`Applied ${this.filterRules.length} filter(s)`);
      }

      // Create SyslogReader instance
      this.syslogReader = new SyslogReader(this.instance);

      // Ensure output directory exists if output file is specified
      if (flags.output) {
        const outputDir = path.dirname(flags.output);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          this._logger.info(`Created output directory: ${outputDir}`);
        }
      }

      // Display header
      const headerLines = this.formatter.formatHeader({
        host: this.instance.getHost(),
        interval: flags.interval,
        output: flags.output,
        filterRules: this.filterRules,
      });
      for (const line of headerLines) {
        console.log(line);
      }

      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        this.handleExit();
      });

      // Start tailing logs
      let logCount = 0;
      let filteredCount = 0;

       
      const reader = this.syslogReader as any;

      await (
        reader.startTailingWithChannelAjax({
          append: true,
          interval: flags.interval,
          onLog: (log: Record<string, unknown>) => {
            if (this.filterService.matchesFilters(log, this.filterRules)) {
              filteredCount++;
              const logLines = this.formatter.formatLog(log, filteredCount);
              for (const line of logLines) {
                console.log(line);
              }
            }

            logCount++;
          },
          outputFile: flags.output,
        })
      );
    } catch (error) {
      this._logger.error("Error occurred while tailing logs.", error as Error);
      this.error(error as Error);
    }
  }

  private handleExit(): void {
    if (this.flags['no-color']) {
      console.log('\n\n⏹️  Stopping tail...');
      console.log('✅ Stopped. Goodbye!\n');
    } else {
      console.log(chalk.yellow('\n\n⏹️  Stopping tail...'));
      console.log(chalk.green('✅ Stopped. ') + chalk.gray('Goodbye!\n'));
    }

    if (this.syslogReader) {
      this.syslogReader.stopTailing();
    }

    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
    process.exit(0);
  }
}
