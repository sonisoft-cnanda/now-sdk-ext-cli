import type {FlowDebugger, FlowDebugSnapshot} from '@sonisoft/now-sdk-ext-core'

import {FlowDebugError} from '@sonisoft/now-sdk-ext-core'

import {FlowDebugDisplayService, projectFlowDebugError} from '../services/flow-debug-display.service.js'

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
        const held = (await this.dbg.getBreakpoints(ctx)).map(b => b.step?.number).filter((n): n is number => n !== undefined)
        return {lines: this.display.breakpoints(await this.dbg.setBreakpoints(ctx, [...new Set([...command.steps, ...held])].sort((a, b) => a - b)))}
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
        const held = (await this.dbg.getBreakpoints(ctx)).map(b => b.step?.number).filter((n): n is number => n !== undefined)
        const keep = held.filter(n => !command.steps.includes(n))
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
