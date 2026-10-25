import {describe, expect, it} from '@jest/globals'
import type {FlowDebugSnapshot, FlowDebugStepData} from '@sonisoft/now-sdk-ext-core'

import {FLOW_DEBUG_WARNING, FlowDebugDisplayService, projectFlowDebugError} from '../../src/services/flow-debug-display.service.js'

const ROOT = 'a'.repeat(32)
const CHILD = 'b'.repeat(32)
const create: FlowDebugStepData = {
  inputs: {task_table: {displayValue: 'incident', value: 'incident'}},
  outputs: {
    __action_status__: {displayValue: '{ "code": 0 }', value: {}},
    Record: {displayValue: 'e5a4015353401310b6d61901a0490e64', value: {table: 'incident'}},
  },
  reportKey: 's1',
  runTimeMs: 253,
  state: 'COMPLETE',
  step: {kind: 'action', label: 'Create Task', number: 1, snapshotInstanceId: 's1', uiUniqueIdentifier: 'u1'},
  error: 'Success',
}
const theIf: FlowDebugStepData = {
  inputs: {condition: {displayValue: 'false=true', value: undefined}},
  outputs: {},
  reportKey: 's3',
  state: 'NOT_READY',
  step: {kind: 'flowLogic', label: 'If: Wait for Completion', number: 3, snapshotInstanceId: 's3', uiUniqueIdentifier: 'u3'},
}
const paused: FlowDebugSnapshot = {
  chain: [ROOT], contextId: ROOT, flowInputs: {}, flowName: 'NSE21 Debug Copy', flowOutputs: {}, pausedAt: {flowElementId: 'u3', line: 6, step: theIf.step},
  pausedLines: [6], rawState: 'PAUSED_IN_DEBUG', rootContextId: ROOT, state: 'PAUSED', steps: [create, theIf],
}

