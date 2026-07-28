import type { ReferenceLink, TestResult } from '@sonisoft/now-sdk-ext-core';

export interface TestSuiteExecutionRequest {
  browser_name?: string;
  browser_version?: string;
  is_performance_run?: boolean;
  os_name?: string;
  os_version?: string;
  run_in_cloud?: boolean;
  test_suite_name?: string;
  test_suite_sys_id?: string;
}

export interface TestSuiteExecutionResponse {
  error: string;
  links: {
    progress: {
      id: string;
      url: string;
    };
    results?: {
      id: string;
      url: string;
    };
  };
  percent_complete: number;
  status: string;
  status_detail: string;
  status_label: string;
  status_message: string;
}

export interface TestSuiteExecutionResult {
  base_suite_result: ReferenceLink;
  end_time: string;
  error_count: string;
  execution_tracker: ReferenceLink;
  failure_count: string;
  number: string;
  parent: string;
  run_time: string;
  schedule_run: ReferenceLink;
  skip_count: string;
  start_time: string;
  status: string;
  success: string;
  success_count: string;
  sys_id: string;
  test_suite: ReferenceLink;
}

export class AtfResultFormatterService {
  /**
   * Build execution options from command flags.
   */
  buildExecutionOptions(flags: Record<string, unknown>): Partial<TestSuiteExecutionRequest> {
    const options: Partial<TestSuiteExecutionRequest> = {};

    if (flags.browser) options.browser_name = flags.browser as string;
    if (flags['browser-version']) options.browser_version = flags['browser-version'] as string;
    if (flags['os-name']) options.os_name = flags['os-name'] as string;
    if (flags['os-version']) options.os_version = flags['os-version'] as string;
    if (flags.performance !== undefined) options.is_performance_run = flags.performance as boolean;
    if (flags.cloud !== undefined) options.run_in_cloud = flags.cloud as boolean;

    return options;
  }

  /**
   * Format a single test result for display.
   * Returns lines to output, or a JSON string if jsonOutput is true.
   */
  formatTestResult(result: TestResult, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];
    lines.push('\n=== Test Execution Results ===');
    lines.push(`Test Name: ${result.test_name}`);
    lines.push(`Status: ${result.status}`);
    lines.push(`Run Time: ${result.run_time}`);
    lines.push(`Test Sys ID: ${result.test.value}`);
    lines.push(`Result Sys ID: ${result.sys_id}`);

    if (result.output) {
      lines.push('\n--- Output ---');
      lines.push(result.output);
    }

    lines.push('\n=== Execution Complete ===');

    if (result.status !== 'success') {
      lines.push('\n✗ Test failed');
    }

    return lines;
  }

  /**
   * Format test suite execution results for display.
   * Returns lines to output, or a JSON string if jsonOutput is true.
   */
  formatTestSuiteResult(result: TestSuiteExecutionResult, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const successCount = Number.parseInt(result.success_count || '0', 10);
    const failureCount = Number.parseInt(result.failure_count || '0', 10);
    const skipCount = Number.parseInt(result.skip_count || '0', 10);
    const errorCount = Number.parseInt(result.error_count || '0', 10);
    const totalTests = successCount + failureCount + skipCount + errorCount;

    const lines: string[] = [];
    lines.push('\n=== Test Suite Execution Results ===');
    lines.push(`Test Suite: ${result.test_suite.value}`);
    lines.push(`Status: ${result.status}`);
    lines.push(`Success: ${result.success}`);
    lines.push(`Run Time: ${result.run_time}`);
    lines.push(`Start Time: ${result.start_time}`);
    lines.push(`End Time: ${result.end_time}`);
    lines.push('\n--- Test Summary ---');
    lines.push(`Total Tests: ${totalTests}`);
    lines.push(`Passed: ${successCount}`);
    lines.push(`Failed: ${failureCount}`);
    lines.push(`Skipped: ${skipCount}`);
    lines.push(`Errors: ${errorCount}`);

    lines.push('\n=== Execution Complete ===');

    if (failureCount === 0 && errorCount === 0) {
      lines.push('\n✓ All tests passed!');
    } else {
      lines.push(`\n✗ ${failureCount} test(s) failed, ${errorCount} error(s)`);
    }

    return lines;
  }
}
