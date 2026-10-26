import type {FlowDebugger, FlowDebugSnapshot} from '@sonisoft/now-sdk-ext-core'

import {FlowDebugError} from '@sonisoft/now-sdk-ext-core'

import {FlowDebugDisplayService, projectFlowDebugError} from '../services/flow-debug-display.service.js'
import {mergeBreakpoints} from './flow-debug-command.js'

/** One line typed at the `nex flow debug` prompt. */
export type ReplCommand =
  | {full: boolean; kind: 'print'; step?: number}
  | {kind: 'break'; steps: number[]}
  | {kind: 'breaks'}
  | {kind: 'detach'}
  | {kind: 'empty'}
  | {kind: 'help'}
  | {kind: 'into'}
  | {kind: 'locations'}
  | {kind: 'out'}
  | {kind: 'over'}
  | {kind: 'quit'}
  | {kind: 'resume'}
  | {kind: 'skip'}
  | {kind: 'unbreak'; steps: number[]}
  | {kind: 'unknown'; text: string}
  | {kind: 'where'}

export const REPL_HELP = [
  'Commands:',
  '  n, next          step over: run the paused step, stop at the next',
  '  s, step          step into: like next, but enter a subflow call',
  '  o, out           step out: run the rest of the current (sub)flow',
  '  c, continue      resume to the next breakpoint, or the end',
  '  skip             run to the end, ignoring breakpoints',
  '  b 2,3            add breakpoints at steps 2 and 3',
  '  b -2             remove the breakpoint at step 2',
  '  b                list breakpoints',
  '  p [N]            inputs and outputs of every step, or step N',
  '  pp [N]           the same, with values in full',
  '  w, where         where the run is',
  '  l, locations     the steps it can stop at',
  '  q, quit          cancel the run and exit (also Ctrl+C, Ctrl+D)',
  '  detach           exit and leave the run open',
  '  h, help          this list',
]

const STEPS = /^-?\d+(?:[\s,]+-?\d+)*$/

function numbers(text: string): number[] | undefined {
  const values = text.split(/[\s,]+/).filter(Boolean).map(Number)
  return values.length > 0 && values.every(n => Number.isInteger(n) && n !== 0) ? values : undefined
}

/** Commands that take no argument, by every name they answer to. */
const SIMPLE: Record<string, ReplCommand> = {
  '?': {kind: 'help'}, c: {kind: 'resume'}, continue: {kind: 'resume'}, detach: {kind: 'detach'}, exit: {kind: 'quit'},
  h: {kind: 'help'}, help: {kind: 'help'}, into: {kind: 'into'}, l: {kind: 'locations'}, locations: {kind: 'locations'},
  n: {kind: 'over'}, next: {kind: 'over'}, o: {kind: 'out'}, out: {kind: 'out'}, over: {kind: 'over'}, q: {kind: 'quit'},
  quit: {kind: 'quit'}, resume: {kind: 'resume'}, s: {kind: 'into'}, skip: {kind: 'skip'}, step: {kind: 'into'},
  w: {kind: 'where'}, where: {kind: 'where'},
}

function parseBreak(rest: string, text: string): ReplCommand {
  if (rest === '') return {kind: 'breaks'}
  const steps = STEPS.test(rest) ? numbers(rest) : undefined
  if (steps?.every(n => n > 0)) return {kind: 'break', steps}
  if (steps?.every(n => n < 0)) return {kind: 'unbreak', steps: steps.map(n => -n)}
  return {kind: 'unknown', text}
}

function parsePrint(word: string, rest: string, text: string): ReplCommand {
  const full = word === 'pp'
  if (rest === '') return {full, kind: 'print'}
  const step = Number(rest)
  return Number.isInteger(step) && step > 0 ? {full, kind: 'print', step} : {kind: 'unknown', text}
}

/** Parse one prompt line. Pure, so the command set is tested without a terminal. */
export function parseReplCommand(line: string): ReplCommand {
  const text = line.trim()
  if (text === '') return {kind: 'empty'}
  const [first, ...restParts] = text.split(/\s+/)
  const word = first.toLowerCase()
  const rest = restParts.join(' ')
  if (word === 'b' || word === 'break') return parseBreak(rest, text)
  if (word === 'p' || word === 'pp' || word === 'print') return parsePrint(word, rest, text)
  const simple = SIMPLE[word]
  return simple && rest === '' ? simple : {kind: 'unknown', text}
}

/** The prompt for a run in this state. */
export function replPrompt(snapshot: FlowDebugSnapshot | undefined): string {
  if (!snapshot) return 'debug> '
  if (snapshot.state !== 'PAUSED') return `debug [${snapshot.state.toLowerCase()}]> `
  const step = snapshot.pausedAt?.step?.number
  const depth = snapshot.chain.length > 1 ? ` in subflow` : ''
  return `debug [paused @ ${step === undefined ? `line ${snapshot.pausedLines.join(',')}` : `step ${step}`}${depth}]> `
}

export interface ReplOutcome {
  /** Exit the REPL: cancel the run when `cancel` is set, leave it open otherwise. */
  exit?: {cancel: boolean}
  lines: string[]
}

/** Carries out prompt commands against one run. */
export class FlowDebugRepl {
  public snapshot?: FlowDebugSnapshot
  private readonly display = new FlowDebugDisplayService()

  public constructor(private readonly dbg: FlowDebugger, public readonly contextId: string, private readonly timeoutMs: number) {}

  public async handle(command: ReplCommand): Promise<ReplOutcome> {
    try {
      return await this.dispatch(command)
    } catch (error) {
      if (error instanceof FlowDebugError) return {lines: this.display.failure(projectFlowDebugError(error))}
      throw error
    }
  }

