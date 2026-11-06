import {Flags} from '@oclif/core'
import {type AclListOptions, type AclRecord} from '@sonisoft/now-sdk-ext-core'

import {AclBaseCommand} from '../../common/acl-command.js'
import {identifier} from '../../common/metadata-command.js'
import {AclDisplayService} from '../../services/acl-display.service.js'
import {ID, NAME} from '../../services/metadata-display.service.js'

export default class AclList extends AclBaseCommand<typeof AclList> {
  static description = 'List access controls (sys_security_acl) with their roles. Needs at least one of --table, --name, --scope or --scope-id. Reading needs no elevation; a security_admin role row shows its sys_id until the session is elevated.'
  static enableJsonFlag = true
  static examples = [
    {command: '<%= config.bin %> <%= command.id %> --table incident --auth dev', description: 'ACLs of a table and its fields'},
    {command: '<%= config.bin %> <%= command.id %> --scope x_acme_app --operation write --json --auth dev', description: 'An application\'s write ACLs, as JSON'},
  ]
  static flags = {
    active: Flags.boolean({allowNo: true, description: 'Only active (--active) or inactive (--no-active) ACLs.'}),
    name: Flags.string({description: 'Exact ACL name, e.g. incident.short_description or a UI page name.'}),
    operation: Flags.string({description: 'Operation name: read, write, create, delete, execute, …'}),
    scope: Flags.string({description: 'Only this application\'s ACLs: its scope name, or global.', exclusive: ['scope-id']}),
    'scope-id': Flags.string({description: 'Only this application\'s ACLs, by sys_scope sys_id.', exclusive: ['scope']}),
    table: Flags.string({description: 'ACLs of this table: the table, table.* and table.<field>.'}),
    type: Flags.string({description: 'ACL type: record, ui_page, rest_endpoint, client_callable_script_include, …'}),
  }
  protected aclAction = 'acl list'

  public async run(): Promise<{acls: AclRecord[]; count: number}> {
    const {flags} = this
    const scopeName = identifier(flags, 'scope', NAME)
    const scopeId = identifier(flags, 'scope-id', ID)
    const options: AclListOptions = {
      ...(flags.table === undefined ? {} : {table: flags.table}),
      ...(flags.name === undefined ? {} : {name: flags.name}),
      ...(flags.operation === undefined ? {} : {operation: flags.operation}),
      ...(flags.type === undefined ? {} : {type: flags.type}),
      ...(flags.active === undefined ? {} : {active: flags.active}),
      ...(scopeId ? {scope: {sysId: scopeId}} : scopeName ? {scope: scopeName === 'global' ? 'global' : {scope: scopeName}} : {}),
    }
    const display = new AclDisplayService()
    const acls = (await this.manager().list(options)).map(acl => display.acl(acl))
    if (!this.jsonEnabled()) for (const line of display.listLines(acls)) this.log(line)
    return {acls, count: acls.length}
  }
}
