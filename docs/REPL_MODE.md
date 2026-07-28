# ServiceNow Script Executor REPL

## Overview

The `nex exec` command now supports an interactive REPL (Read-Eval-Print Loop) mode, allowing you to write and execute ServiceNow scripts directly in your terminal without creating separate files.

## Starting REPL Mode

To start the REPL, simply omit the file argument:

```bash
# Start REPL in global scope
nex exec global --auth my-instance

# Start REPL in custom application scope
nex exec x_my_custom_app --auth my-instance
```

## REPL Interface

When you start the REPL, you'll see:

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

sn>
```

## Writing Multi-Line Scripts

The REPL supports multi-line scripts. Each time you press **Enter**, a new line is added to your script:

```
sn> var gr = new GlideRecord('sys_user');
... gr.addQuery('active', true);
... gr.setLimit(5);
... gr.query();
... while (gr.next()) {
...   gs.info(gr.getValue('name') + ' - ' + gr.getValue('email'));
... }
```

Notice how the prompt changes from `sn>` to `...` to indicate continuation lines.

## Executing Scripts

There are two ways to execute your script:

### 1. Type `.exec` Command

```
sn> gs.info('Hello, ServiceNow!');
... .exec

  Executing script (1 lines)...

  ───────────────────────────────────────────────────────────────

*** Script: Hello, ServiceNow!

  ───────────────────────────────────────────────────────────────
  ✓ Script executed successfully
```

### 2. Press Ctrl+D (EOF)

Press `Ctrl+D` (Linux/Mac) or `Ctrl+Z` then Enter (Windows) to execute the current script.

## REPL Commands

### `.exec`
Executes the current script buffer and displays results.

### `.clear`
Clears the current script buffer without executing it.

```
sn> var test = 'something';
... var another = 'line';
... .clear
  (Input cleared)

sn>
```

### `.exit`
Exits the REPL session.

```
sn> .exit

  Goodbye! 👋
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Enter** | Add new line to script |
| **Ctrl+D** | Execute current script |
| **Ctrl+C** (once) | Clear current input |
| **Ctrl+C** (twice) | Exit REPL |

## Example Session

Here's a complete example session:

```bash
$ nex exec global --auth dev

╔═══════════════════════════════════════════════════════════════╗
║  ServiceNow Script Executor REPL                              ║
╚═══════════════════════════════════════════════════════════════╝
  Scope: global
  Instance: dev12345.service-now.com

  Type your script below (press Enter for new lines):

sn> // Query active users
... var gr = new GlideRecord('sys_user');
... gr.addQuery('active', true);
... gr.setLimit(3);
... gr.query();
... 
... var count = 0;
... while (gr.next()) {
...   count++;
...   gs.info(count + '. ' + gr.getValue('name'));
... }
... 
... gs.info('Total: ' + count + ' users');
... .exec

  Executing script (11 lines)...

  ───────────────────────────────────────────────────────────────

*** Script: 1. John Doe
*** Script: 2. Jane Smith
*** Script: 3. Bob Johnson
*** Script: Total: 3 users

  ───────────────────────────────────────────────────────────────
  ✓ Script executed successfully

sn> .exit

  Goodbye! 👋

$
```

## Use Cases

### Quick Data Queries

Perfect for quick ad-hoc queries without creating files:

```javascript
var gr = new GlideRecord('incident');
gr.addQuery('priority', 1);
gr.query();
gs.info('Critical incidents: ' + gr.getRowCount());
```

### Testing Script Logic

Test script logic before adding it to your application:

```javascript
function testFunction(input) {
  gs.info('Input: ' + input);
  return input * 2;
}

gs.info('Result: ' + testFunction(5));
```

### Interactive Debugging

Explore the ServiceNow API interactively:

```javascript
// Check what properties are available
var gr = new GlideRecord('sys_user');
gr.query();
if (gr.next()) {
  gs.info('Fields: ' + gr.getFields().join(', '));
}
```

### Administrative Tasks

Perform quick administrative tasks:

```javascript
// Update a configuration
var gr = new GlideRecord('sys_properties');
gr.addQuery('name', 'my.property');
gr.query();
if (gr.next()) {
  gr.setValue('value', 'new_value');
  gr.update();
  gs.info('Property updated');
}
```

## Error Handling

If your script encounters an error, the REPL will display it and return to the prompt:

```
sn> var invalid syntax here;
... .exec

  Executing script (1 lines)...

  ───────────────────────────────────────────────────────────────
  ✗ Script execution failed
  Error: Syntax error in script

sn>
```

## Tips and Best Practices

1. **Use Comments**: Add comments to document your scripts
2. **Test Small Pieces**: Test logic incrementally before running complex scripts
3. **Use `.clear`**: If you make a mistake, use `.clear` to start over
4. **Check Scope**: Remember which scope you're in (shown at the top)
5. **Save Useful Scripts**: Copy successful scripts from the REPL to files for reuse
6. **Be Careful**: REPL executes with full Scripts - Background permissions

## Limitations

- No syntax highlighting (yet)
- No auto-completion (yet)
- No command history persistence between sessions
- Scripts must be synchronous (no callbacks)

## Differences from ServiceNow UI

The REPL behaves exactly like Scripts - Background in ServiceNow:
- Same API access
- Same permissions
- Same scope restrictions
- Same server-side execution

The only difference is the interface - terminal instead of web browser.

## Comparison with File Mode

| Feature | File Mode | REPL Mode |
|---------|-----------|-----------|
| Multi-line support | ✓ | ✓ |
| Save scripts | ✓ | Manual copy |
| Quick iterations | - | ✓✓✓ |
| Version control | ✓ | Manual |
| Interactive exploration | - | ✓✓✓ |
| CI/CD integration | ✓✓✓ | - |

## See Also

- [Getting Started Guide](./GETTING_STARTED.md)
- [Exec Command Documentation](../README.md#nex-exec-scope-file)
- [ServiceNow Scripts - Background Documentation](https://docs.servicenow.com)

