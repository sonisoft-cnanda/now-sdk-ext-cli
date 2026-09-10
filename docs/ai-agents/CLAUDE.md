# NEX CLI — AI Agent Guidance

> This file provides AI coding assistants (Claude Code, Cursor, Windsurf, etc.) with comprehensive guidance on using the `nex` CLI to automate ServiceNow platform operations. Copy this file to your project root or include it in your agent's context.

---

## Overview

`nex` (`@sonisoft/now-sdk-ext-cli`) is a CLI tool that extends the ServiceNow SDK with commands across 22 topics. It enables programmatic interaction with ServiceNow instances for querying data, executing scripts, managing flows, running tests, deploying applications, and more.

**Every command requires authentication** via the `--auth <alias>` flag, which specifies the target ServiceNow instance using a pre-configured credential alias.

## Authentication

```bash
# All commands require --auth (or -a) to specify the target instance
nex query -t incident --auth dev
nex flow test -f <id> -o '{}' --auth prod

# Auth aliases are configured via the ServiceNow SDK CLI:
now-sdk auth --add dev12345.service-now.com --alias dev --type oauth
```

### Headless sessions: add `--cred-store`

**If you are running without an interactive desktop session — over SSH, from a
systemd unit, in CI, or as an autonomous agent — add `--cred-store` to every
command:**

```bash
nex query -t incident --auth dev --cred-store
```

The ServiceNow SDK stores credentials in the OS keyring, and a non-interactive
session cannot unlock it *even running as the same user*. The failure is silent
and actively misleading — you get:

```
Could not find stored credentials for alias: dev
```

which reads as a missing alias rather than a locked keyring, so the obvious next
step (re-adding the alias) does not help. `--cred-store` reads from
`@sonisoft/sn-credstore` instead, a store that many concurrent agents can share
safely.

To avoid passing the flag on every command, set it once in the environment:

```bash
export SN_CRED_STORE_ENABLE=1
```

Diagnose which path you are on before assuming credentials are missing:

```bash
nex auth doctor    # active store, whether the shim is on, what is stored
nex auth list      # aliases in the credential store
```

One-time setup, which **must** be run from a desktop session on a TTY because the
keyring will prompt to unlock:

```bash
npm install -g @sonisoft/sn-credstore
sn-credstore import --from keyring
```

Without `--cred-store` (and without `SN_CRED_STORE_ENABLE`), `nex` uses the OS
keyring exactly as the stock SDK does. That is the default on purpose, so nothing
changes for interactive use.

## Global Flags

These flags are available on every command:

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--auth` | `-a` | string | Auth alias for the target ServiceNow instance (required) |
| `--log-level` | | string | Logging verbosity: `debug`, `info`, `warn`, `error`, `trace` (default: `info`) |
| `--json` | `-j` | boolean | Output results as structured JSON instead of formatted text |
| `--cred-store` | | boolean | Read credentials from `@sonisoft/sn-credstore` instead of the OS keyring. **Required in headless sessions** — see Authentication above. |

## Output Patterns

- **Text mode** (default): Human-readable formatted output with Unicode icons and alignment
- **JSON mode** (`--json`): Machine-parseable JSON, suitable for piping to `jq` or programmatic parsing
- Example chaining: `nex flow test -f <id> -o '{}' --json --auth dev | jq '.contextId'`

## Shell Quoting

JSON arguments must be shell-quoted. Use single quotes around JSON values:

```bash
# Correct
nex flow test -f <id> -o '{"record":"INC001"}' --auth dev
nex bulk update -t incident -q "active=true" -d '{"priority":"4"}' --auth dev

# For nested quotes, use escaped doubles inside singles
nex exec global script.js -p '{"table":"incident","query":"active=true"}' --auth dev
```

---

## Quick Reference

Every command at a glance:

| Command | Description |
|---------|-------------|
| **Aggregate** | |
| `nex aggregate count` | Count records in a table |
| `nex aggregate group` | Grouped aggregate statistics (COUNT, AVG, MIN, MAX, SUM) |
| `nex aggregate query` | Run aggregate statistics on a table |
| **App** | |
| `nex app install` | Batch install apps from a definition file |
| `nex app repo-install` | Install an app from the company repository |
| `nex app repo-list` | List apps in the company repository |
| `nex app uninstall` | Uninstall a ServiceNow application by ID and scope |
| **ATF** | |
| `nex atf` | Execute ATF tests or test suites |
| **Auth** | |
| `nex auth list` | List credentials in the headless-safe credential store |
| `nex auth use` | Set the default credential alias |
| `nex auth delete` | Remove a credential from the store |
| `nex auth doctor` | Diagnose credential storage |
| **Attachment** | |
| `nex attachment get` | Get metadata for a specific attachment |
| `nex attachment list` | List attachments on a record |
| `nex attachment upload` | Upload a file as an attachment |
| **Batch** | |
| `nex batch create` | Batch create records from a JSON file |
| `nex batch update` | Batch update records from a JSON file |
| **Bulk** | |
| `nex bulk delete` | Bulk delete records matching a query (dry-run by default) |
| `nex bulk update` | Bulk update records matching a query (dry-run by default) |
| **Exec** | |
| `nex exec` | Execute JavaScript on an instance (file or REPL mode) |
| **Flow** | |
| `nex flow run` | Execute a published flow by scoped name |
| `nex flow subflow` | Execute a published subflow by scoped name |
| `nex flow action` | Execute a flow action by scoped name |
| `nex flow test` | Test a flow without requiring it to be published |
| `nex flow copy` | Copy a flow into a target scoped application |
| `nex flow definition` | Read the design-time definition of a flow, subflow, or action |
| `nex flow status` | Get the status of a flow execution context |
| `nex flow details` | Get rich per-action execution details for a flow context |
| `nex flow logs` | Get execution log entries for a flow context |
| `nex flow outputs` | Get outputs from a completed flow execution |
| `nex flow error` | Get error details from a failed flow execution |
| `nex flow cancel` | Cancel a running or paused flow execution |
| `nex flow message` | Send a message to a paused flow execution |
| **Health** | |
| `nex health check` | Run a consolidated instance health check |
| **Log** | |
| `nex log` | Tail and monitor system logs in real-time |
| **Query** | |
| `nex query` | Query any ServiceNow table |
| `nex query app` | Search for applications by name |
| `nex query columns` | List columns on a table |
| `nex query syslog` | Query system logs (one-shot) |
| **Schema** | |
| `nex schema` | Discover a table's full schema |
| `nex schema field` | Explain a specific field on a table |
| `nex schema validate-catalog` | Validate a catalog item configuration |
| **Scope** | |
| `nex scope` | Get current scope or list available applications |
| `nex scope set` | Set the current application scope |
| **Script-Sync** | |
| `nex script-sync pull` | Pull a script from instance to local file |
| `nex script-sync push` | Push a local script file to instance |
| `nex script-sync sync` | Synchronize all scripts in a directory |
| **Search** | |
| `nex search` | Search platform code across an instance |
| `nex search groups` | List code search groups |
| `nex search tables` | List tables in a search group |
| `nex search add-table` | Add a table to a search group |
| **Store** | |
| `nex store search` | Search the ServiceNow Store |
| `nex store install` | Install a store application |
| `nex store update` | Update a store application |
| `nex store validate` | Validate a batch install definition file |
| **Task** | |
| `nex task find` | Find a task by its number |
| `nex task assign` | Assign a task to a user or group |
| `nex task comment` | Add a comment or work note to a task |
| `nex task resolve` | Resolve an incident |
| `nex task close` | Close an incident |
| `nex task approve` | Approve a change request |
| **Transaction** | |
| `nex transaction list` | List active transactions from all responding cluster nodes |
| `nex transaction kill` | Submit a kill request for one selected transaction (requires `--confirm`) |
| **Update-Set** | |
| `nex update-set` | List update sets |
| `nex update-set create` | Create a new update set |
| `nex update-set current` | Get or set the current update set |
| `nex update-set inspect` | Inspect update set components |
| `nex update-set clone` | Clone an update set and its records |
| `nex update-set move` | Move records between update sets |
| **Workflow** | |
| `nex workflow create` | Create a workflow from a JSON specification |
| `nex workflow publish` | Publish a workflow version |
| **XML** | |
| `nex xml export` | Export a record as XML |
| `nex xml import` | Import XML records into an instance |

---

## Command Reference

### Aggregate

Run aggregate statistics (COUNT, AVG, MIN, MAX, SUM) on ServiceNow tables. Uses the Stats API for efficient server-side computation.

#### `nex aggregate count`

Count records in a ServiceNow table. Much faster than querying all records.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name to count records in |
| `--query` | `-q` | string | no | — | Encoded query string to filter records |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex aggregate count -t incident -q "active=true^priority=1" --auth dev
```

