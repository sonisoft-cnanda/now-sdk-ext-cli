import {Errors, Flags} from '@oclif/core'
import {FlowDebugger} from '@sonisoft/now-sdk-ext-core'
import * as readline from 'node:readline'

import {FlowDebugCommand, interruptGuard, mergeBreakpoints, parseInputs, parseSteps, startFlags, timeoutFlag} from '../../../common/flow-debug-command.js'
import {FlowDebugRepl, replPrompt, runRepl} from '../../../common/flow-debug-repl.js'
import {FLOW_DEBUG_WARNING, FlowDebugDisplayService} from '../../../services/flow-debug-display.service.js'

export default class FlowDebug extends FlowDebugCommand<typeof FlowDebug> {
  static description = `Debug a flow or subflow interactively, step by step, as Workflow Studio's Test > Debug does.

Starts a run with --flow and --inputs (or continues an open one with --context), then reads commands at a
prompt: n (step over), s (step into a subflow), o (step out), c (resume), b 2,3 (breakpoints), p [N] (step
data), q (cancel and quit). Type help at the prompt for the full list.

The run is real: records it creates or changes are kept. Debug a copy (nex flow copy) in a scratch app.
Quitting, Ctrl+C and Ctrl+D cancel the run; detach leaves it open. Needs a terminal: from scripts and agents
use nex flow debug run, or the start / step / resume / inspect / cancel subcommands.`
  static enableJsonFlag = false
  static examples = [
    '<%= config.bin %> <%= command.id %> --flow x_myapp.create_task_copy --inputs \'{"table":"incident"}\' --break 3 --auth dev',
    '<%= config.bin %> <%= command.id %> --context 0123456789abcdef0123456789abcdef --auth dev',
  ]
  static flags = {
    ...startFlags(false),
    context: Flags.string({char: 'c', description: 'Continue an open run instead of starting one: its root context id. --break adds breakpoints to it.',
      exclusive: ['flow', 'inputs', 'input']}),
    timeout: timeoutFlag,
  }

  public async run(): Promise<void> {
    const {flags} = this
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      throw new Errors.CLIError('nex flow debug needs a terminal.', {suggestions: [
        'From a script or agent: nex flow debug run --flow <flow> --inputs <json> --break <steps> --json',
        'Or step a run with nex flow debug start, step, resume, inspect and cancel.']})
    }

    if (!flags.flow && !flags.context) throw new Errors.CLIError('Pass --flow to start a run, or --context to continue one.')
    const dbg = new FlowDebugger(this.instance)
    const display = new FlowDebugDisplayService()
    const timeoutMs = flags.timeout * 1000
    const steps = flags.break === undefined ? undefined : parseSteps(flags.break)
    const inputs = flags.context ? {} : await parseInputs(flags.inputs, flags.input)
    // From here a run may be open: an interruption or a failure before the prompt cancels it.
    const guard = interruptGuard(line => this.log(line))
    let contextId: string | undefined
    let repl: FlowDebugRepl
    try {
      let banner: string[]
      if (flags.context) {
        const snapshot = await dbg.inspect(flags.context)
        contextId = snapshot.rootContextId
        if (steps) await dbg.setBreakpoints(contextId, mergeBreakpoints(await dbg.getBreakpoints(contextId), steps, []))
        banner = [`Continuing debug run ${contextId}.`, FLOW_DEBUG_WARNING, ...display.snapshot(snapshot)]
      } else {
        const session = await dbg.start({breakpoints: steps, flow: flags.flow as string, inputs, timeoutMs})
        contextId = session.contextId
        banner = display.session(session)
      }

      repl = new FlowDebugRepl(dbg, contextId, timeoutMs)
      repl.snapshot = await dbg.inspect(contextId)
      if (guard.interrupted) {
        await this.cancelQuietly(dbg, contextId)
        return
      }

      for (const line of banner.filter(line => !/^(Next|End it|Check it): /.test(line))) this.log(line)
      this.log('Type help for commands; q cancels the run and exits.')
    } catch (error) {
      if (contextId && !flags.context) await this.cancelQuietly(dbg, contextId)
      throw error
    } finally {
      guard.release()
    }

    const rl = readline.createInterface({input: process.stdin, output: process.stdout, prompt: replPrompt(repl.snapshot), terminal: true})
    const loop = runRepl(rl, repl, line => this.log(line))
    // At the prompt, readline turns Ctrl+C into its own event; a SIGTERM (or a SIGINT from outside
    // the terminal) still arrives as a process signal.
    const signals = interruptGuard(line => this.log(line), signal => {
      loop.stop(['', `Cancelling the run (${signal}).`])
    })
    try {
      await loop.done
    } finally {
      signals.release()
    }
  }

  private async cancelQuietly(dbg: FlowDebugger, contextId: string): Promise<void> {
    try {
      for (const line of new FlowDebugDisplayService().cancel(await dbg.cancel(contextId))) this.log(line)
    } catch (error) {
      this.log(`Could not cancel run ${contextId}: ${(error as Error).message}. End it with nex flow debug cancel --context ${contextId}.`)
    }
  }
}
