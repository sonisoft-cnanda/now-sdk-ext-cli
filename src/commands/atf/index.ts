 
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable perfectionist/sort-objects */
 
import {Args, Command, Flags} from '@oclif/core'
import {  ATFTestExecutor, Logger, NowStringUtil, ReferenceLink, TestResult } from '@sonisoft/now-sdk-ext-core';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { isNilOrEmpty } from '../../common/utils.js';
import {
  AtfResultFormatterService,
  TestSuiteExecutionRequest,
  TestSuiteExecutionResponse,
  TestSuiteExecutionResult,
} from '../../services/atf-result-formatter.service.js'

// Extend ATFTestExecutor with test suite methods
interface ExtendedATFTestExecutor extends ATFTestExecutor {
  executeTestSuite(testSuiteSysId: string, options?: Partial<TestSuiteExecutionRequest>): Promise<TestSuiteExecutionResponse>;
  executeTestSuiteAndWait(testSuiteSysId: string, options?: Partial<TestSuiteExecutionRequest>, pollIntervalMs?: number): Promise<TestSuiteExecutionResult>;
  executeTestSuiteByName(testSuiteName: string, options?: Partial<TestSuiteExecutionRequest>): Promise<TestSuiteExecutionResponse>;
  executeTestSuiteByNameAndWait(testSuiteName: string, options?: Partial<TestSuiteExecutionRequest>, pollIntervalMs?: number): Promise<TestSuiteExecutionResult>;
}

export class Atf extends AuthenticatedCommand<typeof Atf> {

  static args = {
  }
static description = 'Execute ATF (Automated Test Framework) tests or test suites on a ServiceNow instance.\n\n' +
    'This command allows you to run automated tests and test suites remotely, making it perfect for CI/CD pipelines ' +
    'and automated testing workflows. You can execute individual tests, entire test suites, and configure execution ' +
    'parameters such as browser type, OS, and performance mode.\n\n' +
    'Features:\n' +
    '  • Execute individual tests or complete test suites\n' +
    '  • Real-time progress monitoring\n' +
    '  • JSON output for CI/CD integration\n' +
    '  • Detailed test results and summaries\n' +
    '  • Browser and environment configuration\n' +
    '  • Performance testing mode support';
static examples = [
    {
      description: 'Execute a single ATF test by sys_id',
      command: '<%= config.bin %> <%= command.id %> --test-id f717a8c783103210621e78c6feaad396 --auth dev-instance',
    },
    {
      description: 'Execute a test suite by sys_id and wait for completion',
      command: '<%= config.bin %> <%= command.id %> --suite-id e077e00b83103210621e78c6feaad383 --auth dev-instance --wait',
    },
    {
      description: 'Execute a test suite by name',
      command: '<%= config.bin %> <%= command.id %> --suite-name "Smoke Tests" --auth dev-instance',
    },
    {
      description: 'Execute with specific browser configuration',
      command: '<%= config.bin %> <%= command.id %> --suite-id e077e00b83103210621e78c6feaad383 --browser chrome --auth dev-instance',
    },
    {
      description: 'Execute as performance test with JSON output for CI/CD',
      command: '<%= config.bin %> <%= command.id %> --suite-id e077e00b83103210621e78c6feaad383 --performance --json --auth dev-instance',
    },
    {
      description: 'Execute with custom poll interval (10 seconds)',
      command: '<%= config.bin %> <%= command.id %> --suite-id e077e00b83103210621e78c6feaad383 --poll-interval 10000 --auth dev-instance',
    },
  ]
static flags = {
    'test-id': Flags.string({
      char: 't',
      description: 'Test sys_id to execute',
      required: false,
      exclusive: ['suite-id', 'suite-name']
    }),
    'suite-id': Flags.string({
      char: 's',
      description: 'Test Suite sys_id to execute',
      required: false,
      exclusive: ['test-id', 'suite-name']
    }),
    'suite-name': Flags.string({
      char: 'n',
      description: 'Test Suite name to execute',
      required: false,
      exclusive: ['test-id', 'suite-id']
    }),
    'wait': Flags.boolean({
      char: 'w',
      description: 'Wait for test suite execution to complete and return results',
      required: false,
      default: true
    }),
    'poll-interval': Flags.integer({
      char: 'p',
      description: 'Polling interval in milliseconds when waiting for completion',
      required: false,
      default: 5000
    }),
    'browser': Flags.string({
      char: 'b',
      description: 'Browser name for test execution (e.g., chrome, firefox)',
      required: false
    }),
    'browser-version': Flags.string({
      description: 'Browser version for test execution',
      required: false
    }),
    'os-name': Flags.string({
      description: 'Operating system name for test execution',
      required: false
    }),
    'os-version': Flags.string({
      description: 'Operating system version for test execution',
      required: false
    }),
    'performance': Flags.boolean({
      description: 'Run as performance test',
      required: false,
      default: false
    }),
    'cloud': Flags.boolean({
      description: 'Run in cloud',
      required: false,
      default: false
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false
    })
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Atf);
    const resultFormatter = new AtfResultFormatterService();

