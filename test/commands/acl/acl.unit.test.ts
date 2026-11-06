import {afterEach, describe, expect, it, jest} from '@jest/globals'
import {Errors} from '@oclif/core'
import {Args, Parser} from '@oclif/core'
import {
  AclError,
  MetadataScopeError,
  AclManager,
  AclPartialError,
  type AclRecord,
  type AclWriteResult,
  refusalFor,
  RoleElevation,
  RoleElevationError,
  ServiceNowInstance,
} from '@sonisoft/now-sdk-ext-core'

import AclAddRole from '../../../src/commands/acl/add-role.js'
import AclCreate from '../../../src/commands/acl/create.js'
import AclDelete from '../../../src/commands/acl/delete.js'
import AclList from '../../../src/commands/acl/list.js'
import AclRemoveRole from '../../../src/commands/acl/remove-role.js'
import AclShow from '../../../src/commands/acl/show.js'
import AclUpdate from '../../../src/commands/acl/update.js'
import Elevation from '../../../src/commands/elevation/index.js'
import {AuthenticatedCommand, elevationRemedy} from '../../../src/common/authenticated-command.js'
import {AclDisplayService, projectAclError} from '../../../src/services/acl-display.service.js'

const ACL = 'a'.repeat(32), SET = 'c'.repeat(32), SCOPE = 'e'.repeat(32)
const record: AclRecord = {active: true, adminOverrides: true, advanced: false, condition: '', decisionType: 'allow', description: 'Agents read',
  name: 'x_app_page', operation: 'read', roles: [{role: 'itil', roleSysId: '1'.repeat(32), sysId: '2'.repeat(32)}], scope: SCOPE,
  scopeName: 'x_app', script: '', sysId: ACL, type: 'ui_page', updatedOn: '2026-11-05 00:00:00'}
const write = {action: 'insert' as const, capture: {action: 'INSERT_OR_UPDATE', currentUpdateSet: {switched: false}, preferenceRowsReplaced: [],
  preferencesUnchanged: true, recordScope: SCOPE, updateSetName: 'QA', updateSetScope: SCOPE, updateSetSysId: SET}, messages: [],
  scope: {scope: 'x_app', sysId: SCOPE}, sysId: ACL, table: 'sys_security_acl'}
const result: AclWriteResult = {acl: record, removedAutomaticRoles: ['snc_internal'], warnings: [], writes: [write]}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const command = (Ctor: any, args: object, flags: object, json = true) => {
  const lines: string[] = []
  const target = Object.assign(Object.create(Ctor.prototype), {
    _logger: {debug: jest.fn(), error: jest.fn()}, args, authLogger: {error: jest.fn(), warn: jest.fn()}, flags,
    instance: new ServiceNowInstance({alias: 'unit-test'}), jsonEnabled: () => json, log: (line: string) => lines.push(line),
  })
  return {lines, target}
}

const scope = {scope: 'x_app', 'update-set': SET}

afterEach(() => jest.restoreAllMocks())

