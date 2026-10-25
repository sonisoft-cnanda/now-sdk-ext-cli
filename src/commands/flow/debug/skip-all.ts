import {FlowDebugger, type FlowDebugSnapshot} from '@sonisoft/now-sdk-ext-core'

import {contextFlag, FlowDebugCommand, timeoutFlag} from '../../../common/flow-debug-command.js'
import {FlowDebugDisplayService} from '../../../services/flow-debug-display.service.js'

export default class FlowDebugSkipAll extends FlowDebugCommand<typeof FlowDebugSkipAll> {
  static description = 'Run a paused debug run to the end, ignoring its breakpoints (Workflow Studio\'s "Skip all breakpoints").'
  static examples = ['<%= config.bin %> <%= command.id %> --context 0123456789abcdef0123456789abcdef --auth dev']
  static flags = {
    context: contextFlag,
    timeout: timeoutFlag,
  }

  public async run(): Promise<FlowDebugSnapshot> {
    const {flags} = this
    const snapshot = await new FlowDebugger(this.instance).skipAll(flags.context, {timeoutMs: flags.timeout * 1000})
    this.print(new FlowDebugDisplayService().snapshot(snapshot))
    return snapshot
  }
}
