import {Args, Flags} from '@oclif/core'
import {type UpdateSetSummary, WorkingSetManager} from '@sonisoft/now-sdk-ext-core'

import {WorkingSetCommand} from '../../common/working-set-command.js'
import {WorkingSetDisplayService} from '../../services/working-set-display.service.js'

export default class UpdateSetComplete extends WorkingSetCommand<typeof UpdateSetComplete> {
  static args = {
    set: Args.string({description: 'sys_id of the In progress, non-Default set to complete.', required: true}),
  }
  static description = `Complete an update set after checking what it holds, and read the state back.

Refused unless the set holds exactly --expected-captures captures, all of the set's own application, one per
record, and no other user is working in it. A completed set is never reopened. Restore your working set
afterwards with nex update-set restore.`
  static examples = ['<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef --expected-captures 3 --auth dev']
  static flags = {
    'expected-captures': Flags.integer({description: 'The number of captures you reviewed in the set.', min: 0, required: true}),
  }
  protected workingSetAction = 'complete'

  public async run(): Promise<UpdateSetSummary> {
    const display = new WorkingSetDisplayService()
    const result = display.summary(await new WorkingSetManager(this.instance).completeUpdateSet(this.args.set, {expectedCaptures: this.flags['expected-captures']}))
    if (!this.jsonEnabled()) for (const line of display.completed(result)) this.log(line)
    return result
  }
}
