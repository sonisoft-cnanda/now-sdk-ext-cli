import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals'
import {FlowDebugError, FlowDebugger, ServiceNowInstance, type FlowDebugSession, type FlowDebugSnapshot} from '@sonisoft/now-sdk-ext-core'
import {mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import FlowDebug from '../../../src/commands/flow/debug/index.js'
import FlowDebugBreak from '../../../src/commands/flow/debug/break.js'
import FlowDebugCancel from '../../../src/commands/flow/debug/cancel.js'
import FlowDebugInspect from '../../../src/commands/flow/debug/inspect.js'
import FlowDebugList from '../../../src/commands/flow/debug/list.js'
import FlowDebugRun from '../../../src/commands/flow/debug/run.js'
import FlowDebugStart from '../../../src/commands/flow/debug/start.js'
import FlowDebugStep from '../../../src/commands/flow/debug/step.js'
import {AuthenticatedCommand} from '../../../src/common/authenticated-command.js'
import {interruptGuard, mergeBreakpoints, parseInputs, parseSteps} from '../../../src/common/flow-debug-command.js'
import {FlowDebugRepl, parseReplCommand, replPrompt, runRepl} from '../../../src/common/flow-debug-repl.js'
import {EventEmitter} from 'node:events'

const CTX = 'a'.repeat(32)
const FLOW = 'f'.repeat(32)
const snapshot: FlowDebugSnapshot = {chain: [CTX], contextId: CTX, flowInputs: {}, flowName: 'Flow', flowOutputs: {},
  pausedAt: {flowElementId: 'u1', line: 1, step: {kind: 'action', label: 'Create Task', number: 1, uiUniqueIdentifier: 'u1'}},
  pausedLines: [1], rawState: 'PAUSED_IN_DEBUG', rootContextId: CTX, state: 'PAUSED', steps: []}
const session: FlowDebugSession = {breakpoints: [], contextId: CTX, flow: {name: 'Flow', scope: 'x_app', sysId: FLOW, type: 'subflow'}, locations: [], snapshot}
const bp = (n: number) => ({flowElementId: `u${n}`, line: n * 2, step: {kind: 'action' as const, label: `S${n}`, number: n, uiUniqueIdentifier: `u${n}`}, verified: true})

type Cmd = {run(): Promise<unknown>}
function command<T extends Cmd>(Class: new (...args: never[]) => T, flags: object, json = true): T & {lines: string[]} {
  const lines: string[] = []
  return Object.assign(Object.create(Class.prototype), {flags: {timeout: 60, ...flags}, instance: new ServiceNowInstance({alias: 'unit-test'}),
    jsonEnabled: () => json, lines, log: (line: string) => lines.push(line)})
}

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'nex-flow-debug-'))
})
afterEach(async () => {
  jest.restoreAllMocks()
  await rm(dir, {force: true, recursive: true})
})

describe('input parsing', () => {
  it('reads --inputs as JSON or @file, and applies --input name=value over it', async () => {
    expect(await parseInputs('{"table":"incident","wait":false}', undefined)).toEqual({table: 'incident', wait: false})
    const file = join(dir, 'in.json')
    await writeFile(file, '{"a":[1,2]}')
    expect(await parseInputs(`@${file}`, ['b=x=y', 'a=over'])).toEqual({a: 'over', b: 'x=y'})
    expect(await parseInputs(undefined, undefined)).toEqual({})
  })

  it.each([['not json'], ['[1]'], ['null'], ['"x"']])('refuses --inputs %j', async (text) => {
    await expect(parseInputs(text, undefined)).rejects.toThrow(/--inputs/)
  })

  it('refuses a missing file and a malformed pair', async () => {
    await expect(parseInputs(`@${join(dir, 'nope.json')}`, undefined)).rejects.toThrow(/Cannot read/)
    await expect(parseInputs(undefined, ['=x'])).rejects.toThrow(/name=value/)
    await expect(parseInputs(undefined, ['novalue'])).rejects.toThrow(/name=value/)
  })

  it('parses step lists and refuses anything but whole numbers from 1', () => {
    expect(parseSteps('2,3 3,5')).toEqual([2, 3, 5])
    for (const bad of ['', '0', '1.5', 'two', '-1']) expect(() => parseSteps(bad)).toThrow(/whole numbers/)
  })
})

