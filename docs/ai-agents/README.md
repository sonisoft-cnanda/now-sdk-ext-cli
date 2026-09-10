# AI Agent Guidance Files for NEX CLI

This directory contains guidance files that enable AI coding assistants to use the `nex` CLI for ServiceNow platform automation. These files bridge the gap between MCP server tool descriptions and CLI-driven workflows, allowing agents to operate with the same effectiveness as if they had MCP access.

## What's Included

| File | Purpose | Target |
|------|---------|--------|
| `CLAUDE.md` | Comprehensive command reference, workflows, and decision guides | Claude Code, general-purpose |
| `.cursorrules` | Condensed rule-based guidance optimized for Cursor's context window | Cursor IDE |

## Installation

### Claude Code

**Option A: Project-level (recommended)**

Copy `CLAUDE.md` to your project root. Claude Code automatically loads it at conversation start:

```bash
cp docs/ai-agents/CLAUDE.md /path/to/your/servicenow-project/CLAUDE.md
```

**Option B: Global include**

Add the file path to your Claude Code settings so it applies across all projects:

```bash
# In ~/.claude/settings.json, add to the "includeFiles" array:
{
  "includeFiles": [
    "/path/to/nex-cli/docs/ai-agents/CLAUDE.md"
  ]
}
```

### Cursor

Copy `.cursorrules` to your project root. Cursor loads it automatically:

```bash
cp docs/ai-agents/.cursorrules /path/to/your/servicenow-project/.cursorrules
```

### Windsurf

Copy `CLAUDE.md` and rename it to `.windsurfrules`:

```bash
cp docs/ai-agents/CLAUDE.md /path/to/your/servicenow-project/.windsurfrules
```

### Other AI Agents

The `CLAUDE.md` content can be used as a system prompt or context file for any AI agent. It is plain markdown and not specific to any particular tool.

## Prerequisites

Before your agent can use `nex` commands, ensure:

1. **`nex` CLI is installed and on PATH**
   ```bash
   npm install -g @sonisoft/now-sdk-ext-cli
   ```

2. **Auth aliases are configured** for your ServiceNow instances
   ```bash
   now-sdk auth --add dev12345.service-now.com --alias dev --type oauth
   now-sdk auth --add prod12345.service-now.com --alias prod --type oauth
   ```

3. **Node.js 26+** is available in the environment

4. **For headless agents**, `@sonisoft/sn-credstore` is installed and the
   credentials imported — otherwise the agent cannot read them at all
   ```bash
   npm install -g @sonisoft/sn-credstore

   # Run this from a desktop session on a TTY; the keyring will prompt to unlock.
   sn-credstore import --from keyring
   ```

   Then either add `--cred-store` to each command, or set it once:
   ```bash
   export SN_CRED_STORE_ENABLE=1
   ```

   This matters because the failure without it is silent and misleading. The OS
   keyring cannot be unlocked from a non-interactive session even as the same
   user, and the SDK reports it as `Could not find stored credentials for alias:
   dev` — which looks like a missing alias, so the obvious fix does not help.
   `nex auth doctor` tells the two apart.

## Table behavior and ATF planning

With nex 5.5.0+, inspect table behavior before building or debugging a process:

```bash
nex behavior --table change_request --auth dev --read-only --json
nex behavior --table change_request --category business_rules --category flows \
  --details scripts --details definitions --details dependencies \
  --dependency-depth 1 --max-bytes 262144 --auth dev --read-only --json
```

Use schema discovery for fields and choice values. Behavior discovery adds business rules, UI actions, client scripts, UI/data policies, workflows, record-triggered flows and generic state models. Retrieve known references with `nex behavior details` instead of repeating inventory scans.

For Change Management ATFs, inspect required fields, transition conditions, approvals and dependent artifacts. Preserve source IDs and runtime/design provenance. Follow category cursors; check warnings, `omittedDetails` and `remainingReferences` before treating results as complete. Conditions are configuration, not evaluated predictions; distinguish browser behavior from server enforcement and verify actual execution separately.

See [README examples and flags](../../README.md#table-behavior-discovery) and the [behavior guide](../table-behavior.md).

## Transaction safety

`nex transaction kill` changes a live ServiceNow instance and aborts real work. Never pass an identifier that did not come from a `nex transaction list` invocation you just ran for this exact task, and always require explicit human intent before adding `--confirm`. Platform acceptance is asynchronous; use a separate later list to verify that the transaction cleared.

## Customization

### Adding Instance-Specific Aliases

Add a section to the guidance file listing your configured aliases:

```markdown
## My Instances
- `dev` — Development (dev12345.service-now.com)
- `test` — Testing (test12345.service-now.com)
- `prod` — Production (prod12345.service-now.com)

Always use `--auth dev` for development work unless told otherwise.
```

### Restricting to Specific Commands

If your team only uses certain topics, you can trim the guidance file to only include relevant sections. The file is structured by topic, making it easy to remove unused sections.

### Adding Project-Specific Workflows

Append custom workflow guides specific to your project:

```markdown
## Project Workflows

### Deploy Feature Branch
1. `nex update-set create -n "FEAT-XXXX Description" --auth dev`
2. Make changes...
3. `nex update-set inspect -s <id> --auth dev`
4. `nex update-set clone -s <id> -n "FEAT-XXXX Backup" --auth dev`
```

### Keeping Updated

When the CLI gains commands, review the current guidance in this repository and merge it into your project's existing instructions. Guidance files are not included in the npm package. From an updated repository checkout, copy them when creating a new project:

```bash
cp docs/ai-agents/CLAUDE.md /path/to/new-project/CLAUDE.md
```

## How It Works

Without these guidance files, an AI agent has to:
1. Discover that `nex` exists
2. Run `nex --help` and parse the output
3. Run `nex <command> --help` for each command
4. Figure out workflows from trial and error

With these files, the agent immediately knows:
- Every available command with flags and examples
- When to use each command (decision guides)
- How to chain commands for multi-step workflows
- Safety patterns (dry-run for bulk ops, auth requirements)
- CLI-specific patterns (shell quoting, JSON output piping)

The result is an agent that can operate the CLI almost as effectively as one using the MCP server directly.
