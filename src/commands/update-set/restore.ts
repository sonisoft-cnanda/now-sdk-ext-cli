import {Flags} from '@oclif/core'
import {type RestoreWorkingSetResult, WorkingSetManager} from '@sonisoft/now-sdk-ext-core'

import {WorkingSetCommand} from '../../common/working-set-command.js'
import {WorkingSetDisplayService} from '../../services/working-set-display.service.js'

export default class UpdateSetRestore extends WorkingSetCommand<typeof UpdateSetRestore> {
  static description = `Put back the working set that nex update-set use reported as "previous".

When that set has closed since, the application's single In progress Default is made current instead.`
  static examples = ['<%= config.bin %> <%= command.id %> --application global --update-set 0123456789abcdef0123456789abcdef --auth dev']
  static flags = {
    application: Flags.string({description: 'previous.application: global or a sys_scope sys_id.', required: true}),
    'update-set': Flags.string({description: 'previous.updateSet: the update set sys_id.', required: true}),
  }
  protected workingSetAction = 'restore'

  public async run(): Promise<RestoreWorkingSetResult> {
    const result = await new WorkingSetManager(this.instance).restoreWorkingSet({application: this.flags.application, updateSet: this.flags['update-set']})
    if (!this.jsonEnabled()) for (const line of new WorkingSetDisplayService().restored(result)) this.log(line)
    return result
  }
}
