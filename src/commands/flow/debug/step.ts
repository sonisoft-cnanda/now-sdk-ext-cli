import {Flags} from '@oclif/core'
import {FlowDebugger, type FlowDebugSnapshot} from '@sonisoft/now-sdk-ext-core'

import {contextFlag, FlowDebugCommand, timeoutFlag} from '../../../common/flow-debug-command.js'
import {FlowDebugDisplayService} from '../../../services/flow-debug-display.service.js'

export default class FlowDebugStep extends FlowDebugCommand<typeof FlowDebugStep> {
  static description = `Run the paused step of a debug run and stop at the next one, then show where it is.

Step over by default. --into enters a subflow call: the subflow runs in a child context, and later commands
apply to it until it finishes. --out runs the rest of the current subflow (at the top level, the rest of the
run). A step that fails does not pause: the run ends in ERROR, and the error is shown.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --context 0123456789abcdef0123456789abcdef --auth dev',
    '<%= config.bin %> <%= command.id %> -c 0123456789abcdef0123456789abcdef --into --json --auth dev',
  ]
  static flags = {
    context: contextFlag,
    full: Flags.boolean({description: 'Show values in full, and the engine\'s internal outputs.'}),
    into: Flags.boolean({description: 'Step into a subflow call.', exclusive: ['out']}),
    out: Flags.boolean({description: 'Step out of the current subflow.', exclusive: ['into']}),
    timeout: timeoutFlag,
  }

  public async run(): Promise<FlowDebugSnapshot> {
    const {flags} = this
    const dbg = new FlowDebugger(this.instance)
    const wait = {timeoutMs: flags.timeout * 1000}
    const snapshot = flags.into ? await dbg.stepInto(flags.context, wait)
      : flags.out ? await dbg.stepOut(flags.context, wait) : await dbg.stepOver(flags.context, wait)
    this.print(new FlowDebugDisplayService().snapshot(snapshot, {full: flags.full}))
    return snapshot
  }
}
