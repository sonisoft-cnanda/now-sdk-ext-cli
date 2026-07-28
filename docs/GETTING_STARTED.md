# Getting Started with now-sdk-ext-cli

This guide will help you get started with `now-sdk-ext-cli` (command: `nex`) and walk you through common use cases.

## Table of Contents

- [Installation](#installation)
- [Setting Up Authentication](#setting-up-authentication)
- [Your First Commands](#your-first-commands)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites

Before installing `now-sdk-ext-cli`, ensure you have:

1. **Node.js 18.0.0 or higher** (Node.js 22.x LTS recommended)
   ```bash
   node --version
   ```

2. **ServiceNow SDK CLI** (for credential management)
   ```bash
   npm install @servicenow/sdk
   ```
   
   You can use the SDK locally with `npx now-sdk` or install it globally with `-g` flag.

### Install now-sdk-ext-cli

Install globally for system-wide access:

```bash
npm install -g @sonisoft/now-sdk-ext-cli
```

Verify the installation:

```bash
nex --version
nex --help
```

## Setting Up Authentication

`now-sdk-ext-cli` leverages the ServiceNow SDK for authentication management. Before using any commands, you must configure authentication profiles using the ServiceNow SDK CLI.

### Understanding Authentication

This CLI extension does not manage credentials directly. Instead, it uses authentication profiles configured via the **ServiceNow SDK CLI** (`snc` command). This approach:
- Provides secure credential storage in your system's keychain
- Enables centralized authentication management
- Allows multiple instance profiles
- Supports both interactive and non-interactive configuration

### Prerequisites

Ensure you have the ServiceNow SDK installed:

```bash
npm install -g @servicenow/sdk
```

Verify installation:

```bash
now-sdk --version
```

### Step 1: Add Authentication Credentials

**Interactive Setup (Recommended)**

The easiest way to add credentials is using the interactive mode:

```bash
now-sdk auth --add your-instance.service-now.com --type basic --alias my-dev
```

This will prompt you for:
- **Username**
- **Password** (input is hidden and stored securely in system keychain)

**Non-Interactive Setup**

For automation and CI/CD, you can provide credentials via environment variables:

```bash
# Set credentials in environment
export NOWSDK_INSTANCE=your-instance.service-now.com
export NOWSDK_USER=your.username  
export NOWSDK_PASSWORD=your-password

# Add profile (will use environment variables if available)
now-sdk auth --add $NOWSDK_INSTANCE --type basic --alias my-dev
```

**OAuth Authentication**

For OAuth-based authentication:

```bash
now-sdk auth --add your-instance.service-now.com --type oauth --alias my-dev-oauth
```

### Step 2: Set a Default Profile (Optional)

If you primarily work with one instance, set it as the default:

```bash
now-sdk auth --use my-dev
```

With a default profile set, you can omit the `--auth` flag in commands.

### Step 3: Verify Your Configuration

```bash
# List all configured authentication profiles
now-sdk auth --list
```

Example output:
```
Available authentication credentials:
  * my-dev (default)
    production
    test-instance
```

### Credential Storage

Credentials are securely stored in your operating system's keychain/credential manager:
- **macOS**: Keychain
- **Linux**: Secret Service API (libsecret)
- **Windows**: Credential Vault

Only authentication metadata (alias, instance URL, type) is stored in plain text configuration files.

## Your First Commands

### 1. Execute Your First Script

Create a simple test script:

```javascript
// test-script.js
gs.info('Hello from nex!');
gs.info('Current user: ' + gs.getUserName());
gs.info('Instance: ' + gs.getProperty('instance_name'));
```

Execute it:

```bash
nex exec global ./test-script.js --auth my-dev
```

### 2. Run an ATF Test

If you have ATF tests configured, run one:

```bash
# Get a test sys_id from your ServiceNow instance
# Navigate to: System Applications > Automated Test Framework > Tests

nex atf --test-id YOUR_TEST_SYS_ID --auth my-dev
```

### 3. Check Application Status

List what commands are available:

```bash
nex --help
nex app --help
nex atf --help
nex exec --help
```

## Common Workflows

### Workflow 1: Automated Testing in Development

```bash
#!/bin/bash
# daily-tests.sh - Run daily smoke tests

echo "Running daily smoke tests..."

# Run smoke test suite
nex atf \
  --suite-name "Daily Smoke Tests" \
  --auth dev-instance \
  --json > test-results-$(date +%Y%m%d).json

# Check exit code
if [ $? -eq 0 ]; then
  echo "✓ All tests passed!"
else
  echo "✗ Tests failed! Check test-results-$(date +%Y%m%d).json"
  exit 1
fi
```

### Workflow 2: Environment Setup

```bash
#!/bin/bash
# setup-environment.sh - Set up a new development environment

echo "Setting up development environment..."

# Install required applications
nex app install \
  --batch \
  --definitionPath ./config/dev-apps.json \
  --auth new-dev-instance

# Run configuration script
nex exec global ./scripts/configure-instance.js --auth new-dev-instance

# Run validation tests
nex atf \
  --suite-name "Environment Validation" \
  --auth new-dev-instance

echo "Environment setup complete!"
```

### Workflow 3: Data Migration

```bash
#!/bin/bash
# migrate-data.sh - Migrate data from one instance to another

echo "Starting data migration..."

# Export data from source
echo "Exporting data..."
nex exec global ./scripts/export-data.js --auth source-instance > data-export.json

# Import data to target
echo "Importing data..."
nex exec global ./scripts/import-data.js --auth target-instance < data-export.json

# Validate migration
echo "Validating..."
nex atf --suite-name "Migration Validation" --auth target-instance

echo "Migration complete!"
```

### Workflow 4: Continuous Integration

**GitHub Actions Example:**

```yaml
# .github/workflows/servicenow-ci.yml
name: ServiceNow CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install Tools
        run: |
          npm install @servicenow/sdk
          npm install -g @sonisoft/now-sdk-ext-cli
      
      - name: Configure ServiceNow Authentication
        env:
          NOWSDK_INSTANCE: ${{ secrets.SN_INSTANCE }}
          NOWSDK_USER: ${{ secrets.SN_USER }}
          NOWSDK_PASSWORD: ${{ secrets.SN_PASSWORD }}
        run: |
          now-sdk auth --add $NOWSDK_INSTANCE --type basic --alias ci
      
      - name: Run Tests
        run: |
          nex atf \
            --suite-id ${{ vars.TEST_SUITE_ID }} \
            --auth ci \
            --json > results.json
      
      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: results.json
```

### Workflow 5: Batch Application Management

Create a batch definition file:

```json
// production-apps.json
{
  "applications": [
    {
      "name": "Core Application",
      "scope": "x_core_app",
      "version": "2.0.0",
      "load_demo_data": false,
      "notes": "Production release v2.0.0"
    },
    {
      "name": "API Integration",
      "scope": "x_api_integration",
      "version": "1.3.0",
      "load_demo_data": false,
      "notes": "Bug fix release"
    }
  ]
}
```

Deploy to production:

```bash
# Install/upgrade applications
nex app install \
  --batch \
  --definitionPath ./production-apps.json \
  --auth production

# Run smoke tests
nex atf \
  --suite-name "Production Smoke Tests" \
  --auth production \
  --json > smoke-test-results.json
```

## Advanced Usage

### Using Environment Variables

```bash
# Set auth alias via environment
export NEX_AUTH_ALIAS=my-dev

# Now you can omit --auth flag
nex atf --test-id xyz123
nex exec global ./script.js
```

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
nex atf \
  --test-id xyz123 \
  --auth my-dev \
  --log-level debug
```

### Piping and Redirecting

```bash
# Save output to file
nex exec global ./report.js --auth my-dev > report.txt

# Pipe to grep
nex exec global ./list-users.js --auth my-dev | grep "admin"

# Pipe to jq for JSON processing
nex atf --test-id xyz --auth my-dev --json | jq '.status'
```

## Troubleshooting

### Issue: "Command not found"

**Solution:**
```bash
# Check if installed
npm list -g @sonisoft/now-sdk-ext-cli

# Reinstall if needed
npm install -g @sonisoft/now-sdk-ext-cli

# Check npm global path is in PATH
echo $PATH
npm config get prefix
```

### Issue: "Authentication failed"

**Solution:**
```bash
# List all configured authentication profiles
now-sdk auth --list

# Delete and re-add credentials if needed
now-sdk auth --delete my-dev
now-sdk auth --add your-instance.service-now.com --type basic --alias my-dev

# Set as default if needed
now-sdk auth --use my-dev
```

### Issue: "Permission denied" when executing scripts

**Solution:**
- Verify your user has appropriate roles in ServiceNow
- Check scope access permissions
- Ensure the script syntax is correct
- Try with `--log-level debug` to see detailed errors

### Issue: Tests timeout

**Solution:**
```bash
# Increase poll interval
nex atf \
  --suite-id xyz \
  --auth my-dev \
  --poll-interval 15000
```

### Issue: Script execution errors

**Solution:**
1. Test the script in ServiceNow Scripts - Background first
2. Check for syntax errors
3. Verify scope has necessary permissions
4. Use debug logging:
   ```bash
   nex exec global ./script.js --auth my-dev --log-level debug
   ```

## Best Practices

### Security

1. **Never commit credentials** to version control
2. Use environment variables in CI/CD pipelines
3. Create dedicated service accounts for automation
4. Regularly rotate passwords
5. Use least-privilege access

### Testing

1. Always test in development first
2. Use ATF for regression testing
3. Maintain test data fixtures
4. Document test prerequisites
5. Archive test results

### Scripts

1. Add error handling in scripts
2. Use try-catch blocks
3. Log important operations
4. Test scripts in isolation
5. Document script purpose and usage

### CI/CD

1. Use JSON output mode
2. Check exit codes
3. Archive test results as artifacts
4. Implement retry logic for flaky tests
5. Use separate instances for CI/CD

## Next Steps

- Read the [ATF Command Documentation](./ATF_COMMAND.md)
- Explore the [API Reference](./API_REFERENCE.md)
- Join the community discussions
- Contribute to the project

## Getting Help

- **Command Help**: `nex COMMAND --help`
- **Issues**: [GitHub Issues](https://github.com/sonisoft/now-sdk-ext-cli/issues)
- **Documentation**: [GitHub Wiki](https://github.com/sonisoft/now-sdk-ext-cli/wiki)

---

Happy automating! 🚀