#### `nex aggregate query`

Run aggregate functions (AVG, MIN, MAX, SUM) on a table with optional record count.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name to aggregate |
| `--query` | `-q` | string | no | — | Encoded query to filter records |
| `--count` | `-c` | boolean | no | `false` | Include record count |
| `--avg` | | string[] | no | — | Fields to compute AVG on |
| `--min` | | string[] | no | — | Fields to compute MIN on |
| `--max` | | string[] | no | — | Fields to compute MAX on |
| `--sum` | | string[] | no | — | Fields to compute SUM on |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex aggregate query -t incident -q "active=true" --count --avg reassignment_count --auth dev
```

#### `nex aggregate group`

Run grouped aggregate queries — ideal for breakdowns and dashboards.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name to aggregate |
| `--group-by` | `-g` | string[] | yes | — | Field name(s) to group by |
| `--query` | `-q` | string | no | — | Encoded query to filter before grouping |
| `--count` | `-c` | boolean | no | `false` | Include record count per group |
| `--avg` | | string[] | no | — | Fields to compute AVG per group |
| `--min` | | string[] | no | — | Fields to compute MIN per group |
| `--max` | | string[] | no | — | Fields to compute MAX per group |
| `--sum` | | string[] | no | — | Fields to compute SUM per group |
| `--having` | | string | no | — | HAVING clause to filter groups (e.g., `"count>10"`) |
| `--display-value` | `-d` | boolean | no | `false` | Return display values for group-by fields |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex aggregate group -t incident -g priority --count -q "active=true" --auth dev
nex aggregate group -t incident -g priority,state --count --having "count>5" --auth dev
```

---

### App

Manage ServiceNow applications: install, uninstall, list company repository apps.

#### `nex app`

Uninstall a ServiceNow application (index command).

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--uninstall` | `-u` | boolean | no | — | Uninstall the app |
| `--applicationId` | `-i` | string | no | — | Application sys_id |
| `--scope` | `-s` | string | no | — | Scope of application |

#### `nex app install`

Install or upgrade multiple applications from a batch definition file. The definition file is a JSON array of applications to install.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--batch` | `-b` | boolean | no | — | Enable batch installation mode |
| `--definitionPath` | `-d` | string | no | — | Path to JSON batch definition file |

```bash
nex app install -b -d ./apps-to-install.json --auth dev
```

#### `nex app repo-install`

Install an application from your company's ServiceNow application repository. Long-running operation that polls until complete.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--scope` | `-s` | string | yes | — | Application scope (e.g., `x_my_custom_app`) |
| `--version` | `-v` | string | no | latest | Specific version to install |
| `--no-wait` | `-w` | boolean | no | `false` | Don't wait for completion |
| `--poll-interval` | | integer | no | `5000` | Polling interval in ms |
| `--timeout` | `-t` | integer | no | `1800000` | Timeout in ms (30 min) |

```bash
nex app repo-install -s x_acme_my_app -v 1.2.0 --auth dev
```

#### `nex app repo-list`

List applications available in your company's application repository.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--installed` | `-i` | boolean | no | `false` | Show only installed apps |
| `--installable` | `-n` | boolean | no | `false` | Show only installable apps (note: `-n` is the short flag, not `--name`) |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex app repo-list --installed --auth dev
```

#### `nex app uninstall`

Uninstall a ServiceNow application from your instance.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--applicationId` | `-i` | string | yes | — | Application sys_id |
| `--scope` | `-s` | string | yes | — | Application scope |

```bash
nex app uninstall -i abc123def456789 -s x_acme_my_app --auth dev
```

---

### ATF

Execute ATF (Automated Test Framework) tests or test suites on a ServiceNow instance. Returns test results with pass/fail status, run time, and output.

#### `nex atf`

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--test-id` | `-t` | string | exclusive | — | Test sys_id to execute |
| `--suite-id` | `-s` | string | exclusive | — | Test Suite sys_id to execute |
| `--suite-name` | `-n` | string | exclusive | — | Test Suite name to execute |
| `--wait` | `-w` | boolean | no | `true` | Wait for suite execution to complete |
| `--poll-interval` | `-p` | integer | no | `5000` | Polling interval in ms |
| `--browser` | `-b` | string | no | — | Browser for UI tests (e.g., `chrome`) |
| `--browser-version` | | string | no | — | Browser version |
| `--os-name` | | string | no | — | OS name for test execution |
| `--os-version` | | string | no | — | OS version |
| `--performance` | | boolean | no | `false` | Run as performance test |
| `--cloud` | | boolean | no | `false` | Run in cloud |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

Provide exactly one of `--test-id`, `--suite-id`, or `--suite-name`.

```bash
# Run a single test
nex atf -t abc123def456789 --auth dev

# Run a test suite by name
nex atf -n "Incident Management Tests" --auth dev

# Run a test suite by sys_id with JSON output
nex atf -s def456abc789012 --json --auth dev
```

---

### Auth

Manage the headless-safe credential store. These commands read the store
directly, so they work even when credentials are otherwise unreadable — which is
what makes `nex auth doctor` useful for diagnosing the failure rather than a
casualty of it.

`--cred-store` is accepted on these commands and ignored: they always use the
store.

#### `nex auth list`

List credentials in the store. Secrets are never printed.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex auth list
nex auth list --json
```

