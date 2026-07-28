# Autocomplete Quick Start

## What is it?

Tab completion for `nex` commands that **dynamically queries your ServiceNow instance** to suggest available application scopes.

## Quick Setup (3 steps)

### 1. Setup Autocomplete

```bash
nex autocomplete
```

Follow the shell-specific instructions displayed.

### 2. Reload Your Shell

```bash
# Bash
source ~/.bashrc

# Zsh  
source ~/.zshrc

# Fish
source ~/.config/fish/config.fish
```

### 3. Try It!

```bash
# Type this and press Tab
nex exec --auth my-instance x_

# You'll see actual scopes from your ServiceNow instance!
```

## Example

```bash
$ nex exec --auth dev x_tan[TAB]

# Autocomplete queries ServiceNow and shows:
x_acme_custom      x_acme_app      x_acme_integration

# Select one and continue typing:
$ nex exec --auth dev x_acme_app
sn> // Now in REPL mode!
```

## How It Works

1. You type: `nex exec --auth dev x_tan` and press Tab
2. CLI extracts `--auth dev` 
3. Queries ServiceNow's `sys_scope` table for scopes starting with `x_tan`
4. Returns matching scopes as autocomplete suggestions
5. Results are cached for 5 minutes for speed

## Features

✅ Queries actual scopes from your instance  
✅ Works with multiple instances  
✅ Caching for fast responses  
✅ Supports both Basic Auth and OAuth  
✅ Automatically filters as you type  
✅ Falls back gracefully if query fails  

## Troubleshooting

**No scopes showing?**
- Check: `now-sdk auth --list` (make sure auth alias exists)
- Verify user has read access to `sys_scope` table
- Try running the command normally first to test connectivity

**Slow?**
- First request queries ServiceNow (~1-2 sec)
- Subsequent requests use cache (instant)
- Cache expires after 5 minutes

For full documentation, see [AUTOCOMPLETE.md](./AUTOCOMPLETE.md)

