 
import { Args, Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { resolveDraftVersion } from '../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../services/workflow-display.service.js'

export class Discard extends AuthenticatedCommand<typeof Discard> {

  static args = {
    workflow: Args.string({ description: 'Workflow name or sys_id (omit when using --version)', required: false }),
  }
static description = 'Discard your checked-out draft of a legacy workflow, keeping the published version.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> "Laptop Request" --auth dev',
      description: 'Throw away your draft',
    },
  ]
static flags = {
    'version': Flags.string({ char: 'v', description: 'Draft version sys_id' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Discard)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const version = await resolveDraftVersion(wm, args.workflow, flags.version)
      await wm.discardCheckout(version)
      for (const line of new WorkflowDisplayService().formatChange('Draft discarded.', { version }, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when discarding draft.', error as Error)
      this.error(error as Error)
    }
  }
}
