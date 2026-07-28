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
   now-sdk auth add --alias dev --host https://dev12345.service-now.com
   now-sdk auth add --alias prod --host https://prod12345.service-now.com
   ```

3. **Node.js 22+** is available in the environment

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

When the `nex` CLI is upgraded with new commands, re-copy the guidance files from the latest package:

```bash
# After upgrading nex
npm update -g @sonisoft/now-sdk-ext-cli

# Re-copy guidance files
cp node_modules/@sonisoft/now-sdk-ext-cli/docs/ai-agents/CLAUDE.md ./CLAUDE.md
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
