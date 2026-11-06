import {
  AclError,
  type AclRecord,
  type AclWriteResult,
  type ElevationStatus,
  isPolicyRefusal,
  MetadataScopeError,
  MetadataVerificationError,
  redactMessage,
} from '@sonisoft/now-sdk-ext-core'

import {elevationRemedy, isRoleElevationError} from '../common/authenticated-command.js'
import {MetadataDisplayService, type MetadataFailure, MetadataInputError, projectMetadataError} from './metadata-display.service.js'

// Values come from the instance: one line each, no control characters or markup.
const clean = (text: string | undefined): string => (text ?? '').replaceAll(/\p{Cc}/gu, ' ')
const cleanMessage = (text: string): string => redactMessage(text).replaceAll(/<[^>]*>/g, '[omitted]').replaceAll(/\p{Cc}/gu, ' ')

const ACL_REMEDIATION: Record<string, string> = {
  acl_not_found: 'Check the sys_id with nex acl list.',
  confirmation_required: 'Pass --confirm repeating the ACL\'s sys_id exactly.',
  elevation_required: 'The session is not elevated to security_admin. nex acl elevates on its own; for other commands pass --elevate security_admin. Run nex elevation to check.',
  field_not_found: 'The table and the tables it extends have no such field (detail). Check the column name.',
  filter_required: 'Pass at least one of --table, --name or --scope/--scope-id.',
  invalid_input: 'A value failed validation (detail names it). Names, roles and tables are identifiers; a name cannot contain javascript:.',
  operation_not_found: 'No sys_security_operation has that name (read, write, create, delete, execute, …).',
  partially_applied: 'The change stopped part way. The message says the ACL\'s state as read back; read it with nex acl show <sys_id> before retrying.',
  role_already_present: 'The ACL already has that role.',
  role_not_found: 'No role has that name, or (for security_admin) the session cannot see it.',
  role_not_present: 'The ACL does not have that role. Read its roles with nex acl show <sys_id>.',
  roles_not_applied: 'The ACL\'s roles did not match the requested roles, so it was left inactive. Read it with nex acl show <sys_id>.',
  scope_mismatch: 'Pass the ACL\'s own application with --scope or --scope-id (nex acl show <sys_id> names it).',
  table_not_found: 'No table has that name.',
  type_not_found: 'No sys_security_type has that name (record, ui_page, rest_endpoint, client_callable_script_include, …).',
}

const READS = new Set(['acl list', 'acl show'])
const READ_REMEDIATION = 'Check --scope/--scope-id: an active application\'s scope name, global, or a sys_scope sys_id. Then retry; a read changes nothing.'

/** A metadata-writer error or a policy refusal, worded for nex acl. */
function projectWriterError(error: unknown, context: {action: string; sysId?: unknown}): MetadataFailure {
  const failure = projectMetadataError(error, {...context, table: 'sys_security_acl'})
  if (failure.code === 'policy_refused') failure.message = 'ACL operation refused by policy.'
  if (error instanceof MetadataScopeError) {
    // list and show only read: a scope that does not resolve is not a refused write.
    if (READS.has(context.action)) {
      failure.message = `ACL read refused: ${error.code}.`
      failure.remediation = [ACL_REMEDIATION[error.code] ?? READ_REMEDIATION]
      delete failure.writeAttempted
    } else if (ACL_REMEDIATION[error.code]) {
      failure.remediation = [ACL_REMEDIATION[error.code]]
    }
  }

  // A refusal after a create or delete carries the ACL it left behind.
  const left = (error as {aclState?: unknown; aclSysId?: unknown;})
  if (typeof left.aclSysId === 'string') failure.sysId = left.aclSysId
  if (typeof left.aclState === 'string') failure.messages.push(`The ACL is ${left.aclState} (read back).`)
  return failure
}

/** A failed nex acl command, as reported: the metadata failure shape, extended with ACL and elevation codes. */
export function projectAclError(error: unknown, context: {action: string; sysId?: unknown}): MetadataFailure {
  // An elevation that failed at a session renewal, mid-change (the cause of a partial create or delete).
  if (isRoleElevationError(error)) {
    return {action: context.action, code: error.code, message: cleanMessage(error.message), messages: [],
      remediation: elevationRemedy(error), table: 'sys_security_acl', type: error.name}
  }

  if (error instanceof MetadataVerificationError || error instanceof MetadataScopeError || error instanceof MetadataInputError || isPolicyRefusal(error)) {
    return projectWriterError(error, context)
  }

  if (error instanceof AclError) {
    const partial = error as AclError & {aclSysId?: string; cause?: unknown; state?: string}
    const failure: MetadataFailure = {action: context.action, code: error.code, message: cleanMessage(error.message),
      messages: [], remediation: [ACL_REMEDIATION[error.code] ?? 'Check the command help.'], table: 'sys_security_acl', type: error.name,
      writeAttempted: error.code === 'partially_applied'}
    if (error.detail) failure.detail = {field: error.detail}
    const sysId = partial.aclSysId ?? context.sysId
    if (typeof sysId === 'string' && /^[a-f\d]{32}$/i.test(sysId)) failure.sysId = sysId
    if (partial.cause !== undefined) {
      // The step that failed, as its own projection: its code and the platform's messages.
      const cause = projectAclError(partial.cause, context)
      failure.messages.push(`Failed step: ${cause.code}`, ...cause.messages)
      if (cause.capture) failure.capture = cause.capture
    }

    return failure
  }

  return projectMetadataError(error, {...context, table: 'sys_security_acl'})
}

