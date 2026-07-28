# Shell Autocomplete Setup

## Overview

The `nex` CLI now supports intelligent shell autocomplete for command arguments. The most powerful feature is **dynamic scope autocomplete** for the `exec` command, which queries your ServiceNow instance to suggest available application scopes.

## Features

- Command autocomplete for all `nex` commands
- Flag autocomplete with descriptions
- **Dynamic scope autocomplete** - queries ServiceNow for actual scopes
- Caching for fast autocomplete responses
- Works with bash, zsh, and fish shells

## Installation

### Step 1: Enable Autocomplete

Run the autocomplete setup command:

```bash
nex autocomplete
```

This will display shell-specific instructions. Follow them carefully.

### Step 2: Shell-Specific Setup

#### Bash

```bash
nex autocomplete bash
```

Follow the instructions to add the autocomplete script to your `.bashrc` or `.bash_profile`.

#### Zsh

```bash
nex autocomplete zsh
```

Follow the instructions to add the autocomplete script to your `.zshrc`.

#### Fish

```bash
nex autocomplete fish
```

Follow the instructions to add the autocomplete script to your fish configuration.

### Step 3: Reload Your Shell

After adding the autocomplete configuration, reload your shell:

```bash
# Bash
source ~/.bashrc

# Zsh
source ~/.zshrc

# Fish
source ~/.config/fish/config.fish
```

Or simply open a new terminal window.

## Using Autocomplete

### Basic Command Autocomplete

Press `Tab` after typing `nex` to see available commands:

```bash
$ nex [TAB]
app:install       app:repo-install  app:repo-list     app:uninstall
atf              exec              help
```

### Flag Autocomplete

Press `Tab` after `--` to see available flags:

```bash
$ nex exec --[TAB]
--auth         --help         --json         --log-level
```

### Dynamic Scope Autocomplete

This is the most powerful feature! When using `nex exec`, the CLI will query your ServiceNow instance for available scopes:

```bash
# First, specify your auth alias
$ nex exec --auth my-instance [TAB]
global                    x_acme_custom_app      x_acme_app
x_my_app                  x_another_scope        rhino

# You can also start typing to filter
$ nex exec --auth my-instance x_tan[TAB]
x_acme_custom      x_acme_app
```

## How Dynamic Scope Autocomplete Works

1. **Parsing**: When you press Tab, the CLI parses your command to extract the `--auth` flag
2. **Querying**: It queries the `sys_scope` table on your ServiceNow instance via REST API
3. **Caching**: Results are cached for 5 minutes to speed up subsequent autocomplete requests
4. **Filtering**: Results are filtered based on what you've typed so far
5. **Display**: Matching scopes are displayed as autocomplete suggestions

### Query Details

The autocomplete feature queries ServiceNow with:
- **Table**: `sys_scope`
- **Fields**: `scope`, `name`
- **Query**: Matches scope names starting with your input
- **Limit**: 50 results
- **Cache**: 5 minute TTL

### Authentication

The autocomplete feature supports both authentication types:
- **Basic Auth**: Uses username/password
- **OAuth**: Uses access token

It automatically detects which auth type is configured for the specified alias.

## Performance

### First Request
The first time you press Tab for a given instance, there will be a ~1-2 second delay while the CLI queries ServiceNow.

### Subsequent Requests
Results are cached for 5 minutes, so subsequent Tab presses are instant.

### Cache Management
The cache is stored in memory and clears when:
- The cache entry is older than 5 minutes
- You restart your terminal session
- The CLI process exits

## Troubleshooting

### Autocomplete Not Working

**Problem**: Tab completion doesn't work

**Solution**:
1. Verify autocomplete is installed:
   ```bash
   nex autocomplete --refresh-cache
   ```

2. Check that the autocomplete script is loaded in your shell config:
   ```bash
   # Bash
   grep "nex" ~/.bashrc
   
   # Zsh  
   grep "nex" ~/.zshrc
   ```

3. Reload your shell:
   ```bash
   source ~/.bashrc  # or ~/.zshrc
   ```

### No Scopes Appearing

**Problem**: Scope autocomplete shows only "global"

**Solutions**:

