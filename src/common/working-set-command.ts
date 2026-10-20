import {Command, Errors} from '@oclif/core'
import {flushLogs, WorkingSetError} from '@sonisoft/now-sdk-ext-core'

import {projectWorkingSetError, WorkingSetDisplayService} from '../services/working-set-display.service.js'
import {AuthenticatedCommand} from './authenticated-command.js'

/** Renders a refused or unverified update-set step as its public code, detail and remediation. */
export abstract class WorkingSetCommand<T extends typeof Command> extends AuthenticatedCommand<T> {
  protected abstract workingSetAction: string

  protected async catch(error: Error & {exitCode?: number}): Promise<void> {
    if (!(error instanceof WorkingSetError)) return super.catch(error)
    const failure = projectWorkingSetError(error, this.workingSetAction)
    await flushLogs()
    const message = this.jsonEnabled() ? failure.message : new WorkingSetDisplayService().failure(failure).join('\n')
    const safe = new Errors.CLIError(message, {code: failure.code, exit: 1, suggestions: failure.remediation})
    Object.assign(safe, {updateSet: failure})
    return super.catch(safe)
  }
}