#### `nex auth doctor`

Diagnose credential storage: whether the SDK shim is active, which backend is in
use, and what is stored. **Run this first when a command reports missing
credentials** — it distinguishes "no credentials" from "credentials unreadable",
which every other error conflates.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex auth doctor
nex auth doctor --json
```

#### `nex auth use`

Set the default credential alias. Commands run without `--auth` use it.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `<alias>` | | arg | yes | — | Alias to make the default |

```bash
nex auth use dev
```

#### `nex auth delete`

Remove a credential from the store. Does not touch the OS keyring, so a copy kept
there before migrating remains.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `<alias>` | | arg | no | — | Alias to remove |
| `--all` | | boolean | no | `false` | Remove every stored credential |

```bash
nex auth delete old-alias
nex auth delete --all
```

---

### Attachment

Manage file attachments on ServiceNow records.

#### `nex attachment list`

List attachments on a ServiceNow record.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name |
| `--record-id` | `-r` | string | yes | — | Record sys_id |
| `--limit` | | integer | no | `20` | Max attachments to return |

```bash
nex attachment list -t incident -r abc123def456789 --auth dev
```

#### `nex attachment get`

Get metadata for a specific attachment by sys_id.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--sys-id` | `-s` | string | yes | — | Attachment sys_id |

```bash
nex attachment get -s att123def456789 --auth dev
```

#### `nex attachment upload`

Upload a file as an attachment to a ServiceNow record.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Target table name |
| `--record-id` | `-r` | string | yes | — | Target record sys_id |
| `--file` | `-f` | string | yes | — | Path to the file to upload |
| `--content-type` | | string | no | — | MIME content type |

```bash
nex attachment upload -t incident -r abc123 -f ./screenshot.png --auth dev
```

---

### Batch

Perform batch create and update operations using JSON definition files.

#### `nex batch create`

Batch create records from a JSON file. Supports variable references between operations using `saveAs`/`${name}` syntax.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--file` | `-f` | string | yes | — | Path to JSON file with create operations |
| `--transaction` | | boolean | no | `true` | Stop on first error (transactional) |

```bash
nex batch create -f ./create-ops.json --auth dev
```

#### `nex batch update`

Batch update records from a JSON file.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--file` | `-f` | string | yes | — | Path to JSON file with update operations |
| `--stop-on-error` | | boolean | no | `false` | Stop on first error |

```bash
nex batch update -f ./update-ops.json --auth dev
```

---

### Bulk

Bulk update or delete records matching an encoded query. **Dry-run by default** — you must pass `--confirm` to execute changes.

> **Safety**: Always run without `--confirm` first to preview how many records will be affected.

#### `nex bulk update`

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name |
| `--query` | `-q` | string | yes | — | Encoded query to match records |
| `--data` | `-d` | string | yes | — | JSON field=value pairs (e.g., `'{"priority":"4"}'`) |
| `--confirm` | | boolean | no | `false` | Execute the update (without = dry run) |
| `--limit` | `-l` | integer | no | `200` | Max records to update (max 10000) |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
# Preview (dry run)
nex bulk update -t incident -q "active=true^priority=5" -d '{"priority":"4"}' --auth dev

# Execute
nex bulk update -t incident -q "active=true^priority=5" -d '{"priority":"4"}' --confirm --auth dev
```

#### `nex bulk delete`

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name |
| `--query` | `-q` | string | yes | — | Encoded query to match records |
| `--confirm` | | boolean | no | `false` | Execute the delete (without = dry run) |
| `--limit` | `-l` | integer | no | `200` | Max records to delete (max 10000) |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
# Preview (dry run)
nex bulk delete -t temp_table -q "sys_created_on<2024-01-01" --auth dev

# Execute
nex bulk delete -t temp_table -q "sys_created_on<2024-01-01" --confirm --auth dev
```

---

### Exec

Execute JavaScript on a ServiceNow instance using Scripts - Background. Full GlideSystem API access (`GlideRecord`, `GlideAggregate`, `gs.print()`, etc.). Scripts execute with the authenticated user's permissions.

> **Warning**: This executes code directly on the instance. Prefer read-only operations unless modification is explicitly intended.

#### `nex exec`

| Arg | Type | Required | Description |
|-----|------|----------|-------------|
| `scope` | string | yes | Scope to execute in (`global` for global scope, or app scope) |
| `file` | string | no | Script file path. If omitted, starts interactive REPL mode |

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--params` | `-p` | string | no | — | JSON object for parameter substitution in script file |

```bash
# Execute a script file
nex exec global ./scripts/count-incidents.js --auth dev

# Execute with parameter substitution
nex exec global ./scripts/query.js -p '{"table":"incident","query":"active=true"}' --auth dev

# Start interactive REPL
nex exec global --auth dev
```

---

### Flow

Execute and manage Flow Designer flows, subflows, and actions. This is the most comprehensive topic with 13 commands covering the full flow development lifecycle.

#### `nex flow run`

Execute a **published** flow by scoped name. In foreground mode (default), blocks until completion. In background mode, returns a context ID for polling.

> Flows with approval/wait steps **must** use background mode.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--name` | `-n` | string | yes | — | Scoped name (e.g., `global.my_flow`) |
| `--inputs` | `-i` | string | no | — | JSON input name-value pairs |
| `--mode` | `-m` | option | no | `foreground` | `foreground` or `background` |
| `--scope` | | string | no | — | Scope context for execution |
| `--quick` | | boolean | no | `false` | Skip execution detail records |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex flow run -n global.my_flow -i '{"record":"INC001"}' --auth dev
nex flow run -n global.approval_flow -m background --auth dev
```

#### `nex flow subflow`

Execute a published subflow by scoped name. Subflows are the reusable building blocks in Flow Designer.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--name` | `-n` | string | yes | — | Scoped name (e.g., `global.my_subflow`) |
| `--inputs` | `-i` | string | no | — | JSON input name-value pairs |
| `--mode` | `-m` | option | no | `foreground` | `foreground` or `background` |
| `--scope` | | string | no | — | Scope context for execution |
| `--quick` | | boolean | no | `false` | Skip execution detail records |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex flow subflow -n x_myapp.create_incident_subflow -i '{"urgency":"1"}' --auth dev
```

#### `nex flow action`

Execute a flow action by scoped name. Actions are the lowest-level building blocks (lookup record, create task, etc.).

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--name` | `-n` | string | yes | — | Scoped name (e.g., `global.create_record`) |
| `--inputs` | `-i` | string | no | — | JSON input name-value pairs |
| `--mode` | `-m` | option | no | `foreground` | `foreground` or `background` |
| `--scope` | | string | no | — | Scope context for execution |
| `--quick` | | boolean | no | `false` | Skip execution detail records |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex flow action -n global.create_record -i '{"table":"incident","fields":{"short_description":"Test"}}' --auth dev
```

#### `nex flow test`

Test a flow **without requiring it to be published**. Uses the ProcessFlow REST API, exactly as the "Test" button in Flow Designer does. This is the primary command for iterating on flow development.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--flow-id` | `-f` | string | yes | — | Flow sys_id or scoped name (e.g., `x_myapp.my_flow`) |
| `--output-map` | `-o` | string | yes | — | JSON mapping of trigger output variable names to test values |
| `--scope` | | string | no | auto | Scope sys_id (auto-resolved from flow definition if omitted) |
| `--synchronous` | | boolean | no | `true` | Run test synchronously (use `--no-synchronous` for async) |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
# Test a flow with trigger outputs
nex flow test -f a1b2c3d4e5f60718293a4b5c6d7e8f90 -o '{"record":"INC001"}' --auth dev

