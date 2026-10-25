import {Command, Errors, Flags} from '@oclif/core'
import {FlowDebugError, flushLogs} from '@sonisoft/now-sdk-ext-core'
import {readFile} from 'node:fs/promises'

import {FlowDebugDisplayService, projectFlowDebugError} from '../services/flow-debug-display.service.js'
import {AuthenticatedCommand} from './authenticated-command.js'

/** Flags every `nex flow debug` command that acts on a run takes. */
export const contextFlag = Flags.string({char: 'c', description: 'Root context id that nex flow debug start printed.', required: true})
export const timeoutFlag = Flags.integer({default: 60, description: 'Seconds to wait for the run to pause again or end.', max: 3600, min: 1})

/** Flags that start a run: `start`, `run`, and the REPL (where --flow is optional, for --context). */
export function startFlags<R extends boolean>(flowRequired: R) {
  return {
    break: Flags.string({char: 'b', description: 'Steps to break at, by the number Workflow Studio shows: 2,3.'}),
    flow: Flags.string({char: 'f', description: 'Flow or subflow: sys_id, or scope.internal_name.', required: flowRequired}),
    input: Flags.string({description: 'One input as name=value (a string). Repeatable; applied over --inputs.', multiple: true}),
    inputs: Flags.string({char: 'i', description: 'Inputs as a JSON object, or @file to read one. For a flow: its trigger outputs (current, table_name).'}),
  }
}

/** --inputs (JSON or @file) with --input name=value applied over it. */
export async function parseInputs(inputs: string | undefined, pairs: string[] | undefined): Promise<Record<string, unknown>> {
  let result: Record<string, unknown> = {}
  if (inputs !== undefined) {
    const text = inputs.startsWith('@') ? await readFile(inputs.slice(1), 'utf8').catch(() => {
      throw new Errors.CLIError(`Cannot read the --inputs file ${inputs.slice(1)}.`)
    }) : inputs
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new Errors.CLIError('--inputs is not valid JSON.', {suggestions: ['Pass a JSON object, for example \'{"table":"incident"}\', or @file.json.']})
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Errors.CLIError('--inputs must be a JSON object.')
    result = parsed as Record<string, unknown>
  }

  for (const pair of pairs ?? []) {
    const at = pair.indexOf('=')
    if (at < 1) throw new Errors.CLIError(`--input ${pair}: expected name=value.`)
    result = {...result, [pair.slice(0, at)]: pair.slice(at + 1)}
  }

  return result
}

/** "2,3 5" → [2, 3, 5]. */
export function parseSteps(text: string): number[] {
  const parts = text.split(/[\s,]+/).filter(Boolean)
  const steps = parts.map(Number)
  if (parts.length === 0 || steps.some(n => !Number.isInteger(n) || n < 1)) {
    throw new Errors.CLIError(`Steps must be whole numbers from 1, separated by commas: got "${text}".`)
  }

  return [...new Set(steps)]
}

/** Shared failure rendering: a FlowDebugError becomes the CLI's own error with remediation. */
export abstract class FlowDebugCommand<T extends typeof Command> extends AuthenticatedCommand<T> {
  protected async catch(error: Error & {exitCode?: number}): Promise<void> {
    if (!(error instanceof FlowDebugError)) return super.catch(error)
    const failure = projectFlowDebugError(error)
    await flushLogs()
    const message = this.jsonEnabled() ? failure.message : new FlowDebugDisplayService().failure(failure).join('\n')
    const safe = new Errors.CLIError(message, {code: failure.code, exit: 1, suggestions: failure.remediation})
    Object.assign(safe, {flowDebug: failure})
    return super.catch(safe)
  }

  /** Print lines unless --json is on. */
  protected print(lines: string[]): void {
    if (!this.jsonEnabled()) for (const line of lines) this.log(line)
  }
}
