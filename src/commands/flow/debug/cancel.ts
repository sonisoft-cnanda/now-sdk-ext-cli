import {type FlowDebugCancelResult, FlowDebugger} from '@sonisoft/now-sdk-ext-core'

import {contextFlag, FlowDebugCommand} from '../../../common/flow-debug-command.js'
import {FlowDebugDisplayService} from '../../../services/flow-debug-display.service.js'

export default class FlowDebugCancel extends FlowDebugCommand<typeof FlowDebugCancel> {
  static description = `End a debug run, and any subflow it stepped into, then read it back. Safe to repeat.

It refuses a flow context the debugger did not start, so it cannot end a real flow run. Needs write, not
execute: it still works under --deny-execute.`
  static examples = ['<%= config.bin %> <%= command.id %> --context 0123456789abcdef0123456789abcdef --auth dev']
  static flags = {
    context: contextFlag,
  }

  public async run(): Promise<FlowDebugCancelResult> {
    const result = await new FlowDebugger(this.instance).cancel(this.flags.context)
    this.print(new FlowDebugDisplayService().cancel(result))
    return result
  }
}