# Test by scoped name
nex flow test -f x_myapp.my_flow -o '{"record":"CHG001"}' --auth dev

# Get JSON output for programmatic use
nex flow test -f <id> -o '{}' --json --auth dev | jq '.contextId'
```

#### `nex flow copy`

Copy an existing flow into a target scoped application. Creates a new editable copy that can be modified and tested independently.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--source-flow-id` | `-s` | string | yes | — | Source flow sys_id or scoped name |
| `--name` | `-n` | string | yes | — | Display name for the new flow |
| `--target-scope` | `-t` | string | yes | — | Target application scope sys_id |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex flow copy -s global.change__standard -n "My Custom Change Flow" -t <scope-id> --auth dev
```

#### `nex flow definition`

Read the **design-time** definition of a flow, subflow, or action — what the artifact *is*, not what a run of it did. Nothing is executed or modified, and no flow context is created or needed. This is the design-time counterpart to `nex flow details`, which reports on one past execution.

The type is never inferred from the sys_id: `--type` selects what is asked for, and a sys_id of a different type fails with `type_mismatch` rather than being relabelled.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--sys-id` | `-i` | string | yes | — | sys_id of the flow, subflow, or action |
| `--type` | `-t` | option | no | `flow` | `flow`, `subflow`, or `action` |
| `--scope` | | string | no | — | Scope sys_id or name for the transaction scope |
| `--json` | `-j` | boolean | no | `false` | Output the complete typed result as JSON |

With `--json`, stdout is exactly one JSON document — the typed result plus the untouched ServiceNow payload — so it pipes and redirects cleanly. Without it, a short summary is printed; definition bodies, step scripts and input values are never printed or logged.

```bash
nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --auth dev
nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --type subflow --auth dev
nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --type action --json --auth dev | jq '.summary.steps'
nex flow definition -i 887dda5583237210fdb8f7b6feaad32c --json --auth dev > flow.json
```

Failures are classified rather than described: `invalid_identifier`, `type_mismatch`, `not_found`, `permission_denied`, `api_error`, `malformed_response`, `request_failed`. Each exits non-zero.

#### `nex flow status`

Get the current status of a flow execution context. Use to poll background executions.

Possible states: `QUEUED`, `IN_PROGRESS`, `WAITING`, `COMPLETE`, `CANCELLED`, `ERROR`.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--context-id` | `-c` | string | yes | — | Flow context sys_id |
| `--scope` | | string | no | — | Scope context |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex flow status -c a1b2c3d4e5f60718293a4b5c6d7e8f90 --auth dev
```

#### `nex flow details`

Get **rich per-action execution details** for a flow context. This is the **primary diagnostic command** after `flow test` or `flow run` — use it to understand what each action did, identify which step failed, inspect inputs and outputs, and iterate on the flow definition.

Shows: flow metadata (name, state, runtime, who ran it), per-action results sorted by execution order (state, runtime, simplified inputs/outputs), flow-level outputs, and report availability notes.

> **Note**: Requires flow operations logging to be enabled on the instance.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--context-id` | `-c` | string | yes | — | Flow context sys_id from `flow test`, `flow run`, `flow subflow`, or `flow action` |
| `--scope` | | string | no | — | Scope sys_id for ProcessFlow API transaction scope |
| `--include-definition` | `-d` | boolean | no | `false` | Include full flow definition snapshot in response |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
# Get detailed execution breakdown
nex flow details -c a1b2c3d4e5f60718293a4b5c6d7e8f90 --auth dev

# Get JSON for programmatic analysis
nex flow details -c <ctx> --json --auth dev | jq '.flowReport.actionOperationsReports'
```

#### `nex flow logs`

Retrieve flow execution **log entries** from `sys_flow_log`. Shows error messages, step-level debug output, and cancellation reasons. Use alongside `flow details` to get the full picture of what happened during an execution.

Log levels: ERROR (-1), WARN (1), INFO (2), DEBUG (3).

> **Note**: Log entries may be empty for simple successful executions, or if the flow's reporting level is set to NONE. Errors and warnings are always logged regardless of the reporting level.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--context-id` | `-c` | string | yes | — | Flow context sys_id |
| `--limit` | `-l` | integer | no | `100` | Max log entries to return |
| `--order` | `-o` | option | no | `asc` | `asc` (oldest first) or `desc` (newest first) |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
# Get all logs (oldest first)
nex flow logs -c a1b2c3d4e5f60718293a4b5c6d7e8f90 --auth dev

# Get latest 10 entries for quick diagnosis
nex flow logs -c <ctx> --limit 10 --order desc --auth dev

# Filter errors from JSON output
nex flow logs -c <ctx> --json --auth dev | jq '.entries[] | select(.level == "-1")'
```

#### `nex flow outputs`

Retrieve outputs from a completed flow execution.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--context-id` | `-c` | string | yes | — | Flow context sys_id |
| `--scope` | | string | no | — | Scope context |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex flow outputs -c <ctx> --auth dev
```

#### `nex flow error`

Retrieve error details from a failed flow execution.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--context-id` | `-c` | string | yes | — | Flow context sys_id |
| `--scope` | | string | no | — | Scope context |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex flow error -c <ctx> --auth dev
```

#### `nex flow cancel`

Cancel a running or paused flow execution.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--context-id` | `-c` | string | yes | — | Flow context sys_id |
| `--reason` | `-r` | string | no | — | Cancellation reason |
| `--scope` | | string | no | — | Scope context |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex flow cancel -c <ctx> -r "Cancelling for testing" --auth dev
```

#### `nex flow message`

Send a message to a paused flow execution (e.g., to resume a flow waiting for user input).

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--context-id` | `-c` | string | yes | — | Flow context sys_id |
| `--message` | `-m` | string | yes | — | Message to send |
| `--payload` | `-p` | string | no | — | JSON payload to include |
| `--scope` | | string | no | — | Scope context |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex flow message -c <ctx> -m "approved" -p '{"notes":"Looks good"}' --auth dev
```

---

### Health

Run consolidated health checks and diagnostics on a ServiceNow instance.

#### `nex health check`

Checks instance version, cluster nodes, stuck jobs, semaphores, and operational record counts.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--include-version` | | boolean | no | `true` | Include version info (use `--no-include-version` to skip) |
| `--include-cluster` | | boolean | no | `true` | Include cluster node status |
| `--include-stuck-jobs` | | boolean | no | `true` | Include stuck job detection |
| `--include-semaphores` | | boolean | no | `true` | Include semaphore count |
| `--include-operational-counts` | | boolean | no | `true` | Include open incident/change/problem counts |
| `--stuck-job-threshold` | | integer | no | `30` | Minutes threshold for stuck job detection |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex health check --auth dev
nex health check --no-include-cluster --json --auth dev
```

---

### Log

Tail and monitor ServiceNow system logs in real-time. Continuously polls for new entries and displays them with formatting.

#### `nex log`

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--output` | `-o` | string | no | — | File path to save logs |
| `--interval` | `-i` | integer | no | `1000` | Polling interval in ms |
| `--no-color` | | boolean | no | `false` | Disable colored output |
| `--filter` | `-f` | string[] | no | — | Filter by field=value |

