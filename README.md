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

#### Verified metadata writes
Write scoped application files through forms with verified update-set capture.
Use explicit scope and exact delete confirmation. See [metadata commands](docs/metadata.md).

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

#### Table Behavior
Discover business rules, UI actions, client scripts, UI/data policies, workflows, flow triggers and state models. Retrieve scripts, definitions and dependencies in the same call or in targeted batches. See [Table Behavior Discovery](#table-behavior-discovery).

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
- **[Table Behavior](docs/table-behavior.md)**: Inspect automation, field requirements, and related artifact details
- **Script Sync**: Pull and push scripts between local files and ServiceNow
- **Task Management**: Comment, assign, resolve, and close incidents and changes
- **Update Sets**: Create, inspect, clone, and manage update sets
- **Workflow Creation**: Create workflows with activities, transitions, and conditions
- **Scope Management**: Switch application scopes programmatically
- **Store Integration**: Search, install, and update apps from the ServiceNow Store, and repair an installed store or company app from its repository (`nex store repair`, see [the guide](docs/store-repair.md))
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
  - [Table Behavior Discovery](#table-behavior-discovery)
  - [Aggregate & Analytics](#aggregate--analytics)
  - [Instance Health Check](#instance-health-check)
  - [Cluster Transactions](#cluster-transactions)
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
> npx @servicenow/sdk auth --add https://dev12345.service-now.com --alias dev --type oauth
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

Create credentials with the ServiceNow SDK (`now-sdk auth`). Use `nex auth` commands to inspect aliases, diagnose credential access, and select a default alias. This provides:
- Secure credential storage in your system's keychain
- Centralized authentication management across ServiceNow tools
- Support for multiple instance profiles
- OAuth and basic authentication methods

### Node.js

- **Minimum Version**: Node.js 26.0.0 or higher

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

#### Headless and non-interactive use

`now-sdk` stores credentials in the OS keyring, which a non-interactive session
cannot unlock — even running as the same user. Worse, the failure is silent: the
SDK's `KeyChain.getPassword()` swallows the error and returns `null`, so you get
`Default Credential has not been set` rather than a keyring error.

If you run `nex` over SSH, from a systemd service, from CI, or from an AI agent,
install [`@sonisoft/sn-credstore`](https://github.com/sonisoft-cnanda/sn-credstore)
and pass `--cred-store`. The SDK then reads from a headless-safe store that many
concurrent processes can share:

```bash
npm install -g @sonisoft/sn-credstore

# One-time migration of existing keyring credentials.
# Run this from a desktop session — the keyring will prompt to unlock.
sn-credstore import --from keyring

nex auth doctor                                    # confirm what is where
nex aggregate count --table incident --auth my-dev-instance --cred-store
```

**This is opt-in.** Without `--cred-store`, `nex` uses the ServiceNow SDK's OS
keyring exactly as it always has, whether or not sn-credstore is installed. To
opt in for a whole session instead of per command, export
`SN_CRED_STORE_ENABLE=1`.

By default the store is encrypted with `systemd-creds --user`, which binds it to
this host. Containers without systemd should set `SN_CRED_STORE=file`.

| Variable | Description |
|---|---|
| `SN_CRED_STORE_ENABLE` | Opt in without passing `--cred-store` on every command |
| `SN_CRED_STORE_DISABLE` | Hard off switch; wins over the flag and everything else |
| `SN_CRED_STORE` | Backend: `systemd-creds` (default), `file`, or `auto` |
| `SN_CRED_STORE_PATH` | Override the store location |
| `SN_CRED_STORE_DEBUG` | Verbose diagnostics on stderr |

#### Managing stored credentials

```bash
nex auth list                # list aliases (secrets are never printed)
nex auth use my-dev-instance # set the default alias
nex auth delete old-alias    # remove one alias
nex auth doctor              # diagnose credential storage
```

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

### Cluster Transactions

Discover active transactions from all responding ServiceNow cluster nodes, then submit a request for one exact transaction when necessary.

```bash
# List active transactions
nex transaction list --auth dev

# Return complete, untruncated records as JSON
nex transaction list --json --auth dev

# Submit a kill request for one deliberately selected transaction
nex transaction kill --transaction-id 8f9a1234567890abcdef1234567890c1 --confirm --auth dev
```

> **Warning:** A kill request aborts real work. Only pass an identifier you deliberately selected from a current `nex transaction list` result. Platform acceptance does not mean the transaction has cleared immediately; run a separate later list to confirm.

### Table Behavior Discovery

Available in **nex 5.5.0**, using core **6.4.1**. Use `nex schema` for table structure and `nex behavior` for configuration that can affect records. Both behavior commands are read-only.

```bash
nex behavior --table change_request --auth dev --read-only --json
```

| Category | Functional context |
| --- | --- |
| `business_rules` | Operation flags, before/after/async timing, order, conditions and script availability |
| `ui_actions` | Form/list/workspace placement, roles, visibility conditions and scripts |
| `client_scripts` | Client events, target fields, views and inherited applicability |
| `ui_policies` | Conditions and mandatory, visible or read-only field actions |
| `data_policies` | Server field requirements and enforcement settings |
| `workflows` | Legacy workflow versions, start conditions, activities and transitions |
| `flows` | Record triggers, conditions and optional current flow definitions |
| `state_models` | State fields, transition gates and required fields in supported generic layouts |

Defaults include active configuration and applicable ancestors, all eight categories, 50 items per category and a 64 KiB JSON response budget. Conditions and declarative field actions are included in summaries; script bodies and full definitions are opt-in.

Request the detail needed for an investigation immediately:

```bash
nex behavior --table change_request --category business_rules \
  --details scripts --auth dev --read-only --json

nex behavior --table change_request --category flows \
  --details definitions --details dependencies --dependency-depth 1 \
  --max-bytes 262144 --auth dev --read-only --json
```

Retrieve 1–50 known artifacts without repeating table discovery. Repeat `--reference` with `kind:sourceTable:sysId` values from results. Replace these example IDs with real source IDs:

```bash
nex behavior details \
  --reference flows:sys_hub_flow:0123456789abcdef0123456789abcdef \
  --reference business_rules:sys_script:abcdef0123456789abcdef0123456789 \
  --details scripts --details definitions --details dependencies \
  --dependency-depth 1 --max-bytes 262144 --auth dev --read-only --json
```

Known subflows, actions, Script Includes and decision tables are also supported. Preserve references returned by discovery: a flow inventory reference can identify its trigger record. For a known flow ID, use `flows:sys_hub_flow:<sys_id>`.

| Control | Use |
| --- | --- |
| `--category` | Repeat to select categories; default all eight |
| `--include-inactive` | Include inactive/draft candidates where discoverable |
| `--no-include-inherited` | Restrict table associations to the requested table |
| `--name`, `--sys-id` | Filter metadata names or up to 50 source IDs; repeat `--sys-id` |
| `--limit` | Items per category, 1–200; default 50 |
| `--cursor` | Continue exactly one selected category with unchanged table and filters |
| `--details` | Repeat for `scripts`, `definitions`, or `dependencies`; available on both commands |
| `--dependency-depth` | 0 by default; 1 expands at most 50 unique dependency references and requires `--details dependencies` |
| `--max-bytes` | JSON budget, 4,096–1,048,576 bytes; default 65,536 |
| `--scope` | Transaction scope for flow definition reads |

Continue a category using its returned `nextCursor`, retaining the original filters and detail selection:

```bash
nex behavior --table change_request --category business_rules \
  --auth dev --read-only --json

nex behavior --table change_request --category business_rules \
  --cursor '<nextCursor from the previous response>' \
  --auth dev --read-only --json
```

**Read completeness before drawing conclusions.** Each category has `status` (`complete`, `partial`, `unavailable`, or `failed`), `items`, `warnings`, and an optional `nextCursor`. Detail batches return `remainingReferences`; oversized details are omitted whole with `omittedDetails` and warnings, never cut mid-script. Increase `--max-bytes`, narrow the batch, or follow the cursor. Even an empty designer-scan page can require continuation. Visibility is limited to configuration accessible to the authenticated account.

For Change Management ATF planning, combine schema choices with behavior conditions, required fields, state transitions and dependent artifacts. Keep client UI requirements separate from server enforcement. Build assertions from that configuration, then validate execution with ATF results, logs and flow contexts. Discovery does not evaluate conditions or predict execution order; runtime trigger metadata and current design definitions have separate provenance and can differ.

`--json` prints one JSON document. SDK diagnostics pass through the shared redacting logger to stderr; core 6.4.1 waits for pending file-log writes during bounded shutdown flushing. Live behavior validation used an Australia instance; Zurich validation remains outstanding.

See the [behavior guide](docs/table-behavior.md) and [core API reference](https://github.com/sonisoft-cnanda/now-sdk-ext-core/blob/main/docs/TableBehaviorDiscovery.md) for source tables, dependency limits and recovery details.

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

# Read a flow's design-time definition (nothing is executed; no context is created)
nex flow definition --sys-id 887dda5583237210fdb8f7b6feaad32c --auth dev

# Read a subflow definition
nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --type subflow --auth dev

# Read a custom action definition with its ordered steps
nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --type action --auth dev

# Redirect the full JSON definition to a file, or pipe it into another tool
nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --json --auth dev > flow.json
nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --type action --json --auth dev | jq .summary.steps

# Debug a flow or subflow to step 3, report every step's data there, and cancel the run (Test > Debug)
nex flow debug run --flow x_myapp.create_task_copy --inputs '{"table":"incident"}' --break 3 --json --auth dev

# Or step through it interactively (n, s, o, c, b 2,3, p, q)
nex flow debug --flow x_myapp.create_task_copy --inputs '{"table":"incident"}' --auth dev
```

`nex flow debug` runs the flow for real: debug a copy in a scratch app. See the [flow debug guide](docs/flow-debug.md).

**Features:**
- Execute flows, subflows, and actions with structured inputs
- Foreground (wait) or background execution modes
- Query flow context status, outputs, and errors
- Cancel running flows and send messages to paused flows
- Read design-time definitions of flows, subflows, and actions — read-only, and
  distinct from `flow details`, which reports on one past execution
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

# Usage
<!-- usage -->
```sh-session
$ npm install -g @sonisoft/now-sdk-ext-cli
$ nex COMMAND
running command...
$ nex (--version)
@sonisoft/now-sdk-ext-cli/5.16.0 linux-x64 node-v26.8.1
$ nex --help [COMMAND]
USAGE
  $ nex COMMAND
...
```
<!-- usagestop -->


## Restricting what can be changed

Changes to a ServiceNow instance are **permitted by default**. Two ways to take that
away, in priority order:

| | | Reachable by an agent? |
|---|---|---|
| `NEX_POLICY_DENY=write,execute` (or `all`) | environment | **No** |
| `--read-only`, `--deny-write`, `--deny-execute` | per invocation | Yes |

Reads are never gated. `nex policy status` prints what is permitted and which layer
decided — use it first when something is refused, since the fix differs completely
between an environment variable and a flag.

A malformed value **fails closed**: `NEX_POLICY_DENY=wrtie` denies everything and warns,
rather than silently denying nothing.

> `NEX_POLICY_DENY` holds only when set somewhere an agent cannot write — a shell
> profile, a systemd unit, or a container environment. **Not** a committed `.env` or a
> project-local config file, which anything with file access can edit.
>
> This is a guardrail, not a security boundary. Anything holding the credential can
> reach the instance directly.

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
* [`nex auth browser-session`](#nex-auth-browser-session)
* [`nex auth delete [ALIAS]`](#nex-auth-delete-alias)
* [`nex auth doctor`](#nex-auth-doctor)
* [`nex auth list`](#nex-auth-list)
* [`nex auth open`](#nex-auth-open)
* [`nex auth use ALIAS`](#nex-auth-use-alias)
* [`nex autocomplete [SHELL]`](#nex-autocomplete-shell)
* [`nex batch create`](#nex-batch-create)
* [`nex batch update`](#nex-batch-update)
* [`nex behavior`](#nex-behavior)
* [`nex behavior details`](#nex-behavior-details)
* [`nex bulk delete`](#nex-bulk-delete)
* [`nex bulk update`](#nex-bulk-update)
* [`nex exec SCOPE [FILE]`](#nex-exec-scope-file)
* [`nex flow action`](#nex-flow-action)
* [`nex flow cancel`](#nex-flow-cancel)
* [`nex flow copy`](#nex-flow-copy)
* [`nex flow debug`](#nex-flow-debug)
* [`nex flow debug break`](#nex-flow-debug-break)
* [`nex flow debug cancel`](#nex-flow-debug-cancel)
* [`nex flow debug inspect`](#nex-flow-debug-inspect)
* [`nex flow debug list`](#nex-flow-debug-list)
* [`nex flow debug resume`](#nex-flow-debug-resume)
* [`nex flow debug run`](#nex-flow-debug-run)
* [`nex flow debug skip-all`](#nex-flow-debug-skip-all)
* [`nex flow debug start`](#nex-flow-debug-start)
* [`nex flow debug step`](#nex-flow-debug-step)
* [`nex flow definition`](#nex-flow-definition)
* [`nex flow details`](#nex-flow-details)
* [`nex flow error`](#nex-flow-error)
* [`nex flow logs`](#nex-flow-logs)
* [`nex flow message`](#nex-flow-message)
* [`nex flow outputs`](#nex-flow-outputs)
* [`nex flow run`](#nex-flow-run)
* [`nex flow status`](#nex-flow-status)
* [`nex flow subflow`](#nex-flow-subflow)
* [`nex flow test`](#nex-flow-test)
* [`nex health check`](#nex-health-check)
* [`nex help [COMMAND]`](#nex-help-command)
* [`nex log`](#nex-log)
* [`nex metadata choice get`](#nex-metadata-choice-get)
* [`nex metadata choice remove`](#nex-metadata-choice-remove)
* [`nex metadata choice set`](#nex-metadata-choice-set)
* [`nex metadata column add`](#nex-metadata-column-add)
* [`nex metadata column remove`](#nex-metadata-column-remove)
* [`nex metadata delete`](#nex-metadata-delete)
* [`nex metadata insert`](#nex-metadata-insert)
* [`nex metadata layout get`](#nex-metadata-layout-get)
* [`nex metadata layout set`](#nex-metadata-layout-set)
* [`nex metadata list-layout get`](#nex-metadata-list-layout-get)
* [`nex metadata list-layout set`](#nex-metadata-list-layout-set)
* [`nex metadata update`](#nex-metadata-update)
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
* [`nex policy status`](#nex-policy-status)
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
* [`nex store repair APP`](#nex-store-repair-app)
* [`nex store search`](#nex-store-search)
* [`nex store update`](#nex-store-update)
* [`nex store validate`](#nex-store-validate)
* [`nex task approve`](#nex-task-approve)
* [`nex task assign`](#nex-task-assign)
* [`nex task close`](#nex-task-close)
* [`nex task comment`](#nex-task-comment)
* [`nex task find`](#nex-task-find)
* [`nex task resolve`](#nex-task-resolve)
* [`nex transaction kill`](#nex-transaction-kill)
* [`nex transaction list`](#nex-transaction-list)
* [`nex update-set`](#nex-update-set)
* [`nex update-set clone`](#nex-update-set-clone)
* [`nex update-set complete SET`](#nex-update-set-complete-set)
* [`nex update-set create`](#nex-update-set-create)
* [`nex update-set current`](#nex-update-set-current)
* [`nex update-set export SET`](#nex-update-set-export-set)
* [`nex update-set inspect`](#nex-update-set-inspect)
* [`nex update-set move`](#nex-update-set-move)
* [`nex update-set move-capture`](#nex-update-set-move-capture)
* [`nex update-set restore`](#nex-update-set-restore)
* [`nex update-set use SET`](#nex-update-set-use-set)
* [`nex workflow activity add`](#nex-workflow-activity-add)
* [`nex workflow activity remove`](#nex-workflow-activity-remove)
* [`nex workflow activity update`](#nex-workflow-activity-update)
* [`nex workflow checkout WORKFLOW`](#nex-workflow-checkout-workflow)
* [`nex workflow condition add`](#nex-workflow-condition-add)
* [`nex workflow condition remove`](#nex-workflow-condition-remove)
* [`nex workflow condition update`](#nex-workflow-condition-update)
* [`nex workflow convert [WORKFLOW]`](#nex-workflow-convert-workflow)
* [`nex workflow create`](#nex-workflow-create)
* [`nex workflow definitions [TYPE]`](#nex-workflow-definitions-type)
* [`nex workflow discard [WORKFLOW]`](#nex-workflow-discard-workflow)
* [`nex workflow export WORKFLOW`](#nex-workflow-export-workflow)
* [`nex workflow list`](#nex-workflow-list)
* [`nex workflow new`](#nex-workflow-new)
* [`nex workflow outline [WORKFLOW]`](#nex-workflow-outline-workflow)
* [`nex workflow publish`](#nex-workflow-publish)
* [`nex workflow show [WORKFLOW]`](#nex-workflow-show-workflow)
* [`nex workflow transition add`](#nex-workflow-transition-add)
* [`nex workflow transition remove`](#nex-workflow-transition-remove)
* [`nex workflow validate [WORKFLOW]`](#nex-workflow-validate-workflow)
* [`nex xml export`](#nex-xml-export)
* [`nex xml import`](#nex-xml-import)

## `nex aggregate count`

Count records in a ServiceNow table.

```
USAGE
  $ nex aggregate count -t <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-q <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -j, --json           Output results as JSON
  -q, --query=<value>  ServiceNow encoded query string to filter records
  -t, --table=<value>  (required) ServiceNow table name to count records in

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/aggregate/count.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/aggregate/count.ts)_

## `nex aggregate group`

Run a grouped aggregate query on a ServiceNow table.

```
USAGE
  $ nex aggregate group -t <value> -g <value>... [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-q <value>] [-c] [--avg
    <value>...] [--min <value>...] [--max <value>...] [--sum <value>...] [--having <value>] [-d]

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
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/aggregate/group.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/aggregate/group.ts)_

## `nex aggregate query`

Run aggregate statistics on a ServiceNow table.

```
USAGE
  $ nex aggregate query -t <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-q <value>] [-c] [--avg <value>...]
    [--min <value>...] [--max <value>...] [--sum <value>...]

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
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/aggregate/query.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/aggregate/query.ts)_

## `nex app`

Manage ServiceNow applications: uninstall applications from your instance.

```
USAGE
  $ nex app [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-u] [-i <value>] [-s <value>]

FLAGS
  -a, --auth=<value>           Auth alias to use.
  -i, --applicationId=<value>  Application sys_id
  -s, --scope=<value>          Scope of application.
  -u, --uninstall              Uninstall the app

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/app/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/app/index.ts)_

## `nex app install`

Install or upgrade multiple ServiceNow applications from a batch definition file.

```
USAGE
  $ nex app install [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-b] [-d <value>]

FLAGS
  -a, --auth=<value>            Auth alias to use.
  -b, --batch                   Enable batch installation mode from definition file
  -d, --definitionPath=<value>  Path to JSON batch definition file containing applications to install

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/app/install.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/app/install.ts)_

## `nex app repo-install`

Install an application from your ServiceNow company repository.

```
USAGE
  $ nex app repo-install -s <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-w] [--poll-interval <value>] [-t
    <value>] [-v <value>]

FLAGS
  -a, --auth=<value>           Auth alias to use.
  -s, --scope=<value>          (required) Application scope (e.g., x_my_custom_app)
  -t, --timeout=<value>        [default: 1800000] Installation timeout in milliseconds (default: 1800000 = 30 min)
  -v, --version=<value>        Specific version to install (defaults to latest)
  -w, --no-wait                Do not wait for installation to complete
      --poll-interval=<value>  [default: 5000] Polling interval in milliseconds (default: 5000)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/app/repo-install.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/app/repo-install.ts)_

## `nex app repo-list`

List applications available in your ServiceNow company repository.

```
USAGE
  $ nex app repo-list [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-n] [-i]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -i, --installed     Show only installed applications
  -j, --json          Output results as JSON
  -n, --installable   Show only applications that can be installed (not yet installed)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/app/repo-list.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/app/repo-list.ts)_

## `nex app uninstall`

Uninstall a ServiceNow application from your instance.

```
USAGE
  $ nex app uninstall -i <value> -s <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>           Auth alias to use.
  -i, --applicationId=<value>  (required) Application sys_id
  -s, --scope=<value>          (required) Scope of application

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/app/uninstall.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/app/uninstall.ts)_

## `nex atf`

Execute ATF (Automated Test Framework) tests or test suites on a ServiceNow instance.

```
USAGE
  $ nex atf [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-t <value> | -s <value> | -n <value>] [-w] [-p
    <value>] [-b <value>] [--browser-version <value>] [--os-name <value>] [--os-version <value>] [--performance]
    [--cloud]

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
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/atf/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/atf/index.ts)_

## `nex attachment get`

Get metadata for a specific attachment.

```
USAGE
  $ nex attachment get -s <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -s, --sys-id=<value>  (required) Sys ID of the attachment

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Get metadata for a specific attachment.

EXAMPLES
  Get attachment metadata by sys_id

    $ nex attachment get --sys-id att123 --auth dev

  Get attachment metadata as JSON

    $ nex attachment get -s att123 --json --auth dev
```

_See code: [src/commands/attachment/get.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/attachment/get.ts)_

## `nex attachment list`

List attachments on a ServiceNow record.

```
USAGE
  $ nex attachment list -r <value> -t <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--limit <value>]

FLAGS
  -a, --auth=<value>       Auth alias to use.
  -r, --record-id=<value>  (required) Sys ID of the record
  -t, --table=<value>      (required) Table name
      --limit=<value>      [default: 20] Maximum number of attachments to return

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  List attachments on a ServiceNow record.

EXAMPLES
  List attachments on an incident

    $ nex attachment list --table incident --record-id abc123 --auth dev

  List up to 50 attachments as JSON

    $ nex attachment list -t incident -r abc123 --limit 50 --json --auth dev
```

_See code: [src/commands/attachment/list.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/attachment/list.ts)_

## `nex attachment upload`

Upload a file as an attachment to a ServiceNow record.

```
USAGE
  $ nex attachment upload -f <value> -r <value> -t <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]
    [--content-type <value>]

FLAGS
  -a, --auth=<value>          Auth alias to use.
  -f, --file=<value>          (required) Path to the file to upload
  -r, --record-id=<value>     (required) Sys ID of the target record
  -t, --table=<value>         (required) Target table name
      --content-type=<value>  MIME content type of the file

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Upload a file as an attachment to a ServiceNow record.

EXAMPLES
  Upload a PDF to an incident record

    $ nex attachment upload --table incident --record-id abc123 --file ./report.pdf --auth dev

  Upload a CSV with explicit content type

    $ nex attachment upload -t incident -r abc123 -f ./data.csv --content-type text/csv --auth dev
```

_See code: [src/commands/attachment/upload.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/attachment/upload.ts)_

## `nex auth browser-session`

Create a verified Playwright cookie session using a stored SDK alias.

```
USAGE
  $ nex auth browser-session -a <value> --output <value> [--json] [--cred-store] [--force]

FLAGS
  -a, --auth=<value>    (required) Stored SDK credential alias.
      --cred-store      Use the headless credential store.
      --force           Replace an existing regular output file.
      --output=<value>  (required) Owner-only Playwright storage-state file.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create a verified Playwright cookie session using a stored SDK alias.
```

_See code: [src/commands/auth/browser-session.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/auth/browser-session.ts)_

## `nex auth delete [ALIAS]`

Remove a credential from the store.

```
USAGE
  $ nex auth delete [ALIAS] [--cred-store] [--all]

ARGUMENTS
  [ALIAS]  Alias to remove

FLAGS
  --all  Remove every stored credential

GLOBAL FLAGS
  --cred-store  Accepted for symmetry with other commands and ignored — the auth commands always use
                @sonisoft/sn-credstore.

DESCRIPTION
  Remove a credential from the store.

  This does not touch the OS keyring — a copy stored there before migrating remains.

EXAMPLES
  Remove one alias

    $ nex auth delete dev206299

  Remove every stored credential

    $ nex auth delete --all
```

_See code: [src/commands/auth/delete.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/auth/delete.ts)_

## `nex auth doctor`

Diagnose credential storage: whether the SDK shim is active, which backend is in use, and what is stored.

```
USAGE
  $ nex auth doctor [--json] [--cred-store]

GLOBAL FLAGS
  --cred-store  Accepted for symmetry with other commands and ignored — the auth commands always use
                @sonisoft/sn-credstore.
  --json        Format output as json.

DESCRIPTION
  Diagnose credential storage: whether the SDK shim is active, which backend is in use, and what is stored.

EXAMPLES
  Check credential storage health

    $ nex auth doctor

  Machine-readable output for CI

    $ nex auth doctor --json
```

_See code: [src/commands/auth/doctor.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/auth/doctor.ts)_

## `nex auth list`

List credentials in the headless-safe credential store.

```
USAGE
  $ nex auth list [--json] [--cred-store]

GLOBAL FLAGS
  --cred-store  Accepted for symmetry with other commands and ignored — the auth commands always use
                @sonisoft/sn-credstore.
  --json        Format output as json.

DESCRIPTION
  List credentials in the headless-safe credential store.

  These are the credentials the ServiceNow SDK reads via the sn-credstore shim, which works in non-interactive sessions
  where the OS keyring cannot be unlocked.

  Secrets are never printed.

EXAMPLES
  List stored credentials

    $ nex auth list

  List as JSON for scripting

    $ nex auth list --json
```

_See code: [src/commands/auth/list.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/auth/list.ts)_

## `nex auth open`

Open a verified UI session in a dedicated desktop browser using a stored SDK alias.

```
USAGE
  $ nex auth open -a <value> [--json] [--browser edge|chrome|brave] [--cdp <value>] [--cred-store] [--force]
    [--output <value>]

FLAGS
  -a, --auth=<value>      (required) Stored SDK credential alias.
      --browser=<option>  [default: edge] Desktop browser to launch. Ignored when --cdp is set.
                          <options: edge|chrome|brave>
      --cdp=<value>       Existing DevTools URL. Skips launching a browser.
      --cred-store        Use the headless credential store.
      --force             Replace an existing regular output file.
      --output=<value>    Optional owner-only Playwright storage-state file.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Open a verified UI session in a dedicated desktop browser using a stored SDK alias.

EXAMPLES
  Open the alias in Edge

    $ nex auth open -a bcbsscdev --cred-store

  Open in Chrome

    $ nex auth open -a dev206299 --browser chrome

  Inject into an already-debuggable browser

    $ nex auth open -a dev206299 --cdp http://127.0.0.1:9222
```

_See code: [src/commands/auth/open.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/auth/open.ts)_

## `nex auth use ALIAS`

Set the default credential alias.

```
USAGE
  $ nex auth use ALIAS [--cred-store]

ARGUMENTS
  ALIAS  Alias to make the default

GLOBAL FLAGS
  --cred-store  Accepted for symmetry with other commands and ignored — the auth commands always use
                @sonisoft/sn-credstore.

DESCRIPTION
  Set the default credential alias.

  Commands run without --auth use this alias.

EXAMPLES
  Make dev206299 the default

    $ nex auth use dev206299
```

_See code: [src/commands/auth/use.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/auth/use.ts)_

## `nex autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ nex autocomplete [SHELL] [-r]

ARGUMENTS
  [SHELL]  (zsh|bash|powershell) Shell type

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

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.55/src/commands/autocomplete/index.ts)_

