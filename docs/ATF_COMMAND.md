# ATF Command Documentation

## Overview

The `atf` command allows you to execute ATF (Automated Test Framework) tests and test suites directly from the command line on a ServiceNow instance.

## Features

- Execute individual ATF tests by sys_id
- Execute ATF test suites by sys_id or name
- Wait for test completion and display results
- JSON output support for CI/CD integration
- Configurable execution options (browser, OS, performance mode, cloud execution)
- Comprehensive error handling
- Exit codes for CI/CD pipelines (0 for success, 1 for failures)

## Command Structure

```bash
nex atf [OPTIONS]
```

## Basic Usage

### Execute a Single Test

```bash
# Execute a test by test sys_id
nex atf --test-id f717a8c783103210621e78c6feaad396 --auth dev209219
```

### Execute a Test Suite

```bash
# Execute a test suite by suite sys_id
nex atf --suite-id e077e00b83103210621e78c6feaad383 --auth dev209219 --wait

# Execute a test suite by name
nex atf --suite-name "My Test Suite" --auth dev209219 --wait
```

## Options

### Required Options (choose one)

- `-t, --test-id <value>` - Test sys_id to execute
- `-s, --suite-id <value>` - Test Suite sys_id to execute
- `-n, --suite-name <value>` - Test Suite name to execute

### Authentication

- `-a, --auth <value>` - Auth alias to use (configured via ServiceNow SDK CLI)

### Execution Control

- `-w, --wait` - Wait for test suite execution to complete and return results (default: true)
- `-p, --poll-interval <value>` - Polling interval in milliseconds when waiting for completion (default: 5000)

### Test Configuration

- `-b, --browser <value>` - Browser name for test execution (e.g., chrome, firefox)
- `--browser-version <value>` - Browser version for test execution
- `--os-name <value>` - Operating system name for test execution
- `--os-version <value>` - Operating system version for test execution
- `--performance` - Run as performance test
- `--cloud` - Run in cloud

### Output

- `-j, --json` - Output results as JSON (useful for CI/CD integration)

### Global Options

- `--log-level <option>` - Specify level for logging (debug|warn|error|info|trace) (default: info)

## Examples

### Execute a Single Test with JSON Output

```bash
nex atf --test-id f717a8c783103210621e78c6feaad396 --auth dev209219 --json
```

**Output Example:**
```json
{
  "sys_id": "abc123",
  "test_name": "My ATF Test",
  "status": "success",
  "run_time": "00:00:05",
  "test": {
    "link": "https://instance.service-now.com/api/now/table/sys_atf_test/xyz789",
    "value": "xyz789"
  },
  "output": "Test completed successfully"
}
```

### Execute a Test Suite with Browser Configuration

```bash
nex atf --suite-id e077e00b83103210621e78c6feaad383 \
  --auth dev209219 \
  --browser chrome \
  --wait \
  --poll-interval 10000
```

**Output Example:**
```
Executing ATF test suite by sys_id: e077e00b83103210621e78c6feaad383

=== Test Suite Execution Results ===
Test Suite: xyz789
Status: success
Duration: 00:02:30
Start Time: 2025-10-07 10:30:00
End Time: 2025-10-07 10:32:30

--- Test Summary ---
Total Tests: 5
Passed: 5
Failed: 0
Skipped: 0

=== Execution Complete ===

✓ All tests passed!
```

### Execute Test Suite as Performance Test

```bash
nex atf --suite-id e077e00b83103210621e78c6feaad383 \
  --auth dev209219 \
  --performance \
  --wait
```

### Use in CI/CD Pipeline

```bash
#!/bin/bash

# Execute test suite and capture exit code
nex atf --suite-id e077e00b83103210621e78c6feaad383 --auth dev209219 --json > test_results.json

# Check exit code (0 = success, 1 = failures)
if [ $? -eq 0 ]; then
  echo "All tests passed!"
  exit 0
else
  echo "Tests failed!"
  cat test_results.json
  exit 1
fi
```

## Exit Codes

- `0` - Success (all tests passed)
- `1` - Failure (one or more tests failed or execution error)

## Test Results

### Single Test Results

When executing a single test, the command displays:
- Test Name
- Status (success, failed, error, etc.)
- Run Time
- Test Sys ID
- Result Sys ID
- Output (if available)

### Test Suite Results

When executing a test suite, the command displays:
- Test Suite ID
- Status
- Duration
- Start/End Times
- Test Summary:
  - Total Tests
  - Passed Tests
  - Failed Tests
  - Skipped Tests
- Output (if available)

## Integration Tests

Integration tests are provided in `test/commands/atf/index.test.ts` with the following test IDs:

- **Test ID**: `f717a8c783103210621e78c6feaad396`
- **Test Suite ID**: `e077e00b83103210621e78c6feaad383`
- **Auth Alias**: `dev209219`

Run integration tests with:

```bash
npm test -- test/commands/atf/index.test.ts
```

## Implementation Details

### File Structure

```
src/commands/atf/
  └── index.ts              # Main ATF command implementation

test/commands/atf/
  └── index.test.ts         # Unit and integration tests
```

### Dependencies

The command uses the `ATFTestExecutor` class from `@sonisoft/now-sdk-ext-core` package, which provides:
- `executeTest()` - Execute a single ATF test
- `executeTestSuite()` - Execute a test suite by sys_id
- `executeTestSuiteByName()` - Execute a test suite by name
- `executeTestSuiteAndWait()` - Execute and wait for test suite completion
- `executeTestSuiteByNameAndWait()` - Execute by name and wait for completion

### Type Definitions

The command includes local type definitions for test suite execution to work around outdated TypeScript definitions in the core package:
- `TestSuiteExecutionRequest`
- `TestSuiteExecutionResponse`
- `TestSuiteExecutionResult`
- `ExtendedATFTestExecutor`

## Error Handling

The command handles various error scenarios:

1. **Missing Parameters**: Error if no test-id, suite-id, or suite-name is provided
2. **Exclusive Flags**: Error if multiple execution options are provided simultaneously
3. **Invalid IDs**: Graceful error handling for invalid test or suite IDs
4. **Authentication Errors**: Clear error messages for authentication failures
5. **Execution Errors**: Detailed error logging for test execution failures

## Troubleshooting

### Authentication Issues

If you get authentication errors:
1. Verify your authentication is configured: `now-sdk auth --list`
2. Set a default authentication profile: `now-sdk auth --use <alias>`
3. Ensure credentials are valid by deleting and re-adding: `now-sdk auth --delete <alias>` then `now-sdk auth --add <instance> --type basic --alias <alias>`

### Test Not Found

If you get "test not found" errors:
1. Verify the test/suite sys_id is correct
2. Check you have access to the test/suite on the instance
3. Ensure the instance is accessible

### Timeout Issues

If tests timeout:
1. Increase the poll interval: `--poll-interval 10000`
2. Check the test execution progress in ServiceNow UI
3. Review ServiceNow instance performance

## Contributing

When extending this command:
1. Update type definitions if core package types change
2. Add comprehensive test coverage
3. Update documentation
4. Follow existing code patterns

