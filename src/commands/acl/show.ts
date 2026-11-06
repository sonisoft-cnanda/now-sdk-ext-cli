import {Args} from '@oclif/core'
import {type AclRecord} from '@sonisoft/now-sdk-ext-core'

import {AclBaseCommand, sysIdArg} from '../../common/acl-command.js'
import {AclDisplayService} from '../../services/acl-display.service.js'

export default class AclShow extends AclBaseCommand<typeof AclShow> {
  static args = {sys_id: Args.string({description: 'The ACL\'s sys_id.', required: true})}
  static description = 'Show one access control with its roles. --json includes its script.'
  static enableJsonFlag = true
  static examples = [{command: '<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef --auth dev', description: 'One ACL'}]
  protected aclAction = 'acl show'

  public async run(): Promise<AclRecord> {
    const display = new AclDisplayService()
    const acl = display.acl(await this.manager().get(sysIdArg(this.args.sys_id)))
    if (!this.jsonEnabled()) for (const line of display.aclLines(acl)) this.log(line)
    return acl
  }
}