describe('FlowDebugDisplayService', () => {
  const display = new FlowDebugDisplayService()

  it('shows where a paused run is, the steps so far, the paused step’s data, and what to type next', () => {
    const lines = display.snapshot(paused)
    expect(lines[0]).toBe('NSE21 Debug Copy: PAUSED at step 3 If: Wait for Completion')
    expect(lines).toContain('  1     COMPLETE     253 ms   Create Task')
    expect(lines).toContain('Paused step 3 If: Wait for Completion (NOT_READY)')
    expect(lines).toContain('    condition: false=true')
    expect(lines.some(line => line.startsWith(`Next: nex flow debug step --context ${ROOT}`))).toBe(true)
    expect(lines).toContain(`End it: nex flow debug cancel --context ${ROOT}`)
  })

  it('says when the run is paused inside a subflow it stepped into', () => {
    const lines = display.snapshot({...paused, chain: [ROOT, CHILD], contextId: CHILD})
    expect(lines[0]).toContain(`in child subflow context ${CHILD} (depth 1)`)
    expect(lines.some(line => line.includes(`--context ${ROOT}`))).toBe(true)
  })

  it('shows the error of a run that ended in ERROR, and gives no hints for an ended run', () => {
    const lines = display.snapshot({...paused, error: 'Nonexistent table: x', pausedAt: undefined, pausedLines: [], rawState: 'ERROR', state: 'ERROR',
      steps: [{...create, error: 'Nonexistent table: x', state: 'ERROR'}]})
    expect(lines[0]).toBe('NSE21 Debug Copy: ERROR')
    expect(lines).toContain('Error: Nonexistent table: x')
    expect(lines.some(line => line.includes('! Nonexistent table: x'))).toBe(true)
    expect(lines.some(line => /^(Next|End it|Check it): /.test(line))).toBe(false)
  })

  it('says when a wait timed out with the run still going', () => {
    const lines = display.snapshot({...paused, pausedAt: undefined, rawState: 'IN_PROGRESS', state: 'RUNNING', timedOut: true})
    expect(lines[0]).toBe('NSE21 Debug Copy: RUNNING (still running when the wait timed out)')
    expect(lines.at(-1)).toContain('Check it: nex flow debug inspect')
  })

  it('hides the engine’s internal outputs and cuts long values unless --full', () => {
    const long = {...create, outputs: {...create.outputs, Big: {displayValue: 'x'.repeat(500), value: ''}}}
    const short = display.step(long)
    expect(short.join('\n')).not.toContain('__action_status__')
    expect(short.find(line => line.includes('Big:'))).toMatch(/x{200}… \(500 chars; --full\)$/)
    const full = display.step(long, {full: true})
    expect(full.join('\n')).toContain('__action_status__')
    expect(full.find(line => line.includes('Big:'))).toBe(`    Big: ${'x'.repeat(500)}`)
  })

  it('shows a value without a display value as JSON, and strips control characters', () => {
    const lines = display.step({...theIf, inputs: {obj: {value: {a: 1}}, text: {displayValue: 'line1\nline2\u001B[31m', value: ''}}})
    expect(lines).toContain('    obj: {"a":1}')
    expect(lines).toContain('    text: line1 line2 [31m')
  })

  it('shows one step’s data, or says it has none yet', () => {
    expect(display.steps(paused, {step: 1})[0]).toBe('Step 1 Create Task (COMPLETE)')
    expect(display.steps(paused, {step: 4})).toEqual(['Step 4 has no data yet.'])
  })

  it('renders the session, locations, breakpoints, cancel and open runs', () => {
    const lines = display.session({
      breakpoints: [{flowElementId: 'u3', line: 6, step: theIf.step, verified: true}], contextId: ROOT,
      flow: {name: 'NSE21 Debug Copy', scope: 'x_app', sysId: 'f'.repeat(32), type: 'subflow'},
      locations: [{flowElementId: 'u1', line: 1, step: create.step}, {flowElementId: 'u3', line: 6, step: theIf.step}, {flowElementId: 'zz', line: 9}],
      snapshot: paused,
    })
    expect(lines[0]).toBe(`Debug run ${ROOT}: NSE21 Debug Copy (subflow, x_app)`)
    expect(lines[1]).toBe(FLOW_DEBUG_WARNING)
    expect(lines.some(line => line.startsWith('  step 1 Create Task') && line.endsWith('line 1'))).toBe(true)
    expect(lines.some(line => line.startsWith('  line 9'))).toBe(true)
    expect(lines).toContain('  step 3 If: Wait for Completion')
    expect(display.breakpoints([])).toEqual(['No breakpoints.'])
    expect(display.breakpoints([{flowElementId: 'x', line: 2, message: 'Flow Engine cannot debug this instruction id', verified: false}]))
      .toContain('  line 2 (not verified: Flow Engine cannot debug this instruction id)')
    expect(display.cancel({after: 'CANCELLED', alreadyEnded: false, before: 'PAUSED_IN_DEBUG', cancelled: true, contextId: ROOT}))
      .toEqual([`Run ${ROOT} cancelled (was PAUSED_IN_DEBUG).`])
    expect(display.cancel({after: 'COMPLETE', alreadyEnded: true, before: 'COMPLETE', cancelled: false, contextId: ROOT})[0]).toContain('had already ended (COMPLETE)')
    expect(display.sessions([])).toEqual(['No open debug runs.'])
    expect(display.sessions([{contextId: ROOT, createdBy: 'admin', createdOn: '2026-10-25 23:00:09', flowName: 'NSE21', flowSysId: 'f', state: 'PAUSED_IN_DEBUG'}])[1])
      .toContain(ROOT)
  })

  it('projects every error code to remediation, and keeps the detail', () => {
    for (const code of ['breakpoint_not_verified', 'cancel_failed', 'context_not_found', 'flow_not_found', 'invalid_input', 'missing_input',
      'not_a_debug_session', 'not_debuggable', 'not_paused', 'permission_denied', 'release_unsupported', 'start_failed', 'unexpected_response',
      'unknown_breakpoint', 'unknown_input'] as const) {
      const failure = projectFlowDebugError({code, detail: undefined})
      expect(failure.remediation[0]).not.toContain('before retrying')
      expect(failure.message).toBe(`Flow debugger refused: ${code}.`)
    }

    const failure = projectFlowDebugError({code: 'unknown_breakpoint', detail: {validSteps: [1, 2]}})
    expect(display.failure(failure)).toEqual(['Flow debugger refused: unknown_breakpoint.', 'Detail: {"validSteps":[1,2]}', failure.remediation[0]])
  })
})
