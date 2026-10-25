import {FlowDebugger, type FlowDebugSession} from '@sonisoft/now-sdk-ext-core'

import {FlowDebugCommand, parseInputs, parseSteps, startFlags, timeoutFlag} from '../../../common/flow-debug-command.js'
import {FlowDebugDisplayService} from '../../../services/flow-debug-display.service.js'

export default class FlowDebugStart extends FlowDebugCommand<typeof FlowDebugStart> {
  static description = `Start a Workflow Studio debug run (Test > Debug) of a flow or subflow, and leave it paused.

The flow's current draft runs, for real: records it creates or changes are kept. Debug a copy (nex flow copy)
in a scratch app. The run pauses before its first step; this prints its root context id, the steps it can
stop at, and where it is. Continue it with nex flow debug step, resume or skip-all, and always end it: run it
to the end, or nex flow debug cancel. nex flow debug run does all of that in one call.

Subflow inputs are checked against the subflow's declared inputs before anything runs. A JSON array for an
array input is sent the way Workflow Studio sends it. For a flow, --inputs are its trigger outputs, as for
nex flow test.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --flow x_myapp.create_task_copy --inputs \'{"table":"incident","field_values":"short_description=Debug"}\' --break 3 --auth dev',
    '<%= config.bin %> <%= command.id %> -f 0123456789abcdef0123456789abcdef -i @inputs.json --json --auth dev',
  ]
  static flags = {
    ...startFlags(true),
    timeout: timeoutFlag,
  }

  public async run(): Promise<FlowDebugSession> {
    const {flags} = this
    const inputs = await parseInputs(flags.inputs, flags.input)
    const session = await new FlowDebugger(this.instance).start({
      breakpoints: flags.break === undefined ? undefined : parseSteps(flags.break), flow: flags.flow as string, inputs, timeoutMs: flags.timeout * 1000,
    })
    this.print(new FlowDebugDisplayService().session(session))
    return session
  }
}
