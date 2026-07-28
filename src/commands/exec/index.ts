/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable perfectionist/sort-objects */
import {Args, Command, Flags} from '@oclif/core'
import {  BackgroundScriptExecutor , Logger, NowStringUtil , ServiceNowInstance } from '@sonisoft/now-sdk-ext-core';
import fs from 'node:fs';
import path from 'node:path';
import * as readline from 'node:readline';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { getCachedScopes } from '../../common/scope-autocomplete.js'
import { ScriptParameterService } from '../../services/script-parameter.service.js'

export class Exec extends AuthenticatedCommand<typeof Exec> {

  static args = {
    scope: Args.string({
      description: 'Scope to execute script in. Use "global" for global scope.',
      required: true
    }),
    file: Args.string({description: 'File to execute in scripts background. If omitted, starts REPL mode.', required: false}),
  }
// Autocomplete hook for scope argument
  static autocomplete = {
     
    async scope(ctx: {flags: Record<string, any>}): Promise<string[]> {
      const authFlag = ctx.flags?.auth as string | undefined;
      try {
        const scopes = await getCachedScopes(authFlag);
        return ['global', ...scopes];
      } catch {
        return ['global'];
      }
    }
  }
static description = 'Execute JavaScript on a ServiceNow instance remotely using Scripts - Background.\n\n' +
    'This command allows you to run JavaScript either from files or interactively via REPL mode. ' +
    'It mimics the functionality of the Scripts - Background interface in ServiceNow, providing a way to ' +
    'execute scripts programmatically without manual interaction. The output is returned in real-time and can be ' +
    'piped to other commands or saved to files.\n\n' +
    'Modes:\n' +
    '  • File Mode: Provide a file path to execute scripts from a file\n' +
    '  • REPL Mode: Omit the file path to start an interactive session\n\n' +
    'Features:\n' +
    '  • Execute local JavaScript files remotely\n' +
    '  • Interactive REPL for ad-hoc script execution\n' +
    '  • Script parameterization with {placeholder} replacement\n' +
    '  • Multi-line script support in REPL\n' +
    '  • Scope-aware execution (global or custom scope)\n' +
    '  • Real-time console output capture\n' +
    '  • Pipe-able output for command chaining\n' +
    '  • Debug logging support\n' +
    '  • Useful for data migration, testing, and administrative tasks\n\n' +
    'Script Parameterization:\n' +
    '  Use {paramName} placeholders in your script files, then provide values via --params:\n' +
    '  • Supports any JSON-serializable values (strings, numbers, booleans)\n' +
    '  • Multiple parameters supported\n' +
    '  • All occurrences of each placeholder are replaced\n' +
    '  • Example: {token}, {username}, {environment}\n\n' +
    'REPL Controls:\n' +
    '  • Press Enter to add a new line\n' +
    '  • Type .exec or press Ctrl+D to execute the script\n' +
    '  • Type .clear to clear the current input\n' +
    '  • Type .exit or press Ctrl+C twice to exit REPL\n\n' +
    '⚠️  IMPORTANT SECURITY WARNING:\n' +
    'This command executes scripts with the same permissions and risks as using Scripts - Background directly\n' +
    'in ServiceNow. Always:\n' +
    '  • Review scripts before execution\n' +
    '  • Test in non-production environments first\n' +
    '  • Use appropriate scoping to limit access\n' +
    '  • Be aware of data modification risks\n' +
    '  • Follow your organization\'s security policies\n' +
    '  • Never execute untrusted scripts\n\n' +
    'Script Capabilities:\n' +
    '  Scripts run with full GlideSystem API access and can:\n' +
    '  • Query and modify database records\n' +
    '  • Create, update, and delete data\n' +
    '  • Execute business rules and workflows\n' +
    '  • Access all APIs available in Scripts - Background\n' +
    '  • Use gs, GlideRecord, GlideAggregate, and other server-side APIs';
static examples = [
    {
      description: 'Start REPL in global scope',
      command: '<%= config.bin %> <%= command.id %> global --auth dev-instance',
    },
    {
      description: 'Start REPL in custom application scope',
      command: '<%= config.bin %> <%= command.id %> x_my_custom_app --auth dev-instance',
    },
    {
      description: 'Execute a script file in global scope',
      command: '<%= config.bin %> <%= command.id %> global ./scripts/cleanup.js --auth dev-instance',
    },
    {
      description: 'Execute a script file in a custom application scope',
      command: '<%= config.bin %> <%= command.id %> x_my_custom_app ./scripts/app-config.js --auth dev-instance',
    },
    {
      description: 'Execute a parameterized script with single parameter',
      command: '<%= config.bin %> <%= command.id %> global ./scripts/query-user.js --auth dev-instance --params \'{"username":"admin"}\'',
    },
    {
      description: 'Execute a parameterized script with multiple parameters',
      command: '<%= config.bin %> <%= command.id %> global ./scripts/update-record.js --auth dev-instance --params \'{"table":"incident","field":"priority","value":"1"}\'',
    },
    {
      description: 'Execute and save output to a file',
      command: '<%= config.bin %> <%= command.id %> global ./scripts/report.js --auth dev-instance > report.txt',
    },
    {
      description: 'Execute and pipe output to grep for filtering',
      command: '<%= config.bin %> <%= command.id %> global ./scripts/list-users.js --auth dev-instance | grep "admin"',
    },
    {
      description: 'Execute with debug logging to troubleshoot issues',
      command: '<%= config.bin %> <%= command.id %> global ./script.js --auth dev-instance --log-level debug',
    },
    {
      description: 'Execute with parameters for template replacement',
      command: '<%= config.bin %> <%= command.id %> global ./script.js --auth dev-instance --params \'{"token":"abc123","env":"dev"}\'',
    },
  ]
static flags = {
    params: Flags.string({
      char: 'p',
      description: 'JSON object of parameters to replace in script file. Use {paramName} syntax in your script.',
      required: false
    }),
  }

