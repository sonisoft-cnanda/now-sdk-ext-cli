/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { InstanceHealth } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { HealthDisplayService } from '../../services/health-display.service.js'

export class HealthCheck extends AuthenticatedCommand<typeof HealthCheck> {

  static args = {}
static description = 'Run a consolidated health check on a ServiceNow instance.\n\n' +
    'Performs comprehensive diagnostics including version info, cluster status, stuck job detection, ' +
    'semaphore counts, and operational record counts.\n\n' +
    'Features:\n' +
    '  \u2022 Instance version and build information\n' +
    '  \u2022 Cluster node status\n' +
    '  \u2022 Stuck job detection with configurable threshold\n' +
    '  \u2022 Active semaphore count\n' +
    '  \u2022 Operational counts (incidents, changes, problems)\n' +
    '  \u2022 Color-coded status indicators\n' +
    '  \u2022 JSON output for CI/CD monitoring';
static examples = [
    {
      description: 'Run full health check',
      command: '<%= config.bin %> <%= command.id %> --auth dev',
    },
    {
      description: 'Check only version and stuck jobs',
      command: '<%= config.bin %> <%= command.id %> --include-version --include-stuck-jobs --no-include-cluster --no-include-semaphores --no-include-operational-counts --auth dev',
    },
    {
      description: 'Health check with custom stuck job threshold',
      command: '<%= config.bin %> <%= command.id %> --stuck-job-threshold 60 --auth dev',
    },
    {
      description: 'Health check as JSON',
      command: '<%= config.bin %> <%= command.id %> --json --auth dev',
    },
  ]
static flags = {
    'include-version': Flags.boolean({
      description: 'Include instance version information',
      required: false,
      default: true,
      allowNo: true,
    }),
    'include-cluster': Flags.boolean({
      description: 'Include cluster node status',
      required: false,
      default: true,
      allowNo: true,
    }),
    'include-stuck-jobs': Flags.boolean({
      description: 'Include stuck job detection',
      required: false,
      default: true,
      allowNo: true,
    }),
    'include-semaphores': Flags.boolean({
      description: 'Include active semaphore count',
      required: false,
      default: true,
      allowNo: true,
    }),
    'include-operational-counts': Flags.boolean({
      description: 'Include operational record counts (incidents, changes, problems)',
      required: false,
      default: true,
      allowNo: true,
    }),
    'stuck-job-threshold': Flags.integer({
      description: 'Minutes threshold for a job to be considered stuck',
      required: false,
      default: 30,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(HealthCheck);
    const displayService = new HealthDisplayService();

    try {
      const instanceHealth = new InstanceHealth(this.instance);

      this.log('Running instance health check...');

      const result = await instanceHealth.checkHealth({
        includeVersion: flags['include-version'],
        includeCluster: flags['include-cluster'],
        includeStuckJobs: flags['include-stuck-jobs'],
        includeSemaphores: flags['include-semaphores'],
        includeOperationalCounts: flags['include-operational-counts'],
        stuckJobThresholdMinutes: flags['stuck-job-threshold'],
      });

      const lines = displayService.formatHealthResult(result, flags.json ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when running health check.", error as Error);
      this.error(error as Error);
    }
  }
}
