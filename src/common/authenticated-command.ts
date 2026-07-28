 

import { Command, Flags, Interfaces } from '@oclif/core'
import { getCredentials } from "@servicenow/sdk-cli/dist/auth/index.js";
import { Logger, ServiceNowInstance, ServiceNowSettingsInstance } from '@sonisoft/now-sdk-ext-core';

import { LogFactory } from '../util/log-factory.js';



export type Flags<T extends typeof Command> = Interfaces.InferredFlags<T['flags'] & typeof AuthenticatedCommand['baseFlags']>
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>

export abstract class AuthenticatedCommand<T extends typeof Command> extends Command {
//   // define flags that can be inherited by any command that extends BaseCommand
  static baseFlags = {
    'auth': Flags.string({char: 'a', description: 'Auth alias to use.', required: false}),
    'log-level': Flags.option({
      default: 'info',
      helpGroup: 'GLOBAL',
      options: ['debug', 'warn', 'error', 'info', 'trace'] as const,
      summary: 'Specify level for logging.',
      
    })(),
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
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    this.authLogger.error("Globally caught exception occurred.", err);

    return super.catch(err)
  }

  protected async finally(_: Error | undefined): Promise<any> {
    // called after run and catch regardless of whether or not the command errored
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

    // The flag is declared as 'log-level' in baseFlags, so oclif keys the parsed
    // value under that exact name. Reading `flags.logLevel` always yielded
    // undefined, silently pinning every command to 'info'.
    const logLevel = (this.flags['log-level'] as string | undefined) || 'info';
    this.logger = LogFactory.createLogger(this.ctor.name, logLevel);
    this.authLogger = LogFactory.createLogger("AuthenticatedCommand", logLevel);
    // const wrapper:CredentialWrapper = new CredentialWrapper();
    // const credential:Creds = await (flags.auth ? wrapper.getStoredCredentialsByAlias(flags.auth) : wrapper.getStoredCredentialsByAlias( 'fluent-default'));
    // const credentialArgs = {"_": "get-credentials", auth: flags.auth || "fluent-default"};
   
    const alias = flags.auth || "fluent-default";
    const credential = await getCredentials(alias);
    // Never log `credential` or any object containing it (e.g. snSettings) — it
    // holds the ServiceNow password/token, and these lines run at --log-level
    // debug, which would write it to the terminal and to CI logs.
    this.authLogger.debug("Credential lookup complete.", {alias, found: Boolean(credential)});
    if(credential){
       const snSettings:ServiceNowSettingsInstance = {
            alias: flags.auth,
           credential
        }
        this.instance = new ServiceNowInstance(snSettings);
    }else{
        this.authLogger.error("Either credential not found or no credentials created.", {alias});
    }

  }
}