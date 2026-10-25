import {Flags} from '@oclif/core'
import {FlowDebugger, type FlowDebugSnapshot} from '@sonisoft/now-sdk-ext-core'

import {contextFlag, FlowDebugCommand, timeoutFlag} from '../../../common/flow-debug-command.js'
import {FlowDebugDisplayService} from '../../../services/flow-debug-display.service.js'

export default class FlowDebugResume extends FlowDebugCommand<typeof FlowDebugResume> {
  static description = 'Resume a paused debug run: run to the next breakpoint, or to the end.'
  static examples = ['<%= config.bin %> <%= command.id %> --context 0123456789abcdef0123456789abcdef --auth dev']
  static flags = {
    context: contextFlag,
    full: Flags.boolean({description: 'Show values in full, and the engine\'s internal outputs.'}),
    timeout: timeoutFlag,
  }

  public async run(): Promise<FlowDebugSnapshot> {
    const {flags} = this
    const snapshot = await new FlowDebugger(this.instance).resume(flags.context, {timeoutMs: flags.timeout * 1000})
    this.print(new FlowDebugDisplayService().snapshot(snapshot, {full: flags.full}))
    return snapshot
  }
}
