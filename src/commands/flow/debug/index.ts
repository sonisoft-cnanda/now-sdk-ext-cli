import {Errors, Flags} from '@oclif/core'
import {FlowDebugger} from '@sonisoft/now-sdk-ext-core'
import * as readline from 'node:readline'

import {FlowDebugCommand, parseInputs, parseSteps, startFlags, timeoutFlag} from '../../../common/flow-debug-command.js'
import {FlowDebugRepl, parseReplCommand, replPrompt} from '../../../common/flow-debug-repl.js'
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
    context: Flags.string({char: 'c', description: 'Continue an open run instead of starting one: its root context id.', exclusive: ['flow']}),
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
    let contextId: string
    let banner: string[]
    if (flags.context) {
      const snapshot = await dbg.inspect(flags.context)
      contextId = snapshot.rootContextId
      banner = [`Continuing debug run ${contextId}.`, FLOW_DEBUG_WARNING, ...display.snapshot(snapshot)]
    } else {
      const inputs = await parseInputs(flags.inputs, flags.input)
      const session = await dbg.start({breakpoints: flags.break === undefined ? undefined : parseSteps(flags.break), flow: flags.flow as string, inputs, timeoutMs})
      contextId = session.contextId
      banner = display.session(session)
    }

    const repl = new FlowDebugRepl(dbg, contextId, timeoutMs)
    try {
      repl.snapshot = await dbg.inspect(contextId)
    } catch {
      repl.snapshot = undefined
    }

    for (const line of banner.filter(line => !/^(Next|End it|Check it): /.test(line))) this.log(line)
    this.log('Type help for commands; q cancels the run and exits.')
    await this.loop(repl)
  }

  /** Read commands until quit, detach, Ctrl+C or Ctrl+D. Leaving any way but detach cancels the run. */
  private loop(repl: FlowDebugRepl): Promise<void> {
    return new Promise(resolve => {
      const rl = readline.createInterface({input: process.stdin, output: process.stdout, prompt: replPrompt(repl.snapshot), terminal: true})
      let busy = false
      let leaving = false
      const leave = async (cancel: boolean, lines: string[] = []) => {
        if (leaving) return
        leaving = true
        for (const line of lines) this.log(line)
        if (cancel) {
          try {
            const result = await repl.handle({kind: 'quit'})
            for (const line of result.lines) this.log(line)
          } catch (error) {
            this.log(`Could not cancel run ${repl.contextId}: ${(error as Error).message}. End it with nex flow debug cancel --context ${repl.contextId}.`)
          }
        }

        rl.close()
        resolve()
      }

      rl.on('line', async (line: string) => {
        if (leaving) return
        if (busy) {
          this.log('(still waiting for the last command)')
          return
        }

        busy = true
        try {
          const outcome = await repl.handle(parseReplCommand(line))
          if (outcome.exit) {
            // quit has already cancelled; detach leaves the run open.
            leaving = true
            for (const out of outcome.lines) this.log(out)
            rl.close()
            resolve()
            return
          }

          for (const out of outcome.lines) this.log(out)
        } catch (error) {
          this.log(`Error: ${(error as Error).message}`)
        } finally {
          busy = false
        }

        if (!leaving) {
          rl.setPrompt(replPrompt(repl.snapshot))
          rl.prompt()
        }
      })
      rl.on('SIGINT', () => {
        leave(true, ['', 'Cancelling the run (Ctrl+C).'])
      })
      rl.on('close', () => {
        leave(true)
      })
      process.once('SIGTERM', () => {
        leave(true, ['', 'Cancelling the run (SIGTERM).'])
      })
      rl.prompt()
    })
  }
}

