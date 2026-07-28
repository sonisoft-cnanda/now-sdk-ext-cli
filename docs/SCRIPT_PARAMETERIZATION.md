# Script Parameterization

## Overview

The `nex exec` command supports script parameterization, allowing you to create reusable script templates with placeholders that get replaced at runtime. This is perfect for CI/CD pipelines, environment-specific configurations, and automated workflows.

## Quick Start

### Create a Template Script

**File: `query-user.js`**
```javascript
var gr = new GlideRecord('sys_user');
gr.addQuery('user_name', '{username}');
gr.query();

if (gr.next()) {
  gs.info('User: ' + gr.getValue('name'));
  gs.info('Email: ' + gr.getValue('email'));
  gs.info('Active: ' + gr.getValue('active'));
}
```

### Execute with Parameters

```bash
nex exec global ./query-user.js \
  --auth dev \
  --params '{"username":"admin"}'
```

The `{username}` placeholder will be replaced with `admin` before execution.

## Syntax

### Placeholder Format

Use curly braces with parameter names:
```javascript
{paramName}
{token}
{api_key}
{environment}
```

### Parameters Flag

Provide parameters as a JSON object:
```bash
--params '{"paramName":"value"}'
```

**Short form:**
```bash
-p '{"token":"abc123"}'
```

## Examples

### Example 1: API Token Script

**Script: `api-call.js`**
```javascript
var request = new sn_ws.RESTMessageV2();
request.setEndpoint('{endpoint}');
request.setHttpMethod('GET');
request.setRequestHeader('Authorization', 'Bearer {token}');

var response = request.execute();
gs.info('Status: ' + response.getStatusCode());
gs.info('Body: ' + response.getBody());
```

**Execution:**
```bash
nex exec global ./api-call.js \
  --auth prod \
  --params '{"endpoint":"https://api.example.com/data","token":"secret_token_123"}'
```

### Example 2: Environment-Specific Configuration

**Script: `configure-app.js`**
```javascript
var config = {
  environment: '{env}',
  debugMode: {debug},
  maxRetries: {retries},
  apiUrl: '{api_url}'
};

gs.setProperty('x_my_app.config', JSON.stringify(config));
gs.info('Configuration updated for: ' + config.environment);
```

**Development:**
```bash
nex exec global ./configure-app.js \
  --auth dev \
  --params '{"env":"development","debug":true,"retries":5,"api_url":"https://dev-api.example.com"}'
```

**Production:**
```bash
nex exec global ./configure-app.js \
  --auth prod \
  --params '{"env":"production","debug":false,"retries":3,"api_url":"https://api.example.com"}'
```

### Example 3: Bulk Update Script

**Script: `bulk-update.js`**
```javascript
var gr = new GlideRecord('{table}');
gr.addQuery('{query_field}', '{query_value}');
gr.query();

var count = 0;
while (gr.next()) {
  gr.setValue('{update_field}', '{update_value}');
  gr.update();
  count++;
}

gs.info('Updated ' + count + ' records in {table}');
```

**Execution:**
```bash
nex exec global ./bulk-update.js \
  --auth dev \
  --params '{"table":"incident","query_field":"state","query_value":"7","update_field":"priority","update_value":"4"}'
```

### Example 4: User Creation Script

**Script: `create-user.js`**
```javascript
var user = new GlideRecord('sys_user');
user.initialize();
user.setValue('user_name', '{username}');
user.setValue('first_name', '{first_name}');
user.setValue('last_name', '{last_name}');
user.setValue('email', '{email}');
user.setValue('active', {active});

var userId = user.insert();
gs.info('Created user: ' + userId);
```

**Execution:**
```bash
nex exec global ./create-user.js \
  --auth dev \
  --params '{"username":"john.doe","first_name":"John","last_name":"Doe","email":"john.doe@example.com","active":true}'
```

## Advanced Usage

### Multiple Occurrences

Placeholders can appear multiple times and will all be replaced:

**Script:**
```javascript
gs.info('Token: {token}');
var authHeader = 'Bearer {token}';
var debugToken = '{token}';
gs.debug('Using token: {token}');
```

**Result:**
All 4 occurrences of `{token}` will be replaced.

### Different Data Types

#### Strings
```javascript
// Script
var name = '{name}';

// Params
--params '{"name":"John Doe"}'

// Result
var name = 'John Doe';
```

#### Numbers
```javascript
// Script
var timeout = {timeout};
var maxRetries = {retries};

// Params
--params '{"timeout":30000,"retries":3}'

// Result
var timeout = 30000;
var maxRetries = 3;
```

#### Booleans
```javascript
// Script
var enabled = {enabled};
var debugMode = {debug};

// Params
--params '{"enabled":true,"debug":false}'

// Result
var enabled = true;
var debugMode = false;
```

