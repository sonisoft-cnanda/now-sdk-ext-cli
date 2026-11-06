import {Args, Flags} from '@oclif/core'
import {type AclUpdateOptions} from '@sonisoft/now-sdk-ext-core'

import {aclFieldFlags, aclTarget, aclTargetFlags, AclWriteCommand, reject, scriptInput, sysIdArg} from '../../common/acl-command.js'
import {type AclWriteSummary} from '../../services/acl-display.service.js'

export default class AclUpdate extends AclWriteCommand<typeof AclUpdate> {
  static args = {sys_id: Args.string({description: 'The ACL\'s sys_id.', required: true})}
  static description = 'Change an access control\'s fields in its application and an update set. Elevates to security_admin for the run. Roles change with nex acl add-role and remove-role.'
  static enableJsonFlag = true
  static examples = [
    {command: '<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef --scope x_acme_app --condition active=true --auth dev', description: 'Add a condition'},
    {command: '<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef --scope x_acme_app --no-active --auth dev', description: 'Deactivate'},
  ]
  static flags = {
    ...aclTargetFlags,
    ...aclFieldFlags,
    active: Flags.boolean({allowNo: true, description: 'Activate (--active) or deactivate (--no-active).'}),
    operation: Flags.string({description: 'Operation name: read, write, create, delete, execute, …'}),
  }
  protected aclAction = 'acl update'

  public async run(): Promise<AclWriteSummary> {
    const {flags} = this
    const script = await scriptInput(flags)
    const options: AclUpdateOptions = {
      ...aclTarget(flags),
      ...(flags.active === undefined ? {} : {active: flags.active}),
      ...(flags.operation === undefined ? {} : {operation: flags.operation}),
      ...(flags.condition === undefined ? {} : {condition: flags.condition}),
      ...(script === undefined ? {} : {script}),
      ...(flags['admin-overrides'] === undefined ? {} : {adminOverrides: flags['admin-overrides']}),
      ...(flags['decision-type'] === undefined ? {} : {decisionType: flags['decision-type']}),
      ...(flags.description === undefined ? {} : {description: flags.description}),
    }
    if (Object.keys(options).every(key => ['scope', 'storeCustomization', 'updateSet'].includes(key))) {
      reject('Pass at least one change: --active/--no-active, --operation, --condition, --script, --script-file, '
        + '--admin-overrides/--no-admin-overrides, --decision-type or --description. Roles change with nex acl add-role / remove-role.')
    }

    return this.report('updated', await this.manager().update(sysIdArg(this.args.sys_id), options))
  }
}
