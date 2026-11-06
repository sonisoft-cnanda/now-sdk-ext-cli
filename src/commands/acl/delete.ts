import {Args, Flags} from '@oclif/core'

import {aclTarget, aclTargetFlags, AclWriteCommand, sysIdArg} from '../../common/acl-command.js'
import {type AclWriteSummary} from '../../services/acl-display.service.js'

export default class AclDelete extends AclWriteCommand<typeof AclDelete> {
  static args = {sys_id: Args.string({description: 'The ACL\'s sys_id.', required: true})}
  static description = `Delete an access control, captured in an update set. Elevates to security_admin for the run.

The platform deletes its role rows with it. It offers Delete on an active record ACL only once inactive, so one is deactivated first (a separate captured update); if anything fails after that, the ACL is reactivated.`
  static enableJsonFlag = true
  static examples = [{command: '<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef --confirm 0123456789abcdef0123456789abcdef --scope x_acme_app --auth dev',
    description: 'Delete, confirming the sys_id'}]
  static flags = {
    ...aclTargetFlags,
    confirm: Flags.string({description: 'Repeat the ACL\'s sys_id exactly.', required: true}),
  }
  protected aclAction = 'acl delete'

  public async run(): Promise<AclWriteSummary> {
    const sysId = sysIdArg(this.args.sys_id)
    return this.report('deleted', await this.manager().delete(sysId, {...aclTarget(this.flags), confirm: this.flags.confirm}))
  }
}
