import {Command, Errors, Flags} from '@oclif/core'
import {AclManager, type AclWriteResult, type AclWriteTarget, flushLogs, isPolicyRefusal, redactMessage} from '@sonisoft/now-sdk-ext-core'
import {readFile} from 'node:fs/promises'

import {AclDisplayService, type AclWriteSummary, projectAclError} from '../services/acl-display.service.js'
import {ID, MetadataInputError} from '../services/metadata-display.service.js'
import {AuthenticatedCommand, isRoleElevationError} from './authenticated-command.js'
import {type MetadataFlags,  scopeOptions} from './metadata-command.js'



/** Flags that set an ACL's fields, shared by create and update. */
export const aclFieldFlags = {
  'admin-overrides': Flags.boolean({allowNo: true, description: 'Whether admin passes regardless (the form\'s Admin overrides). Default on create: yes.'}),
  condition: Flags.string({description: 'Encoded query condition on the record.'}),
  'decision-type': Flags.option({description: 'allow (default) or deny, on a release with deny ACLs.', options: ['allow', 'deny'] as const})(),
  description: Flags.string({description: 'Description. The platform may write its own on first save.'}),
  script: Flags.string({description: 'Script that sets answer. Turns on advanced, which shows the script on the form; the platform runs it either way.', exclusive: ['script-file']}),
  'script-file': Flags.string({description: 'Read the script from a file.', exclusive: ['script']}),
}

export function reject(message: string): never {
  throw new MetadataInputError(message)
}

/** The application and update set every write goes to. */
export function aclTarget(flags: MetadataFlags): AclWriteTarget {
  return scopeOptions(flags)
}

export function sysIdArg(value: unknown, name = 'sys_id'): string {
  if (typeof value !== 'string' || !ID.test(value)) reject(`${name} must be a 32-character sys_id.`)
  return value as string
}

export async function scriptInput(flags: MetadataFlags): Promise<string | undefined> {
  if (flags['script-file'] === undefined) return flags.script as string | undefined
  try {
    return await readFile(flags['script-file'] as string, 'utf8')
  } catch {
    reject('Cannot read the script file.')
  }
}

/** Projects failures while running into public codes; usage, credential and policy errors before that keep their own handling. */
export abstract class AclBaseCommand<T extends typeof Command> extends AuthenticatedCommand<T> {
  protected abstract aclAction: string
  private executing = false

  protected async catch(error: Error & {exitCode?: number}): Promise<void> {
    // Elevation fails at login, with its own remediation in AuthenticatedCommand.
    if (!this.executing || error instanceof Errors.CLIError || isRoleElevationError(error)) return super.catch(error)
    const refused = isPolicyRefusal(error)
    if (refused) this.authLogger?.warn('Refused by policy.', {message: error.message})
    const args = this.args as Record<string, unknown> | undefined
    const failure = projectAclError(error, {action: this.aclAction, sysId: args?.sys_id ?? args?.acl})
    this._logger?.debug('ACL command error before projection.', {code: (error as {code?: unknown}).code,
      message: redactMessage(String(error?.message ?? '')), name: error?.name})
    await flushLogs()
    const message = this.jsonEnabled() ? failure.message : new AclDisplayService().failure(failure).join('\n')
    const safe = new Errors.CLIError(message, {code: failure.code, exit: 1, suggestions: failure.remediation})
    Object.assign(safe, {acl: failure})
    if (refused) return (Command.prototype as unknown as {catch(error: Error): Promise<void>}).catch.call(this, safe)
    return super.catch(safe)
  }

  public async init(): Promise<void> {
    await super.init()
    this.executing = true
  }

  protected manager(): AclManager {
    return new AclManager(this.instance)
  }
}

/** A command that changes an ACL: elevates to security_admin for the run, and reports the verified writes. */
export abstract class AclWriteCommand<T extends typeof Command> extends AclBaseCommand<T> {
  static elevatedRoles = ['security_admin']

  protected report(verb: string, result: AclWriteResult): AclWriteSummary {
    const display = new AclDisplayService()
    const summary = display.result(result)
    if (!this.jsonEnabled()) for (const line of display.resultLines(verb, summary)) this.log(line)
    return summary
  }
}

export {scopeFlags as aclTargetFlags} from './metadata-command.js'