describe('subcommands', () => {
  it('start passes the flow, parsed inputs, breakpoints and timeout, and returns the session', async () => {
    const start = jest.spyOn(FlowDebugger.prototype, 'start').mockResolvedValue(session)
    const target = command(FlowDebugStart, {break: '3,2', flow: FLOW, input: ['wait=false'], inputs: '{"table":"incident"}', timeout: 30})
    await expect(target.run()).resolves.toBe(session)
    expect(start).toHaveBeenCalledWith({breakpoints: [3, 2], flow: FLOW, inputs: {table: 'incident', wait: 'false'}, timeoutMs: 30_000})
    expect(target.lines).toEqual([])
  })

  it('start prints the session in text mode', async () => {
    jest.spyOn(FlowDebugger.prototype, 'start').mockResolvedValue(session)
    const target = command(FlowDebugStart, {flow: FLOW}, false)
    await target.run()
    expect(target.lines[0]).toBe(`Debug run ${CTX}: Flow (subflow, x_app)`)
  })

  it('break replaces, adds, removes, clears and lists, keeping held breakpoints by line', async () => {
    const set = jest.spyOn(FlowDebugger.prototype, 'setBreakpoints').mockResolvedValue([])
    const inner = {flowElementId: 'x-u1', line: 3, verified: true}
    jest.spyOn(FlowDebugger.prototype, 'getBreakpoints').mockResolvedValue([bp(2), bp(3), inner])
    const clear = jest.spyOn(FlowDebugger.prototype, 'clearBreakpoints').mockResolvedValue()
    await command(FlowDebugBreak, {context: CTX, steps: '4'}).run()
    expect(set).toHaveBeenLastCalledWith(CTX, [4])
    await command(FlowDebugBreak, {add: '4,2', context: CTX}).run()
    expect(set).toHaveBeenLastCalledWith(CTX, [{line: 4}, {line: 6}, {line: 3}, 4])
    await command(FlowDebugBreak, {context: CTX, remove: '2'}).run()
    expect(set).toHaveBeenLastCalledWith(CTX, [{line: 6}, {line: 3}])
    await command(FlowDebugBreak, {clear: true, context: CTX}).run()
    expect(clear).toHaveBeenCalledTimes(1)
    await command(FlowDebugBreak, {context: CTX}).run()
  })

  it('removing the last breakpoints clears them', async () => {
    jest.spyOn(FlowDebugger.prototype, 'getBreakpoints').mockResolvedValue([bp(2)])
    const clear = jest.spyOn(FlowDebugger.prototype, 'clearBreakpoints').mockResolvedValue()
    await expect(command(FlowDebugBreak, {context: CTX, remove: '2'}).run()).resolves.toEqual([])
    expect(clear).toHaveBeenCalled()
  })

  it('mergeBreakpoints keeps a breakpoint without a step number through an add and a remove', () => {
    const inner = {flowElementId: 'x-u1', line: 3, verified: true}
    expect(mergeBreakpoints([bp(2), inner], [5, 2], [])).toEqual([{line: 4}, {line: 3}, 5])
    expect(mergeBreakpoints([bp(2), inner], [], [2])).toEqual([{line: 3}])
  })

  it('step steps over by default, into or out on request, with the timeout', async () => {
    const over = jest.spyOn(FlowDebugger.prototype, 'stepOver').mockResolvedValue(snapshot)
    const into = jest.spyOn(FlowDebugger.prototype, 'stepInto').mockResolvedValue(snapshot)
    const out = jest.spyOn(FlowDebugger.prototype, 'stepOut').mockResolvedValue(snapshot)
    await command(FlowDebugStep, {context: CTX, timeout: 5}).run()
    expect(over).toHaveBeenCalledWith(CTX, {timeoutMs: 5000})
    await command(FlowDebugStep, {context: CTX, into: true}).run()
    await command(FlowDebugStep, {context: CTX, out: true}).run()
    expect(into).toHaveBeenCalledTimes(1)
    expect(out).toHaveBeenCalledTimes(1)
  })

  it('run needs --break, and passes --after through', async () => {
    const runTo = jest.spyOn(FlowDebugger.prototype, 'runTo').mockResolvedValue({
      cancel: {after: 'CANCELLED', alreadyEnded: false, before: 'PAUSED_IN_DEBUG', cancelled: true, contextId: CTX}, session, snapshot})
    await expect(command(FlowDebugRun, {after: 'cancel', flow: FLOW}).run()).rejects.toThrow(/--break is required/)
    expect(runTo).not.toHaveBeenCalled()
    const target = command(FlowDebugRun, {after: 'stay', break: '3', flow: FLOW, inputs: '{"table":"incident"}'}, false)
    await target.run()
    expect(runTo).toHaveBeenCalledWith({after: 'stay', breakpoints: [3], flow: FLOW, inputs: {table: 'incident'}, timeoutMs: 60_000})
    expect(target.lines.at(-1)).toBe(`Run ${CTX} cancelled (was PAUSED_IN_DEBUG).`)
  })

  it('inspect, cancel and list call the debugger and return what it returns', async () => {
    jest.spyOn(FlowDebugger.prototype, 'inspect').mockResolvedValue(snapshot)
    const cancelled = {after: 'CANCELLED', alreadyEnded: false, before: 'PAUSED_IN_DEBUG', cancelled: true, contextId: CTX}
    jest.spyOn(FlowDebugger.prototype, 'cancel').mockResolvedValue(cancelled)
    const list = jest.spyOn(FlowDebugger.prototype, 'listSessions').mockResolvedValue([])
    await expect(command(FlowDebugInspect, {context: CTX, step: 1}).run()).resolves.toBe(snapshot)
    await expect(command(FlowDebugCancel, {context: CTX}).run()).resolves.toBe(cancelled)
    await command(FlowDebugList, {'created-by': 'admin', limit: 5}).run()
    expect(list).toHaveBeenCalledWith({createdBy: 'admin', limit: 5})
  })

  it('renders a FlowDebugError as its code, detail and remediation, and passes anything else on', async () => {
    const parent = jest.spyOn(AuthenticatedCommand.prototype as never, 'catch').mockResolvedValue(undefined as never)
    const target = command(FlowDebugStep, {context: CTX}, false) as unknown as {catch(error: Error): Promise<void>}
    await target.catch(new FlowDebugError('not_paused', {contextId: CTX, state: 'COMPLETE'}))
    const rendered = (parent as jest.Mock).mock.calls[0][0] as Error & {flowDebug: {code: string}}
    expect(rendered.flowDebug.code).toBe('not_paused')
    expect(rendered.message).toContain(`Detail: {"contextId":"${CTX}","state":"COMPLETE"}`)
    const other = new Error('boom')
    await target.catch(other)
    expect((parent as jest.Mock).mock.calls[1][0]).toBe(other)
  })

  it('the interactive command refuses to run without a terminal', async () => {
    const stdin = process.stdin.isTTY
    Object.defineProperty(process.stdin, 'isTTY', {configurable: true, value: false})
    try {
      const start = jest.spyOn(FlowDebugger.prototype, 'start')
      await expect(command(FlowDebug, {flow: FLOW}).run()).rejects.toThrow(/needs a terminal/)
      expect(start).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', {configurable: true, value: stdin})
    }
  })
})

