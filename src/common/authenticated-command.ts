 

import { Command, Flags, Interfaces } from '@oclif/core'
import { getCredentials } from "@servicenow/sdk-cli/dist/auth/index.js";
import { logger as sdkLogger } from '@servicenow/sdk-cli/dist/logger/index.js';
import { configureLogging, flushLogs, isPolicyRefusal, Logger, ServiceNowInstance, ServiceNowSettingsInstance } from '@sonisoft/now-sdk-ext-core';

import { LogFactory } from '../util/log-factory.js';
import { installCliPolicy, type PolicyFlags } from './policy.js';



export type Flags<T extends typeof Command> = Interfaces.InferredFlags<T['flags'] & typeof AuthenticatedCommand['baseFlags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class AuthenticatedCommand<T extends typeof Command> extends Command {
//   // define flags that can be inherited by any command that extends BaseCommand
  static baseFlags = {
    'auth': Flags.string({char: 'a', description: 'Auth alias to use.', required: false}),
    // Declared so it appears in --help and is not rejected as unknown. It is
    // ACTED ON in bin/credstore-boot.js, which reads argv directly: the shim has
    // to be installed before init() resolves credentials, and that runs before
    // oclif has parsed anything.
    'cred-store': Flags.boolean({
      description: 'Read credentials from @sonisoft/sn-credstore instead of the OS keyring. ' +
        'Use this in headless sessions (SSH, systemd, CI, agents) where the keyring cannot be unlocked.',
      helpGroup: 'GLOBAL',
      required: false,
    }),
    // Changes are PERMITTED by default; these take permission away.
    //
    // Deliberately deny-direction rather than `--allow-write`. With a permissive
    // default an allow-flag would grant nothing it did not already have, and it could
    // not override NEX_POLICY_DENY either, so it would ship as a no-op. If the default
    // ever flips to deny, the allow flags arrive in that same change.
    //
    // These are agent-reachable, which is fine: an agent can only ever RESTRICT itself
    // with them. The layer an agent cannot reach is NEX_POLICY_DENY, which outranks
    // every flag — that is what makes pointing nex at production meaningful.
    'deny-execute': Flags.boolean({
      description: 'Refuse background scripts, flow runs and ATF runs for this invocation.',
      helpGroup: 'GLOBAL',
      required: false,
    }),
    'deny-write': Flags.boolean({
      description: 'Refuse any change to instance data for this invocation.',
      helpGroup: 'GLOBAL',
      required: false,
    }),
    'log-dir': Flags.string({
      description: 'Directory to write log files to. Implies --log-file.',
      helpGroup: 'GLOBAL',
      required: false,
    }),
    // Logging to a file is opt-in. It used to be unconditional, writing
    // ./logs/*.log into whatever directory nex happened to be run from — including
    // CI checkouts — with no way to turn it off. See NEX-3.
    'log-file': Flags.boolean({
      description: 'Write logs to a file. Defaults to $XDG_STATE_HOME/now-sdk-ext/logs ' +
        '(~/.local/state/now-sdk-ext/logs). Off by default; without this, nex logs ' +
        'warnings and errors to stderr only.',
      helpGroup: 'GLOBAL',
      required: false,
    }),
    'log-level': Flags.option({
      default: 'info',
      helpGroup: 'GLOBAL',
      options: ['debug', 'warn', 'error', 'info', 'trace'] as const,
      summary: 'Specify level for logging.',

    })(),
    'read-only': Flags.boolean({
      description: 'Refuse every change to the instance — equivalent to ' +
        '--deny-write --deny-execute. Reads are unaffected.',
      helpGroup: 'GLOBAL',
      required: false,
    }),
  }
// add the --json flag
    static enableJsonFlag = true
protected _logger!: Logger;
    protected args!: Args<T>;
    protected authLogger!:Logger;
    protected flags!: Flags<T>;
protected instance!:ServiceNowInstance;

    public get logger(): Logger {
        return this._logger;
    }

    public set logger(logger: Logger) {
        this._logger = logger;
    }

  protected async catch(err: Error & {exitCode?: number}): Promise<any> {
    // A refusal is a decision, not a crash. Render it as the CLI's own error with
    // remediation, rather than letting a stack trace reach the user for something they
    // asked for by passing a flag. Handled first, before the generic path below.
    if (isPolicyRefusal(err)) {
      this.authLogger?.warn("Refused by policy.", {message: err.message});
      await flushLogs();
      this.error(err.message, {
        suggestions: [
          'Reads are unaffected — only changes to the instance were refused.',
          'Run `nex policy status` to see what is permitted and which layer decided.',
        ],
      });
    }

    // authLogger is assigned partway through init(), so anything that throws
    // before that point — a missing required flag, for instance — arrived here
    // with it still undefined and produced "Cannot read properties of undefined
    // (reading 'error')", hiding the actual usage error behind a TypeError.
    this.authLogger?.error("Globally caught exception occurred.", err);

    // Flush HERE, not only in finally(). super.catch() routes into oclif's error
    // handler, which can terminate the process — so finally() is not guaranteed to
    // run, and the record that just got logged is precisely the one worth keeping.
    // Winston buffers, so without this the failure line is lost intermittently.
    await flushLogs()

    return super.catch(err)
  }

  protected async finally(_: Error | undefined): Promise<any> {
    // called after run and catch regardless of whether or not the command errored.
    // Covers the success path; the failure path already flushed in catch().
    await flushLogs()
    return super.finally(_)
  }

  public async init(): Promise<void> {
    await super.init();
    const {args, flags} = await this.parse({
      args: this.ctor.args,
      baseFlags: (super.ctor as typeof AuthenticatedCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    })
   
    this.flags = flags as Flags<T>
    this.args = args as Args<T>
    if (this.jsonEnabled()) sdkLogger.setLevel('silent');

    // The flag is declared as 'log-level' in baseFlags, so oclif keys the parsed
    // value under that exact name. Reading `flags.logLevel` always yielded
    // undefined, silently pinning every command to 'info'.
    const logLevel = (this.flags['log-level'] as string | undefined) || 'info';
    const logDir = this.flags['log-dir'] as string | undefined;

    // Configure BEFORE creating any logger. Core's loggers are field initializers on
    // ~43 manager classes and take no arguments, so this process-wide call is the only
    // thing that reaches them — a per-logger level never did.
    configureLogging({
      // --log-dir implies --log-file; requiring both would make `--log-dir ./x` alone
      // silently produce nothing, which reads as a broken flag.
      dir: logDir,
      file: Boolean(this.flags['log-file']) || Boolean(logDir),
      level: logLevel,
      // --json puts machine-readable output on stdout. Warnings on stderr do not
      // corrupt it, but they do land in a terminal the caller is likely piping, so
      // stay quiet unless the level was asked for explicitly.
      ...(this.jsonEnabled() && !this.argvHasLogLevel() ? {consoleLevel: 'error'} : {}),
    });

    this.logger = LogFactory.createLogger(this.ctor.name);
    this.authLogger = LogFactory.createLogger("AuthenticatedCommand");

    // Install the permission ladder before anything can issue a request. Core's gate
    // is inert until this runs, so ordering matters: after logging (so a malformed
    // NEX_POLICY_DENY has somewhere to warn) and before the first credential fetch.
    //
    // Note there is no per-command classification. The gate sits at the HTTP layer and
    // decides per REQUEST, so `update-set current` reading or writing depending on
    // --set, and `script-sync sync` going both ways, need no special handling here.
    installCliPolicy(this.flags as PolicyFlags, (message) => this.authLogger.warn(message));
    // const wrapper:CredentialWrapper = new CredentialWrapper();
    // const credential:Creds = await (flags.auth ? wrapper.getStoredCredentialsByAlias(flags.auth) : wrapper.getStoredCredentialsByAlias( 'fluent-default'));
    // const credentialArgs = {"_": "get-credentials", auth: flags.auth || "fluent-default"};
   
    const alias = flags.auth || "fluent-default";

    let credential;
    try {
      credential = await getCredentials(alias);
    } catch (error) {
      // getCredentials throws for an unknown alias, but it also throws when the
      // store itself is unreachable. Those need different remediation, and
      // sn-credstore's errors carry their own — so pass it through rather than
      // replacing it with a generic "check your alias".
      this.failAuth(alias, error);
    }

    // Never log `credential` or any object containing it (e.g. snSettings) — it
    // holds the ServiceNow password/token, and these lines run at --log-level
    // debug, which would write it to the terminal and to CI logs.
    this.authLogger.debug("Credential lookup complete.", {alias, found: Boolean(credential)});

    if (!credential) {
      // Previously this only logged, leaving this.instance undefined so the
      // command failed later with an unrelated TypeError. An unusable command
      // must not start.
      this.failAuth(alias);
    }

    const snSettings: ServiceNowSettingsInstance = {
      alias: flags.auth,
      credential
    }
    this.instance = new ServiceNowInstance(snSettings);
  }

  /**
   * Whether --log-level was given on the command line rather than defaulted.
   *
   * oclif reports its own default as a parsed value, so `flags['log-level']` cannot
   * distinguish "the user asked for info" from "nobody said anything".
   */
  private argvHasLogLevel(): boolean {
    return this.argv.some((a) => a === '--log-level' || a.startsWith('--log-level='))
  }

  /**
   * Fail with remediation the user can act on.
   *
   * The keyring failure mode this guards against is silent: in a non-interactive
   * session the keyring cannot be unlocked, `KeyChain.getPassword()` swallows the
   * error and returns null, and the SDK reports it as "no credentials" — which is
   * indistinguishable from genuinely having none. So say which of the two it is.
   */
  private failAuth(alias: string, cause?: unknown): never {
    const shimActive = process.env.NOW_SDK_KEYCHAIN_PATCHED === '1';
    const suggestions = [
      'Run "nex auth list" to see stored credentials.',
      'Run "nex auth doctor" to check credential storage.',
    ];

    if (!shimActive) {
      // Not necessarily wrong — the keyring is the default and works fine in a
      // desktop session. But it is the likeliest explanation for "no credentials"
      // when there is no terminal to unlock the keyring from, and that is exactly
      // when nobody is around to reason it out.
      suggestions.unshift(
        'If this is a headless session (SSH, systemd, CI, an agent), the OS keyring cannot be ' +
        'unlocked and will report no credentials regardless of what is stored. Pass --cred-store ' +
        'to read from @sonisoft/sn-credstore instead.',
      );
    }

    // sn-credstore errors carry actionable remediation; a bare message loses it.
    const remediation = (cause as undefined | {remediation?: string})?.remediation;
    if (remediation) suggestions.unshift(remediation);

    const detail = cause instanceof Error ? cause.message : `No credentials found for alias "${alias}".`;
    this.error(detail, {suggestions});
  }
}