```bash
# Tail logs in real-time
nex log --auth dev

# Save to file with 2-second polling
nex log -o ./logs.txt -i 2000 --auth dev
```

---

### Query

Query ServiceNow tables, search applications, list columns, and read syslog.

#### `nex query`

Query any ServiceNow table using the Table API. Supports encoded queries, field selection, and display value resolution.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name (e.g., `incident`, `sys_user`) |
| `--query` | `-q` | string | no | `''` | Encoded query string (e.g., `"active=true^priority=1"`) |
| `--fields` | `-f` | string | no | all | Comma-separated field names to return |
| `--display-value` | `-d` | boolean | no | `false` | Return display values instead of internal values |
| `--limit` | `-l` | integer | no | `20` | Max records to return |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex query -t incident -q "active=true^priority=1" -f "sys_id,number,short_description" -l 10 --auth dev
nex query -t sys_user -q "user_name=admin" --display-value --auth dev
```

#### `nex query app`

Search for applications by name across scoped apps and plugins.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--search` | `-s` | string | yes | — | Application name search term |
| `--active` | `-a` | boolean | no | `false` | Only show active applications |
| `--limit` | `-l` | integer | no | `20` | Max results |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex query app -s "vulnerability" --active --auth dev
```

#### `nex query columns`

List and search columns (fields) on a ServiceNow table.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name |
| `--search` | `-s` | string | no | — | Filter columns by name or label |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex query columns -t incident --auth dev
nex query columns -t incident -s "caller" --auth dev
```

#### `nex query syslog`

Query system logs (one-shot, non-tailing). For real-time tailing, use `nex log`.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--query` | `-q` | string | no | — | Encoded query for filtering |
| `--limit` | `-l` | integer | no | `100` | Max records |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex query syslog -q "level=error" -l 20 --auth dev
```

---

### Schema

Discover and inspect ServiceNow table schemas and field definitions.

#### `nex schema`

Discover a table's full schema including fields, types, references, and optionally choices, relationships, UI policies, and business rules.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name to discover |
| `--include-choices` | | boolean | no | `false` | Include choice values for fields |
| `--include-relationships` | | boolean | no | `false` | Include table relationships |
| `--include-ui-policies` | | boolean | no | `false` | Include UI policies |
| `--include-business-rules` | | boolean | no | `false` | Include business rules |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex schema -t incident --include-choices --include-relationships --auth dev
```

#### `nex schema field`

Get detailed info about a specific field: type, constraints, help text, choice values.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name |
| `--field` | `-f` | string | yes | — | Field element name |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex schema field -t incident -f state --auth dev
```

#### `nex schema validate-catalog`

Validate a catalog item for common configuration issues (duplicate variables, inactive mandatory fields, UI policy conflicts).

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--sys-id` | `-s` | string | yes | — | Catalog item sys_id |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex schema validate-catalog -s abc123def456789 --auth dev
```

---

### Scope

Manage ServiceNow application scopes.

#### `nex scope`

Get the current application scope or list available applications.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--list` | `-l` | boolean | no | `false` | List all available applications |

```bash
nex scope --auth dev         # Get current scope
nex scope --list --auth dev  # List all scoped apps
```

#### `nex scope set`

Set the current application scope. All subsequent operations run in this scope.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--app-id` | `-a` | string | yes | — | 32-char sys_id of the application |

```bash
nex scope set -a abc123def456789012345678abcdef01 --auth dev
```

---

### Script-Sync

Synchronize scripts between local files and ServiceNow instances.

Supported script types: `sys_script_include`, `sys_script`, `sys_ui_script`, `sys_ui_action`, `sys_script_client`

#### `nex script-sync pull`

Pull a script from instance to a local file.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--name` | `-n` | string | yes | — | Script record name |
| `--type` | `-t` | option | yes | — | Script type (see supported types above) |
| `--output` | `-o` | string | no | auto | Output file path |

```bash
nex script-sync pull -n IncidentUtils -t sys_script_include -o ./scripts/IncidentUtils.js --auth dev
```

#### `nex script-sync push`

Push a local script file to the instance. The record must already exist.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--name` | `-n` | string | yes | — | Script record name |
| `--type` | `-t` | option | yes | — | Script type |
| `--file` | `-f` | string | yes | — | Local file path |

```bash
nex script-sync push -n IncidentUtils -t sys_script_include -f ./scripts/IncidentUtils.js --auth dev
```

#### `nex script-sync sync`

Synchronize all scripts in a directory with the instance.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--directory` | `-d` | string | yes | — | Directory containing script files |
| `--types` | `-t` | string[] | no | all | Script types to synchronize |

```bash
nex script-sync sync -d ./scripts --auth dev
```

---

### Search

Search platform code across ServiceNow instances using the Code Search API.

#### `nex search`

Search for code patterns across script fields on the instance.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--term` | `-t` | string | yes | — | Search term |
| `--limit` | `-l` | integer | no | — | Max results |
| `--scope` | `-s` | string | no | — | Application scope to search within |
| `--search-group` | `-g` | string | no | — | Search group to use |
| `--table` | | string | no | — | Specific table (requires `--search-group`) |

```bash
nex search -t "GlideRecord" --auth dev
nex search -t "addQuery" -g "Default Code Search Group" --table sys_script_include --auth dev
```

#### `nex search groups`

List all code search groups on the instance.

```bash
nex search groups --auth dev
```

#### `nex search tables`

List tables configured for a specific search group.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--search-group` | `-g` | string | yes | — | Search group name |

```bash
nex search tables -g "Default Code Search Group" --auth dev
```

#### `nex search add-table`

Add a table to a code search group.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name to add |
| `--search-fields` | `-f` | string | yes | — | Comma-separated fields to index |
| `--search-group` | `-g` | string | yes | — | Search group sys_id |

```bash
nex search add-table -t sys_ui_action -f "script,condition" -g <group-sys-id> --auth dev
```

---

### Store

Search, install, and update applications from the ServiceNow Store.

#### `nex store search`

Search or browse store applications.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--term` | `-t` | string | no | — | Search keyword |
| `--tab` | | option | no | `available_for_you` | `available_for_you`, `installed`, or `updates` |
| `--limit` | | integer | no | `20` | Max results |

