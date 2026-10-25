import {Flags} from '@oclif/core'
import {type FlowDebugBreakpoint, FlowDebugger} from '@sonisoft/now-sdk-ext-core'

import {contextFlag, FlowDebugCommand, parseSteps} from '../../../common/flow-debug-command.js'
import {FlowDebugDisplayService} from '../../../services/flow-debug-display.service.js'

export default class FlowDebugBreak extends FlowDebugCommand<typeof FlowDebugBreak> {
  static description = `Set, add, remove, clear or list a debug run's breakpoints, by step number.

Steps are the numbers Workflow Studio shows. nex looks each one up in the debugger's own list of places it
can stop, and refuses one it cannot, listing the valid steps. With no option, lists the breakpoints. While
the run is paused inside a subflow it stepped into, breakpoints apply to that subflow.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --context 0123456789abcdef0123456789abcdef --steps 2,3 --auth dev',
    '<%= config.bin %> <%= command.id %> -c 0123456789abcdef0123456789abcdef --add 4 --auth dev',
    '<%= config.bin %> <%= command.id %> -c 0123456789abcdef0123456789abcdef --clear --auth dev',
  ]
  static flags = {
    add: Flags.string({description: 'Add breakpoints at these steps, keeping the others.', exclusive: ['steps', 'remove', 'clear']}),
    clear: Flags.boolean({description: 'Remove every breakpoint.', exclusive: ['steps', 'add', 'remove']}),
    context: contextFlag,
    remove: Flags.string({description: 'Remove the breakpoints at these steps.', exclusive: ['steps', 'add', 'clear']}),
    steps: Flags.string({char: 's', description: 'Replace the breakpoints with these steps: 2,3.', exclusive: ['add', 'remove', 'clear']}),
  }

  public async run(): Promise<FlowDebugBreakpoint[]> {
    const {flags} = this
    const dbg = new FlowDebugger(this.instance)
    const ctx = flags.context
    const held = async () => (await dbg.getBreakpoints(ctx)).map(b => b.step?.number).filter((n): n is number => n !== undefined)
    let breakpoints: FlowDebugBreakpoint[]
    if (flags.steps !== undefined) {
      breakpoints = await dbg.setBreakpoints(ctx, parseSteps(flags.steps))
    } else if (flags.add !== undefined) {
      breakpoints = await dbg.setBreakpoints(ctx, [...new Set([...(await held()), ...parseSteps(flags.add)])].sort((a, b) => a - b))
    } else if (flags.remove !== undefined || flags.clear) {
      const removing = flags.clear ? undefined : parseSteps(flags.remove as string)
      const keep = removing === undefined ? [] : (await held()).filter(n => !removing.includes(n))
      if (keep.length === 0) {
        await dbg.clearBreakpoints(ctx)
        breakpoints = []
      } else {
        breakpoints = await dbg.setBreakpoints(ctx, keep)
      }
    } else {
      breakpoints = await dbg.getBreakpoints(ctx)
    }

    this.print(new FlowDebugDisplayService().breakpoints(breakpoints))
    return breakpoints
  }
}