### Environment Variables in CI/CD

**GitHub Actions:**
```yaml
- name: Execute Parameterized Script
  env:
    API_TOKEN: ${{ secrets.API_TOKEN }}
    ENVIRONMENT: ${{ vars.ENVIRONMENT }}
  run: |
    nex exec global ./scripts/deploy.js \
      --auth prod \
      --params "{\"token\":\"$API_TOKEN\",\"env\":\"$ENVIRONMENT\"}"
```

**GitLab CI:**
```yaml
script:
  - |
    nex exec global ./scripts/deploy.js \
      --auth prod \
      --params "{\"token\":\"$API_TOKEN\",\"env\":\"$CI_ENVIRONMENT_NAME\"}"
```

### Complex JSON Values

You can pass JSON strings as parameter values:

**Script:**
```javascript
var config = '{config}';
gs.info('Config: ' + config);
```

**Execution:**
```bash
nex exec global ./script.js \
  --auth dev \
  --params '{"config":"{\"nested\":\"value\",\"count\":42}"}'
```

## Use Cases

### 1. Multi-Environment Deployments

Create one script, execute with different params for each environment:

```bash
# Development
nex exec global ./deploy.js --auth dev --params '{"env":"dev","url":"https://dev.api.com"}'

# Staging
nex exec global ./deploy.js --auth staging --params '{"env":"staging","url":"https://staging.api.com"}'

# Production
nex exec global ./deploy.js --auth prod --params '{"env":"prod","url":"https://api.com"}'
```

### 2. Automated Testing with Different Test Data

```bash
# Test with user 1
nex exec global ./test-user.js --auth test --params '{"userId":"user001","expectedRole":"admin"}'

# Test with user 2
nex exec global ./test-user.js --auth test --params '{"userId":"user002","expectedRole":"user"}'
```

### 3. Data Migration with Configuration

```bash
nex exec global ./migrate-data.js \
  --auth prod \
  --params '{"sourceTable":"old_table","targetTable":"new_table","batchSize":100}'
```

### 4. Scheduled Jobs with Dynamic Parameters

```bash
#!/bin/bash
# Daily cleanup script
TODAY=$(date +%Y-%m-%d)
nex exec global ./cleanup.js \
  --auth prod \
  --params "{\"date\":\"$TODAY\",\"daysToKeep\":90}"
```

## Best Practices

### 1. Use Descriptive Parameter Names

**Good:**
```javascript
var apiEndpoint = '{api_endpoint}';
var retryCount = {max_retries};
```

**Avoid:**
```javascript
var x = '{x}';
var a = {a};
```

### 2. Document Parameters in Script Comments

```javascript
/**
 * User Creation Script
 * 
 * Parameters:
 *   {username}   - User name for login
 *   {email}      - User email address
 *   {first_name} - User first name
 *   {last_name}  - User last name
 *   {active}     - Boolean: user active status
 */

var user = new GlideRecord('sys_user');
user.initialize();
user.setValue('user_name', '{username}');
user.setValue('email', '{email}');
// ... etc
```

### 3. Validate Parameters in Script

```javascript
var username = '{username}';
if (!username || username === '{username}') {
  gs.error('Username parameter not provided');
  return;
}

// Proceed with script
var gr = new GlideRecord('sys_user');
gr.addQuery('user_name', username);
// ...
```

### 4. Use Template Files

Create template files with clear naming:
```
scripts/
  ├── templates/
  │   ├── query-user.template.js
  │   ├── update-records.template.js
  │   └── deploy-app.template.js
  └── README.md (document required parameters)
```

### 5. Store Parameter Sets

Create JSON files for different scenarios:

**dev-params.json:**
```json
{
  "environment": "development",
  "api_url": "https://dev-api.example.com",
  "debug": true,
  "timeout": 60000
}
```

**Execution:**
```bash
PARAMS=$(cat dev-params.json)
nex exec global ./script.js --auth dev --params "$PARAMS"
```

## Parameter Rules

### Replacement Behavior

1. **Case-Sensitive**: `{Token}` ≠ `{token}`
2. **Exact Match**: Only exact placeholder matches are replaced
3. **All Occurrences**: All instances of a placeholder are replaced
4. **No Partial Match**: `{token}` won't match `{mytoken}`
5. **Preserves Formatting**: Whitespace and indentation maintained

### Data Type Conversion

All parameter values are converted to strings:
- Strings: Used as-is
- Numbers: Converted via `String(value)`
- Booleans: `true` → `"true"`, `false` → `"false"`
- Objects/Arrays: Converted via `String(value)` (use JSON strings instead)

## Error Handling

### Invalid JSON
```bash
# This will error
nex exec global ./script.js --auth dev --params '{invalid json}'

# Error: Invalid JSON in --params: Unexpected token...
```