```bash
nex store search -t "vulnerability" --auth dev
nex store search --tab updates --auth dev
```

#### `nex store install`

Install a store application. Long-running operation.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--app-id` | `-a` | string | yes | — | Store app sys_id |
| `--version` | `-v` | string | yes | — | Version to install |
| `--demo-data` | | boolean | no | `false` | Load demo data |
| `--no-wait` | | boolean | no | `false` | Don't wait for completion |
| `--poll-interval` | | integer | no | `5000` | Polling interval in ms |
| `--timeout` | | integer | no | `1800000` | Timeout in ms |

```bash
nex store install -a abc123 -v 4.2.0 --auth dev
```

#### `nex store update`

Update an installed store application to a new version.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--app-id` | `-a` | string | yes | — | Store app sys_id |
| `--version` | `-v` | string | yes | — | Target version |
| `--no-wait` | | boolean | no | `false` | Don't wait for completion |
| `--poll-interval` | | integer | no | `5000` | Polling interval in ms |
| `--timeout` | | integer | no | `1800000` | Timeout in ms |

```bash
nex store update -a abc123 -v 16.0.0 --auth dev
```

#### `nex store validate`

Validate a batch installation definition file.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--file` | `-f` | string | yes | — | Path to batch definition JSON file |

```bash
nex store validate -f ./apps-to-install.json --auth dev
```

---

### Task

Perform operations on ServiceNow tasks, incidents, and change requests.

#### `nex task find`

Find a task record by its number (e.g., `INC0010001`, `CHG0030002`). Returns the full record.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--number` | `-n` | string | yes | — | Task number |
| `--table` | | string | no | `task` | Table name |

```bash
nex task find -n INC0010042 --auth dev
nex task find -n CHG0030002 --table change_request --auth dev
```

#### `nex task assign`

Assign a task to a user and optionally an assignment group.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--number` | `-n` | string | yes | — | Task number |
| `--user` | `-u` | string | yes | — | User to assign to |
| `--group` | `-g` | string | no | — | Assignment group |
| `--table` | | string | no | `task` | Table name |

```bash
nex task assign -n INC0010042 -u admin -g "Network Team" --auth dev
```

#### `nex task comment`

Add a comment or work note to a task.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--number` | `-n` | string | yes | — | Task number |
| `--comment` | `-c` | string | yes | — | Comment text |
| `--table` | | string | no | `task` | Table name |
| `--work-note` | | boolean | no | `false` | Add as internal work note instead of comment |

```bash
nex task comment -n INC0010042 -c "Investigating the issue" --auth dev
nex task comment -n INC0010042 -c "Internal note" --work-note --auth dev
```

#### `nex task resolve`

Resolve an incident with resolution notes.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--number` | `-n` | string | yes | — | Incident number |
| `--notes` | | string | yes | — | Resolution notes |
| `--close-code` | | string | no | — | Close code (e.g., `"Solved (Permanently)"`) |

```bash
nex task resolve -n INC0010042 --notes "Restarted application server. Service restored." --auth dev
```

#### `nex task close`

Close an incident (should typically be in Resolved state first).

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--number` | `-n` | string | yes | — | Incident number |
| `--notes` | | string | yes | — | Close notes |
| `--close-code` | | string | no | — | Close code |

```bash
nex task close -n INC0010042 --notes "Confirmed resolution with caller." --auth dev
```

#### `nex task approve`

Approve a change request.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--number` | `-n` | string | yes | — | Change request number |
| `--comments` | `-c` | string | no | — | Approval comments |

```bash
nex task approve -n CHG0030002 -c "Reviewed and approved. Low risk." --auth dev
```

---

### Transaction

Discover active transactions across every responding cluster node and submit a kill request for one deliberately selected transaction.

> **Warning**: `nex transaction kill` aborts real work belonging to a real user. Only pass an identifier that came from a `nex transaction list` you just ran for this task, and only with explicit human intent. Never guess an identifier.

#### `nex transaction list`

One-shot collection from all responding nodes. Read-only, so it runs unchanged under `--read-only` / `--deny-write`.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--limit` | `-l` | integer | no | `1000` | Max transactions to return |
| `--query` | `-q` | string | no | — | Encoded query to filter transactions |
| `--poll-interval-ms` | | integer | no | `1000` | Interval between collection status polls |
| `--timeout-ms` | | integer | no | `60000` | Collection timeout in ms |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

Defaults come from core: omit a flag and core's own default applies.

```bash
nex transaction list --auth dev

# Complete, untruncated records for programmatic selection
nex transaction list --json --auth dev | jq '.transactions[] | select(.user == "admin")'
```

#### `nex transaction kill`

Submits a kill request for exactly one transaction. **Acceptance is not removal** — the platform clears the transaction asynchronously, so verify with a separate later list.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--transaction-id` | `-t` | string | yes | — | Exact 32-character hex sys_id from `nex transaction list` |
| `--confirm` | | boolean | no | `false` | Required. Without it the command refuses and makes no request |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
# Refuses without --confirm; makes no request
nex transaction kill -t 8f9a1234567890abcdef1234567890c1 --auth dev

# Submit the request for one deliberately selected transaction
nex transaction kill -t 8f9a1234567890abcdef1234567890c1 --confirm --auth dev

# Verify separately — acceptance does not mean it has cleared yet
nex transaction list --json --auth dev | jq '.transactions[].sys_id'
```

---

### Update-Set

Manage ServiceNow update sets for change tracking and deployment.

#### `nex update-set`

List update sets on the instance.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--query` | `-q` | string | no | — | Encoded query filter |
| `--limit` | | integer | no | `20` | Max results |

```bash
nex update-set -q "state=in progress" --auth dev
```

#### `nex update-set create`

Create a new update set.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--name` | `-n` | string | yes | — | Update set name |
| `--description` | `-d` | string | no | — | Description |
| `--application` | | string | no | — | Application scope sys_id |

```bash
nex update-set create -n "FEAT-1234 New Catalog Item" -d "Changes for new hardware catalog" --auth dev
```

#### `nex update-set current`

Get or set the current update set.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--set` | `-s` | string | no | — | sys_id of update set to make current |

```bash
nex update-set current --auth dev           # Get current
nex update-set current -s <sys-id> --auth dev  # Set current
```

#### `nex update-set inspect`

Inspect components (records) in an update set, grouped by type.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--sys-id` | `-s` | string | yes | — | Update set sys_id |

```bash
nex update-set inspect -s abc123def456789 --auth dev
```

#### `nex update-set clone`

