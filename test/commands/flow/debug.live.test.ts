import {afterAll, describe, expect, it} from '@jest/globals'
import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'

import {SN_INSTANCE_ALIAS} from '../../test_utils/test_config.js'

/*
 * NSE-21 through the nex binary, live: debug a flow step by step, as Workflow Studio's Test > Debug does.
 *
 * Runs only through `npm run test:live` (or NEX_LIVE=1), which builds first, and only on dev206299: a debug run
 * executes the flow. It uses scratch copies in the scratch app x_2115789_flowdbg:
 * - "NSE21 Debug Copy - Create Task" (a copy of OOB create_task_1), which creates an incident. Every incident
 *   carries MARK and is deleted afterwards.
 * - "NSE21 Debug Nested - Retrieve Update Sets", a For Each calling a child subflow; it is cancelled before the
 *   child's first action (which would fail on a .invalid host) runs.
 * Every run the suite starts is cancelled, and afterAll checks that none is left open.
 */
const live = (process.env.NEX_LIVE === '1' || process.env.npm_lifecycle_event === 'test:live') && SN_INSTANCE_ALIAS === 'dev206299'
const MINUTE = 60_000
const BIN = resolve('bin/run.js')
const FIXTURE = 'bfd1455b53001310b6d61901a0490e0c'
const NESTED = 'b8cb9ed753005310b6d61901a0490e00'
const MARK = 'NSE-21 nex flow debug live test (test, delete me)'
const INPUTS = JSON.stringify({field_values: `short_description=${MARK}`, table: 'incident', wait: false})
const NESTED_INPUTS = JSON.stringify({api_version: '', credential_alias: '', instance_id: 'nse21', instance_url: 'https://nse21-probe.invalid',
  update_set_ids: ['nse21-a']})

// Jest sets NODE_ENV=test, which makes oclif load src/*.ts instead of the built commands.
const ENV = Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'NODE_ENV' && !key.startsWith('JEST_')))

interface Result {json: any; status: null | number; stderr: string}
function nex(args: string[], extra: string[] = []): Result {
  // A headless session reads credentials from sn-credstore (SN_CRED_STORE), which nex opts into with --cred-store.
  const store = process.env.SN_CRED_STORE ? ['--cred-store'] : []
  const run = spawnSync(process.execPath, [BIN, ...args, '-a', SN_INSTANCE_ALIAS, '--json', ...store, ...extra],
    {encoding: 'utf8', env: ENV, maxBuffer: 32 * 1024 * 1024, timeout: 5 * MINUTE})
  let json: unknown
  try {
    json = JSON.parse(run.stdout)
  } catch {
    json = undefined
  }

  return {json, status: run.status, stderr: run.stderr.slice(-2000)}
}

const ok = (result: Result): any => {
  if (result.status !== 0) throw new Error(`nex failed (${result.status}): ${JSON.stringify(result.json?.error ?? result.stderr)}`)
  return result.json
}

const code = (result: Result): string | undefined => result.json?.error?.flowDebug?.code ?? result.json?.error?.code

