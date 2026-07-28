import { describe, it, expect } from '@jest/globals'
import { AtfResultFormatterService } from '../../src/services/atf-result-formatter.service.js'

describe('AtfResultFormatterService', () => {
  const formatter = new AtfResultFormatterService()

  describe('formatTestResult', () => {
    const successResult = {
      test_name: 'Verify Login Flow',
      status: 'success',
      run_time: '12.5s',
      test: { value: 'abc123', display_value: 'Verify Login Flow' },
      sys_id: 'result-001',
      output: 'All steps passed',
    }

    const failedResult = {
      test_name: 'Verify Error Handler',
      status: 'failure',
      run_time: '3.2s',
      test: { value: 'def456', display_value: 'Verify Error Handler' },
      sys_id: 'result-002',
      output: 'Step 3 failed: element not found',
    }

    it('should format successful test result as text', () => {
      const lines = formatter.formatTestResult(successResult as any, false)
      const output = lines.join('\n')

      expect(output).toContain('=== Test Execution Results ===')
      expect(output).toContain('Test Name: Verify Login Flow')
      expect(output).toContain('Status: success')
      expect(output).toContain('Run Time: 12.5s')
      expect(output).toContain('Test Sys ID: abc123')
      expect(output).toContain('Result Sys ID: result-001')
      expect(output).toContain('All steps passed')
      expect(output).toContain('=== Execution Complete ===')
      expect(output).not.toContain('✗')
    })

    it('should format failed test result with failure indicator', () => {
      const lines = formatter.formatTestResult(failedResult as any, false)
      const output = lines.join('\n')

      expect(output).toContain('Status: failure')
      expect(output).toContain('Step 3 failed: element not found')
      expect(output).toContain('✗ Test failed')
    })

    it('should format test result as JSON', () => {
      const lines = formatter.formatTestResult(successResult as any, true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed.test_name).toBe('Verify Login Flow')
      expect(parsed.status).toBe('success')
      expect(parsed.sys_id).toBe('result-001')
    })

    it('should handle test result without output', () => {
      const noOutputResult = { ...successResult, output: '' }
      const lines = formatter.formatTestResult(noOutputResult as any, false)
      const output = lines.join('\n')

      expect(output).toContain('Test Name: Verify Login Flow')
      expect(output).not.toContain('--- Output ---')
    })
  })

  describe('formatTestSuiteResult', () => {
    const allPassedResult = {
      end_time: '2025-10-12T10:31:00.000Z',
      error_count: '0',
      failure_count: '0',
      number: 'SUITE0001',
      run_time: '45.0s',
      skip_count: '1',
      start_time: '2025-10-12T10:30:00.000Z',
      status: 'success',
      success: 'true',
      success_count: '5',
      sys_id: 'suite-result-001',
      test_suite: { value: 'suite-abc', display_value: 'Smoke Tests' },
    }

    const someFailedResult = {
      end_time: '2025-10-12T10:31:00.000Z',
      error_count: '0',
      failure_count: '2',
      number: 'SUITE0002',
      run_time: '30.0s',
      skip_count: '0',
      start_time: '2025-10-12T10:30:00.000Z',
      status: 'failure',
      success: 'false',
      success_count: '3',
      sys_id: 'suite-result-002',
      test_suite: { value: 'suite-def', display_value: 'Full Regression' },
    }

    it('should format all-passed suite result as text', () => {
      const lines = formatter.formatTestSuiteResult(allPassedResult as any, false)
      const output = lines.join('\n')

      expect(output).toContain('=== Test Suite Execution Results ===')
      expect(output).toContain('Test Suite: suite-abc')
      expect(output).toContain('Status: success')
      expect(output).toContain('Success: true')
      expect(output).toContain('Run Time: 45.0s')
      expect(output).toContain('Total Tests: 6')
      expect(output).toContain('Passed: 5')
      expect(output).toContain('Failed: 0')
      expect(output).toContain('Skipped: 1')
      expect(output).toContain('Errors: 0')
      expect(output).toContain('✓ All tests passed!')
      expect(output).not.toContain('✗')
    })

    it('should format suite result with failures', () => {
      const lines = formatter.formatTestSuiteResult(someFailedResult as any, false)
      const output = lines.join('\n')

      expect(output).toContain('Failed: 2')
      expect(output).toContain('✗ 2 test(s) failed, 0 error(s)')
      expect(output).not.toContain('✓ All tests passed!')
    })

    it('should compute total tests from count fields', () => {
      const lines = formatter.formatTestSuiteResult(allPassedResult as any, false)
      const output = lines.join('\n')

      // 5 success + 0 failure + 1 skip + 0 error = 6
      expect(output).toContain('Total Tests: 6')
    })

    it('should include time information', () => {
      const lines = formatter.formatTestSuiteResult(allPassedResult as any, false)
      const output = lines.join('\n')

      expect(output).toContain('Start Time: 2025-10-12T10:30:00.000Z')
      expect(output).toContain('End Time: 2025-10-12T10:31:00.000Z')
    })

    it('should format suite result as JSON', () => {
      const lines = formatter.formatTestSuiteResult(allPassedResult as any, true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed.success_count).toBe('5')
      expect(parsed.failure_count).toBe('0')
      expect(parsed.error_count).toBe('0')
      expect(parsed.status).toBe('success')
    })
  })

  describe('buildExecutionOptions', () => {
    it('should build options with browser name', () => {
      const options = formatter.buildExecutionOptions({ browser: 'chrome' })
      expect(options.browser_name).toBe('chrome')
    })

    it('should build options with all flags', () => {
      const options = formatter.buildExecutionOptions({
        'browser': 'firefox',
        'browser-version': '120',
        'os-name': 'Windows',
        'os-version': '11',
        'performance': true,
        'cloud': true,
      })

      expect(options.browser_name).toBe('firefox')
      expect(options.browser_version).toBe('120')
      expect(options.os_name).toBe('Windows')
      expect(options.os_version).toBe('11')
      expect(options.is_performance_run).toBe(true)
      expect(options.run_in_cloud).toBe(true)
    })

    it('should omit undefined flags', () => {
      const options = formatter.buildExecutionOptions({})
      expect(options).toEqual({})
    })

    it('should handle performance=false explicitly', () => {
      const options = formatter.buildExecutionOptions({ performance: false })
      expect(options.is_performance_run).toBe(false)
    })

    it('should handle cloud=false explicitly', () => {
      const options = formatter.buildExecutionOptions({ cloud: false })
      expect(options.run_in_cloud).toBe(false)
    })

    it('should only include specified flags', () => {
      const options = formatter.buildExecutionOptions({ browser: 'chrome' })
      expect(options).toEqual({ browser_name: 'chrome' })
      expect(options).not.toHaveProperty('browser_version')
      expect(options).not.toHaveProperty('os_name')
    })
  })
})