Clone an update set and its records.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--source` | `-s` | string | yes | — | Source update set sys_id |
| `--name` | `-n` | string | yes | — | Name for the clone |

```bash
nex update-set clone -s abc123 -n "My Feature v2 - Copy" --auth dev
```

#### `nex update-set move`

Move records between update sets.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--target` | | string | yes | — | Target update set sys_id |
| `--source` | | string | no | — | Source update set sys_id |
| `--records` | | string | no | — | Comma-separated record sys_ids to move |

```bash
nex update-set move --target <target-id> --source <source-id> --auth dev
```

---

### Workflow

Create and manage ServiceNow workflows.

#### `nex workflow create`

Create a complete workflow from a JSON specification file including activities and transitions.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--spec` | `-s` | string | yes | — | Path to workflow JSON spec file |

```bash
nex workflow create -s ./workflow-spec.json --auth dev
```

#### `nex workflow publish`

Publish a workflow version.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--version-id` | `-v` | string | yes | — | Workflow version sys_id |
| `--start-activity` | `-s` | string | yes | — | Start activity sys_id |

```bash
nex workflow publish -v <version-id> -s <start-activity-id> --auth dev
```

---

### XML

Export and import ServiceNow records as XML.

#### `nex xml export`

Export a single record as XML.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--table` | `-t` | string | yes | — | Table name |
| `--sys-id` | `-s` | string | yes | — | Record sys_id |
| `--output` | `-o` | string | no | stdout | File path for output |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex xml export -t sys_script_include -s abc123 -o ./export.xml --auth dev
```

#### `nex xml import`

Import XML records into an instance.

| Flag | Short | Type | Required | Default | Description |
|------|-------|------|----------|---------|-------------|
| `--file` | `-f` | string | yes | — | Path to XML file |
| `--table` | `-t` | string | yes | — | Target table |
| `--json` | `-j` | boolean | no | `false` | Output as JSON |

```bash
nex xml import -f ./records.xml -t sys_script_include --auth dev
```

---

## Workflow Guides

### 1. Flow Development Lifecycle

The complete develop-test-diagnose-iterate cycle:

```bash
# Step 1: Copy an existing flow to customize
nex flow copy -s global.change__standard -n "My Custom Flow" -t <scope-id> --auth dev
# Returns: newFlowSysId

# Step 2: Pull the flow source locally
now-sdk transform --flow <new-flow-sys-id>

# Step 3: Modify the pulled source in your project

# Step 4: Push changes back to the instance

# Step 5: Test the flow (doesn't require publishing)
nex flow test -f <flow-id> -o '{"record":"INC001"}' --auth dev
# Returns: contextId

# Step 6: Inspect what each action did
nex flow details -c <context-id> --auth dev

# Step 7: Check execution logs for errors/debug info
nex flow logs -c <context-id> --auth dev

# Step 8: If issues found, go back to Step 3 and iterate

# Step 9: Publish when ready for production
```

### 2. Flow Diagnostics Decision Tree

After executing a flow (`flow test`, `flow run`, `flow subflow`, or `flow action`), use this guide to diagnose:

| I need to know... | Command | What it shows |
|-------------------|---------|---------------|
| Did it succeed or fail? | `nex flow status -c <ctx>` | Quick state: COMPLETE, ERROR, IN_PROGRESS, etc. |
| What did each action do? | `nex flow details -c <ctx>` | Per-action breakdown: inputs, outputs, timing, state |
| Why did it fail? | `nex flow details -c <ctx>` then `nex flow logs -c <ctx>` | Details: which action failed. Logs: error messages |
| What were the outputs? | `nex flow outputs -c <ctx>` | Just the flow-level output values |
| What error message? | `nex flow error -c <ctx>` | Quick error lookup |
| Step-by-step debug trail | `nex flow logs -c <ctx> --order asc` | Chronological log entries |
| Most recent error only | `nex flow logs -c <ctx> --limit 5 --order desc` | Latest entries first |
| Full diagnostics (JSON) | `nex flow details -c <ctx> --json` | Complete structured data for analysis |

**Typical diagnostic sequence:**
```bash
# 1. Quick check
nex flow status -c <ctx> --auth dev
# If ERROR:
nex flow details -c <ctx> --auth dev   # See which action failed
nex flow logs -c <ctx> --auth dev      # See error details
# If COMPLETE:
nex flow details -c <ctx> --auth dev   # Verify all actions succeeded
nex flow outputs -c <ctx> --auth dev   # Check output values
```

### 3. Query & Investigate

Explore a table's structure and data:

```bash
# Step 1: Discover table schema
nex schema -t incident --include-choices --auth dev

# Step 2: Find specific columns
nex query columns -t incident -s "caller" --auth dev

# Step 3: Query records
nex query -t incident -q "active=true^priority=1" -f "number,short_description,state" -l 10 --auth dev

# Step 4: Count records matching criteria
nex aggregate count -t incident -q "active=true^priority=1" --auth dev

# Step 5: Group by field for breakdown
nex aggregate group -t incident -g priority --count -q "active=true" --auth dev
```

### 4. Testing

#### ATF Tests
```bash
# Run a single test by sys_id
nex atf -t <test-sys-id> --auth dev

# Run a test suite by name
nex atf -n "Incident Management Tests" --auth dev

# Run a test suite with JSON output for CI/CD
nex atf -s <suite-sys-id> --json --auth dev
```

#### Flow Testing
```bash
# Test → diagnose → iterate loop
nex flow test -f <flow-id> -o '{"record":"INC001"}' --auth dev
nex flow details -c <ctx> --auth dev
nex flow logs -c <ctx> --auth dev
```

### 5. Deployment

#### Update Sets
```bash
# Create a new update set for your changes
nex update-set create -n "FEAT-1234 My Feature" --auth dev

# Set it as current (all changes captured here)
nex update-set current -s <new-us-id> --auth dev

# Make changes...

# Inspect what's in the update set
nex update-set inspect -s <us-id> --auth dev

# Clone for backup before deploying
nex update-set clone -s <us-id> -n "FEAT-1234 Backup" --auth dev
```

#### Store Apps
```bash
# Search for available apps
nex store search -t "vulnerability" --auth dev

# Check for updates
nex store search --tab updates --auth dev

# Install an app
nex store install -a <app-id> -v 4.2.0 --auth dev

# Update an installed app
nex store update -a <app-id> -v 16.0.0 --auth dev
```

#### Company App Repository
```bash
# List available company apps
nex app repo-list --auth dev

# Install from company repo
nex app repo-install -s x_acme_my_app -v 1.2.0 --auth dev
```

### 6. Script Development

```bash
# Step 1: Pull a script from the instance
nex script-sync pull -n IncidentUtils -t sys_script_include -o ./scripts/IncidentUtils.js --auth dev

# Step 2: Edit locally with your IDE

# Step 3: Push back to instance
nex script-sync push -n IncidentUtils -t sys_script_include -f ./scripts/IncidentUtils.js --auth dev

# Step 4: Test with exec
nex exec global ./test-script.js --auth dev

# Or use REPL for quick testing
nex exec global --auth dev
```

### 7. Diagnostics

