import {Flags} from '@oclif/core'
import {FlowDebugger, type FlowDebugSessionSummary} from '@sonisoft/now-sdk-ext-core'

import {FlowDebugCommand} from '../../../common/flow-debug-command.js'
import {FlowDebugDisplayService} from '../../../services/flow-debug-display.service.js'

export default class FlowDebugList extends FlowDebugCommand<typeof FlowDebugList> {
  static description = `List debug runs that are still open on the instance (paused, waiting or running), newest first.

A run left paused, by a crashed terminal or an agent that never cancelled, holds a flow context open. Find it
here and end it with nex flow debug cancel.`
  static examples = [
    '<%= config.bin %> <%= command.id %> --auth dev',
    '<%= config.bin %> <%= command.id %> --created-by admin --json --auth dev',
  ]
  static flags = {
    'created-by': Flags.string({description: 'Only runs started by this user name.'}),
    limit: Flags.integer({default: 50, description: 'At most this many.', max: 500, min: 1}),
  }

  public async run(): Promise<FlowDebugSessionSummary[]> {
    const sessions = await new FlowDebugger(this.instance).listSessions({createdBy: this.flags['created-by'], limit: this.flags.limit})
    this.print(new FlowDebugDisplayService().sessions(sessions))
    return sessions
  }
}