  // private _logger:Logger = new Logger("ExecCommand");

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Exec);

    if (NowStringUtil.isStringEmpty(args.scope)) {
      this.error("Scope is required.");
    } else if (!NowStringUtil.isStringEmpty(args.file) && args.file) {
      // File mode - execute script from file
      await this.executeFromFile(args.file, args.scope, flags.params);
    } else {
      // REPL mode - interactive script execution
      await this.startREPL(args.scope);
    }
  }

  private applyParameters(script: string, paramsJson: string): string {
    try {
      const paramService = new ScriptParameterService(this._logger);
      return paramService.applyParameters(script, paramsJson);
    } catch (error) {
      this.error((error as Error).message);
      return script;
    }
  }

  private async executeFromFile(filePath: string, scope: string, params?: string): Promise<void> {
    this.log(`Executing script from file: ${filePath}`);
    this.log(`Scope: ${scope}`);
    this.log(`Params: ${params}`);
    try {
      const resolvedPath: string = path.resolve(filePath);
      let script: string = fs.readFileSync(resolvedPath).toString('utf8');
      
      // Apply parameter replacement if params provided
      if (params) {
        script = this.applyParameters(script, params);
      }
      
      await this.executeScript(script, scope);
    } catch (error) {
      this._logger.error("Error occurred when executing background script from file.", error as Error);
      this.error(error as Error);
    }
  }

  private async executeScript(script: string, scope: string): Promise<void> {
    this.log('Executing script...');
    this.log(`Scope: ${scope}`);
    
    try {
      const executor: BackgroundScriptExecutor = new BackgroundScriptExecutor(this.instance, scope);
      const result = await executor.executeScript(script, scope, this.instance);
      
      this._logger.debug("Ran background script", result);
      
      if (result && result.scriptResults && Array.isArray(result.scriptResults)) {
        const {scriptResults} = result;
        for (const scriptResult of scriptResults) {
          console.log(scriptResult.line);
          this._logger.debug(scriptResult.line);
        }
      } else {
        throw new Error("Response from script execution was null or undefined. Please review logs to identify the problem.");
      }
    } catch (error) {
      this._logger.error("Error occurred when executing background script.", error as Error);
      throw error;
    }
  }

  private async startREPL(scope: string): Promise<void> {
    this.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
    this.log(`║  ServiceNow Script Executor REPL                              ║`);
    this.log(`╚═══════════════════════════════════════════════════════════════╝`);
    this.log(`  Scope: ${scope}`);
    this.log(`  Instance: ${this.instance.getHost()}`);
    this.log(`\n  Commands:`);
    this.log(`    .exec    - Execute the current script`);
    this.log(`    .clear   - Clear the current input`);
    this.log(`    .exit    - Exit REPL`);
    this.log(`    Ctrl+D   - Execute the current script`);
    this.log(`    Ctrl+C   - Cancel current input or exit (press twice)`);
    this.log(`\n  Type your script below (press Enter for new lines):\n`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'sn> ',
      terminal: true
    });

    let scriptBuffer: string[] = [];
    let lineCount = 0;

    const executeBufferedScript = async () => {
      if (scriptBuffer.length === 0) {
        this.log('  (No script to execute)\n');
        rl.prompt();
        return;
      }

      const script = scriptBuffer.join('\n');
      this.log(`\n  Executing script (${scriptBuffer.length} lines)...\n`);
      this.log(`  ${'─'.repeat(63)}\n`);

      try {
        await this.executeScript(script, scope);
        this.log(`\n  ${'─'.repeat(63)}`);
        this.log(`  ✓ Script executed successfully\n`);
      } catch (error) {
        this.log(`\n  ${'─'.repeat(63)}`);
        this.log(`  ✗ Script execution failed`);
        this.log(`  Error: ${(error as Error).message}\n`);
      }

      scriptBuffer = [];
      lineCount = 0;
      rl.setPrompt('sn> ');
      rl.prompt();
    };

    const clearBuffer = () => {
      scriptBuffer = [];
      lineCount = 0;
      this.log('  (Input cleared)\n');
      rl.setPrompt('sn> ');
      rl.prompt();
    };

    rl.on('line', async (line: string) => {
      const trimmedLine = line.trim();

      // Handle REPL commands
      if (trimmedLine === '.exec') {
        await executeBufferedScript();
        return;
      }

      if (trimmedLine === '.clear') {
        clearBuffer();
        return;
      }

      if (trimmedLine === '.exit') {
        this.log('\n  Goodbye! 👋\n');
        rl.close();
        return;
      }

      // Add line to buffer
      scriptBuffer.push(line);
      lineCount++;
      
      // Update prompt to show continuation
      rl.setPrompt(`... `);
      rl.prompt();
    });

    rl.on('close', async () => {
      // Execute on Ctrl+D
      if (scriptBuffer.length > 0) {
        this.log('\n');
        await executeBufferedScript();
      }

      this.exit(0);
    });

    // Handle Ctrl+C
    let ctrlCCount = 0;
    rl.on('SIGINT', () => {
      ctrlCCount++;
      if (ctrlCCount === 1) {
        if (scriptBuffer.length > 0) {
          // First Ctrl+C: clear buffer
          this.log('\n  (Input cancelled. Press Ctrl+C again to exit)\n');
          clearBuffer();
          ctrlCCount = 0;
        } else {
          this.log('\n  (Press Ctrl+C again to exit)\n');
          rl.prompt();
        }
      } else {
        // Second Ctrl+C: exit
        this.log('\n  Goodbye! 👋\n');
        rl.close();
        this.exit(0);
      }
    });

    rl.prompt();
  }
}