describe('the prompt', () => {
  it.each([
    ['n', {kind: 'over'}], ['next', {kind: 'over'}], ['s', {kind: 'into'}], ['o', {kind: 'out'}], ['c', {kind: 'resume'}],
    ['skip', {kind: 'skip'}], ['b', {kind: 'breaks'}], ['b 2,3', {kind: 'break', steps: [2, 3]}], ['b -2', {kind: 'unbreak', steps: [2]}],
    ['p', {full: false, kind: 'print'}], ['p 3', {full: false, kind: 'print', step: 3}], ['pp 1', {full: true, kind: 'print', step: 1}],
    ['w', {kind: 'where'}], ['l', {kind: 'locations'}], ['Q', {kind: 'quit'}], ['detach', {kind: 'detach'}], ['?', {kind: 'help'}], ['  ', {kind: 'empty'}],
    ['b 2,-3', {kind: 'unknown', text: 'b 2,-3'}], ['b x', {kind: 'unknown', text: 'b x'}], ['p 0', {kind: 'unknown', text: 'p 0'}],
    ['n 2', {kind: 'unknown', text: 'n 2'}], ['JUMP', {kind: 'unknown', text: 'JUMP'}],
  ])('parses %j', (line, parsed) => {
    expect(parseReplCommand(line)).toEqual(parsed)
  })

  it('shows the state in the prompt', () => {
    expect(replPrompt(undefined)).toBe('debug> ')
    expect(replPrompt(snapshot)).toBe('debug [paused @ step 1]> ')
    expect(replPrompt({...snapshot, chain: [CTX, 'b'.repeat(32)]})).toBe('debug [paused @ step 1 in subflow]> ')
    expect(replPrompt({...snapshot, state: 'COMPLETE'})).toBe('debug [complete]> ')
  })

  it('quit cancels the run, detach leaves it open, and a refusal is shown rather than thrown', async () => {
    const cancel = jest.spyOn(FlowDebugger.prototype, 'cancel').mockResolvedValue({after: 'CANCELLED', alreadyEnded: false, before: 'PAUSED_IN_DEBUG', cancelled: true, contextId: CTX})
    jest.spyOn(FlowDebugger.prototype, 'stepOver').mockRejectedValue(new FlowDebugError('not_paused', {state: 'COMPLETE'}))
    const repl = new FlowDebugRepl(new FlowDebugger(new ServiceNowInstance({alias: 'unit-test'})), CTX, 1000)
    const refused = await repl.handle({kind: 'over'})
    expect(refused.exit).toBeUndefined()
    expect(refused.lines[0]).toBe('Flow debugger refused: not_paused.')
    expect(await repl.handle({kind: 'detach'})).toMatchObject({exit: {cancel: false}})
    expect(cancel).not.toHaveBeenCalled()
    expect(await repl.handle({kind: 'quit'})).toMatchObject({exit: {cancel: true}})
    expect(cancel).toHaveBeenCalledWith(CTX)
  })

  it('b adds to the breakpoints held, and b -N clears when none remain', async () => {
    jest.spyOn(FlowDebugger.prototype, 'getBreakpoints').mockResolvedValue([bp(2)])
    const set = jest.spyOn(FlowDebugger.prototype, 'setBreakpoints').mockResolvedValue([bp(2), bp(3)])
    const clear = jest.spyOn(FlowDebugger.prototype, 'clearBreakpoints').mockResolvedValue()
    const repl = new FlowDebugRepl(new FlowDebugger(new ServiceNowInstance({alias: 'unit-test'})), CTX, 1000)
    await repl.handle({kind: 'break', steps: [3]})
    expect(set).toHaveBeenCalledWith(CTX, [{line: 4}, 3])
    await repl.handle({kind: 'unbreak', steps: [2]})
    expect(clear).toHaveBeenCalled()
  })

  it('a step command updates the snapshot the prompt shows, without subcommand hints', async () => {
    jest.spyOn(FlowDebugger.prototype, 'stepInto').mockResolvedValue({...snapshot, pausedLines: [4]})
    const repl = new FlowDebugRepl(new FlowDebugger(new ServiceNowInstance({alias: 'unit-test'})), CTX, 1000)
    const outcome = await repl.handle({kind: 'into'})
    expect(repl.snapshot?.pausedLines).toEqual([4])
    expect(outcome.lines.some(line => line.startsWith('Next: '))).toBe(false)
  })
})