export interface AclWriteSummary {
  acl?: AclRecord
  previous?: AclRecord
  removedAutomaticRoles: string[]
  warnings: string[]
  writes: ReturnType<MetadataDisplayService['result']>[]
}

export class AclDisplayService {
  private metadata = new MetadataDisplayService()

  acl(acl: AclRecord): AclRecord {
    return {active: acl.active, adminOverrides: acl.adminOverrides, advanced: acl.advanced, condition: clean(acl.condition),
      decisionType: clean(acl.decisionType), description: clean(acl.description), name: clean(acl.name), operation: clean(acl.operation),
      roles: acl.roles.map(role => ({role: clean(role.role), roleSysId: role.roleSysId, sysId: role.sysId})), scope: acl.scope,
      scopeName: clean(acl.scopeName), script: acl.script, sysId: acl.sysId, type: clean(acl.type), updatedOn: clean(acl.updatedOn)}
  }

  aclLines(acl: AclRecord): string[] {
    const script = acl.script.trim()
    return [
      `ACL ${acl.sysId}: ${clean(acl.name)} (${clean(acl.type)}, ${clean(acl.operation)})${acl.active ? '' : ' INACTIVE'}`,
      `Scope: ${clean(acl.scopeName)} (${acl.scope})`,
      `Roles: ${this.roles(acl)}`,
      `Admin overrides: ${acl.adminOverrides ? 'yes' : 'no'}${acl.decisionType ? `; decision: ${clean(acl.decisionType)}` : ''}`,
      `Condition: ${clean(acl.condition) || '(none)'}`,
      // The script is shown as a size here; --json carries it.
      `Script: ${script ? `${script.split('\n').length} line(s)${acl.advanced ? '' : ' (not run: advanced is off)'}` : '(none)'}`,
      ...(acl.description ? [`Description: ${clean(acl.description)}`] : []),
    ]
  }

  elevationLines(status: ElevationStatus): string[] {
    if (status.available.length === 0) return ['This user may not elevate to any role.']
    return [
      'Roles this user may elevate to:',
      ...status.available.map(role => `  ${clean(role.name).padEnd(24)} ${status.elevated.includes(role.name) ? 'ELEVATED' : 'not elevated'}  ${clean(role.description)}`),
      status.elevated.length > 0 ? `Elevated in this run's session: ${status.elevated.join(', ')}` : 'Not elevated. Pass --elevate <role> to elevate this run\'s sessions.',
    ]
  }

  failure(failure: MetadataFailure): string[] {
    return this.metadata.failure(failure)
  }

  listLines(acls: AclRecord[]): string[] {
    if (acls.length === 0) return ['No ACLs match.']
    const rows = acls.map(acl => [acl.sysId, acl.active ? 'active' : 'inactive', clean(acl.type), clean(acl.operation), clean(acl.name), this.roles(acl), clean(acl.scopeName)])
    const header = ['SYS_ID', 'STATE', 'TYPE', 'OPERATION', 'NAME', 'ROLES', 'SCOPE']
    const widths = header.map((title, index) => Math.min(48, Math.max(title.length, ...rows.map(row => row[index].length))))
    const line = (row: string[]): string => row.map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index]))).join('  ')
    return [line(header), ...rows.map(row => line(row)), `${acls.length} ACL(s)`]
  }

  result(result: AclWriteResult): AclWriteSummary {
    return {removedAutomaticRoles: result.removedAutomaticRoles.map(role => clean(role)), warnings: result.warnings.map(warning => clean(warning)),
      writes: result.writes.map(write => this.metadata.result(write)),
      ...(result.acl === undefined ? {} : {acl: this.acl(result.acl)}),
      ...(result.previous === undefined ? {} : {previous: this.acl(result.previous)})}
  }

  resultLines(verb: string, result: AclWriteSummary): string[] {
    const target = result.acl ?? result.previous
    const sets = [...new Set(result.writes.map(write => `${write.capture.updateSetName} (${write.capture.updateSetSysId})`))]
    return [
      `Verified ACL ${verb}: ${target ? `${clean(target.name)} ${target.sysId}` : ''}`,
      ...(result.acl ? this.aclLines(result.acl).slice(1) : []),
      `Writes: ${result.writes.map(write => `${write.table} ${write.action}`).join(', ')}`,
      `Captured in: ${sets.join(', ') || '(none)'}`,
      ...(result.removedAutomaticRoles.length > 0 ? [`Removed the role the platform added on its own: ${result.removedAutomaticRoles.join(', ')}`] : []),
      ...result.warnings.map(warning => `! ${warning}`),
    ]
  }

  private roles(acl: AclRecord): string {
    // security_admin's name is hidden until the session is elevated: show the sys_id then.
    return acl.roles.length > 0 ? acl.roles.map(role => clean(role.role) || role.roleSysId).join(', ') : '(none)'
  }
}
