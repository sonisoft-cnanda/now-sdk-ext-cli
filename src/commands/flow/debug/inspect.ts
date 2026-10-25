import {Flags} from '@oclif/core'
import {FlowDebugger, type FlowDebugSnapshot} from '@sonisoft/now-sdk-ext-core'

import {contextFlag, FlowDebugCommand} from '../../../common/flow-debug-command.js'
import {FlowDebugDisplayService} from '../../../services/flow-debug-display.service.js'

export default class FlowDebugInspect extends FlowDebugCommand<typeof FlowDebugInspect> {
  static description = `Show a debug run without moving it: where it is, and each step's runtime inputs and outputs.

Values longer than 200 characters are cut, and the engine's internal outputs (__action_status__ and the like)
are hidden, unless --full. --json returns the whole snapshot. Values are the run's real data.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --context 0123456789abcdef0123456789abcdef --auth dev',
    '<%= config.bin %> <%= command.id %> -c 0123456789abcdef0123456789abcdef --step 1 --full --auth dev',
  ]
  static flags = {
    context: contextFlag,
    full: Flags.boolean({description: 'Show values in full, and the engine\'s internal outputs.'}),
    step: Flags.integer({description: 'Only this step\'s inputs and outputs.', min: 1}),
  }

  public async run(): Promise<FlowDebugSnapshot> {
    const {flags} = this
    const snapshot = await new FlowDebugger(this.instance).inspect(flags.context)
    const display = new FlowDebugDisplayService()
    this.print([...display.snapshot(snapshot, {full: flags.full}), ...display.steps(snapshot, {full: flags.full, step: flags.step})])
    return snapshot
  }
}