## `nex batch create`

Batch create records on a ServiceNow instance from a JSON file.

```
USAGE
  $ nex batch create -f <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--transaction]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -f, --file=<value>  (required) Path to JSON file with create operations
      --transaction   Stop on first error (transactional)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Batch create records on a ServiceNow instance from a JSON file.

EXAMPLES
  Create records from a JSON file

    $ nex batch create --file ./records.json --auth dev

  Create records without transactional mode

    $ nex batch create --file ./records.json --no-transaction --auth dev
```

_See code: [src/commands/batch/create.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/batch/create.ts)_

## `nex batch update`

Batch update records on a ServiceNow instance from a JSON file.

```
USAGE
  $ nex batch update -f <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--stop-on-error]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -f, --file=<value>   (required) Path to JSON file with update operations
      --stop-on-error  Stop processing on first error

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Batch update records on a ServiceNow instance from a JSON file.

EXAMPLES
  Update records from a JSON file

    $ nex batch update --file ./updates.json --auth dev

  Update records and stop on first error

    $ nex batch update --file ./updates.json --stop-on-error --auth dev
```

_See code: [src/commands/batch/update.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/batch/update.ts)_

## `nex behavior`

Discover table behavior: rules, UI actions/scripts, UI/data policies, workflows, flows and state models. Active and applicable inherited behavior is included by default. Conditions describe configuration, not a prediction of execution. Select categories and details to control output size.

```
USAGE
  $ nex behavior -t <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--dependency-depth <value>]
    [--details scripts|definitions|dependencies...] [--max-bytes <value>] [--scope <value>] [--category
    business_rules|ui_actions|client_scripts|ui_policies|data_policies|workflows|flows|state_models...] [--cursor
    <value>] [--include-inactive] [--include-inherited] [--limit <value>] [--name <value>] [--sys-id <value>...]

FLAGS
  -a, --auth=<value>              Auth alias to use.
  -t, --table=<value>             (required) Target table name
      --category=<option>...      Category to inspect; repeat to select several, default all
                                  <options: business_rules|ui_actions|client_scripts|ui_policies|data_policies|workflows
                                  |flows|state_models>
      --cursor=<value>            Continuation token; requires exactly one --category and the same filters
      --dependency-depth=<value>  Expand one dependency level; requires --details dependencies
      --details=<option>...       Include selected detail now; repeat for multiple kinds
                                  <options: scripts|definitions|dependencies>
      --include-inactive          Include inactive/published and draft candidates when discoverable
      --[no-]include-inherited    Include applicable ancestor behavior
      --json                      Emit one JSON document
      --limit=<value>             [default: 50] Maximum items per category
      --max-bytes=<value>         [default: 65536] Maximum JSON response bytes; omissions include retrieval references
      --name=<value>              Metadata name contains this text
      --scope=<value>             Transaction scope for flow definition reads
      --sys-id=<value>...         Metadata source sys_id to include; repeat for multiple records

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Discover table behavior: rules, UI actions/scripts, UI/data policies, workflows, flows and state models. Active and
  applicable inherited behavior is included by default. Conditions describe configuration, not a prediction of
  execution. Select categories and details to control output size.

EXAMPLES
  $ nex behavior --table incident --auth dev --json

  $ nex behavior --table change_request --category business_rules --details scripts --auth dev --json
```

_See code: [src/commands/behavior/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/behavior/index.ts)_

## `nex behavior details`

Retrieve known behavior artifacts without rediscovery. Repeat --reference kind:source_table:sys_id for up to 50 records. Add --details scripts, --details definitions or --details dependencies to include bodies immediately. Source references are returned by behavior discovery; flows also accept flows:sys_hub_flow:<sys_id>.

```
USAGE
  $ nex behavior details --reference <value>... [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--dependency-depth
    <value>] [--details scripts|definitions|dependencies...] [--max-bytes <value>] [--scope <value>]

FLAGS
  -a, --auth=<value>              Auth alias to use.
      --dependency-depth=<value>  Expand one dependency level; requires --details dependencies
      --details=<option>...       Include selected detail now; repeat for multiple kinds
                                  <options: scripts|definitions|dependencies>
      --json                      Emit one JSON document
      --max-bytes=<value>         [default: 65536] Maximum JSON response bytes; omissions include retrieval references
      --reference=<value>...      (required) kind:source_table:sys_id; repeat for a batch
      --scope=<value>             Transaction scope for flow definition reads

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Retrieve known behavior artifacts without rediscovery. Repeat --reference kind:source_table:sys_id for up to 50
  records. Add --details scripts, --details definitions or --details dependencies to include bodies immediately. Source
  references are returned by behavior discovery; flows also accept flows:sys_hub_flow:<sys_id>.

EXAMPLES
  $ nex behavior details --reference business_rules:sys_script:0123456789abcdef0123456789abcdef --details scripts --auth dev --json
```

_See code: [src/commands/behavior/details.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/behavior/details.ts)_

## `nex bulk delete`

Bulk delete records matching an encoded query.

```
USAGE
  $ nex bulk delete -t <value> -q <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--confirm] [-l <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -j, --json           Output results as JSON
  -l, --limit=<value>  [default: 200] Maximum number of records to delete (default 200, max 10000)
  -q, --query=<value>  (required) Encoded query to match records for deletion
  -t, --table=<value>  (required) Table name to delete records from
      --confirm        Execute the delete (without this flag, performs a dry run)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/bulk/delete.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/bulk/delete.ts)_

## `nex bulk update`

Bulk update records matching an encoded query.

```
USAGE
  $ nex bulk update -t <value> -q <value> -d <value> [-j] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--confirm]
    [-l <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -d, --data=<value>   (required) JSON object of field=value pairs to apply (e.g. '{"priority":"4","state":"2"}')
  -j, --json           Output results as JSON
  -l, --limit=<value>  [default: 200] Maximum number of records to update (default 200, max 10000)
  -q, --query=<value>  (required) Encoded query to match records
  -t, --table=<value>  (required) Table name to update records in
      --confirm        Execute the update (without this flag, performs a dry run)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/bulk/update.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/bulk/update.ts)_

