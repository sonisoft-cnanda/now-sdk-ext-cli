import {Args} from '@oclif/core'

import {aclTarget, aclTargetFlags, AclWriteCommand, sysIdArg} from '../../common/acl-command.js'
import {type AclWriteSummary} from '../../services/acl-display.service.js'

export default class AclAddRole extends AclWriteCommand<typeof AclAddRole> {
  static args = {
    acl: Args.string({description: 'The ACL\'s sys_id.', required: true}),
    role: Args.string({description: 'Role name.', required: true}),
  }
  static description = 'Add a role to an access control, captured in an update set of the ACL\'s own application. Elevates to security_admin for the run. Any one of an ACL\'s roles passes it.'
  static enableJsonFlag = true
  static examples = [{command: '<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef itil --scope x_acme_app --auth dev', description: 'Add itil'}]
  static flags = {...aclTargetFlags}
  protected aclAction = 'acl add-role'

  public async run(): Promise<AclWriteSummary> {
    return this.report('role added', await this.manager().addRole(sysIdArg(this.args.acl), this.args.role, aclTarget(this.flags)))
  }
}