;(live ? describe : describe.skip)(`nex flow debug (${SN_INSTANCE_ALIAS}, live)`, () => {
  const started: string[] = []
  const start = (flow: string, inputs: string, extra: string[] = []) => {
    const session = ok(nex(['flow', 'debug', 'start', '--flow', flow, '--inputs', inputs, ...extra]))
    started.push(session.contextId)
    return session
  }

  afterAll(() => {
    for (const id of started) nex(['flow', 'debug', 'cancel', '--context', id])
    const open = ok(nex(['flow', 'debug', 'list'])).filter((s: any) => s.flowSysId === FIXTURE || s.flowSysId === NESTED)
    for (const s of open) nex(['flow', 'debug', 'cancel', '--context', s.contextId])
    nex(['bulk', 'delete', '-t', 'incident', '-q', `short_description=${MARK}`, '--confirm'])
    const left = ok(nex(['query', '-t', 'incident', '-q', `short_description=${MARK}`, '-f', 'sys_id', '-l', '10'], ['--read-only'])).records
    expect(open).toEqual([])
    expect(left).toEqual([])
  }, 5 * MINUTE)

  it('run stops at the step, reports every step there, and leaves nothing open', () => {
    const result = ok(nex(['flow', 'debug', 'run', '--flow', 'x_2115789_flowdbg.nse21_debug_copy__create_task', '--inputs', INPUTS, '--break', '3']))
    started.push(result.session.contextId)
    expect(result.snapshot.state).toBe('PAUSED')
    expect(result.snapshot.pausedAt.step.number).toBe(3)
    const created = result.snapshot.steps.find((s: any) => s.step?.number === 1)
    expect(created.outputs.Record.displayValue).toMatch(/^[a-f\d]{32}$/)
    expect(result.cancel.after).toBe('CANCELLED')
  }, 5 * MINUTE)

  it('start, break, resume, inspect, step and cancel, one command at a time', () => {
    const session = start(FIXTURE, INPUTS)
    const ctx = session.contextId
    expect(session.snapshot.pausedLines).toEqual([1])
    expect(ok(nex(['flow', 'debug', 'break', '--context', ctx, '--steps', '3'])).map((b: any) => b.step.number)).toEqual([3])
    expect(code(nex(['flow', 'debug', 'break', '--context', ctx, '--steps', '9']))).toBe('unknown_breakpoint')
    expect(ok(nex(['flow', 'debug', 'resume', '--context', ctx])).pausedAt.step.number).toBe(3)
    expect(ok(nex(['flow', 'debug', 'inspect', '--context', ctx, '--step', '1'])).steps.length).toBeGreaterThan(0)
    expect(ok(nex(['flow', 'debug', 'step', '--context', ctx])).state).toBe('COMPLETE')
    expect(code(nex(['flow', 'debug', 'step', '--context', ctx]))).toBe('not_paused')
    expect(ok(nex(['flow', 'debug', 'cancel', '--context', ctx])).alreadyEnded).toBe(true)
  }, 5 * MINUTE)

  it('--deny-execute refuses starting and stepping a run, and flow test, but a run can still be cancelled', () => {
    const refusedStart = nex(['flow', 'debug', 'start', '--flow', FIXTURE, '--inputs', INPUTS], ['--deny-execute'])
    // A policy refusal is reported on stderr, as for every nex command.
    expect(refusedStart.status).not.toBe(0)
    expect(refusedStart.stderr).toMatch(/denied by a flag/)
    const refusedTest = nex(['flow', 'test', '-f', FIXTURE, '-o', INPUTS], ['--deny-execute'])
    expect(refusedTest.status).not.toBe(0)
    expect(refusedTest.stderr).toMatch(/denied by a flag/)
    const session = start(FIXTURE, INPUTS)
    const refusedStep = nex(['flow', 'debug', 'step', '--context', session.contextId], ['--deny-execute'])
    expect(refusedStep.status).not.toBe(0)
    expect(refusedStep.stderr).toMatch(/denied by a flag/)
    expect(ok(nex(['flow', 'debug', 'cancel', '--context', session.contextId], ['--deny-execute'])).after).toBe('CANCELLED')
  }, 5 * MINUTE)

  it('follows step into a subflow call, and cancelling the root ends both', () => {
    const session = start(NESTED, NESTED_INPUTS)
    const ctx = session.contextId
    expect(ok(nex(['flow', 'debug', 'step', '--context', ctx, '--into'])).pausedAt.step.kind).toBe('subflow')
    const inChild = ok(nex(['flow', 'debug', 'step', '--context', ctx, '--into']))
    expect(inChild.state).toBe('PAUSED')
    expect(inChild.chain).toHaveLength(2)
    expect(ok(nex(['flow', 'debug', 'cancel', '--context', ctx])).after).toBe('CANCELLED')
    expect(ok(nex(['flow', 'debug', 'inspect', '--context', inChild.contextId])).state).toBe('CANCELLED')
  }, 5 * MINUTE)
})