## `nex exec SCOPE [FILE]`

Execute JavaScript on a ServiceNow instance remotely using Scripts - Background.

```
USAGE
  $ nex exec SCOPE [FILE] [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-p <value>]

ARGUMENTS
  SCOPE   Scope to execute script in: "global", the scope of an application developed on the instance (sys_app), or a
          scope sys_id. Installed store apps cannot be used.
  [FILE]  File to execute in scripts background. If omitted, starts REPL mode.

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -p, --params=<value>  JSON object of parameters to replace in script file. Use {paramName} syntax in your script.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

  Scopes:
  Scripts - Background runs in "global" or in an application developed on the instance (sys_app).
  Installed store/repository apps (sys_store_app) cannot be used: run in global and call their
  APIs fully qualified (e.g. sn_app.Util). An unusable scope fails before the script is sent.

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

_See code: [src/commands/exec/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/exec/index.ts)_

## `nex flow action`

Execute a Flow Designer action by scoped name.

```
USAGE
  $ nex flow action -n <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-i <value>] [-m
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
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/flow/action.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/action.ts)_

## `nex flow cancel`

Cancel a running or paused flow execution.

```
USAGE
  $ nex flow cancel -c <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-r <value>] [--scope <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow execution context sys_id
  -j, --json                Output results as JSON
  -r, --reason=<value>      Cancellation reason
      --scope=<value>       Scope context for script execution

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Cancel a running or paused flow execution.

  Cancels a flow context that is in QUEUED, IN_PROGRESS, or WAITING state.

EXAMPLES
  Cancel a running flow

    $ nex flow cancel --context-id abc123def456 --auth dev

  Cancel with a reason

    $ nex flow cancel --context-id abc123def456 --reason "No longer needed" --auth dev
```

_See code: [src/commands/flow/cancel.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/cancel.ts)_

## `nex flow copy`

Copy an existing flow into a target scoped application.

```
USAGE
  $ nex flow copy -s <value> -n <value> -t <value> [-j] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>            Auth alias to use.
  -j, --json                    Output results as JSON
  -n, --name=<value>            (required) Display name for the new copied flow
  -s, --source-flow-id=<value>  (required) Source flow sys_id or scoped name (e.g. global.change__standard)
  -t, --target-scope=<value>    (required) Scope sys_id of the target application (use `nex scope` to find scope
                                sys_ids)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Copy an existing flow into a target scoped application.

  This is the ServiceNow best practice before modifying any flow — OOB and shared flows must never be modified directly;
  always copy first. The copied flow lands in draft/unpublished state in the target scope.

  Enables the full CLI-driven flow development lifecycle:
  copy → pull (now-sdk transform) → modify → push → test → publish

  Features:
  • Copy flows by sys_id or scoped name
  • Specify a display name for the new copy
  • Target any scoped application by sys_id
  • Returns the new flow sys_id for use in subsequent commands

EXAMPLES
  Copy an OOB flow into your app scope

    $ nex flow copy --source-flow-id e89e3ade731310108ef62d2b04f6a744 --name "Copy of Change - Standard" \
      --target-scope 4a5a6115402946939ee48e3fe80f60f8 --auth dev

  Copy by scoped name

    $ nex flow copy -s global.change__standard -n "My Custom Change Flow" -t 4a5a6115402946939ee48e3fe80f60f8 --auth \
      dev

  Copy with JSON output for scripting

    $ nex flow copy -s e89e3ade731310108ef62d2b04f6a744 -n "Copy" -t 4a5a6115402946939ee48e3fe80f60f8 --json --auth \
      dev
```

_See code: [src/commands/flow/copy.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/copy.ts)_

## `nex flow debug`

Debug a flow or subflow interactively, step by step, as Workflow Studio's Test > Debug does.

```
USAGE
  $ nex flow debug [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>] [--log-file]
    [--log-level debug|warn|error|info|trace] [--read-only] [-b <value>] [-c <value> | -f <value> | -i <value> | --input
    <value>...] [--timeout <value>]

FLAGS
  -a, --auth=<value>      Auth alias to use.
  -b, --break=<value>     Steps to break at, by the number Workflow Studio shows: 2,3.
  -c, --context=<value>   Continue an open run instead of starting one: its root context id. --break adds breakpoints to
                          it.
  -f, --flow=<value>      Flow or subflow: sys_id, or scope.internal_name.
  -i, --inputs=<value>    Inputs as a JSON object, or @file to read one. For a flow: its trigger outputs (current,
                          table_name).
      --input=<value>...  One input as name=value (a string). Repeatable; applied over --inputs.
      --timeout=<value>   [default: 60] Seconds to wait for the run to pause again or end.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Debug a flow or subflow interactively, step by step, as Workflow Studio's Test > Debug does.

  Starts a run with --flow and --inputs (or continues an open one with --context), then reads commands at a
  prompt: n (step over), s (step into a subflow), o (step out), c (resume), b 2,3 (breakpoints), p [N] (step
  data), q (cancel and quit). Type help at the prompt for the full list.

  The run is real: records it creates or changes are kept. Debug a copy (nex flow copy) in a scratch app.
  Quitting, Ctrl+C and Ctrl+D cancel the run; detach leaves it open. Needs a terminal: from scripts and agents
  use nex flow debug run, or the start / step / resume / inspect / cancel subcommands.

EXAMPLES
  $ nex flow debug --flow x_myapp.create_task_copy --inputs '{"table":"incident"}' --break 3 --auth dev

  $ nex flow debug --context 0123456789abcdef0123456789abcdef --auth dev
```

_See code: [src/commands/flow/debug/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/debug/index.ts)_

## `nex flow debug break`

Set, add, remove, clear or list a debug run's breakpoints, by step number.

```
USAGE
  $ nex flow debug break -c <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--add <value> | -s <value> | --remove
    <value> | --clear]

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -c, --context=<value>  (required) Root context id that nex flow debug start printed.
  -s, --steps=<value>    Replace the breakpoints with these steps: 2,3.
      --add=<value>      Add breakpoints at these steps, keeping the others.
      --clear            Remove every breakpoint.
      --remove=<value>   Remove the breakpoints at these steps.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Set, add, remove, clear or list a debug run's breakpoints, by step number.

  Steps are the numbers Workflow Studio shows. nex looks each one up in the debugger's own list of places it
  can stop, and refuses one it cannot, listing the valid steps. With no option, lists the breakpoints. While
  the run is paused inside a subflow it stepped into, breakpoints apply to that subflow.

EXAMPLES
  $ nex flow debug break --context 0123456789abcdef0123456789abcdef --steps 2,3 --auth dev

  $ nex flow debug break -c 0123456789abcdef0123456789abcdef --add 4 --auth dev

  $ nex flow debug break -c 0123456789abcdef0123456789abcdef --clear --auth dev
```

_See code: [src/commands/flow/debug/break.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/debug/break.ts)_

## `nex flow debug cancel`

End a debug run, and any subflow it stepped into, then read it back. Safe to repeat.

```
USAGE
  $ nex flow debug cancel -c <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -c, --context=<value>  (required) Root context id that nex flow debug start printed.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  End a debug run, and any subflow it stepped into, then read it back. Safe to repeat.

  It refuses a flow context the debugger did not start, so it cannot end a real flow run. Needs write, not
  execute: it still works under --deny-execute.

EXAMPLES
  $ nex flow debug cancel --context 0123456789abcdef0123456789abcdef --auth dev
```

_See code: [src/commands/flow/debug/cancel.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/debug/cancel.ts)_

## `nex flow debug inspect`

Show a debug run without moving it: where it is, and each step's runtime inputs and outputs.

```
USAGE
  $ nex flow debug inspect -c <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--full] [--step <value>]

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -c, --context=<value>  (required) Root context id that nex flow debug start printed.
      --full             Show values in full, and the engine's internal outputs.
      --step=<value>     Only this step's inputs and outputs.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Show a debug run without moving it: where it is, and each step's runtime inputs and outputs.

  Values longer than 200 characters are cut, and the engine's internal outputs (__action_status__ and the like)
  are hidden, unless --full. --json returns the whole snapshot. Values are the run's real data.

EXAMPLES
  $ nex flow debug inspect --context 0123456789abcdef0123456789abcdef --auth dev

  $ nex flow debug inspect -c 0123456789abcdef0123456789abcdef --step 1 --full --auth dev
```

_See code: [src/commands/flow/debug/inspect.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/debug/inspect.ts)_

## `nex flow debug list`

List debug runs that are still open on the instance (paused, waiting or running), newest first.

```
USAGE
  $ nex flow debug list [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--created-by <value>] [--limit <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
      --created-by=<value>  Only runs started by this user name.
      --limit=<value>       [default: 50] At most this many.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  List debug runs that are still open on the instance (paused, waiting or running), newest first.

  A run left paused, by a crashed terminal or an agent that never cancelled, holds a flow context open. Find it
  here and end it with nex flow debug cancel.

EXAMPLES
  $ nex flow debug list --auth dev

  $ nex flow debug list --created-by admin --json --auth dev
```

_See code: [src/commands/flow/debug/list.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/debug/list.ts)_

## `nex flow debug resume`

Resume a paused debug run: run to the next breakpoint, or to the end.

```
USAGE
  $ nex flow debug resume -c <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--full] [--timeout <value>]

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -c, --context=<value>  (required) Root context id that nex flow debug start printed.
      --full             Show values in full, and the engine's internal outputs.
      --timeout=<value>  [default: 60] Seconds to wait for the run to pause again or end.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Resume a paused debug run: run to the next breakpoint, or to the end.

EXAMPLES
  $ nex flow debug resume --context 0123456789abcdef0123456789abcdef --auth dev
```

_See code: [src/commands/flow/debug/resume.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/debug/resume.ts)_

## `nex flow debug run`

Debug a flow or subflow to a breakpoint in one call, report every step's data there, and end the run.

```
USAGE
  $ nex flow debug run -f <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-b <value>] [--input <value>...] [-i
    <value>] [--after cancel|resume|stay] [--full] [--timeout <value>]

FLAGS
  -a, --auth=<value>      Auth alias to use.
  -b, --break=<value>     Steps to break at, by the number Workflow Studio shows: 2,3.
  -f, --flow=<value>      (required) Flow or subflow: sys_id, or scope.internal_name.
  -i, --inputs=<value>    Inputs as a JSON object, or @file to read one. For a flow: its trigger outputs (current,
                          table_name).
      --after=<option>    [default: cancel] After the breakpoint: cancel the run, let it finish (resume), or leave it
                          paused (stay).
                          <options: cancel|resume|stay>
      --full              Show values in full, and the engine's internal outputs.
      --input=<value>...  One input as name=value (a string). Repeatable; applied over --inputs.
      --timeout=<value>   [default: 60] Seconds to wait for the run to pause again or end.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Debug a flow or subflow to a breakpoint in one call, report every step's data there, and end the run.

  For agents and scripts: start, run to the first of the --break steps, print the run there (with --json, the
  whole snapshot), then cancel it, so nothing is left open. --after resume lets it run on to the end, ignoring
  the other breakpoints, and reports where it got to within --timeout (a run still going then is left
  running, and the output says so); --after stay leaves it paused for nex flow debug commands. Ctrl+C
  cancels the run once the current call returns.

  The run is real: records it creates or changes are kept. Debug a copy (nex flow copy) in a scratch app.

EXAMPLES
  $ nex flow debug run --flow x_myapp.create_task_copy --inputs '{"table":"incident"}' --break 3 --json --auth dev

  $ nex flow debug run -f 0123456789abcdef0123456789abcdef -i @inputs.json -b 2 --after resume --auth dev
```

_See code: [src/commands/flow/debug/run.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/debug/run.ts)_

## `nex flow debug skip-all`