describe('nex acl commands', () => {
  it('create maps its flags to the manager and reports the verified writes', async () => {
    const create = jest.spyOn(AclManager.prototype, 'create').mockResolvedValue(result)
    const {lines, target} = command(AclCreate, {}, {...scope, 'admin-overrides': false, condition: 'active=true', description: 'Agents read',
      inactive: false, name: 'x_app_page', operation: 'read', role: ['itil', 'admin'], type: 'ui_page'}, false)
    const summary = await target.run()
    expect(create).toHaveBeenCalledWith({active: true, adminOverrides: false, condition: 'active=true', description: 'Agents read', name: 'x_app_page',
      operation: 'read', roles: ['itil', 'admin'], scope: {scope: 'x_app'}, type: 'ui_page', updateSet: SET})
    expect(summary.removedAutomaticRoles).toEqual(['snc_internal'])
    expect(lines[0]).toBe(`Verified ACL created: x_app_page ${ACL}`)
    expect(lines).toContain('Captured in: QA (' + SET + ')')
    expect(lines).toContain('Removed the role the platform added on its own: snc_internal')
  })

  it('create reads --script-file, and --inactive creates it inactive', async () => {
    const create = jest.spyOn(AclManager.prototype, 'create').mockResolvedValue(result)
    const {target} = command(AclCreate, {}, {...scope, inactive: true, operation: 'read', 'script-file': 'package.json', table: 'incident', type: 'record'})
    await target.run()
    expect(create.mock.calls[0][0]).toMatchObject({active: false, table: 'incident'})
    expect(create.mock.calls[0][0].script).toContain('"name"')
  })

  it('every write command elevates to security_admin; reads do not', () => {
    for (const Ctor of [AclCreate, AclUpdate, AclDelete, AclAddRole, AclRemoveRole]) expect(Ctor.elevatedRoles).toEqual(['security_admin'])
    for (const Ctor of [AclList, AclShow, Elevation]) expect(Ctor.elevatedRoles).toEqual([])
  })

  it('update refuses to run with nothing to change', async () => {
    const update = jest.spyOn(AclManager.prototype, 'update')
    await expect(command(AclUpdate, {sys_id: ACL}, scope).target.run()).rejects.toThrow('Pass at least one change')
    expect(update).not.toHaveBeenCalled()
  })

  it('update passes only the fields given, and --no-active', async () => {
    const update = jest.spyOn(AclManager.prototype, 'update').mockResolvedValue({...result, previous: record})
    const {target} = command(AclUpdate, {sys_id: ACL}, {...scope, active: false})
    await target.run()
    expect(update).toHaveBeenCalledWith(ACL, {active: false, scope: {scope: 'x_app'}, updateSet: SET})
  })

  it('delete passes the confirmation through, and refuses a bad sys_id before any call', async () => {
    const del = jest.spyOn(AclManager.prototype, 'delete').mockResolvedValue({previous: record, removedAutomaticRoles: [], warnings: [], writes: [write]})
    await command(AclDelete, {sys_id: ACL}, {...scope, confirm: ACL}).target.run()
    expect(del).toHaveBeenCalledWith(ACL, {confirm: ACL, scope: {scope: 'x_app'}, updateSet: SET})
    await expect(command(AclDelete, {sys_id: 'nope'}, {...scope, confirm: 'nope'}).target.run()).rejects.toThrow('sys_id must be')
  })

  it('add-role and remove-role pass the ACL, the role and the target', async () => {
    const add = jest.spyOn(AclManager.prototype, 'addRole').mockResolvedValue(result)
    const remove = jest.spyOn(AclManager.prototype, 'removeRole').mockResolvedValue(result)
    await command(AclAddRole, {acl: ACL, role: 'admin'}, scope).target.run()
    await command(AclRemoveRole, {acl: ACL, role: 'itil'}, {'scope-id': SCOPE}).target.run()
    expect(add).toHaveBeenCalledWith(ACL, 'admin', {scope: {scope: 'x_app'}, updateSet: SET})
    expect(remove).toHaveBeenCalledWith(ACL, 'itil', {scope: {sysId: SCOPE}})
  })

  it('takes the ACL, then the role, as positional arguments', () => {
    // oclif reads positional arguments in key order: a sort-on-save once made it ROLE ACL.
    expect(Object.keys(AclAddRole.args)).toEqual(['acl', 'role'])
    expect(Object.keys(AclRemoveRole.args)).toEqual(['acl', 'role'])
  })

  it('a write needs exactly one of --scope and --scope-id', async () => {
    await expect(command(AclAddRole, {acl: ACL, role: 'admin'}, {}).target.run()).rejects.toThrow('exactly one of --scope and --scope-id')
  })

  it('list maps its filters, including global and --no-active', async () => {
    const list = jest.spyOn(AclManager.prototype, 'list').mockResolvedValue([record])
    const {lines, target} = command(AclList, {}, {active: false, operation: 'read', scope: 'global', table: 'incident'}, false)
    await expect(target.run()).resolves.toMatchObject({count: 1})
    expect(list).toHaveBeenCalledWith({active: false, operation: 'read', scope: 'global', table: 'incident'})
    expect(lines[0]).toMatch(/^SYS_ID +STATE +TYPE/)
    expect(lines.at(-1)).toBe('1 ACL(s)')
  })

  it('show prints the ACL and --json returns its script', async () => {
    jest.spyOn(AclManager.prototype, 'get').mockResolvedValue({...record, advanced: true, script: 'answer = true;\nanswer = false;'})
    const text = command(AclShow, {sys_id: ACL}, {}, false)
    await text.target.run()
    expect(text.lines).toContain('Script: 2 line(s)')
    await expect(command(AclShow, {sys_id: ACL}, {}).target.run()).resolves.toMatchObject({script: 'answer = true;\nanswer = false;'})
  })

  it('elevation shows what the user may elevate to and what is elevated', async () => {
    jest.spyOn(RoleElevation.prototype, 'status').mockResolvedValue({available: [{description: 'High Security', name: 'security_admin'}], elevated: ['security_admin']})
    const {lines, target} = command(Elevation, {}, {}, false)
    await target.run()
    expect(lines[1]).toContain('ELEVATED')
    expect(lines.at(-1)).toBe('Elevated in this run\'s session: security_admin')
  })
})