  private async dispatch(command: ReplCommand): Promise<ReplOutcome> {
    const ctx = this.contextId
    const wait = {timeoutMs: this.timeoutMs}
    switch (command.kind) {
      case 'break': {
        return {lines: this.display.breakpoints(await this.dbg.setBreakpoints(ctx, mergeBreakpoints(await this.dbg.getBreakpoints(ctx), command.steps, [])))}
      }

      case 'breaks': {
        return {lines: this.display.breakpoints(await this.dbg.getBreakpoints(ctx))}
      }

      case 'detach': {
        return {exit: {cancel: false}, lines: [`Left run ${ctx} open. Continue it with nex flow debug --context ${ctx}, or end it with nex flow debug cancel --context ${ctx}.`]}
      }

      case 'empty': {
        return {lines: []}
      }

      case 'help': {
        return {lines: REPL_HELP}
      }

      case 'into': {
        return this.moved(await this.dbg.stepInto(ctx, wait))
      }

      case 'locations': {
        return {lines: this.display.locations(await this.dbg.locations(ctx))}
      }

      case 'out': {
        return this.moved(await this.dbg.stepOut(ctx, wait))
      }

      case 'over': {
        return this.moved(await this.dbg.stepOver(ctx, wait))
      }

      case 'print': {
        const snapshot = await this.dbg.inspect(ctx)
        this.snapshot = snapshot
        return {lines: this.display.steps(snapshot, {full: command.full, step: command.step})}
      }

      case 'quit': {
        const result = await this.dbg.cancel(ctx)
        return {exit: {cancel: true}, lines: this.display.cancel(result)}
      }

      case 'resume': {
        return this.moved(await this.dbg.resume(ctx, wait))
      }

      case 'skip': {
        return this.moved(await this.dbg.skipAll(ctx, wait))
      }

      case 'unbreak': {
        const keep = mergeBreakpoints(await this.dbg.getBreakpoints(ctx), [], command.steps)
        if (keep.length === 0) {
          await this.dbg.clearBreakpoints(ctx)
          return {lines: this.display.breakpoints([])}
        }

        return {lines: this.display.breakpoints(await this.dbg.setBreakpoints(ctx, keep))}
      }

      case 'unknown': {
        return {lines: [`Unknown command: ${command.text}. Type help for the list.`]}
      }

      case 'where': {
        return this.moved(await this.dbg.inspect(ctx))
      }
    }
  }

  private moved(snapshot: FlowDebugSnapshot): ReplOutcome {
    this.snapshot = snapshot
    // The hints name subcommands; at the prompt the short commands apply.
    return {lines: this.display.snapshot(snapshot).filter(line => !line.startsWith('Next: ') && !line.startsWith('End it: ') && !line.startsWith('Check it: '))}
  }
}

/** The parts of a readline interface the prompt loop uses; a test passes an EventEmitter. */
export interface ReplIO {
  close(): void
  on(event: 'close' | 'SIGINT', listener: () => void): unknown
  on(event: 'line', listener: (line: string) => void): unknown
  prompt(): void
  setPrompt(prompt: string): void
}

export interface ReplLoop {
  /** Resolves once the loop has ended, and the run has been cancelled unless it was detached. */
  done: Promise<void>
  /** End the loop from outside (SIGTERM): cancel the run, then close. */
  stop(lines?: string[]): Promise<void>
}

/**
 * Read commands until quit, detach, Ctrl+C or Ctrl+D. Leaving any way but detach cancels the run,
 * once: a command still in flight is allowed to return first, so a cancel never races it. Nothing
 * a line or a log does can leave the loop without ending it.
 */
export function runRepl(io: ReplIO, repl: FlowDebugRepl, log: (line: string) => void): ReplLoop {
  let finished = false
  let busy = false
  let inflight: Promise<unknown> = Promise.resolve()
  let resolveDone!: () => void
  const done = new Promise<void>(resolve => {
    resolveDone = resolve
  })
  const say = (line: string) => {
    try {
      log(line)
    } catch {
      // Output has gone away; the run is still cancelled.
    }
  }

  const finish = async (cancel: boolean, lines: string[] = []): Promise<void> => {
    if (finished) return done
    finished = true
    for (const line of lines) say(line)
    try {
      if (busy) say('(cancelling once the current command returns)')
      await inflight.catch(() => {})
      if (cancel) for (const line of (await repl.handle({kind: 'quit'})).lines) say(line)
    } catch (error) {
      say(`Could not cancel run ${repl.contextId}: ${(error as Error).message}. End it with nex flow debug cancel --context ${repl.contextId}.`)
    } finally {
      try {
        io.close()
      } catch {
        // Already closed.
      }

      resolveDone()
    }

    return done
  }

  const handle = async (line: string): Promise<boolean> => {
    try {
      const outcome = await repl.handle(parseReplCommand(line))
      for (const out of outcome.lines) say(out)
      return outcome.exit !== undefined
    } catch (error) {
      say(`Error: ${(error as Error).message}`)
      return false
    }
  }

  const prompt = () => {
    try {
      io.setPrompt(replPrompt(repl.snapshot))
      io.prompt()
    } catch {
      finish(true)
    }
  }

  io.on('line', (line: string) => {
    if (finished) return
    if (busy) {
      say('(still waiting for the last command)')
      return
    }

    busy = true
    inflight = handle(line).then(exit => {
      busy = false
      // quit has already cancelled the run; detach leaves it open.
      if (exit) finish(false)
      else if (!finished) prompt()
    })
  })
  io.on('SIGINT', () => {
    finish(true, ['', 'Cancelling the run (Ctrl+C).'])
  })
  io.on('close', () => {
    finish(true)
  })
  prompt()
  return {done, stop: (lines?: string[]) => finish(true, lines)}
}