Run a paused debug run to the end, ignoring its breakpoints (Workflow Studio's "Skip all breakpoints").

```
USAGE
  $ nex flow debug skip-all -c <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--timeout <value>]

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -c, --context=<value>  (required) Root context id that nex flow debug start printed.
      --timeout=<value>  [default: 60] Seconds to wait for the run to pause again or end.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Run a paused debug run to the end, ignoring its breakpoints (Workflow Studio's "Skip all breakpoints").

EXAMPLES
  $ nex flow debug skip-all --context 0123456789abcdef0123456789abcdef --auth dev
```

_See code: [src/commands/flow/debug/skip-all.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/debug/skip-all.ts)_

## `nex flow debug start`

Start a Workflow Studio debug run (Test > Debug) of a flow or subflow, and leave it paused.

```
USAGE
  $ nex flow debug start -f <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-b <value>] [--input <value>...] [-i
    <value>] [--timeout <value>]

FLAGS
  -a, --auth=<value>      Auth alias to use.
  -b, --break=<value>     Steps to break at, by the number Workflow Studio shows: 2,3.
  -f, --flow=<value>      (required) Flow or subflow: sys_id, or scope.internal_name.
  -i, --inputs=<value>    Inputs as a JSON object, or @file to read one. For a flow: its trigger outputs (current,
                          table_name).
      --input=<value>...  One input as name=value (a string). Repeatable; applied over --inputs.
      --timeout=<value>   [default: 60] Seconds to wait for the run to pause again or end.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Start a Workflow Studio debug run (Test > Debug) of a flow or subflow, and leave it paused.

  The flow's current draft runs, for real: records it creates or changes are kept. Debug a copy (nex flow copy)
  in a scratch app. The run pauses before its first step; this prints its root context id, the steps it can
  stop at, and where it is. Continue it with nex flow debug step, resume or skip-all, and always end it: run it
  to the end, or nex flow debug cancel. nex flow debug run does all of that in one call.

  Subflow inputs are checked against the subflow's declared inputs before anything runs. A JSON array for an
  array input is sent the way Workflow Studio sends it. For a flow, --inputs are its trigger outputs, as for
  nex flow test.

EXAMPLES
  $ nex flow debug start --flow x_myapp.create_task_copy --inputs '{"table":"incident","field_values":"short_description=Debug"}' --break 3 --auth dev

  $ nex flow debug start -f 0123456789abcdef0123456789abcdef -i @inputs.json --json --auth dev
```

_See code: [src/commands/flow/debug/start.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/debug/start.ts)_

## `nex flow debug step`

Run the paused step of a debug run and stop at the next one, then show where it is.

```
USAGE
  $ nex flow debug step -c <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--full] [--into | --out] [--timeout
    <value>]

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -c, --context=<value>  (required) Root context id that nex flow debug start printed.
      --full             Show values in full, and the engine's internal outputs.
      --into             Step into a subflow call.
      --out              Step out of the current subflow.
      --timeout=<value>  [default: 60] Seconds to wait for the run to pause again or end.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Run the paused step of a debug run and stop at the next one, then show where it is.

  Step over by default. --into enters a subflow call: the subflow runs in a child context, and later commands
  apply to it until it finishes. --out runs the rest of the current subflow (at the top level, the rest of the
  run). A step that fails does not pause: the run ends in ERROR, and the error is shown.

EXAMPLES
  $ nex flow debug step --context 0123456789abcdef0123456789abcdef --auth dev

  $ nex flow debug step -c 0123456789abcdef0123456789abcdef --into --json --auth dev
```

_See code: [src/commands/flow/debug/step.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/debug/step.ts)_

## `nex flow definition`

Retrieve the read-only design-time definition of a flow, subflow, or action.

```
USAGE
  $ nex flow definition -i <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-t flow|subflow|action] [--scope
    <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -i, --sys-id=<value>  (required) sys_id of the flow, subflow, or action to retrieve
  -j, --json            Output the complete typed result as JSON
  -t, --type=<option>   [default: flow] Artifact type to retrieve. Must match what the sys_id actually is.
                        <options: flow|subflow|action>
      --scope=<value>   Scope sys_id or name for the transaction scope parameter. Optional — ServiceNow resolves the
                        artifact's own scope when omitted.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Retrieve the read-only design-time definition of a flow, subflow, or action.

  Returns what the artifact IS, not what a run of it did: triggers, actions, nested subflows, flow logic, inputs and
  outputs as Workflow Studio stores them. Nothing is executed, published or modified, and no flow context is created or
  required.

  This is the design-time counterpart to `flow details`, which describes one past execution and needs a context sys_id.

  The type is never inferred from the sys_id: --type selects the artifact that is asked for, and a sys_id of a different
  type fails with a type_mismatch rather than being relabelled.

  With --json, stdout carries exactly one JSON document — the complete typed result including the untouched ServiceNow
  payload — so it can be piped or redirected. Without it, a short summary is printed; definition bodies, step scripts
  and input values are never printed or logged.

EXAMPLES
  Summarise a flow definition

    $ nex flow definition --sys-id 887dda5583237210fdb8f7b6feaad32c --auth dev

  Retrieve a subflow definition

    $ nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --type subflow --auth dev

  Retrieve a custom action definition with its ordered steps

    $ nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --type action --auth dev

  Redirect the full JSON definition to a file

    $ nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --json --auth dev > flow.json

  Pipe the JSON definition into another tool

    $ nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --type action --json --auth dev | jq .summary.steps
```

_See code: [src/commands/flow/definition.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/definition.ts)_

## `nex flow details`

Get rich execution details for a flow context.

```
USAGE
  $ nex flow details -c <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--scope <value>] [-d]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow context sys_id returned by flow test, flow run, flow subflow, or flow action
  -d, --include-definition  Include the full flow definition snapshot in the response
  -j, --json                Output results as JSON
      --scope=<value>       Scope sys_id for the ProcessFlow API transaction scope parameter

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Get rich execution details for a flow context.

  Returns per-action timing, inputs, outputs, and high-level metadata (state, runtime, who ran it, test vs production).
  This is the primary diagnostic command after flow test or flow run.

  Uses the ProcessFlow operations API (GET /api/now/processflow/operations/flow/context/{id}), the same endpoint Flow
  Designer uses to display execution details.

  NOTE: Requires flow operations logging to be enabled on the instance. If the execution report is unavailable, a notice
  will explain why.

  Typical workflow:
  flow test → flow details → diagnose → modify flow → flow test again

EXAMPLES
  Get execution details after testing a flow

    $ nex flow details --context-id d4e5f6789012345678abcdef01234567 --auth dev

  Get details with explicit scope

    $ nex flow details -c d4e5f6789012345678abcdef01234567 --scope x_myapp --auth dev

  Get details with JSON output for scripting

    $ nex flow details -c d4e5f6789012345678abcdef01234567 --json --auth dev
```

_See code: [src/commands/flow/details.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/details.ts)_

## `nex flow error`

Retrieve error details from a failed flow execution.

```
USAGE
  $ nex flow error -c <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--scope <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow execution context sys_id
  -j, --json                Output results as JSON
      --scope=<value>       Scope context for script execution

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Retrieve error details from a failed flow execution.

  Gets the error message from a flow context that ended in an error state.

EXAMPLES
  Get flow error details

    $ nex flow error --context-id abc123def456 --auth dev
```

_See code: [src/commands/flow/error.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/error.ts)_

## `nex flow logs`

Retrieve flow execution log entries for a given context.

```
USAGE
  $ nex flow logs -c <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-l <value>] [-o asc|desc]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow context sys_id returned by flow test, flow run, flow subflow, or flow action
  -j, --json                Output results as JSON
  -l, --limit=<value>       [default: 100] Maximum number of log entries to return
  -o, --order=<option>      [default: asc] Order direction: asc (oldest first) or desc (newest first)
                            <options: asc|desc>

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Retrieve flow execution log entries for a given context.

  Log entries include error messages, step-level debug output, and cancellation reasons. Use this alongside flow details
  to get the full picture of what happened during an execution.

  Queries sys_flow_log entries and maps numeric log levels to human-readable names (ERROR, WARN, INFO, DEBUG).

  NOTE: Log entries may be empty for simple successful executions, or if the flow reporting level is set to NONE. Errors
  and warnings are always logged regardless of the reporting level setting.

EXAMPLES
  Get flow execution logs

    $ nex flow logs --context-id d4e5f6789012345678abcdef01234567 --auth dev

  Get latest 10 log entries in reverse order

    $ nex flow logs -c d4e5f6789012345678abcdef01234567 --limit 10 --order desc --auth dev

  Get logs with JSON output for scripting

    $ nex flow logs -c d4e5f6789012345678abcdef01234567 --json --auth dev
```

_See code: [src/commands/flow/logs.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/logs.ts)_

## `nex flow message`

Send a message to a paused flow execution.

```
USAGE
  $ nex flow message -c <value> -m <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-p <value>] [--scope
    <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow execution context sys_id
  -j, --json                Output results as JSON
  -m, --message=<value>     (required) Message to send to the flow
  -p, --payload=<value>     Optional JSON payload to include with the message
      --scope=<value>       Scope context for script execution

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/flow/message.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/message.ts)_

## `nex flow outputs`

Retrieve outputs from a completed flow execution.

```
USAGE
  $ nex flow outputs -c <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--scope <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow execution context sys_id
  -j, --json                Output results as JSON
      --scope=<value>       Scope context for script execution

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Retrieve outputs from a completed flow execution.

  Gets the output name-value pairs from a flow, subflow, or action execution context.

EXAMPLES
  Get flow outputs

    $ nex flow outputs --context-id abc123def456 --auth dev

  Get outputs as JSON

    $ nex flow outputs --context-id abc123def456 --json --auth dev
```

_See code: [src/commands/flow/outputs.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/outputs.ts)_

## `nex flow run`

Execute a published Flow Designer flow by scoped name.

```
USAGE
  $ nex flow run -n <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-i <value>] [-m
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
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Execute a published Flow Designer flow by scoped name.

  Runs a flow using the sn_fd.FlowAPI ScriptableFlowRunner. Supports foreground (synchronous) and background
  (asynchronous) execution modes.

  Note: This command requires the flow to be published. For testing flows that are not yet published (draft/saved
  state), use `flow test` instead.

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

_See code: [src/commands/flow/run.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/run.ts)_

## `nex flow status`

Get the status of a flow execution context.

```
USAGE
  $ nex flow status -c <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--scope <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -c, --context-id=<value>  (required) Flow execution context sys_id
  -j, --json                Output results as JSON
      --scope=<value>       Scope context for script execution

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Get the status of a flow execution context.

  Queries sys_flow_context to retrieve the current state of a flow execution.

  Possible states: QUEUED, IN_PROGRESS, WAITING, COMPLETE, CANCELLED, ERROR

EXAMPLES
  Check flow execution status

    $ nex flow status --context-id abc123def456 --auth dev
```

_See code: [src/commands/flow/status.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/status.ts)_

## `nex flow subflow`

Execute a published Flow Designer subflow by scoped name.

```
USAGE
  $ nex flow subflow -n <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-i <value>] [-m
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
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Execute a published Flow Designer subflow by scoped name.

  Runs a subflow using the sn_fd.FlowAPI ScriptableFlowRunner.

  Note: This command requires the subflow to be published. For testing flows that are not yet published (draft/saved
  state), use `flow test` instead.

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

_See code: [src/commands/flow/subflow.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/subflow.ts)_

## `nex flow test`

Test a Flow Designer flow without requiring it to be published.

```
USAGE
  $ nex flow test -f <value> -o <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--scope <value>]
    [--synchronous]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -f, --flow-id=<value>     (required) Flow sys_id or scoped name (e.g. x_myapp.my_flow)
  -j, --json                Output results as JSON
  -o, --output-map=<value>  (required) JSON mapping of trigger output variable names to test values (e.g.
                            '{"current":"<sys_id>","table_name":"change_request"}')
      --scope=<value>       Scope sys_id for transaction scope (auto-resolved from flow definition if omitted)
      --[no-]synchronous    Run test synchronously (default: true)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Test a Flow Designer flow without requiring it to be published.

  Invokes the same API as the "Test" button in Flow Designer, running the flow in its current saved (draft) state.
  Unlike `flow run` which requires a published flow and uses sn_fd.FlowAPI, `flow test` works on unpublished drafts via
  the ProcessFlow REST API.

  Features:
  • Test flows by sys_id or scoped name
  • Pass trigger output values as JSON via --output-map
  • Auto-resolves scope from flow definition if not provided
  • Synchronous or asynchronous execution

EXAMPLES
  Test a flow by sys_id

    $ nex flow test --flow-id 887dda5583237210fdb8f7b6feaad32c --output-map \
      '{"current":"0ecd7552db252200a6a2b31be0b8f5e6","table_name":"change_request"}' --auth dev

  Test a flow by scoped name with explicit scope

    $ nex flow test -f x_myapp.my_flow -o '{"current":"abc123","table_name":"incident"}' --scope x_myapp --auth dev

  Test with JSON output

    $ nex flow test -f 887dda5583237210fdb8f7b6feaad32c -o '{"current":"abc123"}' --json --auth dev
```

_See code: [src/commands/flow/test.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/flow/test.ts)_

## `nex health check`

Run a consolidated health check on a ServiceNow instance.

```
USAGE
  $ nex health check [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--include-version] [--include-cluster]
    [--include-stuck-jobs] [--include-semaphores] [--include-operational-counts] [--stuck-job-threshold <value>]

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
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/health/check.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/health/check.ts)_

## `nex help [COMMAND]`

Display help for nex.

```
USAGE
  $ nex help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for nex.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/6.2.56/src/commands/help.ts)_

## `nex log`

Tail and monitor ServiceNow system logs in real-time with beautiful formatting.

```
USAGE
  $ nex log [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-o <value>] [-i <value>] [--no-color] [-f
    <value>...]

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
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/log/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/log/index.ts)_

## `nex metadata choice get`

Read a column's choice list in one language, in list order, with the column's dictionary Choice setting.

```
USAGE
  $ nex metadata choice get --column <value> --table <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--language
    <value>]

FLAGS
  -a, --auth=<value>      Auth alias to use.
      --column=<value>    (required) Column name, prefix included (u_ in Global).
      --language=<value>  [default: en] Choice language (sys_choice.language).
      --table=<value>     (required) Table name.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Read a column's choice list in one language, in list order, with the column's dictionary Choice setting.

  "choiceSet" is the list's application file (sys_choice_set): its scope, a sys_id (or global), is the application to
  change the list in: pass it as --scope-id (or --scope global). A
  table without one shows the list of the table that defines the column. Choices show on the form only when the
  column's Choice setting is a dropdown or suggestion.

EXAMPLES
  $ nex metadata choice get --table incident --column state --auth dev --read-only

  $ nex metadata choice get --table x_acme_ticket --column severity --language fr --auth dev --read-only --json
```

_See code: [src/commands/metadata/choice/get.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/choice/get.ts)_

## `nex metadata choice remove`

Remove a choice from a column's choice list through the choice form, and verify it.

```
USAGE
  $ nex metadata choice remove --update-set <value> --column <value> --table <value> --value <value> [--json] [-a <value>]
    [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>] [--log-file] [--log-level
    debug|warn|error|info|trace] [--read-only] [--acknowledge-upgrade-skip] [--scope <value> | --scope-id <value>]
    [--confirm-in-use] [--language <value>]

FLAGS
  -a, --auth=<value>              Auth alias to use.
      --acknowledge-upgrade-skip  Required to change a file of an installed Store application. Upgrades of that
                                  application then skip the file until the customization is reviewed. Use only after
                                  review; requires --update-set.
      --column=<value>            (required) Column name, prefix included (u_ in Global).
      --confirm-in-use            Remove the choice even though records hold its value.
      --language=<value>          [default: en] Choice language (sys_choice.language).
      --scope=<value>             Explicit application scope name, or literal global.
      --scope-id=<value>          Explicit application scope sys_id.
      --table=<value>             (required) Table name.
      --update-set=<value>        (required) In progress update set of the list's application. The capture follows it.
      --value=<value>             (required) The stored value of the choice to remove. No ^ or javascript:.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Remove a choice from a column's choice list through the choice form, and verify it.

  The records holding the value are counted first. While any do, the removal is refused unless --confirm-in-use is
  given: those records keep the value, which then has no choice in the list. Inactivating it instead (nex metadata
  choice set --inactive) keeps its label and hides it from new selections. The one Choice list capture,
  sys_choice_<table>_<column>, is checked to be in --update-set and no longer to hold the choice. Removing the last
  choice keeps the list's choice set.

EXAMPLES
  $ nex metadata choice remove --table x_acme_ticket --column severity --value 4 --scope x_acme --update-set 0123456789abcdef0123456789abcdef --auth dev
```

_See code: [src/commands/metadata/choice/remove.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/choice/remove.ts)_

## `nex metadata choice set`

Add a choice to a column's choice list, or change the one with that value, through the choice form, and verify it.

```
USAGE
  $ nex metadata choice set --update-set <value> --column <value> --table <value> --value <value> [--json] [-a <value>]
    [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>] [--log-file] [--log-level
    debug|warn|error|info|trace] [--read-only] [--acknowledge-upgrade-skip] [--scope <value> | --scope-id <value>]
    [--hint <value>] [--inactive] [--label <value>] [--language <value>] [--sequence <value>]

FLAGS
  -a, --auth=<value>              Auth alias to use.
      --acknowledge-upgrade-skip  Required to change a file of an installed Store application. Upgrades of that
                                  application then skip the file until the customization is reviewed. Use only after
                                  review; requires --update-set.
      --column=<value>            (required) Column name, prefix included (u_ in Global).
      --hint=<value>              Hint shown for the choice.
      --[no-]inactive             Inactivate (--inactive) or reactivate (--no-inactive) the choice.
      --label=<value>             Label. Required to add a choice.
      --language=<value>          [default: en] Choice language (sys_choice.language).
      --scope=<value>             Explicit application scope name, or literal global.
      --scope-id=<value>          Explicit application scope sys_id.
      --sequence=<value>          Position in the list (sys_choice.sequence).
      --table=<value>             (required) Table name.
      --update-set=<value>        (required) In progress update set of the list's application. The capture follows it.
      --value=<value>             (required) The stored value; it identifies the choice in the list. No ^ or
                                  javascript:.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Add a choice to a column's choice list, or change the one with that value, through the choice form, and verify it.

  With a value the list does not have, --label is required and the choice is added. With one it has, only the options
  given that differ are changed: --label, --sequence (the order), --inactive / --no-inactive, --hint. Inactivating
  keeps the choice for the records that hold it and hides it from new selections. The list must belong to the
  application given (a table with no list yet takes the column's application); a table that only shows the list of a
  table it extends is refused: change that table's list. The one Choice list capture, sys_choice_<table>_<column>,
  which holds the whole list, is checked to be in --update-set. The set need not be the working set. A list of an
  installed Store application needs --acknowledge-upgrade-skip.

  Choices show on the form only when the column's dictionary Choice setting is a dropdown or suggestion; the result
  says when it is not.

EXAMPLES
  $ nex metadata choice set --table x_acme_ticket --column severity --value 4 --label "Severity 4" --sequence 4 --scope x_acme --update-set 0123456789abcdef0123456789abcdef --auth dev

  $ nex metadata choice set --table cmn_cost_center --column u_tier --value gold --inactive --scope global --update-set 0123456789abcdef0123456789abcdef --auth dev
```

_See code: [src/commands/metadata/choice/set.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/choice/set.ts)_

## `nex metadata column add`

Add a column to a table through the dictionary form and verify the column, its label, its form placement and their captures.

```
USAGE
  $ nex metadata column add --update-set <value> --column <value> --label <value> --table <value> [--json] [-a <value>]
    [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>] [--log-file] [--log-level
    debug|warn|error|info|trace] [--read-only] [--acknowledge-upgrade-skip] [--scope <value> | --scope-id <value>]
    [--max-length <value>] [--reference <value>] [--type <value>]

FLAGS
  -a, --auth=<value>              Auth alias to use.
      --acknowledge-upgrade-skip  Required to change a file of an installed Store application. Upgrades of that
                                  application then skip the file until the customization is reviewed. Use only after
                                  review; requires --update-set.
      --column=<value>            (required) Column name, lower case. The platform's prefix is added when missing.
      --label=<value>             (required) Column label.
      --max-length=<value>        Maximum length, for string types. The type's default applies when omitted.
      --reference=<value>         Referenced table: required for --type reference, optional for glide_list.
      --scope=<value>             Explicit application scope name, or literal global.
      --scope-id=<value>          Explicit application scope sys_id.
      --table=<value>             (required) Table name.
      --type=<value>              [default: string] Column type: a sys_glide_object name such as string, integer,
                                  boolean, glide_date_time or reference.
      --update-set=<value>        (required) In progress update set of the application. It must be the working set (nex
                                  update-set use).

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Add a column to a table through the dictionary form and verify the column, its label, its form placement and their
  captures.

  The platform names the column: u_<name> in Global and in an installed Store application, <scope>_<name> when an
  application adds it to another application's table, and <name> unchanged on a scoped application's own table. The
  prefix is added for you; the result names the column as saved. On Global tables and an application's own tables the
  platform also appends the field to the end of the Default view's main section (move it with nex metadata layout set),
  unless a field of that name is already on the form, as after re-adding a deleted column. Every capture (Dictionary,
  Field Label, and Form Layout when the field was placed) is checked to be in --update-set, which must be the working
  set.
  A column in an installed Store application needs --acknowledge-upgrade-skip: its files are customizations of that
  application, and so is the form section when the field is placed on it; upgrades skip customized files.

  Removing a column deletes its data: that is nex metadata column remove, explicitly confirmed.

EXAMPLES
  $ nex metadata column add --table x_acme_ticket --column triage_note --label "Triage note" --max-length 100 --scope x_acme --update-set 0123456789abcdef0123456789abcdef --auth dev

  $ nex metadata column add --table cmn_cost_center --column approver --label Approver --type reference --reference sys_user --scope global --update-set 0123456789abcdef0123456789abcdef --auth dev
```