1. **Verify authentication**:
   ```bash
   now-sdk auth --list
   ```
   Make sure your auth alias exists.

2. **Check permissions**:
   Your ServiceNow user needs read access to the `sys_scope` table.

3. **Test connection manually**:
   ```bash
   nex exec global --auth my-instance
   ```
   If this works, autocomplete should work too.

4. **Check for errors**:
   The autocomplete feature fails silently. To see errors, run:
   ```bash
   nex exec global --auth my-instance --log-level debug
   ```

### Slow Autocomplete

**Problem**: Tab completion is slow (>2 seconds)

**Solutions**:

1. **Check network latency** to your ServiceNow instance
2. **Verify instance performance**
3. **The cache might have expired** - first request after cache expiry will be slow

### Wrong Scopes Showing

**Problem**: Autocomplete shows scopes from the wrong instance

**Solution**:
Make sure you're specifying the correct `--auth` alias:
```bash
nex exec --auth correct-instance [TAB]
```

The autocomplete uses whichever auth alias you specify in the command.

## Examples

### Example 1: Quick Script Execution

```bash
# Start typing the command
$ nex exec --auth dev x_my[TAB]

# Autocomplete suggests matching scopes
x_my_app    x_my_custom    x_my_integration

# Select and continue
$ nex exec --auth dev x_my_app [TAB]

# Now you can type your script file or press Enter for REPL
```

### Example 2: Finding Application Scopes

```bash
# You can't remember the exact scope name for a Acme app
$ nex exec --auth prod x_tan[TAB]

# Autocomplete shows all Acme scopes
x_acme_custom      x_acme_app      x_acme_integration

# Select the one you need
$ nex exec --auth prod x_acme_app
```

### Example 3: Exploring Available Scopes

```bash
# Press Tab with no input to see all scopes
$ nex exec --auth dev [TAB]

# Shows all 50 most recently used/created scopes plus "global"
```

## Technical Details

### Cache Implementation

```typescript
// Cache structure
Map<string, { scopes: string[], timestamp: number }>

// Cache key format
"${authAlias}:${prefix}"

// TTL
5 minutes (300,000 milliseconds)
```

### API Query

The autocomplete makes a REST API call like:

```
GET /api/now/table/sys_scope?
  sysparm_query=scopeSTARTSWITHx_my^ORnameSTARTSWITHx_my&
  sysparm_fields=scope,name&
  sysparm_limit=50
```

### Security

- Credentials are retrieved securely from the ServiceNow SDK keychain
- No credentials are cached or stored by the autocomplete feature
- Authentication is performed on each query (respecting cache TTL)
- OAuth tokens are used if configured, falling back to basic auth

## Limitations

1. **Cache Size**: Only caches the most recent 50 scopes per prefix
2. **No Offline Mode**: Requires connection to ServiceNow instance
3. **No Fuzzy Matching**: Only matches scopes starting with your input
4. **Per-Session Cache**: Cache clears when terminal session ends

## Advanced Usage

### Bypassing Cache

If you want to force a fresh query (e.g., after creating a new scope), there's no direct cache bypass. However, the cache expires after 5 minutes automatically.

### Multiple Instances

Autocomplete works seamlessly with multiple instances:

```bash
# Each instance has its own cache
$ nex exec --auth dev x_[TAB]      # Queries 'dev'
$ nex exec --auth prod x_[TAB]     # Queries 'prod'
$ nex exec --auth test x_[TAB]     # Queries 'test'
```

### Without Auth Flag

If you don't specify `--auth`, autocomplete uses your default auth alias:

```bash
# Uses default auth
$ nex exec x_[TAB]

# Equivalent to
$ nex exec --auth fluent-default x_[TAB]
```

## Future Enhancements

Potential future improvements:
- Fuzzy matching for scope names
- Description/tooltips showing scope details
- Autocomplete for other arguments (file paths, test IDs, etc.)
- Persistent cache across sessions
- Configuration for cache TTL
- Prefix-based caching for faster partial matches

## See Also

- [REPL Mode Documentation](./REPL_MODE.md)
- [Getting Started Guide](./GETTING_STARTED.md)
- [Exec Command Documentation](../README.md#nex-exec-scope-file)