    // Validate that at least one execution option is provided
    if (isNilOrEmpty(flags['test-id']) && isNilOrEmpty(flags['suite-id']) && isNilOrEmpty(flags['suite-name'])) {
      this.error('You must specify either --test-id, --suite-id, or --suite-name');
      return;
    }

    try {
      const executor: ExtendedATFTestExecutor = new ATFTestExecutor(this.instance) as ExtendedATFTestExecutor;

      // Execute single test
      if (!isNilOrEmpty(flags['test-id'])) {
        this.log(`Executing ATF test: ${flags['test-id']}`);
        const result: TestResult = await executor.executeTest(flags['test-id'] as string);

        if (!result) {
          this.error('Failed to execute test or retrieve test results.');
          return;
        }

        const lines = resultFormatter.formatTestResult(result, flags.json);
        for (const line of lines) {
          flags.json ? console.log(line) : this.log(line);
        }

        if (!flags.json && result.status !== 'success') {
          this.exit(1);
        }
      }
      // Execute test suite by sys_id
      else if (!isNilOrEmpty(flags['suite-id'])) {
        this.log(`Executing ATF test suite by sys_id: ${flags['suite-id']}`);
        const options = resultFormatter.buildExecutionOptions(flags);

        if (flags.wait) {
          const result: TestSuiteExecutionResult = await executor.executeTestSuiteAndWait(
            flags['suite-id'] as string, options, flags['poll-interval']
          );

          if (!result) {
            this.error('Failed to execute test suite or retrieve results.');
            return;
          }

          const lines = resultFormatter.formatTestSuiteResult(result, flags.json);
          for (const line of lines) {
            flags.json ? console.log(line) : this.log(line);
          }

          if (Number.parseInt(result.failure_count || '0', 10) > 0 || Number.parseInt(result.error_count || '0', 10) > 0) {
            this.exit(1);
          }
        }
      }
      // Execute test suite by name
      else if (!isNilOrEmpty(flags['suite-name'])) {
        this.log(`Executing ATF test suite by name: ${flags['suite-name']}`);
        const options = resultFormatter.buildExecutionOptions(flags);

        if (flags.wait) {
          const result: TestSuiteExecutionResult = await executor.executeTestSuiteByNameAndWait(
            flags['suite-name'] as string, options, flags['poll-interval']
          );

          if (!result) {
            this.error('Failed to execute test suite or retrieve results.');
            return;
          }

          const lines = resultFormatter.formatTestSuiteResult(result, flags.json);
          for (const line of lines) {
            flags.json ? console.log(line) : this.log(line);
          }

          if (Number.parseInt(result.failure_count || '0', 10) > 0 || Number.parseInt(result.error_count || '0', 10) > 0) {
            this.exit(1);
          }
        }
      }

    } catch (error) {
      this._logger.error("Error occurred when executing ATF test/suite.", error as Error);
      this.error(error as Error);
    }
  }
}