_See code: [src/commands/metadata/column/add.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/column/add.ts)_

## `nex metadata column remove`

Remove a column through the dictionary form's Delete Column action, and verify what the platform did.

```
USAGE
  $ nex metadata column remove --update-set <value> --column <value> --confirm <value> --table <value> [--json] [-a <value>]
    [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>] [--log-file] [--log-level
    debug|warn|error|info|trace] [--read-only] [--acknowledge-upgrade-skip] [--scope <value> | --scope-id <value>]
    [--acknowledge-data-loss] [--acknowledge-dependent-deletes]

FLAGS
  -a, --auth=<value>                   Auth alias to use.
      --acknowledge-data-loss          Required when rows hold a value in the column: the values are deleted with it.
      --acknowledge-dependent-deletes  Required when the platform will delete client scripts or UI policy actions that
                                       name the column.
      --acknowledge-upgrade-skip       Required to change a file of an installed Store application. Upgrades of that
                                       application then skip the file until the customization is reviewed. Use only
                                       after review; requires --update-set.
      --column=<value>                 (required) Column name, prefix included (u_ in Global).
      --confirm=<value>                (required) Type <table>.<column> exactly, to confirm the removal.
      --scope=<value>                  Explicit application scope name, or literal global.
      --scope-id=<value>               Explicit application scope sys_id.
      --table=<value>                  (required) Table name.
      --update-set=<value>             (required) In progress update set of the column's application. The DELETE
                                       captures follow it.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Remove a column through the dictionary form's Delete Column action, and verify what the platform did.

  This deletes the column's data here and on every instance its DELETE capture is committed to. It needs --confirm
  <table>.<column> naming the column exactly. Rows holding a value are counted first and need --acknowledge-data-loss.
  The platform also deletes the onChange client scripts and UI policy actions that name the column; those need
  --acknowledge-dependent-deletes, and another application's are refused. Only a column the platform itself allows to be
  deleted is removed: a u_ column, or a scoped application's own column (never a vendor column). A u_ column of an
  installed Store application needs --acknowledge-upgrade-skip.

  The column's labels and those dependents are verified deleted, each with a DELETE capture in --update-set (which need
  not be the working set). The platform leaves the column's choices, choice set, form elements and list elements behind;
  the result lists them; other references (UI policies, ACLs, scripts) are not checked. createdInThisSet true means the
  column was created in this set: if the set has never left this instance, move the DELETEs that replaced its own
  captures
  to the application's Default (nex update-set move) rather than ship them. Otherwise committing the set deletes the
  column
  wherever it exists; the result says what to do when the set that created it never left. Remove such a column with that
  set.

EXAMPLES
  $ nex metadata column remove --table x_acme_ticket --column triage_note --confirm x_acme_ticket.triage_note --scope x_acme --update-set 0123456789abcdef0123456789abcdef --auth dev

  $ nex metadata column remove --table cmn_cost_center --column u_tier --confirm cmn_cost_center.u_tier --scope global --update-set 0123456789abcdef0123456789abcdef --auth dev
```

_See code: [src/commands/metadata/column/remove.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/column/remove.ts)_

## `nex metadata delete`

Delete one confirmed metadata record and verify absence and deletion capture.

```
USAGE
  $ nex metadata delete --table <value> --confirm-sys-id <value> --confirm-table <value> --sys-id <value> [--json]
    [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>] [--log-file] [--log-level
    debug|warn|error|info|trace] [--read-only] [--acknowledge-upgrade-skip] [--scope <value> | --scope-id <value>]
    [--update-set <value>] [--view <value>]

FLAGS
  -a, --auth=<value>              Auth alias to use.
      --acknowledge-upgrade-skip  Required to change a file of an installed Store application. Upgrades of that
                                  application then skip the file until the customization is reviewed. Use only after
                                  review; requires --update-set.
      --confirm-sys-id=<value>    (required) Repeat the exact target sys_id.
      --confirm-table=<value>     (required) Repeat the exact target table.
      --scope=<value>             Explicit application scope name, or literal global.
      --scope-id=<value>          Explicit application scope sys_id.
      --sys-id=<value>            (required) Exact metadata record sys_id.
      --table=<value>             (required) Metadata table name.
      --update-set=<value>        In progress update set in the requested scope. Required for a Store application.
      --view=<value>              Form view name.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Delete one confirmed metadata record and verify absence and deletion capture.

EXAMPLES
  $ nex metadata delete --table sys_script_include --sys-id 0123456789abcdef0123456789abcdef --scope x_example_app --confirm-table sys_script_include --confirm-sys-id 0123456789abcdef0123456789abcdef --auth dev
```

_See code: [src/commands/metadata/delete.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/delete.ts)_

## `nex metadata insert`

Insert application metadata through a form and verify scope and capture.

```
USAGE
  $ nex metadata insert --table <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]
    [--acknowledge-upgrade-skip] [--scope <value> | --scope-id <value>] [--update-set <value>] [--view <value>]
    [--fields <value> | --fields-file <value>] [--initial-query <value>] [--variable-field <value>] [--variables <value>
    | --variables-file <value>]

FLAGS
  -a, --auth=<value>              Auth alias to use.
      --acknowledge-upgrade-skip  Required to change a file of an installed Store application. Upgrades of that
                                  application then skip the file until the customization is reviewed. Use only after
                                  review; requires --update-set.
      --fields=<value>            Field values as a JSON object. Prefer --fields-file for scripts.
      --fields-file=<value>       Read field values from a JSON object file.
      --initial-query=<value>     Literal equality terms separated by ^, with lowercase field identifiers. CLI checks
                                  syntax; core checks allowed fields.
      --scope=<value>             Explicit application scope name, or literal global.
      --scope-id=<value>          Explicit application scope sys_id.
      --table=<value>             (required) Metadata table name.
      --update-set=<value>        In progress update set in the requested scope. Required for a Store application.
      --variable-field=<value>    Variable column name. Requires variables.
      --variables=<value>         Variable values as a JSON object.
      --variables-file=<value>    Read variable values from a JSON object file.
      --view=<value>              Form view name.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Insert application metadata through a form and verify scope and capture.

EXAMPLES
  $ nex metadata insert --table sys_script_include --scope x_example_app --fields-file ./fields.json --auth dev
```

_See code: [src/commands/metadata/insert.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/insert.ts)_

## `nex metadata layout get`

Read one form section layout in the Form Layout page notation that metadata layout set takes.

```
USAGE
  $ nex metadata layout get --section <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>     Auth alias to use.
      --section=<value>  (required) sys_ui_section sys_id.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Read one form section layout in the Form Layout page notation that metadata layout set takes.

EXAMPLES
  $ nex metadata layout get --section 0123456789abcdef0123456789abcdef --auth dev --read-only
```

_See code: [src/commands/metadata/layout/get.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/layout/get.ts)_

## `nex metadata layout set`

Replace one form section layout through the Form Layout page and verify the order and its capture.

```
USAGE
  $ nex metadata layout set --update-set <value> --section <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]
    [--acknowledge-upgrade-skip] [--scope <value> | --scope-id <value>] [--elements <value> | --elements-file <value>]

FLAGS
  -a, --auth=<value>              Auth alias to use.
      --acknowledge-upgrade-skip  Required to change a file of an installed Store application. Upgrades of that
                                  application then skip the file until the customization is reviewed. Use only after
                                  review; requires --update-set.
      --elements=<value>          The whole new layout in order, comma-separated: field names, .begin_split, .split,
                                  .end_split, .formatter.<sys_id>.
      --elements-file=<value>     Read the layout from a JSON array of strings.
      --scope=<value>             Explicit application scope name, or literal global.
      --scope-id=<value>          Explicit application scope sys_id.
      --section=<value>           (required) sys_ui_section sys_id.
      --update-set=<value>        (required) In progress update set of the section's application. It must be the working
                                  set (nex update-set use).

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Replace one form section layout through the Form Layout page and verify the order and its capture.

  The platform captures a section as one Form Layout file, sys_ui_section_<section sys_id>. For a section of an
  installed
  Store application, pass --acknowledge-upgrade-skip: upgrades of that application then skip the file.

EXAMPLES
  $ nex metadata layout set --section 0123456789abcdef0123456789abcdef --elements "name,.begin_split,type,.split,url,.end_split" --scope x_example_app --update-set 0123456789abcdef0123456789abcdef --auth dev

  $ nex metadata layout set --section 0123456789abcdef0123456789abcdef --elements-file ./layout.json --scope-id 0123456789abcdef0123456789abcdef --update-set 0123456789abcdef0123456789abcdef --acknowledge-upgrade-skip --auth dev
```

_See code: [src/commands/metadata/layout/set.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/layout/set.ts)_

## `nex metadata list-layout get`

Read a table's list columns for one view, in the order metadata list-layout set takes.

```
USAGE
  $ nex metadata list-layout get --table <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--view <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
      --table=<value>  (required) Table name.
      --view=<value>   View name. Omit for the Default view.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Read a table's list columns for one view, in the order metadata list-layout set takes.

  Only the table's own list: not a related list and not a user's personalized list. "exists": false means the table
  shows its parent's list.

EXAMPLES
  $ nex metadata list-layout get --table cmn_cost_center --auth dev --read-only

  $ nex metadata list-layout get --table incident --view ess --auth dev --read-only
```

_See code: [src/commands/metadata/list-layout/get.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/list-layout/get.ts)_

## `nex metadata list-layout set`

Replace a table's list columns for one view through the List Layout page and verify the order and its capture.

```
USAGE
  $ nex metadata list-layout set --update-set <value> --table <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]
    [--acknowledge-upgrade-skip] [--scope <value> | --scope-id <value>] [--columns <value> | --columns-file <value>]
    [--view <value>]

FLAGS
  -a, --auth=<value>              Auth alias to use.
      --acknowledge-upgrade-skip  Required to change a file of an installed Store application. Upgrades of that
                                  application then skip the file until the customization is reviewed. Use only after
                                  review; requires --update-set.
      --columns=<value>           The whole new column list in order, comma-separated; dot-walked as field.field.
      --columns-file=<value>      Read the columns from a JSON array of strings.
      --scope=<value>             Explicit application scope name, or literal global.
      --scope-id=<value>          Explicit application scope sys_id.
      --table=<value>             (required) Table name.
      --update-set=<value>        (required) In progress update set of the list's application. It must be the working
                                  set (nex update-set use).
      --view=<value>              View name. Omit for the Default view.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Replace a table's list columns for one view through the List Layout page and verify the order and its capture.

  The platform captures the list as one List Layout file, sys_ui_list_<table>_<view> (null for the Default view), and
  replaces the sys_ui_list record on every save. A table with no list of its own gets one. For a list of an installed
  Store application, pass --acknowledge-upgrade-skip: upgrades of that application then skip the file.

EXAMPLES
  $ nex metadata list-layout set --table cmn_cost_center --columns "name,code,manager,valid_from" --scope global --update-set 0123456789abcdef0123456789abcdef --auth dev

  $ nex metadata list-layout set --table sn_grc_indicator --columns-file ./columns.json --scope sn_grc --update-set 0123456789abcdef0123456789abcdef --acknowledge-upgrade-skip --auth dev
```

_See code: [src/commands/metadata/list-layout/set.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/list-layout/set.ts)_

## `nex metadata update`

Update application metadata through a form and verify scope and capture.

```
USAGE
  $ nex metadata update --table <value> --sys-id <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]
    [--acknowledge-upgrade-skip] [--scope <value> | --scope-id <value>] [--update-set <value>] [--view <value>]
    [--fields <value> | --fields-file <value>] [--initial-query <value>] [--variable-field <value>] [--variables <value>
    | --variables-file <value>]

FLAGS
  -a, --auth=<value>              Auth alias to use.
      --acknowledge-upgrade-skip  Required to change a file of an installed Store application. Upgrades of that
                                  application then skip the file until the customization is reviewed. Use only after
                                  review; requires --update-set.
      --fields=<value>            Field values as a JSON object. Prefer --fields-file for scripts.
      --fields-file=<value>       Read field values from a JSON object file.
      --initial-query=<value>     Literal equality terms separated by ^, with lowercase field identifiers. CLI checks
                                  syntax; core checks allowed fields.
      --scope=<value>             Explicit application scope name, or literal global.
      --scope-id=<value>          Explicit application scope sys_id.
      --sys-id=<value>            (required) Exact metadata record sys_id.
      --table=<value>             (required) Metadata table name.
      --update-set=<value>        In progress update set in the requested scope. Required for a Store application.
      --variable-field=<value>    Variable column name. Requires variables.
      --variables=<value>         Variable values as a JSON object.
      --variables-file=<value>    Read variable values from a JSON object file.
      --view=<value>              Form view name.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Update application metadata through a form and verify scope and capture.

EXAMPLES
  $ nex metadata update --table sys_script_include --sys-id 0123456789abcdef0123456789abcdef --scope x_example_app --fields-file ./fields.json --auth dev
```

_See code: [src/commands/metadata/update.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/metadata/update.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.86/src/commands/plugins/index.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.86/src/commands/plugins/inspect.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.86/src/commands/plugins/install.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.86/src/commands/plugins/link.ts)_

## `nex plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nex plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.86/src/commands/plugins/reset.ts)_

## `nex plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nex plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.86/src/commands/plugins/uninstall.ts)_

## `nex plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nex plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.86/src/commands/plugins/update.ts)_

## `nex policy status`

Show what this invocation is permitted to change on the instance, and why.

```
USAGE
  $ nex policy status [--json] [--deny-execute] [--deny-write] [--read-only]

FLAGS
  --deny-execute  Evaluate as if --deny-execute were passed.
  --deny-write    Evaluate as if --deny-write were passed.
  --read-only     Evaluate as if --read-only were passed.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show what this invocation is permitted to change on the instance, and why.

  Changes are permitted by default. NEX_POLICY_DENY, set in the environment, outranks every command-line flag — that is
  the only layer an agent driving this CLI cannot reach.

EXAMPLES
  $ nex policy status

  $ nex policy status --read-only

  NEX_POLICY_DENY=all nex policy status
```

_See code: [src/commands/policy/status.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/policy/status.ts)_

## `nex query`

Query any ServiceNow table using the Table API.

```
USAGE
  $ nex query -t <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-q <value>] [-f <value>] [-d] [-l
    <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -d, --display-value   Return display values instead of internal values
  -f, --fields=<value>  Comma-separated list of fields to return
  -j, --json            Output results as JSON
  -l, --limit=<value>   [default: 20] Maximum number of records to return
  -q, --query=<value>   ServiceNow encoded query string
  -t, --table=<value>   (required) ServiceNow table name to query

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/query/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/query/index.ts)_

## `nex query app`

Search for applications by name across scoped apps and plugins.

```
USAGE
  $ nex query app -s <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-a] [-l <value>]

FLAGS
  -a, --active          Only show active applications
  -a, --auth=<value>    Auth alias to use.
  -j, --json            Output results as JSON
  -l, --limit=<value>   [default: 20] Maximum number of results to return
  -s, --search=<value>  (required) Application name search term

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/query/app.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/query/app.ts)_

## `nex query columns`

List and search columns (fields) on a ServiceNow table.

```
USAGE
  $ nex query columns -t <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-s <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -j, --json            Output results as JSON
  -s, --search=<value>  Filter columns by name or label (case-insensitive)
  -t, --table=<value>   (required) ServiceNow table name to list columns for

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/query/columns.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/query/columns.ts)_

## `nex query syslog`

Query ServiceNow system logs (one-shot, non-tailing).

```
USAGE
  $ nex query syslog [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-q <value>] [-l <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -j, --json           Output results as JSON
  -l, --limit=<value>  [default: 100] Maximum number of syslog records to return
  -q, --query=<value>  ServiceNow encoded query string for filtering syslog records

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/query/syslog.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/query/syslog.ts)_

## `nex schema`

Discover and inspect a ServiceNow table schema including fields, types, and relationships.

```
USAGE
  $ nex schema -t <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--include-choices]
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
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/schema/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/schema/index.ts)_

## `nex schema field`

Get detailed information about a specific field on a ServiceNow table.

```
USAGE
  $ nex schema field -t <value> -f <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -f, --field=<value>  (required) Field name to explain
  -j, --json           Output results as JSON
  -t, --table=<value>  (required) ServiceNow table name

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/schema/field.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/schema/field.ts)_