describe('nex acl failures', () => {
  const caught = async (error: Error, json = true) => {
    const {target} = command(AclCreate, {}, scope, json)
    target.executing = true
    let thrown: unknown
    // AuthenticatedCommand.catch ends in oclif's handler; stop there to read what it was given.
    jest.spyOn(AuthenticatedCommand.prototype as never, 'catch' as never).mockImplementation(async (e: unknown) => { thrown = e })
    const {Command} = await import('@oclif/core')
    jest.spyOn(Command.prototype as never, 'catch' as never).mockImplementation(async (e: unknown) => { thrown = e })
    await target.catch(error)
    return thrown as Errors.CLIError & {acl?: {code: string; messages: string[]; sysId?: string}}
  }

  it('projects an ACL refusal with its remediation', async () => {
    const error = await caught(new AclError('elevation_required', 'security_admin'))
    expect(error).toBeInstanceOf(Errors.CLIError)
    expect(error.acl).toMatchObject({code: 'elevation_required'})
    expect(error.message).toContain('elevation_required')
  })

  it('names the ACL and the failed step of a partial change', async () => {
    const error = await caught(new AclPartialError(ACL, 'create', 'inactive', new AclError('roles_not_applied')), false)
    expect(error.acl).toMatchObject({code: 'partially_applied', sysId: ACL})
    expect(error.acl?.messages).toContain('Failed step: roles_not_applied')
    expect(error.message).toContain('the ACL is inactive')
  })

  it('reports a policy refusal as one, with the ACL it left behind', async () => {
    const refusal = Object.assign(refusalFor('write', 'command-line flag'), {aclState: 'inactive', aclSysId: ACL})
    const error = await caught(refusal)
    expect(error.acl).toMatchObject({code: 'policy_refused', sysId: ACL})
    expect(error.message).toBe('ACL operation refused by policy.')
  })

  it('reports an elevation failure through oclif\'s catch, with its code, roles and remediation (the --json error)', async () => {
    const {Command} = await import('@oclif/core')
    let thrown: (Errors.CLIError & {elevation?: unknown}) | undefined
    jest.spyOn(Command.prototype as never, 'catch' as never).mockImplementation(async (e: unknown) => { thrown = e as never })
    const {target} = command(AclCreate, {}, scope)
    target.executing = true
    await target.catch(new RoleElevationError('not_elevatable', ['security_admin'], ['x_app.auditor']))
    expect(thrown).toBeInstanceOf(Errors.CLIError)
    expect(thrown?.elevation).toEqual({available: ['x_app.auditor'], code: 'not_elevatable', roles: ['security_admin']})
    expect((thrown as unknown as {code: string}).code).toBe('not_elevatable')
    expect(thrown?.suggestions?.[0]).toContain('may elevate to: x_app.auditor')
  })

  it('nex metadata keeps an elevation failure\'s own code too', async () => {
    const {Command} = await import('@oclif/core')
    const {default: MetadataUpdate} = await import('../../../src/commands/metadata/update.js')
    let thrown: unknown
    jest.spyOn(Command.prototype as never, 'catch' as never).mockImplementation(async (e: unknown) => { thrown = e })
    const {target} = command(MetadataUpdate, {}, {table: 'sys_script_include'})
    target.executing = true
    await target.catch(new RoleElevationError('api_unavailable', [], [], 404))
    expect(thrown).toMatchObject({code: 'api_unavailable', elevation: {code: 'api_unavailable', status: 404}})
  })

  it('projects an elevation failure that was the failed step of a partial change', () => {
    const failure = projectAclError(new AclPartialError(ACL, 'create', 'inactive', new RoleElevationError('not_applied', ['security_admin'])), {action: 'acl create'})
    expect(failure.messages).toContain('Failed step: not_applied')
    expect(failure.remediation.join(' ')).toContain('strict_elevate_privilege')
    expect(projectAclError(new AclError('acl_not_found'), {action: 'acl show'}).writeAttempted).toBeUndefined()
  })

  it('calls a refused read a read, with read advice', () => {
    const failure = projectAclError(new MetadataScopeError('scope_unknown'), {action: 'acl list'})
    expect(failure.message).toBe('ACL read refused: scope_unknown.')
    expect(failure.remediation[0]).toContain('--scope')
    expect(failure.writeAttempted).toBeUndefined()
    expect(projectAclError(new MetadataScopeError('elevation_required'), {action: 'acl create'}).remediation[0]).toContain('security_admin')
  })

  it('remediates each elevation failure', () => {
    expect(elevationRemedy(new RoleElevationError('not_elevatable', ['admin'], ['security_admin']))[0]).toContain('may elevate to: security_admin')
    expect(elevationRemedy(new RoleElevationError('not_elevatable', ['admin'], []))[0]).toContain('may not elevate to any role')
    expect(elevationRemedy(new RoleElevationError('api_unavailable'))[0]).toContain('UI Impersonate API')
    expect(elevationRemedy(new RoleElevationError('invalid_role'))[0]).toContain('--elevate security_admin')
  })
})