describe('the prompt loop', () => {
  class FakeIO extends EventEmitter {
    closed = 0
    prompts: string[] = []
    close() {
      this.closed++
      this.emit('close')
    }

    prompt() {}
    setPrompt(prompt: string) {
      this.prompts.push(prompt)
    }
  }

  const setup = () => {
    const cancel = jest.spyOn(FlowDebugger.prototype, 'cancel').mockResolvedValue({after: 'CANCELLED', alreadyEnded: false, before: 'PAUSED_IN_DEBUG', cancelled: true, contextId: CTX})
    const repl = new FlowDebugRepl(new FlowDebugger(new ServiceNowInstance({alias: 'unit-test'})), CTX, 1000)
    repl.snapshot = snapshot
    const io = new FakeIO()
    const lines: string[] = []
    return {cancel, io, lines, loop: runRepl(io, repl, line => lines.push(line))}
  }

  it.each([['Ctrl+C', 'SIGINT'], ['Ctrl+D', 'close']])('%s cancels the run once and ends the loop', async (_name, event) => {
    const {cancel, io, loop} = setup()
    io.emit(event)
    io.emit(event)
    await loop.done
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('q cancels once; detach ends the loop without cancelling', async () => {
    const quit = setup()
    quit.io.emit('line', 'q')
    await quit.loop.done
    expect(quit.cancel).toHaveBeenCalledTimes(1)
    expect(quit.io.closed).toBeGreaterThan(0)
    jest.restoreAllMocks()
    const detach = setup()
    detach.io.emit('line', 'detach')
    await detach.loop.done
    expect(detach.cancel).not.toHaveBeenCalled()
  })

  it('Ctrl+C during a command waits for it to return before cancelling', async () => {
    let release: () => void = () => {}
    const order: string[] = []
    jest.spyOn(FlowDebugger.prototype, 'stepOver').mockImplementation(() => new Promise(resolve => {
      release = () => {
        order.push('step returned')
        resolve(snapshot)
      }
    }))
    const {cancel, io, loop} = setup()
    cancel.mockImplementation(async () => {
      order.push('cancel')
      return {after: 'CANCELLED', alreadyEnded: false, before: 'PAUSED_IN_DEBUG', cancelled: true, contextId: CTX}
    })
    io.emit('line', 'n')
    io.emit('SIGINT')
    await new Promise(resolve => setImmediate(resolve))
    expect(cancel).not.toHaveBeenCalled()
    release()
    await loop.done
    expect(order).toEqual(['step returned', 'cancel'])
  })

  it('an error in a command, or in printing, never leaves the loop without cancelling', async () => {
    jest.spyOn(FlowDebugger.prototype, 'stepOver').mockRejectedValue(new Error('network'))
    const {cancel, io, lines, loop} = setup()
    io.emit('line', 'n')
    await new Promise(resolve => setImmediate(resolve))
    expect(lines).toContain('Error: network')
    io.emit('close')
    await loop.done
    expect(cancel).toHaveBeenCalledTimes(1)
  })

  it('stop (SIGTERM) cancels and ends the loop', async () => {
    const {cancel, loop} = setup()
    await loop.stop(['Cancelling the run (SIGTERM).'])
    await loop.done
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})

describe('the interrupt guard', () => {
  it('holds other SIGINT handlers aside, including ones added while it is held, and puts them back', async () => {
    const exiting = jest.fn()
    const late = jest.fn()
    process.on('SIGINT', exiting)
    const lines: string[] = []
    const guard = interruptGuard(line => lines.push(line))
    process.on('SIGINT', late)
    await Promise.resolve()
    process.emit('SIGINT')
    expect(guard.interrupted).toBe(true)
    expect(exiting).not.toHaveBeenCalled()
    expect(late).not.toHaveBeenCalled()
    expect(lines[0]).toMatch(/cancelled as soon as/)
    guard.release()
    expect(process.listeners('SIGINT')).toEqual(expect.arrayContaining([exiting, late]))
    process.off('SIGINT', exiting)
    process.off('SIGINT', late)
  })

  it('calls onInterrupt with the signal when one is given', () => {
    const seen: string[] = []
    const guard = interruptGuard(() => {}, signal => seen.push(signal))
    // A real signal passes its name to the listener; emit does only what it is given.
    process.emit('SIGTERM', 'SIGTERM')
    guard.release()
    expect(seen).toEqual(['SIGTERM'])
  })
})