## `nex schema validate-catalog`

Validate a ServiceNow catalog item configuration for common issues.

```
USAGE
  $ nex schema validate-catalog -s <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -j, --json            Output results as JSON
  -s, --sys-id=<value>  (required) Catalog item sys_id to validate

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/schema/validate-catalog.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/schema/validate-catalog.ts)_

## `nex scope`

Get the current application scope or list available applications.

```
USAGE
  $ nex scope [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-l]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -l, --list          List all available applications

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/scope/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/scope/index.ts)_

## `nex scope set`

Set the current application scope on a ServiceNow instance.

```
USAGE
  $ nex scope set -a <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --app-id=<value>  (required) 32-char sys_id of application
  -a, --auth=<value>    Auth alias to use.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Set the current application scope on a ServiceNow instance.

EXAMPLES
  Set application scope by sys_id

    $ nex scope set --app-id abc123def456ghi789jkl012mno345pq --auth dev

  Set application scope and output as JSON

    $ nex scope set -a abc123def456ghi789jkl012mno345pq --json --auth dev
```

_See code: [src/commands/scope/set.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/scope/set.ts)_

## `nex script-sync pull`

Pull a script from a ServiceNow instance to a local file.

```
USAGE
  $ nex script-sync pull -n <value> -t sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client
    [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>] [--log-file] [--log-level
    debug|warn|error|info|trace] [--read-only] [-o <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -n, --name=<value>    (required) Name of the script to pull
  -o, --output=<value>  Output file path. If not specified, a file name is auto-generated.
  -t, --type=<option>   (required) Type of script to pull
                        <options: sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client>

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/script-sync/pull.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/script-sync/pull.ts)_

## `nex script-sync push`

Push a local script file to a ServiceNow instance.

```
USAGE
  $ nex script-sync push -n <value> -t sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client -f
    <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>] [--log-file]
    [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -f, --file=<value>   (required) Path to the local script file to push
  -n, --name=<value>   (required) Name of the script to push
  -t, --type=<option>  (required) Type of script to push
                       <options: sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client>

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/script-sync/push.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/script-sync/push.ts)_

## `nex script-sync sync`

Synchronize all scripts in a directory with a ServiceNow instance.

```
USAGE
  $ nex script-sync sync -d <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-t
    sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client...]

FLAGS
  -a, --auth=<value>       Auth alias to use.
  -d, --directory=<value>  (required) Directory containing script files to synchronize
  -t, --types=<option>...  Script types to synchronize. Can be specified multiple times to include multiple types.
                           <options: sys_script_include|sys_script|sys_ui_script|sys_ui_action|sys_script_client>

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/script-sync/sync.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/script-sync/sync.ts)_

## `nex search`

Search platform code across a ServiceNow instance.

```
USAGE
  $ nex search -t <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-l <value>] [-s <value>] [-g <value>]
    [--table <value>]

FLAGS
  -a, --auth=<value>          Auth alias to use.
  -g, --search-group=<value>  Search group to search within (required when using --table)
  -l, --limit=<value>         Maximum number of results to return
  -s, --scope=<value>         Application scope to search within
  -t, --term=<value>          (required) Search term to look for in platform code
      --table=<value>         Table name to search within (requires --search-group)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/search/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/search/index.ts)_

## `nex search add-table`

Add a table to a code search group on a ServiceNow instance.

```
USAGE
  $ nex search add-table -f <value> -g <value> -t <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>           Auth alias to use.
  -f, --search-fields=<value>  (required) Comma-separated list of fields to index for search
  -g, --search-group=<value>   (required) Search group to add the table to
  -t, --table=<value>          (required) Table name to add to the search group

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/search/add-table.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/search/add-table.ts)_

## `nex search groups`

List all available code search groups on a ServiceNow instance.

```
USAGE
  $ nex search groups [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>  Auth alias to use.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/search/groups.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/search/groups.ts)_

## `nex search tables`

List tables configured for a specific code search group.

```
USAGE
  $ nex search tables -g <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>          Auth alias to use.
  -g, --search-group=<value>  (required) Search group name to list tables for

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/search/tables.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/search/tables.ts)_

## `nex store install`

Install an application from the ServiceNow Store.

```
USAGE
  $ nex store install -a <value> -v <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--demo-data] [--no-wait]
    [--poll-interval <value>] [--timeout <value>]

FLAGS
  -a, --app-id=<value>         (required) Store application sys_id
  -a, --auth=<value>           Auth alias to use.
  -v, --version=<value>        (required) Application version to install
      --demo-data              Load demo data during installation
      --no-wait                Do not wait for installation to complete
      --poll-interval=<value>  [default: 5000] Polling interval in milliseconds
      --timeout=<value>        [default: 1800000] Installation timeout in milliseconds

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/store/install.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/store/install.ts)_

## `nex store repair APP`

Repair an installed store or company application: reinstall its installed version from the application repository, without uninstalling it.

```
USAGE
  $ nex store repair APP [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--demo-data] [--no-wait] [--poll-interval
    <value>] [--timeout <value>]

ARGUMENTS
  APP  The installed application: its scope (e.g. x_acme_app) or its sys_store_app sys_id.

FLAGS
  -a, --auth=<value>           Auth alias to use.
      --demo-data              Also load the application's demo data. Refused for an application that has none.
      --no-wait                Start the repair and return its tracker id without waiting.
      --poll-interval=<value>  [default: 5000] Polling interval in milliseconds.
      --timeout=<value>        [default: 1800000] How long to wait, in milliseconds. A queued repair can wait minutes
                               before it runs.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Repair an installed store or company application: reinstall its installed version from the application repository,
  without uninstalling it.

  This is the Repair Application link on the application's sys_store_app record. Use it when an installed application is
  broken, or an install or update skipped files it should have applied. It waits for the repair and reports the upgrade
  history it wrote, including every file it did not apply.

  Repaired is reported only when the App Client succeeded AND wrote a new, finished upgrade history row: it also reports
  success when it decided no reinstall was necessary. A repair is a write, so --read-only and --deny-write refuse it.

EXAMPLES
  Repair an installed application by scope and wait for it

    $ nex store repair x_acme_app --auth dev

  By sys_store_app sys_id, as JSON

    $ nex store repair 0123456789abcdef0123456789abcdef --json --auth dev

  Start it and return the tracker id

    $ nex store repair x_acme_app --no-wait --auth dev
```

_See code: [src/commands/store/repair.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/store/repair.ts)_

## `nex store search`

Search for applications in the ServiceNow Store.

```
USAGE
  $ nex store search [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--limit <value>] [--tab
    available_for_you|installed|updates] [-t <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -t, --term=<value>   Search term
      --limit=<value>  [default: 20] Maximum number of results to return
      --tab=<option>   [default: available_for_you] Store tab context to search
                       <options: available_for_you|installed|updates>

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/store/search.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/store/search.ts)_

## `nex store update`

Update a ServiceNow Store application to a new version.

```
USAGE
  $ nex store update -a <value> -v <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--no-wait]
    [--poll-interval <value>] [--timeout <value>]

FLAGS
  -a, --app-id=<value>         (required) Store application sys_id
  -a, --auth=<value>           Auth alias to use.
  -v, --version=<value>        (required) Target application version
      --no-wait                Do not wait for update to complete
      --poll-interval=<value>  [default: 5000] Polling interval in milliseconds
      --timeout=<value>        [default: 1800000] Update timeout in milliseconds

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/store/update.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/store/update.ts)_

## `nex store validate`

Validate a batch installation definition file.

```
USAGE
  $ nex store validate -f <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -f, --file=<value>  (required) Path to batch definition JSON file

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Validate a batch installation definition file.

EXAMPLES
  Validate a batch definition file

    $ nex store validate --file ./batch-definition.json --auth dev
```

_See code: [src/commands/store/validate.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/store/validate.ts)_

## `nex task approve`

Approve a ServiceNow change request.

```
USAGE
  $ nex task approve -n <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-c <value>]

FLAGS
  -a, --auth=<value>      Auth alias to use.
  -c, --comments=<value>  Approval comments
  -n, --number=<value>    (required) Change request number (e.g., CHG0010001)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/task/approve.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/task/approve.ts)_

## `nex task assign`

Assign a ServiceNow task to a user or group.

```
USAGE
  $ nex task assign -n <value> -u <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-g <value>] [--table
    <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -g, --group=<value>   Assignment group
  -n, --number=<value>  (required) Task number (e.g., INC0010001)
  -u, --user=<value>    (required) User to assign the task to
      --table=<value>   [default: task] ServiceNow table name

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/task/assign.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/task/assign.ts)_

## `nex task close`

Close a ServiceNow incident.

```
USAGE
  $ nex task close --notes <value> -n <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]
    [--close-code <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -n, --number=<value>      (required) Incident number (e.g., INC0010001)
      --close-code=<value>  Close code for the closure
      --notes=<value>       (required) Close notes

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/task/close.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/task/close.ts)_

## `nex task comment`

Add a comment or work note to a ServiceNow task.

```
USAGE
  $ nex task comment -c <value> -n <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--table <value>]
    [--work-note]

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -c, --comment=<value>  (required) Comment text to add
  -n, --number=<value>   (required) Task number (e.g., INC0010001)
      --table=<value>    [default: task] ServiceNow table name
      --work-note        Add as work note instead of comment

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/task/comment.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/task/comment.ts)_

## `nex task find`

Find a ServiceNow task by its number.

```
USAGE
  $ nex task find -n <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--table <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -n, --number=<value>  (required) Task number (e.g., INC0010001, CHG0010001)
      --table=<value>   [default: task] ServiceNow table name

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/task/find.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/task/find.ts)_

## `nex task resolve`

Resolve a ServiceNow incident with resolution notes.

```
USAGE
  $ nex task resolve --notes <value> -n <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]
    [--close-code <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -n, --number=<value>      (required) Incident number (e.g., INC0010001)
      --close-code=<value>  Close code for the resolution
      --notes=<value>       (required) Resolution notes

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/task/resolve.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/task/resolve.ts)_

## `nex transaction kill`

Submit a request to terminate one active transaction. Platform acceptance does not mean immediate removal.

```
USAGE
  $ nex transaction kill -t <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--confirm]

FLAGS
  -a, --auth=<value>            Auth alias to use.
  -t, --transaction-id=<value>  (required) Exact 32-character hexadecimal sys_id from `nex transaction list`.
      --confirm                 Confirm submission of the kill request.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Submit a request to terminate one active transaction. Platform acceptance does not mean immediate removal.

  Only pass an identifier you deliberately selected from `nex transaction list`. Killing another user's transaction
  aborts their work.

EXAMPLES
  $ nex transaction kill --transaction-id 8f9a1234567890abcdef1234567890c1 --confirm --auth dev

  $ nex transaction kill --transaction-id 8f9a1234567890abcdef1234567890c1 --confirm --json --auth dev
```

_See code: [src/commands/transaction/kill.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/transaction/kill.ts)_

## `nex transaction list`

List active transactions from all responding ServiceNow cluster nodes.

```
USAGE
  $ nex transaction list [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-l <value>] [--poll-interval-ms <value>] [-q
    <value>] [--timeout-ms <value>]

FLAGS
  -a, --auth=<value>              Auth alias to use.
  -l, --limit=<value>             Maximum transactions to return. Core default: 1000.
  -q, --query=<value>             Encoded query used to filter transactions. Core default: none.
      --poll-interval-ms=<value>  Interval between collection status polls. Core default: 1000.
      --timeout-ms=<value>        Collection timeout in milliseconds. Core default: 60000.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  List active transactions from all responding ServiceNow cluster nodes.

EXAMPLES
  $ nex transaction list --auth dev

  $ nex transaction list --json --auth dev

  $ nex transaction list --query "user=admin" --limit 50 --auth dev

  $ nex transaction list --timeout-ms 120000 --poll-interval-ms 2000 --auth dev
```

_See code: [src/commands/transaction/list.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/transaction/list.ts)_

## `nex update-set`

List update sets on a ServiceNow instance.

```
USAGE
  $ nex update-set [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--limit <value>] [-q <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -q, --query=<value>  Encoded query filter
      --limit=<value>  [default: 20] Maximum number of update sets to return

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/update-set/index.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/index.ts)_

## `nex update-set clone`

Clone an update set and its records.

```
USAGE
  $ nex update-set clone -n <value> -s <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -n, --name=<value>    (required) Name for the cloned update set
  -s, --source=<value>  (required) Source update set sys_id

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Clone an update set and its records.

EXAMPLES
  Clone an update set

    $ nex update-set clone --source us-001 --name "Cloned Set" --auth dev-instance

  Clone with JSON output

    $ nex update-set clone --source us-001 --name "Cloned Set" --json --auth dev-instance
```

_See code: [src/commands/update-set/clone.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/clone.ts)_

## `nex update-set complete SET`

Complete an update set after checking what it holds, and read the state back.

```
USAGE
  $ nex update-set complete SET --expected-captures <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

ARGUMENTS
  SET  sys_id of the In progress, non-Default set to complete.

FLAGS
  -a, --auth=<value>               Auth alias to use.
      --expected-captures=<value>  (required) The number of captures you reviewed in the set.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Complete an update set after checking what it holds, and read the state back.

  Refused unless the set holds exactly --expected-captures captures, all of the set's own application, one per
  record, and no other user is working in it. Complete a set as soon as its change is proven: an open set
  that is anyone's current set keeps capturing their changes. Restore your working set afterwards with
  nex update-set restore. For more work later, reopen the set in the UI only if neither it nor its batch base
  has ever been retrieved by another instance or exported; if unsure, treat it as left and use a new set
  (update-sets skill: Complete early, reopen deliberately).

EXAMPLES
  $ nex update-set complete 0123456789abcdef0123456789abcdef --expected-captures 3 --auth dev
```

_See code: [src/commands/update-set/complete.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/complete.ts)_

## `nex update-set create`

Create a new update set.

```
USAGE
  $ nex update-set create -n <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--application <value>] [-d <value>]

FLAGS
  -a, --auth=<value>         Auth alias to use.
  -d, --description=<value>  Description for the new update set
  -n, --name=<value>         (required) Name for the new update set
      --application=<value>  Application of the new set: global, a sys_scope sys_id, or a scope name matching one active
                             application. The set's application is verified after creation.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Create a new update set.

EXAMPLES
  Create a new update set with a name

    $ nex update-set create --name "My Feature Set" --auth dev-instance

  Create with name and description

    $ nex update-set create --name "My Feature Set" --description "Update set for feature X" --auth dev-instance

  Create within a specific application scope

    $ nex update-set create --name "My Feature Set" --application x_my_app --auth dev-instance

  Create a set for an installed Store application, then make it current with nex update-set use

    $ nex update-set create --name "STORY-123 Policy form" --application sn_compliance --auth dev-instance
```

_See code: [src/commands/update-set/create.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/create.ts)_

## `nex update-set current`

Get or set the current update set.

```
USAGE
  $ nex update-set current [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-s <value>]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -s, --set=<value>   sys_id of an In progress update set to make the working set

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Get or set the current update set.

  --set makes the set your working set for every later session: it also makes the set's application current
  (apps.current_app), which a set of another application needs to stick. The previous working set is printed;
  put it back with nex update-set restore.

EXAMPLES
  Get the current update set

    $ nex update-set current --auth dev-instance

  Set the current update set by sys_id

    $ nex update-set current --set us-001 --auth dev-instance

  Get the current update set as JSON

    $ nex update-set current --json --auth dev-instance
```

_See code: [src/commands/update-set/current.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/current.ts)_

## `nex update-set export SET`

Export an update set to XML, as the platform's Export to XML does, and check the file.

```
USAGE
  $ nex update-set export SET [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--force] [--include-incomplete] [-o <value>]

ARGUMENTS
  SET  sys_id of a sys_update_set, or of a Retrieved Update Set (sys_remote_update_set).

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -o, --output=<value>      File to write, or an existing directory for update-set-<sys_id>.xml. Default: that name in
                            the current directory.
      --force               Replace the output file if it exists.
      --include-incomplete  Export a set (or batch members) that is not Complete: a snapshot of unfinished work.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Export an update set to XML, as the platform's Export to XML does, and check the file.

  A local set is exported with the platform's UpdateSetExport, through a temporary Retrieved Update Set copy
  that the download deletes. nex reads the copy back and removes it if the platform did not. A batch base is
  exported with its Complete children; a batch member is refused in favour of its base. A Loaded Retrieved
  Update Set is a plain read.

  Only Complete sets are exported unless --include-incomplete is passed. The file must hold exactly the sets
  and records the instance counts, or nothing is written. It holds every record's full payload; the XML
  is never printed.

