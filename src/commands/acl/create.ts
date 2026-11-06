import {Flags} from '@oclif/core'
import {type AclCreateOptions} from '@sonisoft/now-sdk-ext-core'

import {aclFieldFlags, aclTarget, aclTargetFlags, AclWriteCommand, scriptInput} from '../../common/acl-command.js'
import {type AclWriteSummary} from '../../services/acl-display.service.js'

export default class AclCreate extends AclWriteCommand<typeof AclCreate> {
  static description = `Create an access control in an application and update set, with its roles. Elevates to security_admin for the run.

A record ACL is named from --table and optional --field ('*' for every field); other types take --name. With roles, the ACL is inserted inactive, given the roles, cleared of the snc_internal role the platform adds to a role-less ACL, checked, and only then activated. Every write is verified by reading back the record and its capture.`
  static enableJsonFlag = true
  static examples = [
    {command: '<%= config.bin %> <%= command.id %> --scope x_acme_app --update-set <set> --operation read --table x_acme_app_request --field cost --role x_acme_app.manager --auth dev',
      description: 'A field read ACL for one role'},
    {command: '<%= config.bin %> <%= command.id %> --scope x_acme_app --operation read --type ui_page --name x_acme_app_dashboard --role itil --auth dev',
      description: 'A UI page ACL'},
  ]
  static flags = {
    ...aclTargetFlags,
    ...aclFieldFlags,
    field: Flags.string({description: 'Record ACLs: the field, or * for every field. Omit for the table.'}),
    inactive: Flags.boolean({default: false, description: 'Create it inactive.'}),
    name: Flags.string({description: 'Non-record types: the resource name (UI page, REST endpoint, script include, …).'}),
    operation: Flags.string({description: 'Operation name: read, write, create, delete, execute, …', required: true}),
    role: Flags.string({description: 'A role that passes the ACL. Repeatable: any one of them passes.', multiple: true}),
    table: Flags.string({description: 'Record ACLs: the table.'}),
    type: Flags.string({default: 'record', description: 'ACL type (sys_security_type name).'}),
  }
  protected aclAction = 'acl create'

  public async run(): Promise<AclWriteSummary> {
    const {flags} = this
    const script = await scriptInput(flags)
    const options: AclCreateOptions = {
      ...aclTarget(flags), active: !flags.inactive, operation: flags.operation, type: flags.type,
      ...(flags.table === undefined ? {} : {table: flags.table}),
      ...(flags.field === undefined ? {} : {field: flags.field}),
      ...(flags.name === undefined ? {} : {name: flags.name}),
      ...(flags.role === undefined ? {} : {roles: flags.role}),
      ...(flags.condition === undefined ? {} : {condition: flags.condition}),
      ...(script === undefined ? {} : {script}),
      ...(flags['admin-overrides'] === undefined ? {} : {adminOverrides: flags['admin-overrides']}),
      ...(flags['decision-type'] === undefined ? {} : {decisionType: flags['decision-type']}),
      ...(flags.description === undefined ? {} : {description: flags.description}),
    }
    return this.report('created', await this.manager().create(options))
  }
}
