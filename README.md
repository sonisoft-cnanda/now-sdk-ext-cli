# @sonisoft/now-sdk-ext-cli

[![npm version](https://img.shields.io/npm/v/@sonisoft/now-sdk-ext-cli.svg)](https://www.npmjs.com/package/@sonisoft/now-sdk-ext-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A powerful CLI toolkit that extends the ServiceNow SDK with advanced automation capabilities for development, testing, and operations.

## 🚀 Overview

`now-sdk-ext-cli` (command: `nex`) is a comprehensive command-line interface that enhances the official ServiceNow SDK with powerful features for developers and administrators. It provides seamless integration with ServiceNow instances to automate common tasks, execute tests, manage applications, and run scripts remotely.

### Why Use `nex`?

- **💪 Powerful Automation**: Automate ServiceNow operations that would otherwise require manual UI interaction
- **⚡ Fast Development**: Interactive REPL mode for rapid script development and testing
- **🔧 DevOps Ready**: Built for CI/CD with JSON output, exit codes, and scriptable operations
- **🎯 Developer Friendly**: Intuitive commands, autocomplete, and extensive documentation
- **🔒 Secure**: Uses ServiceNow SDK's secure keychain storage for credentials

### Key Features

#### 🧪 ATF Test Automation
Execute individual ATF tests or entire test suites with detailed results, perfect for CI/CD pipelines.

#### 📦 Application Lifecycle Management
- **Install** applications from batch definitions
- **Uninstall** applications programmatically
- **Repository Management**: List and install apps from your company repository
- Automated deployment workflows

#### ⚡ Script Execution (Enhanced)
- **File Mode**: Execute JavaScript files on ServiceNow instances
- **REPL Mode**: Interactive script executor (like node REPL, but for ServiceNow!)
- **Parameterization**: Template scripts with `{placeholder}` replacement
- **Scope-Aware**: Execute in global or custom application scopes

#### 🔍 Query & Search
- **Table Queries**: Query any ServiceNow table with encoded queries, field selection, and display values
- **Application Search**: Find applications by name across your instance
- **Column Discovery**: List and search table columns/fields
- **Syslog Reader**: Query system logs with filtering
- **Code Search**: Search scripts across the platform

#### 📊 Aggregate & Analytics
- **Record Counts**: Count records with optional filters
- **Aggregate Statistics**: Run AVG, MIN, MAX, SUM across table fields
- **Grouped Aggregation**: Group-by queries with multiple fields and HAVING clauses

#### 🏥 Instance Health & Diagnostics
- **Health Check**: Consolidated instance diagnostics — version info, cluster status, stuck jobs, semaphore counts, operational record counts
- **Color-coded** status indicators for quick visual assessment
- **JSON output** for CI/CD monitoring and alerting

#### 🔀 Flow Designer Operations
- **Execute Flows**: Run flows, subflows, and actions in foreground or background mode
- **Monitor Status**: Check flow context status, retrieve outputs, and inspect errors
- **Flow Control**: Cancel running flows and send messages to waiting flows
- **JSON inputs/outputs**: Pass structured inputs and capture flow outputs programmatically

#### 🗑️ Bulk Record Operations
- **Bulk Update**: Update all records matching an encoded query with dry-run safety
- **Bulk Delete**: Delete records matching a query with confirmation and limits
- **Dry-run by default**: Preview affected records before committing changes
- **Progress callbacks**: Real-time progress updates during bulk operations

#### 🎨 Advanced Features
- **Dynamic Autocomplete**: Tab completion that queries your ServiceNow instance for scopes
- **Batch Operations**: Install multiple applications from JSON definitions or batch create/update records
- **Progress Monitoring**: Real-time progress for long-running operations
- **Schema Discovery**: Inspect table schemas and field definitions
- **Script Sync**: Pull and push scripts between local files and ServiceNow
- **Task Management**: Comment, assign, resolve, and close incidents and changes
- **Update Sets**: Create, inspect, clone, and manage update sets
- **Workflow Creation**: Create workflows with activities, transitions, and conditions
- **Scope Management**: Switch application scopes programmatically
- **Store Integration**: Search, install, and update apps from the ServiceNow Store
- **JSON Output**: Perfect for parsing and automation

#### 🔄 CI/CD Integration
- Proper exit codes (0 = success, 1 = failure)
- JSON output mode for all commands
- Environment variable support
- Scriptable and automatable

## 📋 Table of Contents

- [Installation](#-installation)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Core Capabilities](#-core-capabilities)
  - [ATF Testing](#atf-testing)
  - [Application Management](#application-management)
  - [Script Execution with REPL](#script-execution-with-repl)
  - [Company Repository](#company-repository-integration)
  - [Query & Search](#query--search)
  - [Aggregate & Analytics](#aggregate--analytics)
  - [Instance Health Check](#instance-health-check)
  - [Flow Designer](#flow-designer-operations)
  - [Bulk Operations](#bulk-record-operations)
- [All Commands](#-commands)
- [Authentication](#-authentication)
- [Advanced Features](#-advanced-features)
  - [Interactive REPL](#interactive-repl-mode)
  - [Script Parameterization](#script-parameterization)
  - [Shell Autocomplete](#shell-autocomplete)
- [CI/CD Integration](#-cicd-integration)
- [Examples](#-examples)
- [Troubleshooting](#-troubleshooting)
- [Documentation](#-documentation)
- [Support & Contributing](#-support--contributing)

## ⚠️ Breaking Change — v2.0.0 (ServiceNow SDK 4.3.0)

> **If you are upgrading from v1.x, read this first.**
>
> This version upgrades the underlying ServiceNow SDK dependencies from **4.2.x to 4.3.0** and the core library to **@sonisoft/now-sdk-ext-core 3.4.0**. ServiceNow 4.3.0 **changed how credential aliases are stored**, replacing the previous `keytar`-based credential store with a new implementation.
>
> **What this means for you:**
> - Credential aliases created with ServiceNow SDK 4.2.x **cannot be read** by SDK 4.3.x
> - You **must re-create all instance aliases** after upgrading
>
> **Migration steps:**
> ```bash
> # 1. Update the global CLI
> npm install -g @servicenow/sdk@4.3.0
>
> # 2. Re-add each instance alias
> snc configure profile set
> # — or —
> npx @servicenow/sdk auth --add <your-alias>
>
> # 3. Verify your aliases work
> npx @servicenow/sdk auth --list
> ```
>
> All CLI commands and API surfaces remain unchanged — only the underlying authentication storage has changed.

## 💾 Installation

### Global Installation (Recommended)

```bash
npm install -g @sonisoft/now-sdk-ext-cli
```

### Local Installation

```bash
npm install @sonisoft/now-sdk-ext-cli
```

### Verify Installation

```bash
nex --version
nex --help
```

## 📚 Prerequisites

### ServiceNow SDK

**Required**: This CLI extension leverages the official ServiceNow SDK for authentication management. You must install and configure the ServiceNow SDK first.

```bash
npm install -g @servicenow/sdk
```

Verify installation:

```bash
now-sdk --version
```

**Important**: The `now-sdk-ext-cli` does not manage credentials directly. It uses authentication credentials configured via the ServiceNow SDK (`now-sdk auth` command). This provides:
- Secure credential storage in your system's keychain
- Centralized authentication management across ServiceNow tools
- Support for multiple instance profiles
- OAuth and basic authentication methods

### Node.js

- **Minimum Version**: Node.js 18.0.0 or higher
- **Recommended**: Node.js 22.x (LTS) or later

### ServiceNow Instance

- ServiceNow instance with appropriate permissions
- API access enabled
- User account with required roles:
  - `admin` or `atf_test_runner` for ATF operations
  - `admin` or `sn_cicd.sys_ci_automation` for application management
  - Script execution requires appropriate scope access

## 🎯 Quick Start

### 1. Configure Authentication

First, set up your ServiceNow instance credentials using the ServiceNow SDK:

```bash
# Add credentials (interactive - will prompt for username/password)
now-sdk auth --add your-instance.service-now.com --type basic --alias my-dev-instance

# Set as default (optional)
now-sdk auth --use my-dev-instance

# List configured authentication profiles
now-sdk auth --list
```

**Note**: Credentials configured via `now-sdk auth` are automatically available to `nex` commands through the `--auth` flag.

### 2. Run Your First Command

```bash
# Start interactive REPL
nex exec global --auth my-dev-instance

# Execute an ATF test
nex atf --test-id <test-sys-id> --auth my-dev-instance

# List repository applications
nex app:repo-list --auth my-dev-instance

# Install from repository
nex app:repo-install --scope x_my_app --auth my-dev-instance
```

---

## 🎯 Core Capabilities

### ATF Testing

Execute Automated Test Framework tests and suites directly from the command line.

```bash
# Execute a single test
nex atf --test-id f717a8c783103210621e78c6feaad396 --auth dev

# Execute a test suite by ID
nex atf --suite-id e077e00b83103210621e78c6feaad383 --auth dev --wait

# Execute by name with JSON output (perfect for CI/CD)
nex atf --suite-name "Smoke Tests" --auth dev --json > results.json

# Configure browser and performance settings
nex atf --suite-id abc123 --browser chrome --performance --auth dev
```

**Key Features:**
- Execute individual tests or complete suites
- Wait for completion or run async
- JSON output for CI/CD integration
- Browser/OS configuration
- Performance testing mode
- Real-time progress monitoring

### Application Management

Comprehensive application lifecycle management tools.

```bash
# Install applications from batch definition
nex app:install --batch --definitionPath ./apps.json --auth dev

# Uninstall an application
nex app:uninstall -i <sys_id> -s x_my_app --auth dev

# List repository applications (what's available to install)
nex app:repo-list --installable --auth dev

# Install from company repository
nex app:repo-install --scope x_my_app --version 2.1.0 --auth dev

# List installed repository apps
nex app:repo-list --installed --json --auth dev
```

**Key Features:**
- Batch installation from JSON definitions
- Repository browsing and installation
- Progress monitoring with configurable timeouts
- Post-installation verification
- JSON output for automation

### Script Execution with REPL

Execute JavaScript on ServiceNow instances - now with three powerful modes!

#### Mode 1: Execute Script Files
```bash
nex exec global ./cleanup.js --auth dev
nex exec x_my_app ./app-config.js --auth dev
```

#### Mode 2: Interactive REPL ⭐ NEW!
```bash
$ nex exec global --auth dev

sn> var gr = new GlideRecord('sys_user');
... gr.addQuery('active', true);
... gr.query();
... gs.info('Active users: ' + gr.getRowCount());
... .exec

*** Script: Active users: 142

sn> .exit
```

**REPL Features:**
- Multi-line script input
- Execute with `.exec` or Ctrl+D
- Clear buffer with `.clear`
- Command history within session
- Beautiful, intuitive interface

#### Mode 3: Parameterized Scripts ⭐ NEW!
```bash
# Script with placeholders: {username}, {table}
nex exec global ./query-user.js \
  --auth dev \
  --params '{"username":"admin","table":"sys_user"}'
```

**Parameterization Features:**
- `{placeholder}` syntax in scripts
- JSON parameter object
- Multiple parameters supported
- All data types (string, number, boolean)
- Perfect for environment-specific scripts

### Company Repository Integration

Discover and install applications from your company's internal repository.

```bash
# See what's available
nex app:repo-list --auth prod

# Filter for installable apps
nex app:repo-list --installable --json --auth prod

# Install by scope (automatic lookup)
nex app:repo-install --scope x_custom_app --auth prod

# Install specific version
nex app:repo-install --scope x_custom_app --version 1.2.0 --auth prod

# Background installation
nex app:repo-install --scope x_custom_app --no-wait --auth prod
```

**Key Features:**
- Browse company repository applications
- Filter by installation status
- Install by scope name (no need to look up sys_id)
- Version control
- Wait for completion or run async
- Post-installation verification

### Query & Search

Query ServiceNow tables, applications, columns, and system logs directly from the CLI.

```bash
# Query any table with encoded queries
nex query --table incident --query "active=true^priority=1" --fields number,short_description --limit 10 --auth dev

# Search applications by name
nex query app --name "ITSM" --auth dev

# List columns for a table
nex query columns --table incident --search "description" --auth dev

# Query system logs
nex query syslog --query "level=error" --limit 50 --auth dev

# Search platform code
nex search code --term "GlideRecord" --auth dev
```

### Aggregate & Analytics

Run aggregate statistics on ServiceNow tables without downloading individual records.

```bash
# Count records
nex aggregate count --table incident --query "active=true" --auth dev

# Run aggregate statistics (AVG, MIN, MAX, SUM)
nex aggregate query --table incident --avg reassignment_count --min reassignment_count --max reassignment_count --auth dev

# Grouped aggregation with display values
nex aggregate group --table incident --group-by priority --count --auth dev --display-value all

# Multiple group-by fields with HAVING clause
nex aggregate group --table incident --group-by priority --group-by state --count --having "COUNT>5" --auth dev
```

### Instance Health Check

Run consolidated health diagnostics on your ServiceNow instance.

```bash
# Full health check
nex health check --auth dev

# Check only version and stuck jobs
nex health check --include-version --include-stuck-jobs --no-include-cluster --no-include-semaphores --no-include-operational-counts --auth dev

# Health check with custom stuck job threshold (60 minutes)
nex health check --stuck-job-threshold 60 --auth dev

# JSON output for monitoring/alerting
nex health check --json --auth dev
```

**Includes:**
- Instance version and build information
- Cluster node status (online/offline)
- Stuck job detection with configurable threshold
- Active semaphore count
- Operational counts (open incidents, changes, problems)
- Color-coded status indicators

### Flow Designer Operations

Execute and manage Flow Designer flows, subflows, and actions from the CLI.

```bash
# Execute a flow in foreground (waits for completion)
nex flow run --name global.my_flow --auth dev

# Execute with inputs
nex flow run --name global.my_flow --inputs '{"priority":"1","category":"network"}' --auth dev

# Execute a subflow
nex flow subflow --name global.my_subflow --inputs '{"record_id":"abc123"}' --auth dev

# Execute an action
nex flow action --name global.my_action --inputs '{"table":"incident"}' --auth dev

# Check flow status
nex flow status --context-id ctx-abc123 --auth dev

# Retrieve flow outputs
nex flow outputs --context-id ctx-abc123 --json --auth dev

# Check for errors
nex flow error --context-id ctx-abc123 --auth dev

# Cancel a running flow
nex flow cancel --context-id ctx-abc123 --reason "No longer needed" --auth dev

# Send a message to a waiting flow (e.g., approval)
nex flow message --context-id ctx-abc123 --message approved --payload '{"approver":"admin"}' --auth dev
```

**Features:**
- Execute flows, subflows, and actions with structured inputs
- Foreground (wait) or background execution modes
- Query flow context status, outputs, and errors
- Cancel running flows and send messages to paused flows
- JSON output for automation and CI/CD

### Bulk Record Operations

Perform bulk updates and deletes on ServiceNow records matching a query.

```bash
# Dry-run: preview which records would be updated (safe default)
nex bulk update --table incident --query "active=true^priority=4" --data '{"priority":"3"}' --auth dev

# Confirm bulk update (actually modifies records)
nex bulk update --table incident --query "active=true^priority=4" --data '{"priority":"3"}' --confirm --auth dev

# Dry-run: preview which records would be deleted
nex bulk delete --table u_temp_records --query "sys_created_on<2024-01-01" --auth dev

# Confirm bulk delete with limit
nex bulk delete --table u_temp_records --query "sys_created_on<2024-01-01" --confirm --limit 500 --auth dev

# JSON output for scripting
nex bulk update --table incident --query "state=7" --data '{"active":"false"}' --confirm --json --auth dev
```

**Safety Features:**
- **Dry-run by default**: Always previews affected records before modifying
- **Explicit confirmation**: Must pass `--confirm` to execute changes
- **Record limits**: Cap the number of affected records with `--limit`
- **Progress updates**: Real-time feedback during bulk operations

## 📖 Commands

<!-- toc -->
* [@sonisoft/now-sdk-ext-cli](#sonisoftnow-sdk-ext-cli)
* [Add credentials (interactive - will prompt for username/password)](#add-credentials-interactive---will-prompt-for-usernamepassword)
* [Set as default (optional)](#set-as-default-optional)
* [List configured authentication profiles](#list-configured-authentication-profiles)
* [Start interactive REPL](#start-interactive-repl)
* [Execute an ATF test](#execute-an-atf-test)
* [List repository applications](#list-repository-applications)
* [Install from repository](#install-from-repository)
* [Execute a single test](#execute-a-single-test)
* [Execute a test suite by ID](#execute-a-test-suite-by-id)
* [Execute by name with JSON output (perfect for CI/CD)](#execute-by-name-with-json-output-perfect-for-cicd)
* [Configure browser and performance settings](#configure-browser-and-performance-settings)
* [Install applications from batch definition](#install-applications-from-batch-definition)
* [Uninstall an application](#uninstall-an-application)
* [List repository applications (what's available to install)](#list-repository-applications-whats-available-to-install)
* [Install from company repository](#install-from-company-repository)
* [List installed repository apps](#list-installed-repository-apps)
* [Script with placeholders: {username}, {table}](#script-with-placeholders-username-table)
* [See what's available](#see-whats-available)
* [Filter for installable apps](#filter-for-installable-apps)
* [Install by scope (automatic lookup)](#install-by-scope-automatic-lookup)
* [Install specific version](#install-specific-version)
* [Background installation](#background-installation)
* [Query any table with encoded queries](#query-any-table-with-encoded-queries)
* [Search applications by name](#search-applications-by-name)
* [List columns for a table](#list-columns-for-a-table)
* [Query system logs](#query-system-logs)
* [Search platform code](#search-platform-code)
* [Count records](#count-records)
* [Run aggregate statistics (AVG, MIN, MAX, SUM)](#run-aggregate-statistics-avg-min-max-sum)
* [Grouped aggregation with display values](#grouped-aggregation-with-display-values)
* [Multiple group-by fields with HAVING clause](#multiple-group-by-fields-with-having-clause)
* [Full health check](#full-health-check)
* [Check only version and stuck jobs](#check-only-version-and-stuck-jobs)
* [Health check with custom stuck job threshold (60 minutes)](#health-check-with-custom-stuck-job-threshold-60-minutes)
* [JSON output for monitoring/alerting](#json-output-for-monitoringalerting)
* [Usage](#usage)
* [Commands](#commands)
* [Global scope](#global-scope)
* [Custom application scope](#custom-application-scope)
* [Development](#development)
* [Production](#production)
* [GitHub Actions](#github-actions)
* [1. Enable autocomplete](#1-enable-autocomplete)
* [2. Follow shell-specific instructions (bash/zsh/fish)](#2-follow-shell-specific-instructions-bashzshfish)
* [3. Reload shell](#3-reload-shell)
* [4. Start using it!](#4-start-using-it)
* [Autocomplete queries ServiceNow and shows:](#autocomplete-queries-servicenow-and-shows)
* [Ready to execute!](#ready-to-execute)
* [Add credentials interactively (will prompt for username/password)](#add-credentials-interactively-will-prompt-for-usernamepassword)
* [For OAuth authentication](#for-oauth-authentication)
* [List all configured authentication profiles](#list-all-configured-authentication-profiles)
* [Set default authentication profile (optional)](#set-default-authentication-profile-optional)
* [Delete an authentication profile](#delete-an-authentication-profile)
* [Use specific authentication profile via --auth flag](#use-specific-authentication-profile-via---auth-flag)
* [Use default profile (if set with --use)](#use-default-profile-if-set-with---use)
* [All commands support the --auth flag](#all-commands-support-the---auth-flag)
* [Set credentials in environment](#set-credentials-in-environment)
* [Add authentication profile (will use environment variables)](#add-authentication-profile-will-use-environment-variables)
* [1. List available repository apps](#1-list-available-repository-apps)
* [2. Install application from repository](#2-install-application-from-repository)
* [3. Configure using REPL](#3-configure-using-repl)
* [4. Run tests](#4-run-tests)
* [5. Deploy to production with parameterized script](#5-deploy-to-production-with-parameterized-script)
* [6. Verify deployment](#6-verify-deployment)
* [Execute a single test](#execute-a-single-test)
* [Execute a test suite and wait for results](#execute-a-test-suite-and-wait-for-results)
* [Execute by name (no need to look up sys_id)](#execute-by-name-no-need-to-look-up-sys_id)
* [Performance test with specific browser](#performance-test-with-specific-browser)
* [CI/CD integration with JSON output](#cicd-integration-with-json-output)
* [Custom polling for long tests](#custom-polling-for-long-tests)
* [Browse company repository](#browse-company-repository)
* [Install from repository](#install-from-repository)
* [Batch install multiple apps](#batch-install-multiple-apps)
* [Uninstall application](#uninstall-application)
* [Execute script file](#execute-script-file)
* [Execute in custom scope](#execute-in-custom-scope)
* [Pipe output](#pipe-output)
* [Start REPL](#start-repl)
* [Execute multi-line scripts interactively](#execute-multi-line-scripts-interactively)
* [Single parameter](#single-parameter)
* [Multiple parameters](#multiple-parameters)
* [From environment variables](#from-environment-variables)
* [daily-tests.sh](#daily-testssh)
* [setup-environment.sh](#setup-environmentsh)
* [Install required apps from repository](#install-required-apps-from-repository)
* [Configure via parameterized script](#configure-via-parameterized-script)
* [Validate with ATF](#validate-with-atf)
* [migrate-data.sh](#migrate-datash)
* [Export from source](#export-from-source)
* [Transform data](#transform-data)
* [Import to target with parameters](#import-to-target-with-parameters)
* [Validate](#validate)
* [List all configured authentication profiles](#list-all-configured-authentication-profiles)
* [Delete and re-add credentials if needed](#delete-and-re-add-credentials-if-needed)
* [Set as default](#set-as-default)
* [Verify installation](#verify-installation)
* [Reinstall if needed](#reinstall-if-needed)
* [Check PATH includes npm global binaries](#check-path-includes-npm-global-binaries)
* [Increase poll interval](#increase-poll-interval)
* [Check instance performance](#check-instance-performance)
* [Check test suite complexity](#check-test-suite-complexity)
* [Review ServiceNow logs](#review-servicenow-logs)
* [Verify user has required roles:](#verify-user-has-required-roles)
* [- atf_test_runner for ATF operations](#--atf_test_runner-for-atf-operations)
* [- admin for app management](#--admin-for-app-management)
* [- appropriate scope access for scripts](#--appropriate-scope-access-for-scripts)
* [General help](#general-help)
* [Command-specific help](#command-specific-help)
* [Command-specific help](#command-specific-help)
* [Enable autocomplete](#enable-autocomplete)
* [Clone the repository](#clone-the-repository)
* [Install dependencies](#install-dependencies)
* [Build](#build)
* [Run tests (960+ tests)](#run-tests-864-tests)
* [Run linter](#run-linter)
* [Test locally](#test-locally)
* [All tests](#all-tests)
* [Specific test file](#specific-test-file)
* [With coverage](#with-coverage)
<!-- tocstop -->

# Usage
<!-- usage -->
```sh-session
$ npm install -g @sonisoft/now-sdk-ext-cli
$ nex COMMAND
running command...
$ nex (--version)
@sonisoft/now-sdk-ext-cli/2.0.0-alpha.0 linux-x64 node-v22.16.0
$ nex --help [COMMAND]
USAGE
  $ nex COMMAND
...
```
<!-- usagestop -->

# Commands
<!-- commands -->
* [`nex aggregate count`](#nex-aggregate-count)
* [`nex aggregate group`](#nex-aggregate-group)
* [`nex aggregate query`](#nex-aggregate-query)
* [`nex app`](#nex-app)
* [`nex app install`](#nex-app-install)
* [`nex app repo-install`](#nex-app-repo-install)
* [`nex app repo-list`](#nex-app-repo-list)
* [`nex app uninstall`](#nex-app-uninstall)
* [`nex atf`](#nex-atf)
* [`nex attachment get`](#nex-attachment-get)
* [`nex attachment list`](#nex-attachment-list)
* [`nex attachment upload`](#nex-attachment-upload)
* [`nex autocomplete [SHELL]`](#nex-autocomplete-shell)
* [`nex batch create`](#nex-batch-create)
* [`nex batch update`](#nex-batch-update)
* [`nex bulk delete`](#nex-bulk-delete)
* [`nex bulk update`](#nex-bulk-update)
* [`nex exec SCOPE [FILE]`](#nex-exec-scope-file)
* [`nex flow action`](#nex-flow-action)
* [`nex flow cancel`](#nex-flow-cancel)
* [`nex flow error`](#nex-flow-error)
* [`nex flow message`](#nex-flow-message)
* [`nex flow outputs`](#nex-flow-outputs)
* [`nex flow run`](#nex-flow-run)
* [`nex flow status`](#nex-flow-status)
* [`nex flow subflow`](#nex-flow-subflow)
* [`nex health check`](#nex-health-check)
* [`nex help [COMMAND]`](#nex-help-command)
* [`nex log`](#nex-log)
* [`nex plugins`](#nex-plugins)
* [`nex plugins add PLUGIN`](#nex-plugins-add-plugin)
* [`nex plugins:inspect PLUGIN...`](#nex-pluginsinspect-plugin)
* [`nex plugins install PLUGIN`](#nex-plugins-install-plugin)
* [`nex plugins link PATH`](#nex-plugins-link-path)
* [`nex plugins remove [PLUGIN]`](#nex-plugins-remove-plugin)
* [`nex plugins reset`](#nex-plugins-reset)
* [`nex plugins uninstall [PLUGIN]`](#nex-plugins-uninstall-plugin)
* [`nex plugins unlink [PLUGIN]`](#nex-plugins-unlink-plugin)
* [`nex plugins update`](#nex-plugins-update)
* [`nex query`](#nex-query)
* [`nex query app`](#nex-query-app)
* [`nex query columns`](#nex-query-columns)
* [`nex query syslog`](#nex-query-syslog)
* [`nex schema`](#nex-schema)
* [`nex schema field`](#nex-schema-field)
* [`nex schema validate-catalog`](#nex-schema-validate-catalog)
* [`nex scope`](#nex-scope)
* [`nex scope set`](#nex-scope-set)
* [`nex script-sync pull`](#nex-script-sync-pull)
* [`nex script-sync push`](#nex-script-sync-push)
* [`nex script-sync sync`](#nex-script-sync-sync)
* [`nex search`](#nex-search)
* [`nex search add-table`](#nex-search-add-table)
* [`nex search groups`](#nex-search-groups)
* [`nex search tables`](#nex-search-tables)
* [`nex store install`](#nex-store-install)
* [`nex store search`](#nex-store-search)
* [`nex store update`](#nex-store-update)
* [`nex store validate`](#nex-store-validate)
* [`nex task approve`](#nex-task-approve)
* [`nex task assign`](#nex-task-assign)
* [`nex task close`](#nex-task-close)
* [`nex task comment`](#nex-task-comment)
* [`nex task find`](#nex-task-find)
* [`nex task resolve`](#nex-task-resolve)
* [`nex update-set`](#nex-update-set)
* [`nex update-set clone`](#nex-update-set-clone)
* [`nex update-set create`](#nex-update-set-create)
* [`nex update-set current`](#nex-update-set-current)
* [`nex update-set inspect`](#nex-update-set-inspect)
* [`nex update-set move`](#nex-update-set-move)
* [`nex workflow create`](#nex-workflow-create)
* [`nex workflow publish`](#nex-workflow-publish)

## `nex aggregate count`

Count records in a ServiceNow table.

```
USAGE
  $ nex aggregate count -t <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-q <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -j, --json           Output results as JSON
  -q, --query=<value>  ServiceNow encoded query string to filter records
  -t, --table=<value>  (required) ServiceNow table name to count records in

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Count records in a ServiceNow table.

  Uses the Stats API to efficiently count records with optional encoded query filtering.

  Features:
  • Fast record counting via Stats API
  • Optional encoded query filtering
  • JSON output for scripting

EXAMPLES
  Count all incidents

    $ nex aggregate count --table incident --auth dev

  Count active critical incidents

    $ nex aggregate count --table incident --query "active=true^priority=1" --auth dev

  Count as JSON

    $ nex aggregate count --table incident --query "active=true" --json --auth dev
```

_See code: [src/commands/aggregate/count.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/aggregate/count.ts)_

## `nex aggregate group`

Run a grouped aggregate query on a ServiceNow table.

```
USAGE
  $ nex aggregate group -t <value> -g <value>... [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-q
    <value>] [-c] [--avg <value>...] [--min <value>...] [--max <value>...] [--sum <value>...] [--having <value>] [-d]

FLAGS
  -a, --auth=<value>         Auth alias to use.
  -c, --count                Include record count per group
  -d, --display-value        Return display values for group-by fields
  -g, --group-by=<value>...  (required) Field name(s) to group by
  -j, --json                 Output results as JSON
  -q, --query=<value>        ServiceNow encoded query string to filter records before grouping
  -t, --table=<value>        (required) ServiceNow table name to aggregate
      --avg=<value>...       Comma-separated field names to compute AVG on per group
      --having=<value>       HAVING clause to filter groups (e.g. "count>10")
      --max=<value>...       Comma-separated field names to compute MAX on per group
      --min=<value>...       Comma-separated field names to compute MIN on per group
      --sum=<value>...       Comma-separated field names to compute SUM on per group

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Run a grouped aggregate query on a ServiceNow table.

  Compute aggregate statistics (COUNT, AVG, MIN, MAX, SUM) grouped by one or more fields using the Stats API. Supports
  HAVING clauses for filtering groups.

  Features:
  • GROUP BY one or more fields
  • Compute AVG, MIN, MAX, SUM per group
  • HAVING clause for group filtering
  • Display values for reference fields
  • JSON output for scripting

EXAMPLES
  Count incidents grouped by priority

    $ nex aggregate group --table incident --group-by priority --count --auth dev

  Average reassignment count grouped by priority and assignment group

    $ nex aggregate group --table incident --group-by priority --group-by assignment_group --avg reassignment_count \
      --count --display-value --auth dev

  Groups with HAVING clause

    $ nex aggregate group --table incident --group-by priority --count --having "count>10" --auth dev
```

_See code: [src/commands/aggregate/group.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/aggregate/group.ts)_

## `nex aggregate query`

Run aggregate statistics on a ServiceNow table.

```
USAGE
  $ nex aggregate query -t <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-q <value>] [-c]
    [--avg <value>...] [--min <value>...] [--max <value>...] [--sum <value>...]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -c, --count           Include record count in the result
  -j, --json            Output results as JSON
  -q, --query=<value>   ServiceNow encoded query string to filter records
  -t, --table=<value>   (required) ServiceNow table name to aggregate
      --avg=<value>...  Comma-separated field names to compute AVG on
      --max=<value>...  Comma-separated field names to compute MAX on
      --min=<value>...  Comma-separated field names to compute MIN on
      --sum=<value>...  Comma-separated field names to compute SUM on

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Run aggregate statistics on a ServiceNow table.

  Compute AVG, MIN, MAX, and SUM on specified fields using the Stats API. Optionally include a record count.

  Features:
  • Compute AVG, MIN, MAX, SUM on any numeric field
  • Optional record count
  • Filter with encoded queries
  • JSON output for scripting

EXAMPLES
  Get average reassignment count for incidents

    $ nex aggregate query --table incident --avg reassignment_count --auth dev

  Get min, max, and average for active incidents

    $ nex aggregate query --table incident --query "active=true" --avg reassignment_count --min reassignment_count \
      --max reassignment_count --count --auth dev

  Get sum as JSON

    $ nex aggregate query --table incident --sum reassignment_count --json --auth dev
```

_See code: [src/commands/aggregate/query.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/aggregate/query.ts)_

## `nex app`

Manage ServiceNow applications: uninstall applications from your instance.

```
USAGE
  $ nex app [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-u] [-i <value>] [-s <value>]

FLAGS
  -a, --auth=<value>           Auth alias to use.
  -i, --applicationId=<value>  Application sys_id
  -s, --scope=<value>          Scope of application.
  -u, --uninstall              Uninstall the app

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Manage ServiceNow applications: uninstall applications from your instance.

  This command provides programmatic control over ServiceNow applications, allowing you to uninstall applications
  remotely. This is useful for automated environment cleanup, testing workflows, and application lifecycle management.

  Features:
  • Uninstall applications by sys_id and scope
  • Automated application removal in CI/CD pipelines
  • Proper cleanup and rollback handling
  • Detailed logging and error reporting

  Requirements:
  • User must have admin role
  • Application must be in a removable state
  • Both application sys_id and scope are required

EXAMPLES
  Uninstall an application by sys_id and scope

    $ nex app --uninstall --applicationId a1b2c3d4e5f6 --scope x_my_custom_app --auth dev-instance

  Uninstall with enhanced debug logging

    $ nex app -u -i a1b2c3d4e5f6 -s x_my_custom_app --auth dev-instance --log-level debug

  Uninstall using short flags

    $ nex app -u -i a1b2c3d4e5f6 -s x_my_custom_app -a dev-instance
```

_See code: [src/commands/app/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/app/index.ts)_

## `nex app install`

Install or upgrade multiple ServiceNow applications from a batch definition file.

```
USAGE
  $ nex app install [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-b] [-d <value>]

FLAGS
  -a, --auth=<value>            Auth alias to use.
  -b, --batch                   Enable batch installation mode from definition file
  -d, --definitionPath=<value>  Path to JSON batch definition file containing applications to install

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Install or upgrade multiple ServiceNow applications from a batch definition file.

  This command enables automated installation and upgrade of multiple applications using a JSON definition file. Perfect
  for setting up new environments, deploying application bundles, or managing application dependencies. The batch file
  can specify multiple applications with their versions, scopes, and installation options.

  Features:
  • Install multiple applications in a single operation
  • Upgrade existing applications to new versions
  • Control demo data loading per application
  • Detailed installation progress and results
  • Automatic dependency resolution
  • Rollback support on failures

  Batch Definition Format:
  The JSON file should contain an "applications" array with objects defining:
  • name: Application name
  • scope: Application scope (e.g., x_my_app)
  • version: Target version number
  • load_demo_data: Whether to load demo data (optional)
  • notes: Installation notes (optional)

EXAMPLES
  Install applications from a batch definition file

    $ nex app install --batch --definitionPath ./apps-to-install.json --auth dev-instance

  Install with short flags

    $ nex app install -b -d ./batch-apps.json -a dev-instance

  Install with debug logging to troubleshoot issues

    $ nex app install -b -d ./apps.json -a dev-instance --log-level debug
```

_See code: [src/commands/app/install.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/app/install.ts)_

## `nex app repo-install`

Install an application from your ServiceNow company repository.

```
USAGE
  $ nex app repo-install -s <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-w]
    [--poll-interval <value>] [-t <value>] [-v <value>]

FLAGS
  -a, --auth=<value>           Auth alias to use.
  -s, --scope=<value>          (required) Application scope (e.g., x_my_custom_app)
  -t, --timeout=<value>        [default: 1800000] Installation timeout in milliseconds (default: 1800000 = 30 min)
  -v, --version=<value>        Specific version to install (defaults to latest)
  -w, --no-wait                Do not wait for installation to complete
      --poll-interval=<value>  [default: 5000] Polling interval in milliseconds (default: 5000)

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Install an application from your ServiceNow company repository.

  This command installs an application from your company's internal application repository. You can specify the
  application by its scope name, and optionally specify a particular version. The command will automatically look up the
  application details and initiate the installation.

  Features:
  • Install applications by scope name
  • Automatic lookup of application sys_id
  • Optional version specification (defaults to latest)
  • Wait for installation completion with progress monitoring
  • No-wait mode for background installations
  • Configurable polling intervals and timeouts
  • Detailed installation status and error reporting

  Installation Process:
  1. Looks up the application in the company repository by scope
  2. Verifies the application is available and installable
  3. Initiates the installation via CI/CD API
  4. Monitors progress until completion (unless --no-wait specified)
  5. Reports final status and any errors

  Requirements:
  • User must have sn_cicd.sys_ci_automation role
  • Application must exist in company repository
  • Application must not be already installed (or use upgrade)

EXAMPLES
  Install application by scope (latest version)

    $ nex app repo-install --scope x_my_custom_app --auth dev-instance

  Install specific version of an application

    $ nex app repo-install --scope x_my_app --version 2.1.0 --auth dev-instance

  Install without waiting for completion

    $ nex app repo-install --scope x_my_app --no-wait --auth dev-instance

  Install with custom timeout (1 hour)

    $ nex app repo-install -s x_my_app -a dev-instance --timeout 3600000

  Install with debug logging

    $ nex app repo-install -s x_my_app -a dev-instance --log-level debug
```

_See code: [src/commands/app/repo-install.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/app/repo-install.ts)_

## `nex app repo-list`

List applications available in your ServiceNow company repository.

```
USAGE
  $ nex app repo-list [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-n] [-i]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -i, --installed     Show only installed applications
  -j, --json          Output results as JSON
  -n, --installable   Show only applications that can be installed (not yet installed)

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List applications available in your ServiceNow company repository.

  This command retrieves and displays all applications that are available in your company's internal application
  repository. These are applications that have been published internally and are available for installation across your
  ServiceNow instances.

  Features:
  • List all available company repository applications
  • Filter to show only installed applications
  • Filter to show only installable (not yet installed) applications
  • View application details including versions and dependencies
  • JSON output support for automation and scripting
  • Vendor-based filtering

  Use Cases:
  • Discover available applications for installation
  • Audit installed company applications
  • Find applications that can be upgraded
  • Integration with CI/CD pipelines
  • Automated environment setup and configuration

EXAMPLES
  List all company repository applications

    $ nex app repo-list --auth dev-instance

  List only installed applications

    $ nex app repo-list --installed --auth dev-instance

  List only installable (not installed) applications

    $ nex app repo-list --installable --auth dev-instance

  Get JSON output for scripting

    $ nex app repo-list --json --auth dev-instance

  List with short flags

    $ nex app repo-list -a dev-instance
```

_See code: [src/commands/app/repo-list.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/app/repo-list.ts)_

## `nex app uninstall`

Uninstall a ServiceNow application from your instance.

```
USAGE
  $ nex app uninstall -i <value> -s <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>           Auth alias to use.
  -i, --applicationId=<value>  (required) Application sys_id
  -s, --scope=<value>          (required) Scope of application

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Uninstall a ServiceNow application from your instance.

  This command provides programmatic control over ServiceNow application removal, allowing you to uninstall applications
  remotely. This is useful for automated environment cleanup, testing workflows, and application lifecycle management.

  Features:
  • Uninstall applications by sys_id and scope
  • Automated application removal in CI/CD pipelines
  • Proper cleanup and rollback handling
  • Detailed logging and error reporting

  Requirements:
  • User must have admin role
  • Application must be in a removable state
  • Both application sys_id and scope are required

EXAMPLES
  Uninstall an application by sys_id and scope

    $ nex app uninstall --applicationId a1b2c3d4e5f6 --scope x_my_custom_app --auth dev-instance

  Uninstall with enhanced debug logging

    $ nex app uninstall -i a1b2c3d4e5f6 -s x_my_custom_app --auth dev-instance --log-level debug

  Uninstall using short flags

    $ nex app uninstall -i a1b2c3d4e5f6 -s x_my_custom_app -a dev-instance
```

_See code: [src/commands/app/uninstall.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/app/uninstall.ts)_

## `nex atf`

Execute ATF (Automated Test Framework) tests or test suites on a ServiceNow instance.

```
USAGE
  $ nex atf [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-t <value> | -s <value> | -n
    <value>] [-w] [-p <value>] [-b <value>] [--browser-version <value>] [--os-name <value>] [--os-version <value>]
    [--performance] [--cloud]

FLAGS
  -a, --auth=<value>             Auth alias to use.
  -b, --browser=<value>          Browser name for test execution (e.g., chrome, firefox)
  -j, --json                     Output results as JSON
  -n, --suite-name=<value>       Test Suite name to execute
  -p, --poll-interval=<value>    [default: 5000] Polling interval in milliseconds when waiting for completion
  -s, --suite-id=<value>         Test Suite sys_id to execute
  -t, --test-id=<value>          Test sys_id to execute
  -w, --wait                     Wait for test suite execution to complete and return results
      --browser-version=<value>  Browser version for test execution
      --cloud                    Run in cloud
      --os-name=<value>          Operating system name for test execution
      --os-version=<value>       Operating system version for test execution
      --performance              Run as performance test

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Execute ATF (Automated Test Framework) tests or test suites on a ServiceNow instance.

  This command allows you to run automated tests and test suites remotely, making it perfect for CI/CD pipelines and
  automated testing workflows. You can execute individual tests, entire test suites, and configure execution parameters
  such as browser type, OS, and performance mode.

  Features:
  • Execute individual tests or complete test suites
  • Real-time progress monitoring
  • JSON output for CI/CD integration
  • Detailed test results and summaries
  • Browser and environment configuration
  • Performance testing mode support

EXAMPLES
  Execute a single ATF test by sys_id

    $ nex atf --test-id f717a8c783103210621e78c6feaad396 --auth dev-instance

  Execute a test suite by sys_id and wait for completion

    $ nex atf --suite-id e077e00b83103210621e78c6feaad383 --auth dev-instance --wait

  Execute a test suite by name

    $ nex atf --suite-name "Smoke Tests" --auth dev-instance

  Execute with specific browser configuration

    $ nex atf --suite-id e077e00b83103210621e78c6feaad383 --browser chrome --auth dev-instance

  Execute as performance test with JSON output for CI/CD

    $ nex atf --suite-id e077e00b83103210621e78c6feaad383 --performance --json --auth dev-instance

  Execute with custom poll interval (10 seconds)

    $ nex atf --suite-id e077e00b83103210621e78c6feaad383 --poll-interval 10000 --auth dev-instance
```

_See code: [src/commands/atf/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/atf/index.ts)_

## `nex attachment get`

Get metadata for a specific attachment.

```
USAGE
  $ nex attachment get -s <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -s, --sys-id=<value>  (required) Sys ID of the attachment

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Get metadata for a specific attachment.

EXAMPLES
  Get attachment metadata by sys_id

    $ nex attachment get --sys-id att123 --auth dev

  Get attachment metadata as JSON

    $ nex attachment get -s att123 --json --auth dev
```

_See code: [src/commands/attachment/get.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/attachment/get.ts)_

## `nex attachment list`

List attachments on a ServiceNow record.

```
USAGE
  $ nex attachment list -t <value> -r <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]
    [--limit <value>]

FLAGS
  -a, --auth=<value>       Auth alias to use.
  -r, --record-id=<value>  (required) Sys ID of the record
  -t, --table=<value>      (required) Table name
      --limit=<value>      [default: 20] Maximum number of attachments to return

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List attachments on a ServiceNow record.

EXAMPLES
  List attachments on an incident

    $ nex attachment list --table incident --record-id abc123 --auth dev

  List up to 50 attachments as JSON

    $ nex attachment list -t incident -r abc123 --limit 50 --json --auth dev
```

_See code: [src/commands/attachment/list.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/attachment/list.ts)_

## `nex attachment upload`

Upload a file as an attachment to a ServiceNow record.

```
USAGE
  $ nex attachment upload -t <value> -r <value> -f <value> [--json] [-a <value>] [--log-level
    debug|warn|error|info|trace] [--content-type <value>]

FLAGS
  -a, --auth=<value>          Auth alias to use.
  -f, --file=<value>          (required) Path to the file to upload
  -r, --record-id=<value>     (required) Sys ID of the target record
  -t, --table=<value>         (required) Target table name
      --content-type=<value>  MIME content type of the file

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Upload a file as an attachment to a ServiceNow record.

EXAMPLES
  Upload a PDF to an incident record

    $ nex attachment upload --table incident --record-id abc123 --file ./report.pdf --auth dev

  Upload a CSV with explicit content type

    $ nex attachment upload -t incident -r abc123 -f ./data.csv --content-type text/csv --auth dev
```

_See code: [src/commands/attachment/upload.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/attachment/upload.ts)_

## `nex autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ nex autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ nex autocomplete

  $ nex autocomplete bash

  $ nex autocomplete zsh

  $ nex autocomplete powershell

  $ nex autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.35/src/commands/autocomplete/index.ts)_

## `nex batch create`

Batch create records on a ServiceNow instance from a JSON file.

```
USAGE
  $ nex batch create -f <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [--transaction]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -f, --file=<value>  (required) Path to JSON file with create operations
      --transaction   Stop on first error (transactional)

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Batch create records on a ServiceNow instance from a JSON file.

EXAMPLES
  Create records from a JSON file

    $ nex batch create --file ./records.json --auth dev

  Create records without transactional mode

    $ nex batch create --file ./records.json --no-transaction --auth dev
```

_See code: [src/commands/batch/create.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/batch/create.ts)_

## `nex batch update`

Batch update records on a ServiceNow instance from a JSON file.

```
USAGE
  $ nex batch update -f <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [--stop-on-error]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -f, --file=<value>   (required) Path to JSON file with update operations
      --stop-on-error  Stop processing on first error

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Batch update records on a ServiceNow instance from a JSON file.

EXAMPLES
  Update records from a JSON file

    $ nex batch update --file ./updates.json --auth dev

  Update records and stop on first error

    $ nex batch update --file ./updates.json --stop-on-error --auth dev
```

_See code: [src/commands/batch/update.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/batch/update.ts)_

## `nex bulk delete`

Bulk delete records matching an encoded query.

```
USAGE
  $ nex bulk delete -t <value> -q <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [--confirm]
    [-l <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -j, --json           Output results as JSON
  -l, --limit=<value>  [default: 200] Maximum number of records to delete (default 200, max 10000)
  -q, --query=<value>  (required) Encoded query to match records for deletion
  -t, --table=<value>  (required) Table name to delete records from
      --confirm        Execute the delete (without this flag, performs a dry run)

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Bulk delete records matching an encoded query.

  Finds all records in a table matching the given query, then deletes each one. Defaults to dry-run mode — use --confirm
  to execute.

  Features:
  • Safe dry-run by default (shows match count without deleting)
  • Encoded query filtering
  • Configurable record limit (default 200, max 10000)
  • Progress reporting for large operations
  • Error collection — operation continues even if individual records fail

EXAMPLES
  Dry run — see how many records would be deleted

    $ nex bulk delete --table u_temp_import --query "sys_created_on<2024-01-01" --auth dev

  Execute the delete (requires --confirm)

    $ nex bulk delete --table u_temp_import --query "sys_created_on<2024-01-01" --confirm --auth dev

  Delete with custom limit

    $ nex bulk delete --table incident --query "active=false^closed_at<2023-01-01" --limit 1000 --confirm --auth dev

  Delete as JSON output

    $ nex bulk delete --table u_staging --query "processed=true" --confirm --json --auth dev
```

_See code: [src/commands/bulk/delete.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/bulk/delete.ts)_

## `nex bulk update`

Bulk update records matching an encoded query.

```
USAGE
  $ nex bulk update -t <value> -q <value> -d <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace]
    [--confirm] [-l <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -d, --data=<value>   (required) JSON object of field=value pairs to apply (e.g. '{"priority":"4","state":"2"}')
  -j, --json           Output results as JSON
  -l, --limit=<value>  [default: 200] Maximum number of records to update (default 200, max 10000)
  -q, --query=<value>  (required) Encoded query to match records
  -t, --table=<value>  (required) Table name to update records in
      --confirm        Execute the update (without this flag, performs a dry run)

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Bulk update records matching an encoded query.

  Finds all records in a table matching the given query, then applies field updates to each one. Defaults to dry-run
  mode — use --confirm to execute.

  Features:
  • Safe dry-run by default (shows match count without modifying data)
  • Encoded query filtering
  • JSON field=value pairs for update data
  • Configurable record limit (default 200, max 10000)
  • Progress reporting for large operations
  • Error collection — operation continues even if individual records fail

EXAMPLES
  Dry run — see how many records would be updated

    $ nex bulk update --table incident --query "active=true^priority=5" --data '{"priority":"4"}' --auth dev

  Execute the update (requires --confirm)

    $ nex bulk update --table incident --query "active=true^priority=5" --data '{"priority":"4"}' --confirm --auth \
      dev

  Update with custom limit

    $ nex bulk update --table incident --query "state=1" --data '{"assignment_group":"group-sys-id"}' --limit 500 \
      --confirm --auth dev

  Update as JSON output

    $ nex bulk update --table incident --query "active=true" --data '{"state":"6"}' --confirm --json --auth dev
```

_See code: [src/commands/bulk/update.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/bulk/update.ts)_

## `nex exec SCOPE [FILE]`

Execute JavaScript on a ServiceNow instance remotely using Scripts - Background.

```
USAGE
  $ nex exec SCOPE [FILE] [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-p <value>]

ARGUMENTS
  SCOPE  Scope to execute script in. Use "global" for global scope.
  FILE   File to execute in scripts background. If omitted, starts REPL mode.

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -p, --params=<value>  JSON object of parameters to replace in script file. Use {paramName} syntax in your script.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Execute JavaScript on a ServiceNow instance remotely using Scripts - Background.

  This command allows you to run JavaScript either from files or interactively via REPL mode. It mimics the
  functionality of the Scripts - Background interface in ServiceNow, providing a way to execute scripts programmatically
  without manual interaction. The output is returned in real-time and can be piped to other commands or saved to files.

  Modes:
  • File Mode: Provide a file path to execute scripts from a file
  • REPL Mode: Omit the file path to start an interactive session

  Features:
  • Execute local JavaScript files remotely
  • Interactive REPL for ad-hoc script execution
  • Script parameterization with {placeholder} replacement
  • Multi-line script support in REPL
  • Scope-aware execution (global or custom scope)
  • Real-time console output capture
  • Pipe-able output for command chaining
  • Debug logging support
  • Useful for data migration, testing, and administrative tasks

  Script Parameterization:
  Use {paramName} placeholders in your script files, then provide values via --params:
  • Supports any JSON-serializable values (strings, numbers, booleans)
  • Multiple parameters supported
  • All occurrences of each placeholder are replaced
  • Example: {token}, {username}, {environment}

  REPL Controls:
  • Press Enter to add a new line
  • Type .exec or press Ctrl+D to execute the script
  • Type .clear to clear the current input
  • Type .exit or press Ctrl+C twice to exit REPL

  ⚠️  IMPORTANT SECURITY WARNING:
  This command executes scripts with the same permissions and risks as using Scripts - Background directly
  in ServiceNow. Always:
  • Review scripts before execution
  • Test in non-production environments first
  • Use appropriate scoping to limit access
  • Be aware of data modification risks
  • Follow your organization's security policies
  • Never execute untrusted scripts

  Script Capabilities:
  Scripts run with full GlideSystem API access and can:
  • Query and modify database records
  • Create, update, and delete data
  • Execute business rules and workflows
  • Access all APIs available in Scripts - Background
  • Use gs, GlideRecord, GlideAggregate, and other server-side APIs

EXAMPLES
  Start REPL in global scope

    $ nex exec global --auth dev-instance

  Start REPL in custom application scope

    $ nex exec x_my_custom_app --auth dev-instance

  Execute a script file in global scope

    $ nex exec global ./scripts/cleanup.js --auth dev-instance

  Execute a script file in a custom application scope

    $ nex exec x_my_custom_app ./scripts/app-config.js --auth dev-instance

  Execute a parameterized script with single parameter

    $ nex exec global ./scripts/query-user.js --auth dev-instance --params '{"username":"admin"}'

  Execute a parameterized script with multiple parameters

    $ nex exec global ./scripts/update-record.js --auth dev-instance --params \
      '{"table":"incident","field":"priority","value":"1"}'

  Execute and save output to a file

    $ nex exec global ./scripts/report.js --auth dev-instance > report.txt

  Execute and pipe output to grep for filtering

    $ nex exec global ./scripts/list-users.js --auth dev-instance | grep "admin"

  Execute with debug logging to troubleshoot issues

    $ nex exec global ./script.js --auth dev-instance --log-level debug

  Execute with parameters for template replacement

    $ nex exec global ./script.js --auth dev-instance --params '{"token":"abc123","env":"dev"}'
```

_See code: [src/commands/exec/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/exec/index.ts)_

## `nex flow action`

Execute a Flow Designer action by scoped name.

```
USAGE
  $ nex flow action -n <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-i <value>] [-m
    foreground|background] [--scope <value>] [--quick]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -i, --inputs=<value>  JSON object of input name-value pairs
  -j, --json            Output results as JSON
  -m, --mode=<option>   [default: foreground] Execution mode
                        <options: foreground|background>
  -n, --name=<value>    (required) Scoped name of the action (e.g. global.create_record)
      --quick           Skip execution detail records for better performance
      --scope=<value>   Scope context for script execution

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Execute a Flow Designer action by scoped name.

  Runs an action using the sn_fd.FlowAPI ScriptableFlowRunner.

  Features:
  • Execute actions by scoped name
  • Pass input values as JSON
  • Foreground or background execution mode
  • Returns context ID, outputs, and debug information

EXAMPLES
  Run an action

    $ nex flow action --name global.create_record --inputs \
      '{"table":"incident","values":{"short_description":"Test"}}' --auth dev
```

_See code: [src/commands/flow/action.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/flow/action.ts)_

## `nex flow cancel`

Cancel a running or paused flow execution.

```
USAGE
  $ nex flow cancel -c <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-r <value>] [--scope
    <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow execution context sys_id
  -j, --json                Output results as JSON
  -r, --reason=<value>      Cancellation reason
      --scope=<value>       Scope context for script execution

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Cancel a running or paused flow execution.

  Cancels a flow context that is in QUEUED, IN_PROGRESS, or WAITING state.

EXAMPLES
  Cancel a running flow

    $ nex flow cancel --context-id abc123def456 --auth dev

  Cancel with a reason

    $ nex flow cancel --context-id abc123def456 --reason "No longer needed" --auth dev
```

_See code: [src/commands/flow/cancel.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/flow/cancel.ts)_

## `nex flow error`

Retrieve error details from a failed flow execution.

```
USAGE
  $ nex flow error -c <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [--scope <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow execution context sys_id
  -j, --json                Output results as JSON
      --scope=<value>       Scope context for script execution

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Retrieve error details from a failed flow execution.

  Gets the error message from a flow context that ended in an error state.

EXAMPLES
  Get flow error details

    $ nex flow error --context-id abc123def456 --auth dev
```

_See code: [src/commands/flow/error.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/flow/error.ts)_

## `nex flow message`

Send a message to a paused flow execution.

```
USAGE
  $ nex flow message -c <value> -m <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-p
    <value>] [--scope <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow execution context sys_id
  -j, --json                Output results as JSON
  -m, --message=<value>     (required) Message to send to the flow
  -p, --payload=<value>     Optional JSON payload to include with the message
      --scope=<value>       Scope context for script execution

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Send a message to a paused flow execution.

  Sends a message to a flow context that is in a WAITING state (e.g. waiting on a "Wait for Message" action). Supports
  an optional JSON payload.

EXAMPLES
  Send a message to resume a waiting flow

    $ nex flow message --context-id abc123def456 --message "approved" --auth dev

  Send a message with a JSON payload

    $ nex flow message --context-id abc123def456 --message "data_ready" --payload '{"status":"ok"}' --auth dev
```

_See code: [src/commands/flow/message.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/flow/message.ts)_

## `nex flow outputs`

Retrieve outputs from a completed flow execution.

```
USAGE
  $ nex flow outputs -c <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [--scope <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow execution context sys_id
  -j, --json                Output results as JSON
      --scope=<value>       Scope context for script execution

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Retrieve outputs from a completed flow execution.

  Gets the output name-value pairs from a flow, subflow, or action execution context.

EXAMPLES
  Get flow outputs

    $ nex flow outputs --context-id abc123def456 --auth dev

  Get outputs as JSON

    $ nex flow outputs --context-id abc123def456 --json --auth dev
```

_See code: [src/commands/flow/outputs.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/flow/outputs.ts)_

## `nex flow run`

Execute a Flow Designer flow by scoped name.

```
USAGE
  $ nex flow run -n <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-i <value>] [-m
    foreground|background] [--scope <value>] [--quick]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -i, --inputs=<value>  JSON object of input name-value pairs
  -j, --json            Output results as JSON
  -m, --mode=<option>   [default: foreground] Execution mode
                        <options: foreground|background>
  -n, --name=<value>    (required) Scoped name of the flow (e.g. global.my_flow)
      --quick           Skip execution detail records for better performance
      --scope=<value>   Scope context for script execution (e.g. global, x_myapp)

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Execute a Flow Designer flow by scoped name.

  Runs a flow using the sn_fd.FlowAPI ScriptableFlowRunner. Supports foreground (synchronous) and background
  (asynchronous) execution modes.

  Features:
  • Execute flows by scoped name (e.g. global.my_flow)
  • Pass input values as JSON
  • Foreground or background execution mode
  • Quick mode to skip execution detail records
  • Returns context ID, outputs, and debug information

EXAMPLES
  Run a flow in foreground mode

    $ nex flow run --name global.my_flow --auth dev

  Run with inputs

    $ nex flow run --name global.my_flow --inputs '{"record_sys_id":"abc123"}' --auth dev

  Run in background mode

    $ nex flow run --name global.my_flow --mode background --auth dev
```

_See code: [src/commands/flow/run.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/flow/run.ts)_

## `nex flow status`

Get the status of a flow execution context.

```
USAGE
  $ nex flow status -c <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [--scope <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow execution context sys_id
  -j, --json                Output results as JSON
      --scope=<value>       Scope context for script execution

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Get the status of a flow execution context.

  Queries sys_flow_context to retrieve the current state of a flow execution.

  Possible states: QUEUED, IN_PROGRESS, WAITING, COMPLETE, CANCELLED, ERROR

EXAMPLES
  Check flow execution status

    $ nex flow status --context-id abc123def456 --auth dev
```

_See code: [src/commands/flow/status.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/flow/status.ts)_

## `nex flow subflow`

Execute a Flow Designer subflow by scoped name.

```
USAGE
  $ nex flow subflow -n <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-i <value>] [-m
    foreground|background] [--scope <value>] [--quick]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -i, --inputs=<value>  JSON object of input name-value pairs
  -j, --json            Output results as JSON
  -m, --mode=<option>   [default: foreground] Execution mode
                        <options: foreground|background>
  -n, --name=<value>    (required) Scoped name of the subflow (e.g. global.my_subflow)
      --quick           Skip execution detail records for better performance
      --scope=<value>   Scope context for script execution

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Execute a Flow Designer subflow by scoped name.

  Runs a subflow using the sn_fd.FlowAPI ScriptableFlowRunner.

  Features:
  • Execute subflows by scoped name
  • Pass input values as JSON
  • Foreground or background execution mode
  • Returns context ID, outputs, and debug information

EXAMPLES
  Run a subflow

    $ nex flow subflow --name global.my_subflow --auth dev

  Run with inputs

    $ nex flow subflow --name x_myapp.process_record --inputs '{"table":"incident","sys_id":"abc123"}' --auth dev
```

_See code: [src/commands/flow/subflow.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/flow/subflow.ts)_

## `nex health check`

Run a consolidated health check on a ServiceNow instance.

```
USAGE
  $ nex health check [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [--include-version]
    [--include-cluster] [--include-stuck-jobs] [--include-semaphores] [--include-operational-counts]
    [--stuck-job-threshold <value>]

FLAGS
  -a, --auth=<value>                     Auth alias to use.
  -j, --json                             Output results as JSON
      --[no-]include-cluster             Include cluster node status
      --[no-]include-operational-counts  Include operational record counts (incidents, changes, problems)
      --[no-]include-semaphores          Include active semaphore count
      --[no-]include-stuck-jobs          Include stuck job detection
      --[no-]include-version             Include instance version information
      --stuck-job-threshold=<value>      [default: 30] Minutes threshold for a job to be considered stuck

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Run a consolidated health check on a ServiceNow instance.

  Performs comprehensive diagnostics including version info, cluster status, stuck job detection, semaphore counts, and
  operational record counts.

  Features:
  • Instance version and build information
  • Cluster node status
  • Stuck job detection with configurable threshold
  • Active semaphore count
  • Operational counts (incidents, changes, problems)
  • Color-coded status indicators
  • JSON output for CI/CD monitoring

EXAMPLES
  Run full health check

    $ nex health check --auth dev

  Check only version and stuck jobs

    $ nex health check --include-version --include-stuck-jobs --no-include-cluster --no-include-semaphores \
      --no-include-operational-counts --auth dev

  Health check with custom stuck job threshold

    $ nex health check --stuck-job-threshold 60 --auth dev

  Health check as JSON

    $ nex health check --json --auth dev
```

_See code: [src/commands/health/check.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/health/check.ts)_

## `nex help [COMMAND]`

Display help for nex.

```
USAGE
  $ nex help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for nex.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.32/src/commands/help.ts)_

## `nex log`

Tail and monitor ServiceNow system logs in real-time with beautiful formatting.

```
USAGE
  $ nex log [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-o <value>] [-i <value>]
    [--no-color] [-f <value>...]

FLAGS
  -a, --auth=<value>       Auth alias to use.
  -f, --filter=<value>...  Filter logs by field and value. Syntax: field OPERATOR value. Operators: CONTAINS,
                           CONTAINS_CI (case-insensitive), EQUALS, EQUALS_CI, STARTS_WITH, STARTS_WITH_CI, ENDS_WITH,
                           ENDS_WITH_CI, REGEX, NOT_CONTAINS, NOT_EQUALS. Field defaults to "message" if omitted.
                           Multiple filters are combined with AND logic.
  -i, --interval=<value>   [default: 1000] Polling interval in milliseconds
  -o, --output=<value>     Output file path to save logs. Creates parent directories if needed.
      --no-color           Disable colored output

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Tail and monitor ServiceNow system logs in real-time with beautiful formatting.

  This command provides real-time log monitoring with enhanced visual formatting using color-coded output that makes
  logs easy to scan and understand at a glance. Automatically highlights errors, warnings, success messages, and
  important keywords.

  Key Features:
  • Real-time log tailing (like Unix tail -f)
  • Powerful filtering with multiple operators (CONTAINS, REGEX, EQUALS, etc.)
  • Smart keyword highlighting (errors in red, warnings in yellow, etc.)
  • Beautiful color-coded console output with chalk
  • Export logs to file with automatic appending
  • Fast 1-second default polling interval
  • Timestamps and sequence numbers for each log
  • Graceful shutdown with Ctrl+C
  • Clean output without colors (--no-color flag)

  Smart Highlighting:
  • Error terms (error, exception, failed) - highlighted in RED
  • Warning terms (warn, warning, deprecated) - highlighted in YELLOW
  • Success terms (success, completed, done) - highlighted in GREEN
  • System terms (system, user, transaction) - highlighted in BLUE

  Filtering:
  • Apply filters using --filter flag with syntax: "field OPERATOR value"
  • Supports case-sensitive and case-insensitive operations
  • Multiple filters are combined with AND logic
  • Operators: CONTAINS, CONTAINS_CI, EQUALS, EQUALS_CI, STARTS_WITH, STARTS_WITH_CI,
  ENDS_WITH, ENDS_WITH_CI, REGEX, NOT_CONTAINS, NOT_CONTAINS_CI, NOT_EQUALS, NOT_EQUALS_CI

  Use Cases:
  • Monitor logs during application development
  • Debug issues in real-time
  • Track system events during deployments
  • Filter logs for specific application or component
  • Quickly spot errors and warnings
  • Collect logs for analysis or audit trails

  ⚠️  IMPORTANT NOTES:
  • Press Ctrl+C to stop tailing and exit gracefully
  • Log files are created/appended automatically
  • Uses ChannelAjax when available for better performance
  • Default poll interval is 1 second for real-time monitoring

EXAMPLES
  Tail all logs in real-time

    $ nex log --auth dev-instance

  Tail logs and save to a file

    $ nex log --output ./logs/instance-logs.txt --auth dev-instance

  Tail logs with custom polling interval (500ms for faster updates)

    $ nex log --interval 500 --auth dev-instance

  Filter logs containing specific text (case-insensitive)

    $ nex log --filter "message CONTAINS_CI error" --auth dev-instance

  Filter logs with multiple conditions (AND logic)

    $ nex log --filter "message CONTAINS x_acme_app" --filter "message CONTAINS error" --auth dev-instance

  Filter logs using regex pattern

    $ nex log --filter "message REGEX .*exception.*" --auth dev-instance

  Filter logs by message starting with a pattern

    $ nex log --filter "message STARTS_WITH [ERROR]" --auth dev-instance

  Tail logs without colored output

    $ nex log --no-color --auth dev-instance
```

_See code: [src/commands/log/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/log/index.ts)_

## `nex plugins`

List installed plugins.

```
USAGE
  $ nex plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ nex plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/index.ts)_

## `nex plugins add PLUGIN`

Installs a plugin into nex.

```
USAGE
  $ nex plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into nex.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the NEX_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the NEX_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ nex plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ nex plugins add myplugin

  Install a plugin from a github url.

    $ nex plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ nex plugins add someuser/someplugin
```

## `nex plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ nex plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ nex plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/inspect.ts)_

## `nex plugins install PLUGIN`

Installs a plugin into nex.

```
USAGE
  $ nex plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into nex.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the NEX_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the NEX_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ nex plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ nex plugins install myplugin

  Install a plugin from a github url.

    $ nex plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ nex plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/install.ts)_

## `nex plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ nex plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ nex plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/link.ts)_

## `nex plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nex plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nex plugins unlink
  $ nex plugins remove

EXAMPLES
  $ nex plugins remove myplugin
```

## `nex plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ nex plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/reset.ts)_

## `nex plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nex plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nex plugins unlink
  $ nex plugins remove

EXAMPLES
  $ nex plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/uninstall.ts)_

## `nex plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nex plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nex plugins unlink
  $ nex plugins remove

EXAMPLES
  $ nex plugins unlink myplugin
```

## `nex plugins update`

Update installed plugins.

```
USAGE
  $ nex plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.46/src/commands/plugins/update.ts)_

## `nex query`

Query any ServiceNow table using the Table API.

```
USAGE
  $ nex query -t <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-q <value>] [-f
    <value>] [-d] [-l <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -d, --display-value   Return display values instead of internal values
  -f, --fields=<value>  Comma-separated list of fields to return
  -j, --json            Output results as JSON
  -l, --limit=<value>   [default: 20] Maximum number of records to return
  -q, --query=<value>   ServiceNow encoded query string
  -t, --table=<value>   (required) ServiceNow table name to query

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Query any ServiceNow table using the Table API.

  Retrieve records from any table with support for encoded queries, field selection, display values, and configurable
  limits.

  Features:
  • Query any table with encoded query strings
  • Select specific fields to return
  • Toggle display values vs. internal values
  • Configurable record limit
  • JSON output for scripting and CI/CD

EXAMPLES
  Query active incidents

    $ nex query --table incident --query "active=true" --limit 10 --auth dev

  Query with specific fields and display values

    $ nex query --table incident --query "priority=1" --fields "number,short_description,state" --display-value \
      --auth dev

  Query as JSON output

    $ nex query --table sys_user --query "active=true" --limit 5 --json --auth dev
```

_See code: [src/commands/query/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/query/index.ts)_

## `nex query app`

Search for applications by name across scoped apps and plugins.

```
USAGE
  $ nex query app -s <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-a] [-l <value>]

FLAGS
  -a, --active          Only show active applications
  -a, --auth=<value>    Auth alias to use.
  -j, --json            Output results as JSON
  -l, --limit=<value>   [default: 20] Maximum number of results to return
  -s, --search=<value>  (required) Application name search term

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Search for applications by name across scoped apps and plugins.

  Searches the sys_scope table for applications matching the provided search term.

  Features:
  • Search by name (case-insensitive contains)
  • Filter active/inactive applications
  • Configurable result limit
  • JSON output for scripting

EXAMPLES
  Search for ITSM applications

    $ nex query app --search "ITSM" --auth dev

  Search active apps only

    $ nex query app --search "HR" --active --auth dev
```

_See code: [src/commands/query/app.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/query/app.ts)_

## `nex query columns`

List and search columns (fields) on a ServiceNow table.

```
USAGE
  $ nex query columns -t <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-s <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -j, --json            Output results as JSON
  -s, --search=<value>  Filter columns by name or label (case-insensitive)
  -t, --table=<value>   (required) ServiceNow table name to list columns for

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List and search columns (fields) on a ServiceNow table.

  Retrieves all field definitions for a table from the sys_dictionary, with optional name/label filtering.

  Features:
  • List all fields with types, lengths, and constraints
  • Search/filter fields by name or label
  • JSON output for scripting

EXAMPLES
  List all columns on the incident table

    $ nex query columns --table incident --auth dev

  Search for date-related columns

    $ nex query columns --table incident --search "date" --auth dev

  List columns as JSON

    $ nex query columns --table incident --json --auth dev
```

_See code: [src/commands/query/columns.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/query/columns.ts)_

## `nex query syslog`

Query ServiceNow system logs (one-shot, non-tailing).

```
USAGE
  $ nex query syslog [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [-q <value>] [-l <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -j, --json           Output results as JSON
  -l, --limit=<value>  [default: 100] Maximum number of syslog records to return
  -q, --query=<value>  ServiceNow encoded query string for filtering syslog records

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Query ServiceNow system logs (one-shot, non-tailing).

  Retrieves syslog records with optional encoded query filtering and configurable limits. For real-time log tailing, use
  the "log tail" command instead.

  Features:
  • Query syslog with encoded query strings
  • Configurable record limit
  • Formatted table output with timestamps, levels, and sources
  • JSON output for scripting

EXAMPLES
  Query recent error logs

    $ nex query syslog --query "level=2" --limit 20 --auth dev

  Query all recent syslog entries

    $ nex query syslog --limit 50 --auth dev

  Query syslog as JSON

    $ nex query syslog --query "sourceLIKEincident" --json --auth dev
```

_See code: [src/commands/query/syslog.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/query/syslog.ts)_

## `nex schema`

Discover and inspect a ServiceNow table schema including fields, types, and relationships.

```
USAGE
  $ nex schema -t <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace] [--include-choices]
    [--include-relationships] [--include-ui-policies] [--include-business-rules]

FLAGS
  -a, --auth=<value>            Auth alias to use.
  -j, --json                    Output results as JSON
  -t, --table=<value>           (required) ServiceNow table name to discover schema for
      --include-business-rules  Include business rules in the schema output
      --include-choices         Include field choices in the schema output
      --include-relationships   Include table relationships in the schema output
      --include-ui-policies     Include UI policies in the schema output

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Discover and inspect a ServiceNow table schema including fields, types, and relationships.

  This command retrieves the full schema definition for a ServiceNow table, including all fields, their types,
  constraints, and optionally choices, relationships, UI policies, and business rules.

  Features:
  • List all fields with types, lengths, and constraints
  • Optionally include field choices
  • Optionally include table relationships
  • Optionally include UI policies
  • Optionally include business rules
  • JSON output for CI/CD integration

EXAMPLES
  Discover incident table schema

    $ nex schema --table incident --auth dev

  Include choices and relationships

    $ nex schema --table incident --include-choices --include-relationships --auth dev
```

_See code: [src/commands/schema/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/schema/index.ts)_

## `nex schema field`

Get detailed information about a specific field on a ServiceNow table.

```
USAGE
  $ nex schema field -t <value> -f <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -f, --field=<value>  (required) Field name to explain
  -j, --json           Output results as JSON
  -t, --table=<value>  (required) ServiceNow table name

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Get detailed information about a specific field on a ServiceNow table.

  This command retrieves comprehensive details about a single field, including its type, constraints, choices, and other
  metadata. Useful for understanding field definitions during development.

EXAMPLES
  Explain the state field on incident table

    $ nex schema field --table incident --field state --auth dev

  Explain the priority field on incident table with JSON output

    $ nex schema field --table incident --field priority --json --auth dev
```

_See code: [src/commands/schema/field.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/schema/field.ts)_

## `nex schema validate-catalog`

Validate a ServiceNow catalog item configuration for common issues.

```
USAGE
  $ nex schema validate-catalog -s <value> [-j] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -j, --json            Output results as JSON
  -s, --sys-id=<value>  (required) Catalog item sys_id to validate

GLOBAL FLAGS
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Validate a ServiceNow catalog item configuration for common issues.

  This command checks a catalog item configuration and reports any validation issues, warnings, or errors found. Useful
  for ensuring catalog items are properly configured before deployment.

EXAMPLES
  Validate a catalog item by sys_id

    $ nex schema validate-catalog --sys-id a1b2c3d4e5f6 --auth dev

  Validate a catalog item with JSON output

    $ nex schema validate-catalog --sys-id a1b2c3d4e5f6 --json --auth dev
```

_See code: [src/commands/schema/validate-catalog.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/schema/validate-catalog.ts)_

## `nex scope`

Get the current application scope or list available applications.

```
USAGE
  $ nex scope [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-l]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -l, --list          List all available applications

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Get the current application scope or list available applications.

EXAMPLES
  Get the current application scope

    $ nex scope --auth dev

  List all available applications

    $ nex scope --list --auth dev

  List applications as JSON

    $ nex scope -l --json --auth dev
```

_See code: [src/commands/scope/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/scope/index.ts)_

## `nex scope set`

Set the current application scope on a ServiceNow instance.

```
USAGE
  $ nex scope set -a <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --app-id=<value>  (required) 32-char sys_id of application
  -a, --auth=<value>    Auth alias to use.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Set the current application scope on a ServiceNow instance.

EXAMPLES
  Set application scope by sys_id

    $ nex scope set --app-id abc123def456ghi789jkl012mno345pq --auth dev

  Set application scope and output as JSON

    $ nex scope set -a abc123def456ghi789jkl012mno345pq --json --auth dev
```

_See code: [src/commands/scope/set.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/scope/set.ts)_

## `nex script-sync pull`

Pull a script from a ServiceNow instance to a local file.

```
USAGE
  $ nex script-sync pull -n <value> -t sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client
    [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-o <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -n, --name=<value>    (required) Name of the script to pull
  -o, --output=<value>  Output file path. If not specified, a file name is auto-generated.
  -t, --type=<option>   (required) Type of script to pull
                        <options: sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client>

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Pull a script from a ServiceNow instance to a local file.

  This command downloads a script record from your ServiceNow instance and saves it as a local file. Supports multiple
  script types including Script Includes, Business Rules, UI Scripts, UI Actions, and Client Scripts.

  Features:
  • Download scripts by name and type
  • Custom output file path support
  • Auto-generated file names based on script name and type
  • JSON output for CI/CD integration

EXAMPLES
  Pull a Script Include to auto-generated file name

    $ nex script-sync pull --name MyScriptInclude --type sys_script_include --auth dev-instance

  Pull a Business Rule to a specific file

    $ nex script-sync pull --name MyBusinessRule --type sys_script --output ./scripts/my-rule.js --auth dev-instance

  Pull a Client Script with JSON output

    $ nex script-sync pull -n MyClientScript -t sys_script_client --json --auth dev-instance
```

_See code: [src/commands/script-sync/pull.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/script-sync/pull.ts)_

## `nex script-sync push`

Push a local script file to a ServiceNow instance.

```
USAGE
  $ nex script-sync push -n <value> -t sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client -f
    <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -f, --file=<value>   (required) Path to the local script file to push
  -n, --name=<value>   (required) Name of the script to push
  -t, --type=<option>  (required) Type of script to push
                       <options: sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client>

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Push a local script file to a ServiceNow instance.

  This command uploads a local script file to your ServiceNow instance, updating the corresponding script record.
  Supports multiple script types including Script Includes, Business Rules, UI Scripts, UI Actions, and Client Scripts.

  Features:
  • Upload scripts by name and type
  • Specify the local file to push
  • JSON output for CI/CD integration
  • Detailed push result reporting

EXAMPLES
  Push a Script Include from a local file

    $ nex script-sync push --name MyScriptInclude --type sys_script_include --file ./scripts/MyScriptInclude.js \
      --auth dev-instance

  Push a Business Rule with short flags

    $ nex script-sync push -n MyBusinessRule -t sys_script -f ./scripts/my-rule.js -a dev-instance

  Push a UI Script with JSON output

    $ nex script-sync push -n MyUIScript -t sys_ui_script -f ./scripts/ui-script.js --json --auth dev-instance
```

_See code: [src/commands/script-sync/push.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/script-sync/push.ts)_

## `nex script-sync sync`

Synchronize all scripts in a directory with a ServiceNow instance.

```
USAGE
  $ nex script-sync sync -d <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-t
    sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client...]

FLAGS
  -a, --auth=<value>       Auth alias to use.
  -d, --directory=<value>  (required) Directory containing script files to synchronize
  -t, --types=<option>...  Script types to synchronize. Can be specified multiple times to include multiple types.
                           <options: sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client>

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Synchronize all scripts in a directory with a ServiceNow instance.

  This command scans a local directory for script files and synchronizes them with the corresponding records on your
  ServiceNow instance. You can optionally filter by script types to synchronize only specific kinds of scripts.

  Features:
  • Batch synchronization of all scripts in a directory
  • Filter by one or more script types
  • Summary report with success/failure counts
  • JSON output for CI/CD integration

EXAMPLES
  Sync all scripts in a directory

    $ nex script-sync sync --directory ./scripts --auth dev-instance

  Sync only Script Includes and Business Rules

    $ nex script-sync sync --directory ./scripts --types sys_script_include --types sys_script --auth dev-instance

  Sync with JSON output for CI/CD

    $ nex script-sync sync -d ./scripts --json --auth dev-instance
```

_See code: [src/commands/script-sync/sync.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/script-sync/sync.ts)_

## `nex search`

Search platform code across a ServiceNow instance.

```
USAGE
  $ nex search -t <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-s <value>]
    [--table <value>] [-g <value>] [-l <value>]

FLAGS
  -a, --auth=<value>          Auth alias to use.
  -g, --search-group=<value>  Search group to search within (required when using --table)
  -l, --limit=<value>         Maximum number of results to return
  -s, --scope=<value>         Application scope to search within
  -t, --term=<value>          (required) Search term to look for in platform code
      --table=<value>         Table name to search within (requires --search-group)

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Search platform code across a ServiceNow instance.

  This command allows you to search through code stored on the platform, including scripts, business rules, UI pages,
  and other scriptable records. You can search globally, within a specific application scope, or within a specific table
  and search group.

  Features:
  • Full-text code search across the platform
  • Scope-specific search within application boundaries
  • Table-specific search within a search group
  • JSON output for CI/CD integration
  • Configurable result limits

EXAMPLES
  Search for a term across the entire instance

    $ nex search --term "GlideRecord" --auth dev-instance

  Search within a specific application scope

    $ nex search --term "getValue" --scope x_my_app --auth dev-instance

  Search within a specific table and search group

    $ nex search --term "initialize" --search-group "Script Includes" --table sys_script_include --auth dev-instance

  Search with a result limit and JSON output

    $ nex search --term "GlideRecord" --limit 10 --json --auth dev-instance
```

_See code: [src/commands/search/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/search/index.ts)_

## `nex search add-table`

Add a table to a code search group on a ServiceNow instance.

```
USAGE
  $ nex search add-table -t <value> -f <value> -g <value> [--json] [-a <value>] [--log-level
    debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>           Auth alias to use.
  -f, --search-fields=<value>  (required) Comma-separated list of fields to index for search
  -g, --search-group=<value>   (required) Search group to add the table to
  -t, --table=<value>          (required) Table name to add to the search group

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Add a table to a code search group on a ServiceNow instance.

  This command registers a new table and its searchable fields with a search group, making the table's records
  discoverable through code search. This is useful when you need to include custom tables in code search results.

  Features:
  • Add custom tables to search groups
  • Specify which fields should be indexed
  • JSON output for scripting and automation

EXAMPLES
  Add a table to a search group

    $ nex search add-table --table sys_script_include --search-fields script --search-group "Script Includes" --auth \
      dev-instance

  Add a table with multiple search fields

    $ nex search add-table --table sys_ui_page --search-fields "html,client_script,processing_script" --search-group \
      "UI Pages" --auth dev-instance

  Add a table with JSON output

    $ nex search add-table --table u_custom_script --search-fields script --search-group "Custom" --json --auth \
      dev-instance
```

_See code: [src/commands/search/add-table.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/search/add-table.ts)_

## `nex search groups`

List all available code search groups on a ServiceNow instance.

```
USAGE
  $ nex search groups [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>  Auth alias to use.

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List all available code search groups on a ServiceNow instance.

  Search groups organize searchable tables into logical categories. Use this command to discover which search groups are
  configured, then use the group names with other search commands to narrow your search scope.

  Features:
  • List all configured search groups
  • JSON output for scripting and automation

EXAMPLES
  List all search groups

    $ nex search groups --auth dev-instance

  List search groups with JSON output

    $ nex search groups --json --auth dev-instance
```

_See code: [src/commands/search/groups.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/search/groups.ts)_

## `nex search tables`

List tables configured for a specific code search group.

```
USAGE
  $ nex search tables -g <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>          Auth alias to use.
  -g, --search-group=<value>  (required) Search group name to list tables for

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List tables configured for a specific code search group.

  Each search group contains one or more tables that are indexed for code search. Use this command to discover which
  tables belong to a search group, including the fields that are searchable on each table.

  Features:
  • List all tables in a search group
  • View searchable fields per table
  • JSON output for scripting and automation

EXAMPLES
  List tables in a search group

    $ nex search tables --search-group "Script Includes" --auth dev-instance

  List tables with JSON output

    $ nex search tables --search-group "Business Rules" --json --auth dev-instance
```

_See code: [src/commands/search/tables.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/search/tables.ts)_

## `nex store install`

Install an application from the ServiceNow Store.

```
USAGE
  $ nex store install -a <value> -v <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]
    [--demo-data] [--no-wait] [--poll-interval <value>] [--timeout <value>]

FLAGS
  -a, --app-id=<value>         (required) Store application sys_id
  -a, --auth=<value>           Auth alias to use.
  -v, --version=<value>        (required) Application version to install
      --demo-data              Load demo data during installation
      --no-wait                Do not wait for installation to complete
      --poll-interval=<value>  [default: 5000] Polling interval in milliseconds
      --timeout=<value>        [default: 1800000] Installation timeout in milliseconds

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Install an application from the ServiceNow Store.

EXAMPLES
  Install a store application and wait for completion

    $ nex store install --app-id abc123 --version 1.0.0 --auth dev

  Install without waiting for completion

    $ nex store install --app-id abc123 --version 1.0.0 --no-wait --auth dev

  Install with demo data

    $ nex store install -a abc123 -v 1.0.0 --demo-data --auth dev
```

_See code: [src/commands/store/install.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/store/install.ts)_

## `nex store search`

Search for applications in the ServiceNow Store.

```
USAGE
  $ nex store search [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [--limit <value>] [--tab
    available_for_you|installed|updates] [-t <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -t, --term=<value>   Search term
      --limit=<value>  [default: 20] Maximum number of results to return
      --tab=<option>   [default: available_for_you] Store tab context to search
                       <options: available_for_you|installed|updates>

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Search for applications in the ServiceNow Store.

EXAMPLES
  Search for applications matching a term

    $ nex store search --term "ITSM" --auth dev

  List installed applications

    $ nex store search --tab installed --auth dev

  List applications with available updates

    $ nex store search --tab updates --limit 10 --auth dev
```

_See code: [src/commands/store/search.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/store/search.ts)_

## `nex store update`

Update a ServiceNow Store application to a new version.

```
USAGE
  $ nex store update -a <value> -v <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]
    [--no-wait] [--poll-interval <value>] [--timeout <value>]

FLAGS
  -a, --app-id=<value>         (required) Store application sys_id
  -a, --auth=<value>           Auth alias to use.
  -v, --version=<value>        (required) Target application version
      --no-wait                Do not wait for update to complete
      --poll-interval=<value>  [default: 5000] Polling interval in milliseconds
      --timeout=<value>        [default: 1800000] Update timeout in milliseconds

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Update a ServiceNow Store application to a new version.

EXAMPLES
  Update a store application and wait for completion

    $ nex store update --app-id abc123 --version 2.0.0 --auth dev

  Update without waiting for completion

    $ nex store update --app-id abc123 --version 2.0.0 --no-wait --auth dev

  Update with custom timeout (1 hour)

    $ nex store update -a abc123 -v 2.0.0 --timeout 3600000 --auth dev
```

_See code: [src/commands/store/update.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/store/update.ts)_

## `nex store validate`

Validate a batch installation definition file.

```
USAGE
  $ nex store validate -f <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -f, --file=<value>  (required) Path to batch definition JSON file

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Validate a batch installation definition file.

EXAMPLES
  Validate a batch definition file

    $ nex store validate --file ./batch-definition.json --auth dev
```

_See code: [src/commands/store/validate.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/store/validate.ts)_

## `nex task approve`

Approve a ServiceNow change request.

```
USAGE
  $ nex task approve -n <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-c <value>]

FLAGS
  -a, --auth=<value>      Auth alias to use.
  -c, --comments=<value>  Approval comments
  -n, --number=<value>    (required) Change request number (e.g., CHG0010001)

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Approve a ServiceNow change request.

  This command approves a change request identified by its number. You can optionally provide approval comments.

  Features:
  - Approve change requests
  - Optionally add approval comments
  - Auto-resolves change request number to sys_id

EXAMPLES
  Approve a change request

    $ nex task approve --number CHG0010001 --auth dev

  Approve a change request with comments

    $ nex task approve -n CHG0010001 -c "Looks good, approved" --auth dev
```

_See code: [src/commands/task/approve.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/task/approve.ts)_

## `nex task assign`

Assign a ServiceNow task to a user or group.

```
USAGE
  $ nex task assign -n <value> -u <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]
    [--table <value>] [-g <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -g, --group=<value>   Assignment group
  -n, --number=<value>  (required) Task number (e.g., INC0010001)
  -u, --user=<value>    (required) User to assign the task to
      --table=<value>   [default: task] ServiceNow table name

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Assign a ServiceNow task to a user or group.

  This command assigns a task record identified by its number to a specified user and/or group. You can assign to a
  user, a group, or both simultaneously.

  Features:
  - Assign tasks to individual users
  - Assign tasks to assignment groups
  - Assign to both user and group at once
  - Supports any task-based table
  - Auto-resolves task number to sys_id

EXAMPLES
  Assign an incident to a user

    $ nex task assign --number INC0010001 --user admin --auth dev

  Assign an incident to a user and group

    $ nex task assign -n INC0010001 -u admin -g "Service Desk" --auth dev

  Assign a change request to a user

    $ nex task assign --number CHG0010001 --table change_request --user admin --auth dev
```

_See code: [src/commands/task/assign.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/task/assign.ts)_

## `nex task close`

Close a ServiceNow incident.

```
USAGE
  $ nex task close -n <value> --notes <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]
    [--close-code <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -n, --number=<value>      (required) Incident number (e.g., INC0010001)
      --close-code=<value>  Close code for the closure
      --notes=<value>       (required) Close notes

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Close a ServiceNow incident.

  This command closes an incident identified by its number, setting the close notes and optionally a close code. The
  incident must be in a state that allows closure.

  Features:
  - Close incidents with close notes
  - Optionally specify a close code
  - Auto-resolves incident number to sys_id

EXAMPLES
  Close an incident with close notes

    $ nex task close --number INC0010001 --notes "Issue confirmed resolved by user" --auth dev

  Close with a specific close code

    $ nex task close -n INC0010001 --notes "Closed" --close-code "Solved (Permanently)" --auth dev
```

_See code: [src/commands/task/close.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/task/close.ts)_

## `nex task comment`

Add a comment or work note to a ServiceNow task.

```
USAGE
  $ nex task comment -n <value> -c <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]
    [--table <value>] [--work-note]

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -c, --comment=<value>  (required) Comment text to add
  -n, --number=<value>   (required) Task number (e.g., INC0010001)
      --table=<value>    [default: task] ServiceNow table name
      --work-note        Add as work note instead of comment

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Add a comment or work note to a ServiceNow task.

  This command adds a comment or work note to a task record identified by its number. By default, comments are added as
  customer-visible comments. Use the --work-note flag to add an internal work note instead.

  Features:
  - Add customer-visible comments to any task
  - Add internal work notes visible only to fulfiller teams
  - Supports any task-based table (incident, change_request, etc.)
  - Auto-resolves task number to sys_id

EXAMPLES
  Add a comment to an incident

    $ nex task comment --number INC0010001 --comment "Investigating the issue" --auth dev

  Add a work note to an incident

    $ nex task comment -n INC0010001 -c "Internal update" --work-note --auth dev

  Add a comment to a change request

    $ nex task comment --number CHG0010001 --table change_request --comment "Approved" --auth dev
```

_See code: [src/commands/task/comment.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/task/comment.ts)_

## `nex task find`

Find a ServiceNow task by its number.

```
USAGE
  $ nex task find -n <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [--table <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -n, --number=<value>  (required) Task number (e.g., INC0010001, CHG0010001)
      --table=<value>   [default: task] ServiceNow table name

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Find a ServiceNow task by its number.

  This command looks up a task record by its number in the specified table. Returns the full task details including
  sys_id, description, state, and assignment information.

  Features:
  - Look up any task by number
  - Supports any task-based table
  - JSON output for scripting and automation

EXAMPLES
  Find an incident by number

    $ nex task find --number INC0010001 --auth dev

  Find a change request by number

    $ nex task find -n CHG0010001 --table change_request --auth dev

  Find an incident and output as JSON

    $ nex task find -n INC0010001 --json --auth dev
```

_See code: [src/commands/task/find.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/task/find.ts)_

## `nex task resolve`

Resolve a ServiceNow incident with resolution notes.

```
USAGE
  $ nex task resolve -n <value> --notes <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]
    [--close-code <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -n, --number=<value>      (required) Incident number (e.g., INC0010001)
      --close-code=<value>  Close code for the resolution
      --notes=<value>       (required) Resolution notes

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Resolve a ServiceNow incident with resolution notes.

  This command resolves an incident identified by its number, setting the resolution notes and optionally a close code.
  The incident must be in a state that allows resolution.

  Features:
  - Resolve incidents with resolution notes
  - Optionally specify a close code
  - Auto-resolves incident number to sys_id

EXAMPLES
  Resolve an incident with resolution notes

    $ nex task resolve --number INC0010001 --notes "Issue resolved by restarting the service" --auth dev

  Resolve with a specific close code

    $ nex task resolve -n INC0010001 --notes "Fixed" --close-code "Solved (Permanently)" --auth dev
```

_See code: [src/commands/task/resolve.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/task/resolve.ts)_

## `nex update-set`

List update sets on a ServiceNow instance.

```
USAGE
  $ nex update-set [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-q <value>] [--limit <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -q, --query=<value>  Encoded query filter
      --limit=<value>  [default: 20] Maximum number of update sets to return

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  List update sets on a ServiceNow instance.

EXAMPLES
  List update sets with default limit

    $ nex update-set --auth dev-instance

  List update sets with a custom query filter

    $ nex update-set --query "state=in progress" --limit 50 --auth dev-instance

  List update sets with JSON output

    $ nex update-set --json --auth dev-instance
```

_See code: [src/commands/update-set/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/update-set/index.ts)_

## `nex update-set clone`

Clone an update set and its records.

```
USAGE
  $ nex update-set clone -s <value> -n <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -n, --name=<value>    (required) Name for the cloned update set
  -s, --source=<value>  (required) Source update set sys_id

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Clone an update set and its records.

EXAMPLES
  Clone an update set

    $ nex update-set clone --source us-001 --name "Cloned Set" --auth dev-instance

  Clone with JSON output

    $ nex update-set clone --source us-001 --name "Cloned Set" --json --auth dev-instance
```

_See code: [src/commands/update-set/clone.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/update-set/clone.ts)_

## `nex update-set create`

Create a new update set.

```
USAGE
  $ nex update-set create -n <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-d <value>]
    [--application <value>]

FLAGS
  -a, --auth=<value>         Auth alias to use.
  -d, --description=<value>  Description for the new update set
  -n, --name=<value>         (required) Name for the new update set
      --application=<value>  Application scope for the new update set

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Create a new update set.

EXAMPLES
  Create a new update set with a name

    $ nex update-set create --name "My Feature Set" --auth dev-instance

  Create with name and description

    $ nex update-set create --name "My Feature Set" --description "Update set for feature X" --auth dev-instance

  Create within a specific application scope

    $ nex update-set create --name "My Feature Set" --application x_my_app --auth dev-instance
```

_See code: [src/commands/update-set/create.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/update-set/create.ts)_

## `nex update-set current`

Get or set the current update set.

```
USAGE
  $ nex update-set current [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [-s <value>]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -s, --set=<value>   sys_id of update set to make current

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Get or set the current update set.

EXAMPLES
  Get the current update set

    $ nex update-set current --auth dev-instance

  Set the current update set by sys_id

    $ nex update-set current --set us-001 --auth dev-instance

  Get the current update set as JSON

    $ nex update-set current --json --auth dev-instance
```

_See code: [src/commands/update-set/current.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/update-set/current.ts)_

## `nex update-set inspect`

Inspect the components of an update set.

```
USAGE
  $ nex update-set inspect -s <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -s, --sys-id=<value>  (required) sys_id of the update set to inspect

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Inspect the components of an update set.

EXAMPLES
  Inspect an update set by sys_id

    $ nex update-set inspect --sys-id us-001 --auth dev-instance

  Inspect with JSON output

    $ nex update-set inspect --sys-id us-001 --json --auth dev-instance
```

_See code: [src/commands/update-set/inspect.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/update-set/inspect.ts)_

## `nex update-set move`

Move records between update sets.

```
USAGE
  $ nex update-set move --target <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace] [--source
    <value>] [--records <value>]

FLAGS
  -a, --auth=<value>     Auth alias to use.
      --records=<value>  Comma-separated sys_ids of records to move
      --source=<value>   Source update set sys_id
      --target=<value>   (required) Target update set sys_id

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Move records between update sets.

EXAMPLES
  Move all records from one update set to another

    $ nex update-set move --target us-002 --source us-001 --auth dev-instance

  Move specific records to a target update set

    $ nex update-set move --target us-002 --records "rec-001,rec-002,rec-003" --auth dev-instance

  Move records with JSON output

    $ nex update-set move --target us-002 --source us-001 --json --auth dev-instance
```

_See code: [src/commands/update-set/move.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/update-set/move.ts)_

## `nex workflow create`

Create a complete workflow from a JSON specification file.

```
USAGE
  $ nex workflow create -s <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -s, --spec=<value>  (required) Path to workflow JSON specification file

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Create a complete workflow from a JSON specification file.

EXAMPLES
  Create a workflow from a JSON spec file

    $ nex workflow create --spec ./workflow.json --auth dev

  Create a workflow and output result as JSON

    $ nex workflow create -s ./workflow.json --json --auth dev
```

_See code: [src/commands/workflow/create.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/workflow/create.ts)_

## `nex workflow publish`

Publish a workflow version.

```
USAGE
  $ nex workflow publish -v <value> -s <value> [--json] [-a <value>] [--log-level debug|warn|error|info|trace]

FLAGS
  -a, --auth=<value>            Auth alias to use.
  -s, --start-activity=<value>  (required) Sys ID of the start activity
  -v, --version-id=<value>      (required) Sys ID of the workflow version to publish

GLOBAL FLAGS
  --json                Format output as json.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>

DESCRIPTION
  Publish a workflow version.

EXAMPLES
  Publish a workflow version

    $ nex workflow publish --version-id wfv-001 --start-activity act-001 --auth dev

  Publish a workflow version and output as JSON

    $ nex workflow publish -v wfv-001 -s act-001 --json --auth dev
```

_See code: [src/commands/workflow/publish.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v2.0.0-alpha.0/src/commands/workflow/publish.ts)_
<!-- commandsstop -->

---

## 🚀 Advanced Features

### Interactive REPL Mode

The ServiceNow Script Executor REPL provides an interactive environment for executing scripts without creating files - perfect for quick queries, debugging, and exploration.

#### Starting the REPL

```bash
# Global scope
nex exec global --auth dev

# Custom application scope  
nex exec x_my_custom_app --auth dev
```

#### REPL Interface

```
╔═══════════════════════════════════════════════════════════════╗
║  ServiceNow Script Executor REPL                              ║
╚═══════════════════════════════════════════════════════════════╝
  Scope: global
  Instance: dev12345.service-now.com

  Commands:
    .exec    - Execute the current script
    .clear   - Clear the current input
    .exit    - Exit REPL
    Ctrl+D   - Execute the current script
    Ctrl+C   - Cancel current input or exit (press twice)

  Type your script below (press Enter for new lines):

sn> var gr = new GlideRecord('incident');
... gr.addQuery('priority', 1);
... gr.setLimit(5);
... gr.query();
... while (gr.next()) {
...   gs.info(gr.number + ': ' + gr.short_description);
... }
... .exec

  Executing script (7 lines)...

  ───────────────────────────────────────────────────────────────

*** Script: INC0001234: Server down
*** Script: INC0001235: Network issue
*** Script: INC0001236: Database error

  ───────────────────────────────────────────────────────────────
  ✓ Script executed successfully

sn>
```

#### REPL Commands

| Command | Description |
|---------|-------------|
| `.exec` | Execute the current script buffer |
| `.clear` | Clear the current input |
| `.exit` | Exit REPL |
| `Ctrl+D` | Execute and continue |
| `Ctrl+C` (once) | Clear input |
| `Ctrl+C` (twice) | Exit REPL |

#### Use Cases

- **Quick Queries**: Test GlideRecord queries without creating files
- **Debugging**: Explore API behavior interactively
- **Learning**: Learn ServiceNow APIs hands-on
- **Prototyping**: Test logic before adding to applications
- **Admin Tasks**: One-off administrative operations

📚 **Full Documentation**: [REPL Mode Guide](./docs/REPL_MODE.md)

---

### Script Parameterization

Create reusable script templates with runtime parameter replacement - perfect for multi-environment deployments and CI/CD.

#### Basic Usage

**1. Create a template script:**

**File: `deploy.js`**
```javascript
// Deploy to {environment}
var config = {
  environment: '{environment}',
  apiEndpoint: '{api_endpoint}',
  debugMode: {debug_mode},
  timeout: {timeout}
};

gs.setProperty('app.config', JSON.stringify(config));
gs.info('Deployed to: ' + config.environment);
```

**2. Execute with parameters:**

```bash
# Development
nex exec global ./deploy.js \
  --auth dev \
  --params '{"environment":"dev","api_endpoint":"https://dev-api.com","debug_mode":true,"timeout":60000}'

# Production  
nex exec global ./deploy.js \
  --auth prod \
  --params '{"environment":"prod","api_endpoint":"https://api.com","debug_mode":false,"timeout":30000}'
```

#### Parameter Syntax

Use `{paramName}` in your scripts:

```javascript
var username = '{username}';           // String
var retries = {max_retries};           // Number
var enabled = {feature_enabled};       // Boolean
var endpoint = '{api_endpoint}';       // URL
```

Provide values via `--params` flag:

```bash
--params '{"username":"admin","max_retries":3,"feature_enabled":true,"api_endpoint":"https://api.example.com"}'
```

#### Advanced Examples

**API Integration:**
```javascript
var request = new sn_ws.RESTMessageV2();
request.setEndpoint('{endpoint}');
request.setRequestHeader('Authorization', 'Bearer {token}');
var response = request.execute();
```

**Bulk Operations:**
```javascript
var gr = new GlideRecord('{table}');
gr.addQuery('{field}', '{value}');
gr.query();
while (gr.next()) {
  gr.setValue('{update_field}', '{update_value}');
  gr.update();
}
```

**CI/CD Integration:**
```yaml
# GitHub Actions
- name: Deploy Script
  run: |
    nex exec global ./deploy.js \
      --auth ci \
      --params "{\"env\":\"${{ vars.ENVIRONMENT }}\",\"token\":\"${{ secrets.API_TOKEN }}\"}"
```

📚 **Full Documentation**: [Script Parameterization Guide](./docs/SCRIPT_PARAMETERIZATION.md)

---

### Shell Autocomplete

Intelligent tab completion that dynamically queries your ServiceNow instance for available scopes.

#### Setup (One-Time)

```bash
# 1. Enable autocomplete
nex autocomplete

# 2. Follow shell-specific instructions (bash/zsh/fish)

# 3. Reload shell
source ~/.zshrc  # or ~/.bashrc

# 4. Start using it!
```

#### Usage

```bash
$ nex exec --auth dev x_tan[TAB]

# Autocomplete queries ServiceNow and shows:
x_acme_app           x_acme_custom         x_acme_integration

$ nex exec --auth dev x_acme_app
# Ready to execute!
```

#### How It Works

1. **You type** and press Tab
2. **CLI extracts** the `--auth` flag value
3. **Queries ServiceNow** `sys_scope` table for matching scopes
4. **Returns suggestions** from your actual instance
5. **Caches results** for 5 minutes (fast subsequent lookups)

#### Features

- ✅ Real-time querying of your ServiceNow instance
- ✅ Works with multiple instances (different cache per instance)
- ✅ Intelligent caching (5-minute TTL)
- ✅ Supports Basic Auth and OAuth
- ✅ Graceful fallback if query fails
- ✅ No configuration needed

📚 **Full Documentation**: [Autocomplete Guide](./docs/AUTOCOMPLETE.md) | [Quick Start](./docs/AUTOCOMPLETE_QUICKSTART.md)

---

## 🔐 Authentication

### How Authentication Works

`now-sdk-ext-cli` uses the ServiceNow SDK's authentication system. You configure credentials once using the `now-sdk auth` command, and they're automatically available to all `nex` commands.

### Setting Up Authentication

```bash
# Add credentials interactively (will prompt for username/password)
now-sdk auth --add your-instance.service-now.com --type basic --alias prod

# For OAuth authentication
now-sdk auth --add your-instance.service-now.com --type oauth --alias prod-oauth

# List all configured authentication profiles
now-sdk auth --list

# Set default authentication profile (optional)
now-sdk auth --use prod

# Delete an authentication profile
now-sdk auth --delete old-instance
```

### Credential Storage

Credentials are securely stored in your operating system's keychain:
- **macOS**: Keychain
- **Linux**: Secret Service API (libsecret)
- **Windows**: Credential Vault

Only authentication metadata (alias, instance URL, type) is stored in plain text configuration files.

### Using Authentication in Commands

```bash
# Use specific authentication profile via --auth flag
nex atf --test-id xyz123 --auth prod

# Use default profile (if set with --use)
nex atf --test-id xyz123

# All commands support the --auth flag
nex exec global ./script.js --auth prod
nex app uninstall -i app-id -s x_scope --auth prod
```

### Environment Variables for CI/CD

For automated environments, you can use environment variables:

```bash
# Set credentials in environment
export NOWSDK_INSTANCE=your-instance.service-now.com
export NOWSDK_USER=admin
export NOWSDK_PASSWORD=your-password

# Add authentication profile (will use environment variables)
now-sdk auth --add $NOWSDK_INSTANCE --type basic --alias ci
```

### For ServiceNow SDK Documentation

For complete authentication documentation, see:
**ServiceNow SDK CLI Commands**: https://www.servicenow.com/docs/bundle/zurich-application-development/page/build/servicenow-sdk/reference/servicenow-sdk-cli-commands.html

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: ServiceNow ATF Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install Dependencies
        run: |
          npm install -g @servicenow/sdk
          npm install -g @sonisoft/now-sdk-ext-cli
      
      - name: Configure ServiceNow Authentication
        env:
          NOWSDK_INSTANCE: ${{ secrets.SN_INSTANCE }}
          NOWSDK_USER: ${{ secrets.SN_USER }}
          NOWSDK_PASSWORD: ${{ secrets.SN_PASSWORD }}
        run: |
          now-sdk auth --add $NOWSDK_INSTANCE --type basic --alias ci-instance
      
      - name: Run ATF Test Suite
        run: |
          nex atf \
            --suite-id ${{ vars.TEST_SUITE_ID }} \
            --auth ci-instance \
            --json > test-results.json
      
      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results.json
```

### GitLab CI Example

```yaml
servicenow-tests:
  image: node:22
  stage: test
  before_script:
    - npm install -g @servicenow/sdk
    - npm install -g @sonisoft/now-sdk-ext-cli
    - export NOWSDK_INSTANCE=$SN_INSTANCE NOWSDK_USER=$SN_USER NOWSDK_PASSWORD=$SN_PASSWORD
    - now-sdk auth --add $SN_INSTANCE --type basic --alias ci
  script:
    - nex atf --suite-id $TEST_SUITE_ID --auth ci --json > test-results.json
  artifacts:
    when: always
    reports:
      junit: test-results.json
    paths:
      - test-results.json
```

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    
    environment {
        SN_INSTANCE = credentials('servicenow-instance')
        SN_CREDENTIALS = credentials('servicenow-credentials')
    }
    
    stages {
        stage('Setup') {
            steps {
                sh '''
                    npm install -g @servicenow/sdk
                    npm install -g @sonisoft/now-sdk-ext-cli
                    export NOWSDK_INSTANCE=$SN_INSTANCE NOWSDK_USER=$SN_CREDENTIALS_USR NOWSDK_PASSWORD=$SN_CREDENTIALS_PSW
                    now-sdk auth --add $SN_INSTANCE --type basic --alias jenkins
                '''
            }
        }
        
        stage('Run Tests') {
            steps {
                sh '''
                    nex atf --suite-id ${TEST_SUITE_ID} --auth jenkins --json > test-results.json
                '''
            }
        }
        
        stage('Publish Results') {
            steps {
                archiveArtifacts artifacts: 'test-results.json'
                publishHTML([
                    reportDir: '.',
                    reportFiles: 'test-results.json',
                    reportName: 'ATF Test Results'
                ])
            }
        }
    }
}
```

## 💡 Examples

### Complete Workflow: Development to Production

```bash
# 1. List available repository apps
nex app:repo-list --installable --auth dev

# 2. Install application from repository
nex app:repo-install --scope x_my_app --auth dev

# 3. Configure using REPL
nex exec x_my_app --auth dev
sn> gs.setProperty('x_my_app.api_key', 'dev_key_123');
... .exec

# 4. Run tests
nex atf --suite-name "My App Tests" --auth dev --wait

# 5. Deploy to production with parameterized script
nex exec global ./deploy.js \
  --auth prod \
  --params '{"env":"production","api_key":"prod_key_456"}'

# 6. Verify deployment
nex atf --suite-name "Smoke Tests" --auth prod --json > results.json
```

### ATF Testing Examples

```bash
# Execute a single test
nex atf --test-id f717a8c783103210621e78c6feaad396 --auth dev

# Execute a test suite and wait for results
nex atf --suite-id e077e00b83103210621e78c6feaad383 --auth dev --wait

# Execute by name (no need to look up sys_id)
nex atf --suite-name "Regression Tests" --auth dev

# Performance test with specific browser
nex atf --suite-id abc123 --browser chrome --performance --auth dev

# CI/CD integration with JSON output
nex atf --suite-name "CI Tests" --auth ci --json > test-results.json

# Custom polling for long tests
nex atf --suite-id xyz789 --poll-interval 10000 --auth dev
```

### Application Management Examples

```bash
# Browse company repository
nex app:repo-list --auth prod
nex app:repo-list --installable --json --auth prod

# Install from repository
nex app:repo-install --scope x_custom_app --auth prod
nex app:repo-install --scope x_custom_app --version 2.0.0 --auth prod
nex app:repo-install --scope x_custom_app --no-wait --auth prod

# Batch install multiple apps
nex app:install --batch --definitionPath ./production-apps.json --auth prod

# Uninstall application
nex app:uninstall -i a1b2c3d4e5f6 -s x_my_app --auth dev
```

### Script Execution Examples

#### File Mode
```bash
# Execute script file
nex exec global ./cleanup.js --auth dev

# Execute in custom scope
nex exec x_my_app ./app-setup.js --auth dev

# Pipe output
nex exec global ./report.js --auth dev > report.txt
nex exec global ./list-users.js --auth dev | grep "admin"
```

#### REPL Mode
```bash
# Start REPL
$ nex exec global --auth dev

# Execute multi-line scripts interactively
sn> var gr = new GlideRecord('incident');
... gr.addQuery('priority', 1);
... gr.query();
... gs.info('Critical incidents: ' + gr.getRowCount());
... .exec

*** Script: Critical incidents: 5

sn> .exit
```

#### Parameterized Scripts
```bash
# Single parameter
nex exec global ./query-user.js \
  --auth dev \
  --params '{"username":"admin"}'

# Multiple parameters
nex exec global ./deploy.js \
  --auth prod \
  --params '{"env":"production","token":"secret","debug":false,"timeout":30000}'

# From environment variables
export API_TOKEN="secret_token"
nex exec global ./api-call.js \
  --auth prod \
  --params "{\"token\":\"$API_TOKEN\",\"endpoint\":\"https://api.example.com\"}"
```

### Batch Application Installation

Create a `batch-install.json` file:

```json
{
  "applications": [
    {
      "name": "Core Application",
      "scope": "x_core_app",
      "version": "2.0.0",
      "load_demo_data": false,
      "notes": "Production release"
    },
    {
      "name": "Integration Module",
      "scope": "x_integration",
      "version": "1.5.0",
      "load_demo_data": false
    }
  ]
}
```

Execute:

```bash
nex app:install --batch --definitionPath ./batch-install.json --auth prod
```

### Real-World Scenarios

#### Scenario 1: Daily Smoke Tests
```bash
#!/bin/bash
# daily-tests.sh

nex atf \
  --suite-name "Daily Smoke Tests" \
  --auth prod \
  --json > test-results-$(date +%Y%m%d).json

if [ $? -eq 0 ]; then
  echo "✓ All tests passed!"
else
  echo "✗ Tests failed!"
  exit 1
fi
```

#### Scenario 2: Environment Setup
```bash
#!/bin/bash
# setup-environment.sh

# Install required apps from repository
nex app:repo-install --scope x_core_app --auth new-env
nex app:repo-install --scope x_integration --auth new-env

# Configure via parameterized script
nex exec global ./configure.js \
  --auth new-env \
  --params '{"env":"staging","debug":true}'

# Validate with ATF
nex atf --suite-name "Environment Validation" --auth new-env
```

#### Scenario 3: Data Migration
```bash
#!/bin/bash
# migrate-data.sh

# Export from source
nex exec global ./export-data.js --auth source > data.json

# Transform data
cat data.json | jq '.records' > transformed.json

# Import to target with parameters
nex exec global ./import-data.js \
  --auth target \
  --params "{\"data\":\"$(cat transformed.json)\"}"

# Validate
nex atf --suite-name "Data Validation" --auth target
```

## 🔧 Troubleshooting

### Common Issues

#### Authentication Errors

```bash
# List all configured authentication profiles
now-sdk auth --list

# Delete and re-add credentials if needed
now-sdk auth --delete your-alias
now-sdk auth --add instance.service-now.com --type basic --alias your-alias

# Set as default
now-sdk auth --use your-alias
```

#### Command Not Found

```bash
# Verify installation
npm list -g @sonisoft/now-sdk-ext-cli

# Reinstall if needed
npm install -g @sonisoft/now-sdk-ext-cli

# Check PATH includes npm global binaries
npm config get prefix
```

#### Test Execution Timeouts

```bash
# Increase poll interval
nex atf --suite-id xyz --auth dev --poll-interval 15000

# Check instance performance
# Check test suite complexity
# Review ServiceNow logs
```

#### Permission Errors

```bash
# Verify user has required roles:
# - atf_test_runner for ATF operations
# - admin for app management
# - appropriate scope access for scripts
```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
nex atf --test-id xyz --auth dev --log-level debug
```

### Getting Help

```bash
# General help
nex --help

# Command-specific help
nex atf --help
nex app --help
nex exec --help
```

## 📝 Best Practices

### Security

- **Never commit credentials** to version control
- Use environment variables or secure credential stores in CI/CD
- Regularly rotate passwords
- Use least-privilege accounts for automation
- Audit script execution logs

### Testing

- Always test scripts in development environments first
- Use ATF for automated regression testing
- Implement proper error handling in scripts
- Validate batch installation definitions before production use

### CI/CD

- Use JSON output mode for parsing results
- Check exit codes (0 = success, 1 = failure)
- Archive test results as artifacts
- Implement proper secret management
- Use dedicated service accounts

### Performance

- Adjust poll intervals based on test duration
- Use batch operations when possible
- Monitor instance performance during test execution
- Consider off-peak hours for large operations

## 📚 Documentation

### Comprehensive Guides

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/GETTING_STARTED.md) | Complete setup and first steps guide |
| [REPL Mode](./docs/REPL_MODE.md) | Interactive script executor documentation |
| [Script Parameterization](./docs/SCRIPT_PARAMETERIZATION.md) | Template scripts with parameter replacement |
| [Autocomplete Setup](./docs/AUTOCOMPLETE.md) | Full autocomplete documentation |
| [Autocomplete Quick Start](./docs/AUTOCOMPLETE_QUICKSTART.md) | 3-step setup guide |
| [ATF Command](./docs/ATF_COMMAND.md) | Detailed ATF testing documentation |
| [Summary](./docs/SUMMARY.md) | Feature overview and capabilities |

### Quick References

```bash
# Command-specific help
nex --help
nex atf --help
nex app --help
nex app:repo-list --help
nex app:repo-install --help
nex app:uninstall --help
nex exec --help

# Enable autocomplete
nex autocomplete
```

### API Reference

All commands are built on `@sonisoft/now-sdk-ext-core`. For low-level API documentation:
- [Core Library Documentation](https://www.npmjs.com/package/@sonisoft/now-sdk-ext-core)
- [ServiceNow SDK Documentation](https://www.servicenow.com/docs/bundle/zurich-application-development/page/build/servicenow-sdk/reference/servicenow-sdk-cli-commands.html)

---

## 📞 Support & Contributing

### Getting Help

- 📖 **Documentation**: Start with [Getting Started Guide](./docs/GETTING_STARTED.md)
- 💬 **Issues**: [GitHub Issues](https://github.com/sonisoft/now-sdk-ext-cli/issues)
- 📦 **NPM**: [@sonisoft/now-sdk-ext-cli](https://www.npmjs.com/package/@sonisoft/now-sdk-ext-cli)
- ❓ **Questions**: Open a GitHub Discussion

### Contributing

Contributions are welcome! We appreciate:

- 🐛 Bug reports and fixes
- ✨ Feature requests and implementations
- 📖 Documentation improvements
- 🧪 Additional test coverage
- 💡 Usage examples and tutorials

#### Development Setup

```bash
# Clone the repository
git clone https://github.com/sonisoft/now-sdk-ext-cli.git
cd now-sdk-ext-cli

# Install dependencies
npm install

# Build
npm run build

# Run tests (960+ tests)
npm test

# Run linter
npm run lint

# Test locally
./bin/run.js exec global --auth your-instance
```

#### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- test/commands/exec/parameterization.test.ts

# With coverage
npm test -- --coverage
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- [@servicenow/sdk](https://www.npmjs.com/package/@servicenow/sdk) - Official ServiceNow SDK
- [@sonisoft/now-sdk-ext-core](https://www.npmjs.com/package/@sonisoft/now-sdk-ext-core) - Core library powering this CLI

---

## ⭐ Why Choose `nex`?

### vs. Manual ServiceNow UI

| Task | Manual UI | With `nex` |
|------|-----------|------------|
| Run 10 ATF tests | Click each test, wait, check results (30+ min) | `nex atf --suite-id xyz --json` (5 min) |
| Install 5 apps | Navigate, click, wait for each (20+ min) | `nex app:install --batch apps.json` (10 min) |
| Test a script idea | Create file, upload, run, download (5 min) | `nex exec global` type & run (30 sec) |
| Deploy to 3 envs | Repeat manually 3 times (1+ hour) | `./deploy.sh` with params (15 min) |

### vs. ServiceNow REST API

| Feature | REST API | With `nex` |
|---------|----------|------------|
| Authentication | Manage yourself | Uses ServiceNow SDK (secure keychain) |
| ATF Execution | Complex multi-step process | Single command |
| Progress Monitoring | Manual polling | Automatic with progress display |
| Error Handling | Parse HTTP responses | Clear error messages |
| Output Formatting | Parse JSON yourself | Beautiful console or JSON mode |

### vs. Other Tools

- ✅ **Built for ServiceNow**: Purpose-built, not a generic tool adapted for ServiceNow
- ✅ **Modern CLI**: Uses industry-standard oclif framework
- ✅ **Extensible**: Plugin support for custom commands
- ✅ **Well-Tested**: 48+ unit tests, production-ready
- ✅ **Actively Maintained**: Regular updates and improvements
- ✅ **Open Source**: MIT licensed, community-driven

### What Makes It Special

1. **🎨 Interactive REPL**: Only CLI with interactive ServiceNow script execution
2. **🎯 Smart Autocomplete**: Only CLI that queries your instance for scopes
3. **📝 Parameterization**: Template scripts for any environment
4. **📦 Repository Integration**: Direct company repository access
5. **🔄 Complete Lifecycle**: From installation to testing to uninstallation
6. **🚀 DevOps First**: Built for automation, CI/CD, and modern workflows

---

Made with ❤️ for the ServiceNow Developer Community

**Ready to get started?** → [Jump to Quick Start](#-quick-start)