describe('--elevate', () => {
  it('merges the flag with the command\'s own roles, once each, into the instance settings', () => {
    const {target} = command(AclCreate, {}, {auth: 'dev', elevate: ['x_app.admin', 'security_admin']})
    expect(target.instanceSettings('dev', {}).elevatedRoles).toEqual(['security_admin', 'x_app.admin'])
    const list = command(AclList, {}, {auth: 'dev'}).target.instanceSettings('dev', {})
    expect(list).not.toHaveProperty('elevatedRoles')
    expect(command(AclList, {}, {elevate: ['security_admin']}).target.instanceSettings('dev', {}).elevatedRoles).toEqual(['security_admin'])
  })

  it('does not swallow the arguments that follow it', async () => {
    const parsed = await Parser.parse(['--elevate', 'security_admin', 'global', 'fix.js'], {
      args: {scope: Args.string(), file: Args.string()}, flags: {elevate: AuthenticatedCommand.baseFlags.elevate},
    })
    expect(parsed.flags.elevate).toEqual(['security_admin'])
    expect(parsed.args).toEqual({file: 'fix.js', scope: 'global'})
  })
})

describe('AclDisplayService', () => {
  it('shows a security_admin role by sys_id until its name is readable', () => {
    const lines = new AclDisplayService().aclLines({...record, roles: [{role: '', roleSysId: '4'.repeat(32), sysId: '5'.repeat(32)}]})
    expect(lines).toContain(`Roles: ${'4'.repeat(32)}`)
  })

  it('keeps instance text to one line', () => {
    const acl = new AclDisplayService().acl({...record, description: 'one\ntwo'})
    expect(acl.description).toBe('one two')
  })

  it('projects an unknown error without its message', () => {
    expect(projectAclError(new Error('private-sentinel'), {action: 'acl create'}).message).not.toContain('sentinel')
  })
})