### Non-Object Parameters
```bash
# These are technically valid JSON but not objects
nex exec global ./script.js --auth dev --params '"string"'     # String primitive
nex exec global ./script.js --auth dev --params '123'           # Number primitive
nex exec global ./script.js --auth dev --params 'null'          # Null

# All will throw error: Parameters must be a valid JSON object
```

### Missing Parameters

If a placeholder has no matching parameter, it remains unchanged:

**Script:**
```javascript
var token = '{token}';
var key = '{apiKey}';
```

**Execution:**
```bash
nex exec global ./script.js --auth dev --params '{"token":"abc123"}'
```

**Result:**
```javascript
var token = 'abc123';
var key = '{apiKey}';  // Unchanged - no apiKey in params
```

## CI/CD Integration

### GitHub Actions Example

**Workflow:**
```yaml
name: Deploy to ServiceNow

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup
        run: |
          npm install -g @servicenow/sdk
          npm install -g @sonisoft/now-sdk-ext-cli
          
      - name: Configure Auth
        env:
          NOWSDK_INSTANCE: ${{ secrets.SN_INSTANCE }}
          NOWSDK_USER: ${{ secrets.SN_USER }}
          NOWSDK_PASSWORD: ${{ secrets.SN_PASSWORD }}
        run: |
          now-sdk auth --add $NOWSDK_INSTANCE --type basic --alias ci
          
      - name: Deploy with Parameters
        env:
          API_TOKEN: ${{ secrets.API_TOKEN }}
          ENVIRONMENT: ${{ github.ref_name }}
        run: |
          nex exec global ./scripts/deploy.js \
            --auth ci \
            --params "{\"token\":\"$API_TOKEN\",\"env\":\"$ENVIRONMENT\",\"commit\":\"${{ github.sha }}\"}"
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    
    environment {
        SN_INSTANCE = credentials('servicenow-instance')
        SN_CREDENTIALS = credentials('servicenow-credentials')
        API_TOKEN = credentials('api-token')
    }
    
    stages {
        stage('Execute Script') {
            steps {
                sh '''
                    PARAMS=$(cat <<EOF
{
  "token": "${API_TOKEN}",
  "environment": "${ENVIRONMENT}",
  "build_number": "${BUILD_NUMBER}",
  "branch": "${GIT_BRANCH}"
}
EOF
)
                    nex exec global ./scripts/deploy.js \
                        --auth jenkins \
                        --params "$PARAMS"
                '''
            }
        }
    }
}
```

## Limitations

1. **No Nested Placeholder Evaluation**: `{outer{inner}}` won't work
2. **String Conversion**: Complex objects become `[object Object]`
3. **No Escaping**: Can't include literal `{param}` in output
4. **Case Sensitive**: `{Token}` and `{token}` are different
5. **No Default Values**: Missing parameters leave placeholder unchanged

## Workarounds

### For Complex Objects

Instead of passing objects directly, pass JSON strings:

**Script:**
```javascript
var configStr = '{config}';
var config = JSON.parse(configStr);
gs.info('Debug mode: ' + config.debugMode);
```

**Execution:**
```bash
nex exec global ./script.js \
  --auth dev \
  --params '{"config":"{\"debugMode\":true,\"timeout\":30000}"}'
```

### For Literal Braces

If you need literal `{something}` in your output, construct it differently:

**Instead of:**
```javascript
var pattern = '{pattern}';  // Will be replaced!
```

**Use:**
```javascript
var pattern = String.fromCharCode(123) + 'literal' + String.fromCharCode(125);
// Or
var pattern = ['', 'literal', ''].join('{') + '}';
```

### For Default Values

Handle missing parameters in your script:

```javascript
var token = '{token}';
if (token === '{token}') {
  // Parameter wasn't provided, use default
  token = 'default_token';
}
```

## Security Considerations

### Never Commit Secrets

**Bad:**
```bash
# DON'T commit this to git!
nex exec global ./script.js --params '{"password":"secret123"}'
```

**Good:**
```bash
# Use environment variables
export API_TOKEN=$(cat ~/.secrets/api-token)
nex exec global ./script.js --params "{\"token\":\"$API_TOKEN\"}"
```

### Use CI/CD Secret Management

**GitHub Actions:**
```yaml
- name: Execute with Secrets
  env:
    SECRET_TOKEN: ${{ secrets.SECRET_TOKEN }}
  run: |
    nex exec global ./script.js \
      --params "{\"token\":\"$SECRET_TOKEN\"}"
```

### Sanitize Logs

Parameters are logged in debug mode:

```bash
# Default: params not shown in output
nex exec global ./script.js --params '{"token":"secret"}'

# Debug mode: params visible in logs!
nex exec global ./script.js --params '{"token":"secret"}' --log-level debug
```