EXAMPLES
  $ nex update-set export 0123456789abcdef0123456789abcdef --auth dev

  $ nex update-set export 0123456789abcdef0123456789abcdef --output ./exports/ --json --auth dev

  $ nex update-set export 0123456789abcdef0123456789abcdef --output STORY-123.xml --force --auth dev
```

_See code: [src/commands/update-set/export.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/export.ts)_

## `nex update-set inspect`

Inspect the components of an update set.

```
USAGE
  $ nex update-set inspect -s <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -s, --sys-id=<value>  (required) sys_id of the update set to inspect

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Inspect the components of an update set.

EXAMPLES
  Inspect an update set by sys_id

    $ nex update-set inspect --sys-id us-001 --auth dev-instance

  Inspect with JSON output

    $ nex update-set inspect --sys-id us-001 --json --auth dev-instance
```

_See code: [src/commands/update-set/inspect.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/inspect.ts)_

## `nex update-set move`

Move records between update sets.

```
USAGE
  $ nex update-set move --target <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--records <value>]
    [--source <value>]

FLAGS
  -a, --auth=<value>     Auth alias to use.
      --records=<value>  Comma-separated sys_ids of records to move
      --source=<value>   Source update set sys_id
      --target=<value>   (required) Target update set sys_id

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

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

_See code: [src/commands/update-set/move.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/move.ts)_

## `nex update-set move-capture`

Move one capture (sys_update_xml) between two In progress sets of its own application, and read it back.

```
USAGE
  $ nex update-set move-capture --capture <value> --reason <value> --source <value> --target <value> [--json] [-a <value>]
    [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>] [--log-file] [--log-level
    debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>     Auth alias to use.
      --capture=<value>  (required) sys_update_xml sys_id.
      --reason=<value>   (required) Why the capture moves (letters, digits and simple punctuation).
      --source=<value>   (required) The set the capture is in now.
      --target=<value>   (required) The In progress, non-Default set of the same application to move it to.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Move one capture (sys_update_xml) between two In progress sets of its own application, and read it back.

  Refused before the move when the target belongs to another application, is a Default, already holds a capture
  of the same record, or a newer capture of the record exists elsewhere. The reason is appended to the capture's
  comments.

EXAMPLES
  $ nex update-set move-capture --capture 0123456789abcdef0123456789abcdef --source 0123456789abcdef0123456789abcdee --target 0123456789abcdef0123456789abcded --reason "STORY-123 belongs in the story set" --auth dev
```

_See code: [src/commands/update-set/move-capture.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/move-capture.ts)_

## `nex update-set restore`

Put back the working set that nex update-set use reported as "previous".

```
USAGE
  $ nex update-set restore --application <value> --update-set <value> [--json] [-a <value>] [--cred-store]
    [--deny-execute] [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace]
    [--read-only]

FLAGS
  -a, --auth=<value>         Auth alias to use.
      --application=<value>  (required) previous.application: global or a sys_scope sys_id.
      --update-set=<value>   (required) previous.updateSet: the update set sys_id.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Put back the working set that nex update-set use reported as "previous".

  When that set has closed since, the application's single In progress Default is made current instead.

EXAMPLES
  $ nex update-set restore --application global --update-set 0123456789abcdef0123456789abcdef --auth dev
```

_See code: [src/commands/update-set/restore.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/restore.ts)_

## `nex update-set use SET`

Make an update set your working set, for every later session, and read it back.

```
USAGE
  $ nex update-set use SET [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

ARGUMENTS
  SET  sys_id of an In progress, non-Default update set.

FLAGS
  -a, --auth=<value>  Auth alias to use.

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Make an update set your working set, for every later session, and read it back.

  Saves apps.current_app (the set's application), sys_update_set and updateSetForScope<application>, so the
  next session, background script or Table API write captures into this set. Keep "previous" from the result
  and pass it to nex update-set restore when the work is done. Defaults are refused.

EXAMPLES
  $ nex update-set use 0123456789abcdef0123456789abcdef --json --auth dev
```

_See code: [src/commands/update-set/use.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/update-set/use.ts)_

## `nex workflow activity add`

Add an activity to your checked-out draft of a legacy workflow.

```
USAGE
  $ nex workflow activity add -n <value> -t <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--after-exit <value>]
    [--exit <value>] [--from <value>] [--from-exit <value>] [--input <value>] [--insert-after <value> | --insert-on
    <value>] [--stage <value>] [--to <value>] [--var <value>...] [--vars-file <value>] [-v <value>] [-w <value>] [--x
    <value>] [--y <value>]

FLAGS
  -a, --auth=<value>          Auth alias to use.
  -n, --name=<value>          (required) Name of the new activity
  -t, --type=<value>          (required) Activity type name or sys_id (e.g. Timer, "Run Script", "Approval - User")
  -v, --version=<value>       Draft version sys_id
  -w, --workflow=<value>      Workflow name or sys_id (uses your checked-out draft)
      --after-exit=<value>    With --insert-after: which exit's line to insert on, when the activity has several
      --exit=<value>          The new activity's exit used for --to / the inserted line (defaults to its first exit)
      --from=<value>          Activity (name or sys_id) to add a transition from
      --from-exit=<value>     Exit of --from to leave by (required when it has several)
      --input=<value>         Activity Designer input mapping as a JSON object
      --insert-after=<value>  Insert onto the line leaving this activity (name or sys_id)
      --insert-on=<value>     Insert onto this transition (sys_id)
      --stage=<value>         Stage name, value or sys_id
      --to=<value>            Activity (name or sys_id) to add a transition to
      --var=<value>...        Variable value as element=value (repeatable)
      --vars-file=<value>     JSON file with variable values keyed by element
      --x=<value>             Canvas x position
      --y=<value>             Canvas y position

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Add an activity to your checked-out draft of a legacy workflow.

  The activity is created through the Workflow Editor's activity form, so its variables are saved and its default exits
  are created exactly as in the UI. Use "workflow definitions <type>" to see the variables a type accepts.

  Wiring:
  --insert-after / --insert-on  drop the activity onto an existing line, as the editor does
  --from / --to                 add transitions into and out of the new activity

EXAMPLES
  Insert a one-day timer right after Begin

    $ nex workflow activity add -w "Laptop Request" --type Timer --name "Wait 1 day" --insert-after Begin --var \
      duration=86400 --auth dev

  Add an approval wired from the timer, Approved → End

    $ nex workflow activity add -w "Laptop Request" --type "Approval - User" --name "Manager approval" --from "Wait \
      1 day" --to End --exit Approved --vars-file approval.json --auth dev
```

_See code: [src/commands/workflow/activity/add.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/activity/add.ts)_

## `nex workflow activity remove`

Remove an activity, with its exits and variables, from your checked-out draft of a legacy workflow.

```
USAGE
  $ nex workflow activity remove -a <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--reconnect] [-v <value>] [-w
    <value>]

FLAGS
  -a, --activity=<value>  (required) Activity name or sys_id
  -a, --auth=<value>      Auth alias to use.
  -v, --version=<value>   Draft version sys_id
  -w, --workflow=<value>  Workflow name or sys_id (uses your checked-out draft)
      --reconnect         Join its single incoming and outgoing transitions so the flow stays connected

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Remove an activity, with its exits and variables, from your checked-out draft of a legacy workflow.

EXAMPLES
  Remove an activity and join the line it sat on

    $ nex workflow activity remove -w "Laptop Request" --activity "Wait 1 day" --reconnect --auth dev
```

_See code: [src/commands/workflow/activity/remove.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/activity/remove.ts)_

## `nex workflow activity update`

Change an activity on your checked-out draft of a legacy workflow. Variables you do not pass keep their values.

```
USAGE
  $ nex workflow activity update -a <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--input <value>] [--rename <value>]
    [--stage <value>] [--var <value>...] [--vars-file <value>] [-v <value>] [-w <value>] [--x <value>] [--y <value>]

FLAGS
  -a, --activity=<value>   (required) Activity name or sys_id
  -a, --auth=<value>       Auth alias to use.
  -v, --version=<value>    Draft version sys_id
  -w, --workflow=<value>   Workflow name or sys_id (uses your checked-out draft)
      --input=<value>      Activity Designer input mapping as a JSON object
      --rename=<value>     New activity name
      --stage=<value>      Stage name, value or sys_id ("" clears it)
      --var=<value>...     Variable value as element=value (repeatable)
      --vars-file=<value>  JSON file with variable values keyed by element
      --x=<value>          Canvas x position
      --y=<value>          Canvas y position

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Change an activity on your checked-out draft of a legacy workflow. Variables you do not pass keep their values.

EXAMPLES
  Change a timer's duration and rename it

    $ nex workflow activity update -w "Laptop Request" --activity "Wait 1 day" --var duration=172800 --rename "Wait \
      2 days" --auth dev

  Move an activity on the canvas

    $ nex workflow activity update -w "Laptop Request" --activity "Notify" --x 400 --y 200 --auth dev
```

_See code: [src/commands/workflow/activity/update.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/activity/update.ts)_

## `nex workflow checkout WORKFLOW`

Check out a legacy workflow for editing. Like the Workflow Editor, this creates a draft version — a full copy of the published one — checked out to you. If you already have a draft, it is reused.

```
USAGE
  $ nex workflow checkout WORKFLOW [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--force]

ARGUMENTS
  WORKFLOW  Workflow name or sys_id

FLAGS
  -a, --auth=<value>  Auth alias to use.
      --force         Take over a checkout held by another user

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Check out a legacy workflow for editing. Like the Workflow Editor, this creates a draft version — a full copy of the
  published one — checked out to you. If you already have a draft, it is reused.

EXAMPLES
  Check out a workflow

    $ nex workflow checkout "Laptop Request" --auth dev

  Take over a checkout held by another user

    $ nex workflow checkout "Laptop Request" --force --auth dev
```

_See code: [src/commands/workflow/checkout.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/checkout.ts)_

## `nex workflow condition add`

Add an exit (condition) to an activity on your checked-out draft of a legacy workflow.

```
USAGE
  $ nex workflow condition add -a <value> -c <value> -n <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--else]
    [--error] [--order <value>] [-v <value>] [-w <value>]

FLAGS
  -a, --activity=<value>   (required) Activity name or sys_id
  -a, --auth=<value>       Auth alias to use.
  -c, --condition=<value>  (required) JavaScript condition, e.g. activity.result == 'skipped'
  -n, --name=<value>       (required) Exit name
  -v, --version=<value>    Draft version sys_id
  -w, --workflow=<value>   Workflow name or sys_id (uses your checked-out draft)
      --else               Taken when no other exit matches
      --error              Taken when the activity faults
      --order=<value>      Evaluation order

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Add an exit (condition) to an activity on your checked-out draft of a legacy workflow.

  An exit is a JavaScript condition evaluated when the activity finishes, usually against activity.result (core
  activities) or activityOutput.<name> (Activity Designer activities). Connect it with "workflow transition add".

EXAMPLES
  Add a custom exit that a Run Script activity can take by setting activity.result

    $ nex workflow condition add -w "Laptop Request" --activity "Check stock" --name Backordered --condition \
      "activity.result == 'backordered'" --auth dev
```

_See code: [src/commands/workflow/condition/add.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/condition/add.ts)_

## `nex workflow condition remove`

Remove an exit (condition), and the transitions leaving from it, from an activity on your checked-out draft.

```
USAGE
  $ nex workflow condition remove -a <value> -e <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-v <value>] [-w <value>]

FLAGS
  -a, --activity=<value>  (required) Activity name or sys_id
  -a, --auth=<value>      Auth alias to use.
  -e, --exit=<value>      (required) Exit name or sys_id
  -v, --version=<value>   Draft version sys_id
  -w, --workflow=<value>  Workflow name or sys_id (uses your checked-out draft)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Remove an exit (condition), and the transitions leaving from it, from an activity on your checked-out draft.

EXAMPLES
  Remove an approval's Skipped exit

    $ nex workflow condition remove -w "Laptop Request" --activity "Manager approval" --exit Skipped --auth dev
```

_See code: [src/commands/workflow/condition/remove.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/condition/remove.ts)_

## `nex workflow condition update`

Change an exit (condition) of an activity on your checked-out draft of a legacy workflow.

```
USAGE
  $ nex workflow condition update -a <value> -e <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-c <value>] [--order
    <value>] [--rename <value>] [-v <value>] [-w <value>]

FLAGS
  -a, --activity=<value>   (required) Activity name or sys_id
  -a, --auth=<value>       Auth alias to use.
  -c, --condition=<value>  New JavaScript condition
  -e, --exit=<value>       (required) Exit name or sys_id
  -v, --version=<value>    Draft version sys_id
  -w, --workflow=<value>   Workflow name or sys_id (uses your checked-out draft)
      --order=<value>      New evaluation order
      --rename=<value>     New exit name

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Change an exit (condition) of an activity on your checked-out draft of a legacy workflow.

EXAMPLES
  Change an exit's condition

    $ nex workflow condition update -w "Laptop Request" --activity "Check stock" --exit Backordered --condition \
      "activity.result == 'backorder'" --auth dev
```

_See code: [src/commands/workflow/condition/update.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/condition/update.ts)_

## `nex workflow convert [WORKFLOW]`

Plan the move of a legacy workflow to Flow Designer, and write a Fluent (now-sdk) skeleton for it. Read-only.

```
USAGE
  $ nex workflow convert [WORKFLOW] [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--directory <value>] [-f <value>]
    [--fluent <value>] [--force] [--plan <value>] [--version current|published|draft]

ARGUMENTS
  [WORKFLOW]  Workflow name or sys_id, or a version sys_id (or use --file)

FLAGS
  -a, --auth=<value>       Auth alias to use.
  -f, --file=<value>       Read a `nex workflow export` JSON file instead of the instance
      --directory=<value>  [default: src/fluent/flows] Folder inside the app for the flow file (with --fluent)
      --fluent=<value>     Write the Fluent skeleton into this now-sdk app folder
      --force              Overwrite an existing flow file (with --fluent)
      --plan=<value>       Save the plan as JSON to this file
      --version=<option>   [default: current] current: your draft if you have one, else published
                           <options: current|published|draft>

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Plan the move of a legacy workflow to Flow Designer, and write a Fluent (now-sdk) skeleton for it. Read-only.

  The plan maps each activity to its Flow Designer equivalent (approvals to Ask For Approval with branches on its state,
  If/Switch to if/else, tasks, timers, waits, parallel lines), turns scratchpad values into flow variables, and lists
  what needs a person: scripts to port, loops, steps shared by several paths, catalog variables, subflows, spoke
  activities. It is printed as text (or --json); --plan saves it as JSON.

  --fluent writes the skeleton into a now-sdk app (default src/fluent/flows/<name>.now.ts): it builds as generated, with
  TODO(convert) comments and the legacy scripts where design work remains. Works on the instance or offline on a `nex
  workflow export` file.

EXAMPLES
  Print the conversion plan

    $ nex workflow convert "Laptop Request" --auth dev

  From a saved export: save the plan and write the Fluent skeleton into a now-sdk app

    $ nex workflow convert --file laptop.json --plan laptop.plan.json --fluent ./my-app
```

_See code: [src/commands/workflow/convert.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/convert.ts)_

## `nex workflow create`

Create a complete workflow from a JSON specification file.

```
USAGE
  $ nex workflow create -s <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>  Auth alias to use.
  -s, --spec=<value>  (required) Path to workflow JSON specification file

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Create a complete workflow from a JSON specification file.

EXAMPLES
  Create a workflow from a JSON spec file

    $ nex workflow create --spec ./workflow.json --auth dev

  Create a workflow and output result as JSON

    $ nex workflow create -s ./workflow.json --json --auth dev
```

_See code: [src/commands/workflow/create.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/create.ts)_

## `nex workflow definitions [TYPE]`

List workflow activity types, or describe one as this instance defines it.

```
USAGE
  $ nex workflow definitions [TYPE] [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-c <value>] [--core-only] [-n
    <value>] [--sample <value> --usage] [--script]

ARGUMENTS
  [TYPE]  Activity type name or sys_id to describe (omit to list types)

FLAGS
  -a, --auth=<value>      Auth alias to use.
  -c, --category=<value>  Category (e.g. Approvals, Timers, Utilities)
  -n, --name=<value>      Name contains this text
      --core-only         Exclude Activity Designer / Orchestration activities
      --sample=<value>    [default: 100] With --usage: activities to sample
      --script            With a type: include its implementation script
      --usage             With a type: show how published workflows on this instance configure it

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  List workflow activity types, or describe one as this instance defines it.

  Describing a type shows its own description, its exits, and the variables it accepts (types, choices, defaults, hints)
  — or, for Activity Designer types, its inputs and outputs. Add --script for its implementation (how each variable is
  used and which results drive the exits) and --usage to see how published workflows on this instance configure it.

EXAMPLES
  List approval activity types

    $ nex workflow definitions --category Approvals --auth dev

  Describe the Timer activity type and its variables

    $ nex workflow definitions Timer --auth dev

  See how this instance's published workflows configure user approvals

    $ nex workflow definitions "Approval - User" --usage --auth dev

  Read the If activity's implementation

    $ nex workflow definitions If --script --auth dev
```

