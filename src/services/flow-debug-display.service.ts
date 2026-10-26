import type {
  FlowDebugBreakpoint, FlowDebugCancelResult, FlowDebugError, FlowDebugErrorDetail, FlowDebugLocation, FlowDebugSession,
  FlowDebugSessionSummary, FlowDebugSnapshot, FlowDebugStepData, FlowDebugValue,
} from '@sonisoft/now-sdk-ext-core'

/** A FlowDebugError as nex reports it, in text and under --json. */
export interface FlowDebugFailure {
  code: string
  detail?: FlowDebugErrorDetail
  message: string
  remediation: string[]
  type: 'FlowDebugError'
}

export interface FlowDebugDisplayOptions {
  /** Print values in full, and the engine's internal outputs (`__action_status__` and the like). */
  full?: boolean
}

const VALUE_MAX = 200
const WARNING = 'Debugging runs the flow for real: records it creates or changes are kept.'

const REMEDIATION: Record<string, string> = {
  breakpoint_not_verified: 'The debugger cannot stop there (detail.serverMessage). Pick another step: nex flow debug inspect --context <ctx> lists where it can stop.',
  cancel_failed: 'The run is still open (detail.state). Run nex flow debug cancel again, or end it from the flow context record in the instance.',
  context_not_found: 'No flow context has that id. List open runs with nex flow debug list.',
  flow_not_found: 'No flow or subflow matches. Pass its sys_id, or scope.internal_name (nex flow definition shows both).',
  invalid_input: 'Check the arguments: ids are 32-character sys_ids, steps are positive whole numbers, --inputs is a JSON object.',
  missing_input: 'Give a value for each mandatory input in detail.inputs (--inputs or --input name=value).',
  not_a_debug_session: 'That context was not started by the debugger, so nex will not step or cancel it. Start one with nex flow debug start.',
  not_debuggable: 'Only flows and subflows can be debugged. Test an action with nex flow action instead.',
  not_paused: 'The run is not paused (detail.state). See where it is with nex flow debug inspect --context <ctx>.',
  permission_denied: 'This user cannot use the Workflow Studio debugger. It needs the flow_designer role (or admin).',
  release_unsupported: 'This instance has no Workflow Studio debugger (its release does not offer Test > Debug).',
  start_failed: 'The debugger did not start a run. If detail.cancelled is false, a run may be open: check nex flow debug list.',
  unexpected_response: 'The debugger answered in a way nex does not understand. Check the run with nex flow debug inspect, and cancel it if it is open.',
  unknown_breakpoint: 'That step cannot be a breakpoint. Valid steps are in detail.validSteps.',
  unknown_input: 'The subflow does not declare the inputs in detail.inputs. nex flow definition lists its inputs.',
}

export function projectFlowDebugError(error: Pick<FlowDebugError, 'code' | 'detail'>): FlowDebugFailure {
  return {code: error.code, ...(error.detail === undefined ? {} : {detail: error.detail}), message: `Flow debugger refused: ${error.code}.`,
    remediation: [REMEDIATION[error.code] ?? 'Check the run with nex flow debug inspect before retrying.'], type: 'FlowDebugError'}
}

const clean = (text: unknown): string => String(text ?? '').replaceAll(/\p{Cc}/gu, ' ')
const cut = (text: string, full: boolean): string => (full || text.length <= VALUE_MAX ? text : `${text.slice(0, VALUE_MAX)}… (${text.length} chars; --full)`)

function where(location: FlowDebugLocation | undefined): string {
  if (!location) return ''
  const {step} = location
  if (!step) return `line ${location.line}`
  return step.number === undefined ? `${clean(step.label)} (line ${location.line})` : `step ${step.number} ${clean(step.label)}`
}

export class FlowDebugDisplayService {
  breakpoints(breakpoints: FlowDebugBreakpoint[]): string[] {
    if (breakpoints.length === 0) return ['No breakpoints.']
    return ['Breakpoints:', ...breakpoints.map(b => `  ${where(b)}${b.verified ? '' : ` (not verified: ${clean(b.message)})`}`)]
  }

  cancel(result: FlowDebugCancelResult): string[] {
    if (result.alreadyEnded) return [`Run ${result.contextId} had already ended (${result.after}); nothing was sent.`]
    return [`Run ${result.contextId} ${result.cancelled ? 'cancelled' : `ended as ${result.after}`} (was ${result.before}).`]
  }

  failure(failure: FlowDebugFailure): string[] {
    return [failure.message, ...(failure.detail === undefined ? [] : [`Detail: ${JSON.stringify(failure.detail)}`]), ...failure.remediation]
  }

  /** What to type next, for a run in this state. */
  hints(snapshot: FlowDebugSnapshot): string[] {
    const ctx = snapshot.rootContextId
    if (snapshot.state === 'PAUSED') {
      return [`Next: nex flow debug step --context ${ctx} [--into|--out]   resume --context ${ctx}   inspect --context ${ctx}`,
        `End it: nex flow debug cancel --context ${ctx}`]
    }

    if (snapshot.state === 'RUNNING' || snapshot.state === 'WAITING' || snapshot.state === 'UNKNOWN') {
      return [`Check it: nex flow debug inspect --context ${ctx}   End it: nex flow debug cancel --context ${ctx}`]
    }

    return []
  }