**⚠️ Warning**: Don't use `--log-level debug` with sensitive parameters in CI/CD!

## Testing Parameterized Scripts

### Test with Different Parameters

```bash
#!/bin/bash
# test-script.sh

echo "Testing with user1..."
nex exec global ./test-user.js --auth test --params '{"userId":"user001"}'

echo "Testing with user2..."
nex exec global ./test-user.js --auth test --params '{"userId":"user002"}'

echo "Testing with admin..."
nex exec global ./test-user.js --auth test --params '{"userId":"admin"}'
```

### Validate Parameter Replacement

```javascript
// In your script, log parameters for verification
gs.info('=== Parameters ===');
gs.info('Username: {username}');
gs.info('Environment: {environment}');
gs.info('==================');

// Check if parameters were actually replaced
if ('{username}'.indexOf('{') > -1) {
  gs.error('Parameters not provided!');
  return;
}
```

## Troubleshooting

### Issue: Placeholders Not Being Replaced

**Symptoms:**
```
*** Script: Token: {token}
```

**Causes:**
1. Forgot to provide `--params` flag
2. Parameter name mismatch (case-sensitive)
3. Typo in parameter name

**Solution:**
```bash
# Make sure parameter names match exactly
# Script has: {token}
# Params must have: "token" (not "Token" or "apiToken")
nex exec global ./script.js --params '{"token":"abc123"}'
```

### Issue: JSON Parse Error

**Symptoms:**
```
Error: Invalid JSON in --params: Unexpected token...
```

**Causes:**
1. Invalid JSON syntax
2. Unescaped quotes
3. Missing quotes around keys/values

**Solution:**
```bash
# Use single quotes around the JSON, double quotes inside
nex exec global ./script.js --params '{"key":"value"}'

# Or escape properly with double quotes
nex exec global ./script.js --params "{\"key\":\"value\"}"
```

### Issue: Parameter Values with Special Characters

**Problem:**
```bash
# This might cause issues
nex exec global ./script.js --params '{"msg":"It's a test"}'
```

**Solution:**
```bash
# Escape the apostrophe
nex exec global ./script.js --params '{"msg":"It'\''s a test"}'

# Or use a different quote style in JSON
nex exec global ./script.js --params "{\"msg\":\"It's a test\"}"
```

## Comparison with REPL Mode

| Feature | File Mode with Params | REPL Mode |
|---------|----------------------|-----------|
| Reusability | ✓✓✓ (save as templates) | - (manual copy) |
| Parameterization | ✓✓✓ (--params flag) | - (manual edit) |
| Version Control | ✓✓✓ (commit scripts) | - (ephemeral) |
| Quick Testing | - (need file) | ✓✓✓ (instant) |
| CI/CD Integration | ✓✓✓ | - |
| Multi-Environment | ✓✓✓ (same script, different params) | - |

## Real-World Example: Deployment Script

**Script: `deploy-app.js`**
```javascript
/**
 * Application Deployment Script
 * Parameters:
 *   {app_scope} - Application scope to deploy
 *   {version} - Target version number
 *   {environment} - Environment name (dev/test/prod)
 *   {rollback_enabled} - Boolean: enable rollback
 *   {notification_email} - Email for deployment notifications
 */

gs.info('=== Application Deployment ===');
gs.info('Scope: {app_scope}');
gs.info('Version: {version}');
gs.info('Environment: {environment}');
gs.info('============================');

// Update application configuration
var app = new GlideRecord('sys_app');
app.addQuery('scope', '{app_scope}');
app.query();

if (app.next()) {
  app.setValue('version', '{version}');
  app.setValue('deploy_environment', '{environment}');
  app.update();
  
  gs.info('✓ Application updated successfully');
  
  // Send notification
  var email = new GlideEmailOutbound();
  email.setSubject('Deployment: {app_scope} v{version} to {environment}');
  email.addAddress('{notification_email}');
  email.setBody('Deployment completed successfully.');
  email.send();
  
  gs.info('✓ Notification sent to {notification_email}');
} else {
  gs.error('✗ Application not found: {app_scope}');
}
```

**Execution:**
```bash
#!/bin/bash
# deploy.sh

APP_SCOPE="x_my_custom_app"
VERSION="2.1.0"
ENVIRONMENT="production"
EMAIL="devops@example.com"

nex exec global ./deploy-app.js \
  --auth prod \
  --params "{
    \"app_scope\":\"$APP_SCOPE\",
    \"version\":\"$VERSION\",
    \"environment\":\"$ENVIRONMENT\",
    \"rollback_enabled\":true,
    \"notification_email\":\"$EMAIL\"
  }"
```

## See Also

- [REPL Mode Documentation](./REPL_MODE.md)
- [Getting Started Guide](./GETTING_STARTED.md)
- [Exec Command Reference](../README.md#nex-exec-scope-file)