_See code: [src/commands/workflow/definitions.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/definitions.ts)_

## `nex workflow discard [WORKFLOW]`

Discard your checked-out draft of a legacy workflow, keeping the published version.

```
USAGE
  $ nex workflow discard [WORKFLOW] [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-v <value>]

ARGUMENTS
  [WORKFLOW]  Workflow name or sys_id (omit when using --version)

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -v, --version=<value>  Draft version sys_id

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Discard your checked-out draft of a legacy workflow, keeping the published version.

EXAMPLES
  Throw away your draft

    $ nex workflow discard "Laptop Request" --auth dev
```

_See code: [src/commands/workflow/discard.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/discard.ts)_

## `nex workflow export WORKFLOW`

Export a legacy workflow version as one complete JSON definition. Read-only.

```
USAGE
  $ nex workflow export WORKFLOW [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-o <value>] [--version
    current|published|draft]

ARGUMENTS
  WORKFLOW  Workflow name or sys_id, or a version sys_id

FLAGS
  -a, --auth=<value>      Auth alias to use.
  -o, --output=<value>    Write the JSON to this file instead of stdout
      --version=<option>  [default: current] current: your draft if you have one, else published
                          <options: current|published|draft>

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Export a legacy workflow version as one complete JSON definition. Read-only.

  Includes the workflow and version properties (trigger condition, stages, inputs), every activity with its type,
  labelled variable values (defaults marked) and exits, the transitions, the activity types used (described from the
  instance, including whether they pause the workflow), display names for referenced records, the subflows it calls, and
  the catalog items and workflows that use it.

  Exports your checked-out draft when you have one, otherwise the published version; --version chooses. The JSON goes to
  stdout (or --output). Read it with `nex workflow outline --file` (outline, analysis, Mermaid) and plan its move to
  Flow Designer with `nex workflow convert --file`.

EXAMPLES
  Export a workflow

    $ nex workflow export "Laptop Request" --auth dev > laptop-request.json

  Export the published version to a file

    $ nex workflow export "Laptop Request" --version published -o laptop.json --auth dev
```

_See code: [src/commands/workflow/export.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/export.ts)_

## `nex workflow list`

List legacy workflows with the state of their published and checked-out versions.

```
USAGE
  $ nex workflow list [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--limit <value>] [-n <value>] [-q <value>] [-t
    <value>]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -n, --name=<value>   Name contains this text
  -q, --query=<value>  Additional encoded query on wf_workflow
  -t, --table=<value>  Workflow table (e.g. incident, sc_req_item)
      --limit=<value>  [default: 50] Maximum number of workflows to list

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  List legacy workflows with the state of their published and checked-out versions.

EXAMPLES
  List workflows whose name contains "Hardware"

    $ nex workflow list --name "Hardware" --auth dev

  List catalog item workflows as JSON

    $ nex workflow list --table sc_req_item --json --auth dev
```

_See code: [src/commands/workflow/list.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/list.ts)_

## `nex workflow new`

Create a legacy workflow the way the Workflow Editor does: Begin and End joined by a transition, checked out to you for editing.

```
USAGE
  $ nex workflow new -n <value> -t <value> [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--condition <value>]
    [--condition-type <value>] [-d <value>]

FLAGS
  -a, --auth=<value>            Auth alias to use.
  -d, --description=<value>     Workflow description
  -n, --name=<value>            (required) Workflow name (must be unique)
  -t, --table=<value>           (required) Table the workflow runs on
      --condition=<value>       Trigger condition (encoded query)
      --condition-type=<value>  Trigger condition type (e.g. run_match)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Create a legacy workflow the way the Workflow Editor does: Begin and End joined by a transition, checked out to you
  for editing.

EXAMPLES
  Create a catalog item workflow

    $ nex workflow new --name "Laptop Request" --table sc_req_item --auth dev
```

_See code: [src/commands/workflow/new.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/new.ts)_

## `nex workflow outline [WORKFLOW]`

Show a legacy workflow as a readable outline, a node list, a structural analysis or a Mermaid graph. Read-only.

```
USAGE
  $ nex workflow outline [WORKFLOW] [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--all-values] [--analysis | --nodes |
    --mermaid] [-f <value>] [--flow-hints] [--full-scripts] [--version current|published|draft]

ARGUMENTS
  [WORKFLOW]  Workflow name or sys_id, or a version sys_id (or use --file)

FLAGS
  -a, --auth=<value>      Auth alias to use.
  -f, --file=<value>      Read a `nex workflow export` JSON file instead of the instance
      --all-values        Include settings left at their defaults
      --analysis          Structural analysis instead of the outline
      --flow-hints        Annotate steps with the likely Flow Designer construct
      --full-scripts      Print scripts in full (default: the first 25 lines)
      --mermaid           A Mermaid flowchart instead of the outline
      --nodes             Every activity with its exits and where it is reached from
      --version=<option>  [default: current] current: your draft if you have one, else published
                          <options: current|published|draft>

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Show a legacy workflow as a readable outline, a node list, a structural analysis or a Mermaid graph. Read-only.

  The outline nests the workflow the way it runs: numbered steps in reading order, decisions with a block per exit
  (short exits as guard clauses), parallel lines closed at their Join, loops (↻), waits ([WAIT]), steps shared by
  several paths, dead exits and unreachable activities. Settings show only what differs from the defaults.

  --analysis lists paths, decisions, parallel splits, loops, dead exits, scratchpad and catalog-variable use, scripts
  and subflows. Works on the instance (exporting the workflow) or offline on a `nex workflow export` file.

EXAMPLES
  Outline a workflow

    $ nex workflow outline "Laptop Request" --auth dev

  Analyse a saved export (no instance needed)

    $ nex workflow outline --file laptop.json --analysis

  Annotate steps with likely Flow Designer constructs

    $ nex workflow outline --file laptop.json --flow-hints
```

_See code: [src/commands/workflow/outline.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/outline.ts)_

## `nex workflow publish`

Publish a workflow version.

```
USAGE
  $ nex workflow publish [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--allow-warnings] [-s <value> -v <value>] [-w
    <value> | ]

FLAGS
  -a, --auth=<value>            Auth alias to use.
  -s, --start-activity=<value>  Sys ID of the start activity (sets it and publishes without validation)
  -v, --version-id=<value>      Sys ID of the workflow version to publish
  -w, --workflow=<value>        Workflow name or sys_id; publishes your checked-out draft
      --allow-warnings          Publish even when validation reports warnings

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Publish a workflow version.

  Publishes your checked-out draft the way the Workflow Editor does: it is validated first, and warnings stop the
  publish unless --allow-warnings is given. Critical findings always stop it. The instance records the workflow in your
  current update set.

  With --start-activity, the version's start activity is set and it is published without validation (the original
  behaviour of this command).

EXAMPLES
  Validate and publish your draft

    $ nex workflow publish --workflow "Laptop Request" --auth dev

  Publish even if validation reports warnings

    $ nex workflow publish -w "Laptop Request" --allow-warnings --auth dev

  Set the start activity and publish a version without validation

    $ nex workflow publish --version-id wfv-001 --start-activity act-001 --auth dev
```

_See code: [src/commands/workflow/publish.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/publish.ts)_

## `nex workflow show [WORKFLOW]`

Show a legacy workflow: its activities with their exits and variable values, and its transitions.

```
USAGE
  $ nex workflow show [WORKFLOW] [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--vars] [-v <value>]

ARGUMENTS
  [WORKFLOW]  Workflow name or sys_id (omit when using --version)

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -v, --version=<value>  Workflow version sys_id
      --[no-]vars        Include activity variable values

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Show a legacy workflow: its activities with their exits and variable values, and its transitions.

  Shows your checked-out draft when you have one, otherwise the published version. Use --version for any other version.

EXAMPLES
  Show a workflow

    $ nex workflow show "Hardware Request" --auth dev

  Show a specific version without variable values

    $ nex workflow show --version <version_sys_id> --no-vars --auth dev
```

_See code: [src/commands/workflow/show.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/show.ts)_

## `nex workflow transition add`

Add a transition between two activities on your checked-out draft of a legacy workflow.

```
USAGE
  $ nex workflow transition add --from <value> --to <value> [--json] [-a <value>] [--cred-store] [--deny-execute]
    [--deny-write] [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--exit
    <value>] [-v <value>] [-w <value>]

FLAGS
  -a, --auth=<value>      Auth alias to use.
  -v, --version=<value>   Draft version sys_id
  -w, --workflow=<value>  Workflow name or sys_id (uses your checked-out draft)
      --exit=<value>      Exit of --from to leave by (required when it has several)
      --from=<value>      (required) Source activity (name or sys_id)
      --to=<value>        (required) Target activity (name or sys_id)

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Add a transition between two activities on your checked-out draft of a legacy workflow.

EXAMPLES
  Send the Rejected exit to End

    $ nex workflow transition add -w "Laptop Request" --from "Manager approval" --exit Rejected --to End --auth dev
```

_See code: [src/commands/workflow/transition/add.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/transition/add.ts)_

## `nex workflow transition remove`

Remove a transition from your checked-out draft of a legacy workflow, by sys_id or by its ends.

```
USAGE
  $ nex workflow transition remove [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir <value>]
    [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [--exit <value>] [--from <value> | --transition
    <value>] [--to <value> | ] [-v <value>] [-w <value>]

FLAGS
  -a, --auth=<value>        Auth alias to use.
  -v, --version=<value>     Draft version sys_id
  -w, --workflow=<value>    Workflow name or sys_id (uses your checked-out draft)
      --exit=<value>        With --from/--to: the exit, when several lines join the two activities
      --from=<value>        Source activity (name or sys_id)
      --to=<value>          Target activity (name or sys_id)
      --transition=<value>  Transition sys_id

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Remove a transition from your checked-out draft of a legacy workflow, by sys_id or by its ends.

EXAMPLES
  Remove the transition between two activities

    $ nex workflow transition remove -w "Laptop Request" --from "Manager approval" --to End --auth dev

  Remove a transition by sys_id

    $ nex workflow transition remove -w "Laptop Request" --transition <transition_sys_id> --auth dev
```

_See code: [src/commands/workflow/transition/remove.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/transition/remove.ts)_

## `nex workflow validate [WORKFLOW]`

Run the Workflow Editor's validation on a workflow without publishing it.

```
USAGE
  $ nex workflow validate [WORKFLOW] [--json] [-a <value>] [--cred-store] [--deny-execute] [--deny-write] [--log-dir
    <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-v <value>]

ARGUMENTS
  [WORKFLOW]  Workflow name or sys_id (omit when using --version)

FLAGS
  -a, --auth=<value>     Auth alias to use.
  -v, --version=<value>  Workflow version sys_id

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --json                Format output as json.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Run the Workflow Editor's validation on a workflow without publishing it.

  Validates your checked-out draft when you have one, otherwise the published version.

EXAMPLES
  Validate your draft of a workflow

    $ nex workflow validate "Hardware Request" --auth dev
```

_See code: [src/commands/workflow/validate.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/workflow/validate.ts)_

## `nex xml export`

Export a single ServiceNow record as XML.

```
USAGE
  $ nex xml export -t <value> -s <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only] [-o <value>]

FLAGS
  -a, --auth=<value>    Auth alias to use.
  -j, --json            Output results as JSON
  -o, --output=<value>  File path to write the exported XML to. If omitted, XML is printed to stdout.
  -s, --sys-id=<value>  (required) Sys ID of the record to export
  -t, --table=<value>   (required) Table name of the record to export

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Export a single ServiceNow record as XML.

  Downloads the XML representation of a specific record from a ServiceNow table. Without --output, the XML is printed to
  stdout. With --output, the XML is written to the specified file path.

  Features:
  • Export any record by table and sys_id
  • Print XML to stdout for piping to other tools
  • Save directly to a file with --output
  • JSON output mode for CI/CD integration

EXAMPLES
  Export a record to stdout

    $ nex xml export --table sys_script_include --sys-id abc123def456 --auth dev

  Export and save to a file

    $ nex xml export --table incident --sys-id abc123 --output ./export.xml --auth dev

  Export as JSON metadata

    $ nex xml export --table sys_script --sys-id abc123 --json --auth dev
```

_See code: [src/commands/xml/export.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/xml/export.ts)_

## `nex xml import`

Import XML records into a ServiceNow instance.

```
USAGE
  $ nex xml import -f <value> -t <value> [-j] [-a <value>] [--cred-store] [--deny-execute] [--deny-write]
    [--log-dir <value>] [--log-file] [--log-level debug|warn|error|info|trace] [--read-only]

FLAGS
  -a, --auth=<value>   Auth alias to use.
  -f, --file=<value>   (required) Path to the XML file to import
  -j, --json           Output results as JSON
  -t, --table=<value>  (required) Target table to import records into

GLOBAL FLAGS
  --cred-store          Read credentials from @sonisoft/sn-credstore instead of the OS keyring. Use this in headless
                        sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.
  --deny-execute        Refuse background scripts, creating or updating scheduled jobs (deleting one needs only write),
                        flow runs and ATF runs for this invocation.
  --deny-write          Refuse any change to instance data for this invocation.
  --log-dir=<value>     Directory to write log files to. Implies --log-file.
  --log-file            Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs
                        (~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs warnings and errors to
                        stderr only.
  --log-level=<option>  [default: info] Specify level for logging.
                        <options: debug|warn|error|info|trace>
  --read-only           Refuse every change to the instance — equivalent to --deny-write --deny-execute. Reads are
                        unaffected.

DESCRIPTION
  Import XML records into a ServiceNow instance.

  Reads an XML file and imports its contents into the specified target table. The XML should be in ServiceNow unload
  format.

  Features:
  • Import from local XML files
  • Target a specific table
  • JSON output mode for CI/CD integration

EXAMPLES
  Import records from an XML file

    $ nex xml import --file ./export.xml --table sys_script_include --auth dev

  Import with JSON output

    $ nex xml import --file ./records.xml --table incident --json --auth dev
```

_See code: [src/commands/xml/import.ts](https://github.com/sonisoft-cnanda/now-sdk-ext-cli/blob/v5.16.0/src/commands/xml/import.ts)_
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
          node-version: '26'
      
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
  image: node:26
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

## ServiceNow SDK upgrades

New `@servicenow/sdk` releases are rolled through sn-credstore, core, the CLI and the MCP
server by a scheduled routine. Its runbook and scripts (`scripts/sdk-watch/`) are described in
[docs/SDK_UPGRADE_ROUTINE.md](docs/SDK_UPGRADE_ROUTINE.md).

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

## Open a desktop UI session

```bash
nex auth open -a bcbsscdev --cred-store
```

Mints a verified cookie session from the stored SDK alias and opens it in a
dedicated Edge window. See [docs/AUTH_OPEN.md](docs/AUTH_OPEN.md) for macOS,
Windows, and WSL. This is not your daily browser profile; close the window
when finished. `--browser chrome|brave` and `--cdp http://127.0.0.1:9222` are
optional.

## Playwright sessions from SDK aliases

```bash
nex auth browser-session -a dev206299 --cred-store --output playwright/.auth/dev.json --json
```

Uses SDK OAuth refresh and exports cookie-only Playwright storage state. Output is
metadata/path only; the file contains secrets and is written atomically with mode
0600. Existing output requires `--force`; symlinks are refused. Ignore the auth
directory in Git and exclude it from test artifacts.

Pass the file as Playwright's `storageState`. Remote Docker browsers receive the
state over the Playwright connection; they need no credential-store mount.
Generate a fresh session per test, especially when impersonating. For long tests,
renew at an explicit safe checkpoint and open a new context; state files cannot
refresh themselves.

Regular nex commands now pass an alias-bound provider to core so long-running
operations can renew credentials. Read-only authentication failures can retry once;
writes and stateful workflows are not automatically replayed. nex permission flags
do not constrain actions performed later by Playwright.

Use the same backend/path for `now-sdk-x` and `nex --cred-store`. Plain now-sdk
normally uses the keyring and does not synchronize a separate credential store.

When upgrading a shared store, stop all clients first, upgrade every client
(including standalone `now-sdk-x`) to sn-credstore 1.1.1 or later, then restart.
The new lock protocol cannot safely run alongside older clients.
