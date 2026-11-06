import {Args} from '@oclif/core'

import {aclTarget, aclTargetFlags, AclWriteCommand, sysIdArg} from '../../common/acl-command.js'
import {type AclWriteSummary} from '../../services/acl-display.service.js'

export default class AclRemoveRole extends AclWriteCommand<typeof AclRemoveRole> {
  static args = {
    acl: Args.string({description: 'The ACL\'s sys_id.', required: true}),
    role: Args.string({description: 'Role name.', required: true}),
  }
  static description = `Remove a role from an access control, captured in an update set of the ACL's own application. Elevates to security_admin for the run.

Removing the last role makes the platform add snc_internal back (every internal user then passes); the result warns. Add the role the ACL should have first.`
  static enableJsonFlag = true
  static examples = [{command: '<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef snc_internal --scope x_acme_app --auth dev', description: 'Remove snc_internal'}]
  static flags = {...aclTargetFlags}
  protected aclAction = 'acl remove-role'

  public async run(): Promise<AclWriteSummary> {
    return this.report('role removed', await this.manager().removeRole(sysIdArg(this.args.acl), this.args.role, aclTarget(this.flags)))
  }
}
