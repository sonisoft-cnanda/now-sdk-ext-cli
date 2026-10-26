import {Errors, Flags} from '@oclif/core'
import {FlowDebugger, type FlowDebugRunToResult} from '@sonisoft/now-sdk-ext-core'

import {FlowDebugCommand, interruptGuard, parseInputs, parseSteps, startFlags, timeoutFlag} from '../../../common/flow-debug-command.js'
import {FLOW_DEBUG_WARNING, FlowDebugDisplayService} from '../../../services/flow-debug-display.service.js'

export default class FlowDebugRun extends FlowDebugCommand<typeof FlowDebugRun> {
  static description = `Debug a flow or subflow to a breakpoint in one call, report every step's data there, and end the run.

For agents and scripts: start, run to the first of the --break steps, print the run there (with --json, the
whole snapshot), then cancel it, so nothing is left open. --after resume lets it run on to the end, ignoring
the other breakpoints, and reports where it got to within --timeout (a run still going then is left
running, and the output says so); --after stay leaves it paused for nex flow debug commands. Ctrl+C
cancels the run once the current call returns.

The run is real: records it creates or changes are kept. Debug a copy (nex flow copy) in a scratch app.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --flow x_myapp.create_task_copy --inputs \'{"table":"incident"}\' --break 3 --json --auth dev',
    '<%= config.bin %> <%= command.id %> -f 0123456789abcdef0123456789abcdef -i @inputs.json -b 2 --after resume --auth dev',
  ]
  static flags = {
    ...startFlags(true),
    after: Flags.option({default: 'cancel', description: 'After the breakpoint: cancel the run, let it finish (resume), or leave it paused (stay).',
      options: ['cancel', 'resume', 'stay'] as const})(),
    full: Flags.boolean({description: 'Show values in full, and the engine\'s internal outputs.'}),
    timeout: timeoutFlag,
  }

  public async run(): Promise<FlowDebugRunToResult> {
    const {flags} = this
    if (flags.break === undefined) throw new Errors.CLIError('--break is required: the steps to stop at, for example --break 3.')
    const inputs = await parseInputs(flags.inputs, flags.input)
    const dbg = new FlowDebugger(this.instance)
    const guard = interruptGuard(line => this.log(line))
    let result: FlowDebugRunToResult
    try {
      result = await dbg.runTo({
        after: flags.after, breakpoints: parseSteps(flags.break), flow: flags.flow as string, inputs, timeoutMs: flags.timeout * 1000,
      })
      // --after cancel has already ended it; an interrupted resume or stay ends it too.
      if (guard.interrupted && !result.cancel) {
        result.cancel = await dbg.cancel(result.session.contextId)
      }
    } finally {
      guard.release()
    }

    const display = new FlowDebugDisplayService()
    const lines = [`Debug run ${result.session.contextId}: ${result.session.flow.name}`, FLOW_DEBUG_WARNING,
      ...display.snapshot(result.snapshot, {full: flags.full}).filter(line => flags.after === 'stay' || !/^(Next|End it|Check it): /.test(line)),
      ...display.steps(result.snapshot, {full: flags.full})]
    if (result.final) {
      lines.push('After resuming:', ...display.snapshot(result.final, {full: flags.full}))
      if (!['CANCELLED', 'COMPLETE', 'ERROR'].includes(result.final.state) && !result.cancel) {
        lines.push(`The run had not ended when the wait did (${result.final.state}): it is still going. ` +
          `Check it with nex flow debug inspect --context ${result.session.contextId}, or end it with nex flow debug cancel.`)
      }
    }

    if (result.cancel) lines.push(...display.cancel(result.cancel))
    this.print(lines)
    return result
  }
}