```bash
# Full health check
nex health check --auth dev

# Tail logs in real-time
nex log --auth dev

# Query syslog for recent errors
nex query syslog -q "level=error" -l 20 --auth dev

# Search code for patterns
nex search -t "getRowCount" --auth dev
```

### 8. Task Management

```bash
# Find a task
nex task find -n INC0010042 --auth dev

# Assign it
nex task assign -n INC0010042 -u admin -g "Network Team" --auth dev

# Add a comment
nex task comment -n INC0010042 -c "Investigating the reported issue" --auth dev

# Add a work note (internal only)
nex task comment -n INC0010042 -c "Root cause: DNS misconfiguration" --work-note --auth dev

# Resolve
nex task resolve -n INC0010042 --notes "Fixed DNS configuration. Service restored." --auth dev

# Close
nex task close -n INC0010042 --notes "Confirmed with caller. No recurrence." --auth dev

# Approve a change
nex task approve -n CHG0030002 -c "Reviewed and approved." --auth dev
```

---

## Decision Guide

### "I want to..."

| Goal | Command | Key Flags |
|------|---------|-----------|
| Query any table | `nex query -t <table>` | `-q` query, `-f` fields, `-l` limit, `--display-value` |
| Count records | `nex aggregate count -t <table>` | `-q` to filter |
| Get statistics (AVG, SUM, etc.) | `nex aggregate query -t <table>` | `--avg`, `--sum`, `--min`, `--max`, `--count` |
| Group records by field | `nex aggregate group -t <table> -g <field>` | `--count`, `--having` |
| Discover table structure | `nex schema -t <table>` | `--include-choices`, `--include-relationships` |
| Explain a field | `nex schema field -t <table> -f <field>` | |
| Find an application | `nex query app -s <name>` | `--active` |
| Run a script | `nex exec <scope> <file>` | `-p` for params |
| Start a REPL | `nex exec <scope>` | (no file arg) |
| Test a flow (draft) | `nex flow test -f <id> -o '{...}'` | `--scope`, `--json` |
| Run a published flow | `nex flow run -n <name>` | `-i` inputs, `-m` mode |
| Check flow result | `nex flow details -c <ctx>` | `--json` for programmatic parsing |
| See flow errors | `nex flow error -c <ctx>` or `nex flow logs -c <ctx>` | `--limit`, `--order` |
| Copy a flow | `nex flow copy -s <src> -n <name> -t <scope>` | |
| Run ATF tests | `nex atf -t <test-id>` or `-n <suite-name>` | `--json` for CI/CD |
| Search code | `nex search -t <term>` | `-s` scope, `-g` group |
| Install a store app | `nex store install -a <id> -v <ver>` | `--demo-data` |
| Install from company repo | `nex app repo-install -s <scope>` | `-v` version |
| Bulk update safely | `nex bulk update -t <tbl> -q <q> -d '{...}'` | `--confirm` to execute |
| Bulk delete safely | `nex bulk delete -t <tbl> -q <q>` | `--confirm` to execute |
| Create update set | `nex update-set create -n <name>` | `-d` description |
| Export a record | `nex xml export -t <tbl> -s <id>` | `-o` file output |
| Pull a script | `nex script-sync pull -n <name> -t <type>` | `-o` output path |
| Push a script | `nex script-sync push -n <name> -t <type> -f <file>` | |
| Check instance health | `nex health check` | `--json` |
| See active cluster transactions | `nex transaction list` | `-q` query, `-l` limit, `--timeout-ms`, `--json` |
| Kill one selected transaction | `nex transaction kill -t <sys-id>` | `--confirm` required; verify with a later list |
| Tail live logs | `nex log` | `-f` filter, `-i` interval |
| Add a task comment | `nex task comment -n <number> -c <text>` | `--work-note` |
| Resolve an incident | `nex task resolve -n <number> --notes <text>` | `--close-code` |
| Approve a change | `nex task approve -n <number>` | `-c` comments |

---

## CLI-Specific Patterns

### Shell Quoting for JSON Arguments

```bash
# Single quotes around JSON values
nex flow test -f <id> -o '{"record":"INC001"}' --auth dev

# Escaped inner quotes if needed
nex bulk update -t incident -q "active=true" -d '{"short_description":"Updated via CLI"}' --auth dev

# For complex JSON inputs, write to a temp file first
echo '[{"table":"incident","data":{"short_description":"Test","priority":"3"}}]' > /tmp/batch.json
nex batch create -f /tmp/batch.json --auth dev
```

### Chaining Commands with JSON Output

```bash
# Get a context ID from flow test and use it with flow details
CTX=$(nex flow test -f <id> -o '{}' --json --auth dev | jq -r '.contextId')
nex flow details -c "$CTX" --auth dev

# Count then query if count is small
COUNT=$(nex aggregate count -t incident -q "priority=1" --json --auth dev | jq -r '.count')
echo "Found $COUNT P1 incidents"
nex query -t incident -q "priority=1" -l "$COUNT" --auth dev
```

### Dry-Run Safety Pattern

Bulk operations (`bulk update`, `bulk delete`) are **dry-run by default**:

```bash
# Step 1: Preview (dry run — no changes made)
nex bulk update -t incident -q "active=true^priority=5" -d '{"priority":"4"}' --auth dev
# Output: "Records that would be updated: 23"

# Step 2: Execute (only if preview looks correct)
nex bulk update -t incident -q "active=true^priority=5" -d '{"priority":"4"}' --confirm --auth dev
```

### Polling Flags for Long-Running Operations

Some commands (`store install`, `store update`, `app repo-install`, `atf`) are long-running:

```bash
# Wait for completion (default)
nex store install -a <id> -v 4.2.0 --auth dev

# Custom polling and timeout
nex store install -a <id> -v 4.2.0 --poll-interval 10000 --timeout 3600000 --auth dev

# Don't wait (fire and forget)
nex store install -a <id> -v 4.2.0 --no-wait --auth dev
```

### Common Errors and Resolution

| Error | Cause | Resolution |
|-------|-------|------------|
| `Missing required flag: --auth` | No auth alias provided | Add `--auth <alias>` to the command |
| `Auth alias "xxx" not found` | Alias not configured | Run `now-sdk auth add --alias xxx --host https://...` |
| `Invalid context ID format` | Context ID not 32-char hex | Use the full 32-character sys_id from the execution result |
| `ECONNREFUSED` | Instance unreachable | Check instance URL and network connectivity |
| `401 Unauthorized` | Invalid credentials | Reconfigure auth: `now-sdk auth add --alias <alias>` |
| `ACL restriction` | Insufficient permissions | Ensure the authenticated user has required roles |

### REPL Mode

`nex exec <scope>` without a file argument starts an interactive REPL:

```bash
nex exec global --auth dev
# > gs.print(gs.now())
# 2026-03-10 12:00:00
# > var ga = new GlideAggregate('incident'); ga.addAggregate('COUNT'); ga.query(); ga.next(); gs.print(ga.getAggregate('COUNT'));
# 156
```