  locations(locations: FlowDebugLocation[]): string[] {
    if (locations.length === 0) return ['No locations: the run has no steps the debugger can stop at.']
    return ['Steps it can stop at:', ...locations.map(l => `  ${where(l).padEnd(48)} line ${l.line}`)]
  }

  session(session: FlowDebugSession): string[] {
    return [
      `Debug run ${session.contextId}: ${clean(session.flow.name)} (${session.flow.type}, ${clean(session.flow.scope)})`,
      WARNING,
      ...this.locations(session.locations),
      ...(session.breakpoints.length > 0 ? this.breakpoints(session.breakpoints) : []),
      ...this.snapshot(session.snapshot),
    ]
  }

  sessions(sessions: FlowDebugSessionSummary[]): string[] {
    if (sessions.length === 0) return ['No open debug runs.']
    return ['Open debug runs (newest first):',
      ...sessions.map(s => `  ${s.contextId}  ${clean(s.state).padEnd(16)} ${clean(s.createdOn)}  ${clean(s.createdBy).padEnd(12)} ${clean(s.flowName)}`),
      'End one with nex flow debug cancel --context <id>.']
  }

  snapshot(snapshot: FlowDebugSnapshot, options: FlowDebugDisplayOptions = {}): string[] {
    const depth = snapshot.chain.length - 1
    const inChild = depth > 0 ? ` in child subflow context ${snapshot.contextId} (depth ${depth})` : ''
    const state = snapshot.state === 'PAUSED' ? `PAUSED at ${where(snapshot.pausedAt) || `line ${snapshot.pausedLines.join(', ')}`}` : snapshot.state
    const lines = [`${clean(snapshot.flowName)}: ${state}${inChild}${snapshot.timedOut ? ' (still running when the wait timed out)' : ''}`]
    if (snapshot.error) lines.push(`Error: ${clean(snapshot.error)}`)
    if (snapshot.steps.length > 0) {
      lines.push('  Step  State        Time     Label')
      for (const step of snapshot.steps) {
        const number = step.step?.number === undefined ? '-' : String(step.step.number)
        const time = step.runTimeMs === undefined ? '' : `${step.runTimeMs} ms`
        const error = step.error && step.error !== 'Success' ? `  ! ${clean(step.error)}` : ''
        lines.push(`  ${number.padEnd(5)} ${clean(step.state).padEnd(12)} ${time.padEnd(8)} ${clean(step.step?.label ?? step.reportKey)}${error}`)
      }
    }

    const paused = snapshot.state === 'PAUSED' ? this.pausedStep(snapshot) : undefined
    if (paused) lines.push(...this.step(paused, options, 'Paused step'))
    lines.push(...this.hints(snapshot))
    return lines
  }

  /** One step's inputs and outputs. */
  step(step: FlowDebugStepData, options: FlowDebugDisplayOptions = {}, title = 'Step'): string[] {
    const full = options.full === true
    const label = step.step?.number === undefined ? clean(step.step?.label ?? step.reportKey) : `${step.step.number} ${clean(step.step.label)}`
    return [`${title} ${label} (${clean(step.state)})`, ...this.values('Inputs', step.inputs, full), ...this.values('Outputs', step.outputs, full)]
  }

  /** Every step's inputs and outputs, or one step's. */
  steps(snapshot: FlowDebugSnapshot, options: FlowDebugDisplayOptions & {step?: number} = {}): string[] {
    const chosen = options.step === undefined ? snapshot.steps : snapshot.steps.filter(s => s.step?.number === options.step)
    if (chosen.length === 0) return [options.step === undefined ? 'No step has run yet.' : `Step ${options.step} has no data yet.`]
    return chosen.flatMap(step => this.step(step, options))
  }

  /** The paused element's report: its own, or for a loop the latest of its `<id>.…` entries. */
  private pausedStep(snapshot: FlowDebugSnapshot): FlowDebugStepData | undefined {
    const id = snapshot.pausedAt?.step?.snapshotInstanceId
    if (!id) return undefined
    return snapshot.steps.find(s => s.reportKey === id) ?? snapshot.steps.findLast(s => s.step?.snapshotInstanceId === id)
  }

  private values(title: string, values: Record<string, FlowDebugValue>, full: boolean): string[] {
    const names = Object.keys(values).filter(name => full || !name.startsWith('__'))
    if (names.length === 0) return [`  ${title}: (none)`]
    return [`  ${title}:`, ...names.map(name => {
      const {displayValue, value} = values[name]
      const text = displayValue === undefined || displayValue === '' ? JSON.stringify(value) ?? '' : displayValue
      return `    ${clean(name)}: ${cut(clean(text), full)}`
    })]
  }
}

export const FLOW_DEBUG_WARNING = WARNING
