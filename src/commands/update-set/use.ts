import {Args} from '@oclif/core'
import {type UseUpdateSetResult, WorkingSetManager} from '@sonisoft/now-sdk-ext-core'

import {WorkingSetCommand} from '../../common/working-set-command.js'
import {WorkingSetDisplayService} from '../../services/working-set-display.service.js'

export default class UpdateSetUse extends WorkingSetCommand<typeof UpdateSetUse> {
  static args = {
    set: Args.string({description: 'sys_id of an In progress, non-Default update set.', required: true}),
  }
  static description = `Make an update set your working set, for every later session, and read it back.

Saves apps.current_app (the set's application), sys_update_set and updateSetForScope<application>, so the
next session, background script or Table API write captures into this set. Keep "previous" from the result
and pass it to nex update-set restore when the work is done. Defaults are refused.`
  static examples = ['<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef --json --auth dev']
  protected workingSetAction = 'use'

  public async run(): Promise<UseUpdateSetResult> {
    const display = new WorkingSetDisplayService()
    const result = await new WorkingSetManager(this.instance).useUpdateSet(this.args.set)
    const safe = {current: result.current, previous: result.previous, updateSet: display.summary(result.updateSet)}
    if (!this.jsonEnabled()) for (const line of display.used(safe)) this.log(line)
    return safe
  }
}
