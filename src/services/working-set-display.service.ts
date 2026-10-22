import type {MoveCaptureResult, RestoreWorkingSetResult, UpdateSetSummary, UseUpdateSetResult, WorkingSet, WorkingSetError,
  WorkingSetErrorDetail} from '@sonisoft/now-sdk-ext-core'

export interface WorkingSetFailure {
  action: string
  code: string
  detail?: WorkingSetErrorDetail
  message: string
  remediation: string[]
  type: 'WorkingSetError'
}

const REMEDIATION: Record<string, string> = {
  application_not_applied: 'The set did not read back in the requested application. Inspect sys_update_set before retrying.',
  application_not_found: 'Pass global, a sys_scope sys_id, or a scope name that matches exactly one active application.',
  capture_count_mismatch: 'The set holds a different number of captures than you reviewed (detail.expected, detail.actual). List them again before completing.',
  capture_not_in_source: 'The capture is not in the source set. Read sys_update_xml.update_set for it.',
  complete_not_applied: 'A business rule may have refused completion. Read the message in the UI or syslog.',
  create_not_applied: 'The set was not created as requested. Inspect sys_update_set before retrying.',
  default_update_set: 'A Default is not for development work and never ships. Create a set (nex update-set create --application) and use it; nex update-set restore can return to a Default.',
  duplicate_capture: 'The target already holds a capture of this record, or the set holds two. Resolve the duplicate first.',
  evidence_unavailable: 'The instance did not return complete evidence. Retry the read; change nothing until it is complete.',
  invalid_input: 'Check the sys_ids, the application and the reason (letters, digits and simple punctuation).',
  mixed_scope_capture: 'Move the other applications\' captures (detail.captures) to their own Default first.',
  move_not_applied: 'The platform aborted the move. Read the row back; a set of another scope is refused by "Handle updates moving between sets".',
  newer_capture_exists: 'A newer capture of the same record exists elsewhere. Recapture the record with the target set current instead.',
  no_single_default: 'The application has no single In progress Default to fall back to. Restore with an In progress set of that application.',
  scope_mismatch: 'A capture can move only to a set of its own application (detail.application). Create a set in that application.',
  script_result_unavailable: 'The background script result could not be read. Check nex update-set current and syslog before retrying.',
  update_set_closed: 'The set is not In progress. Put further changes in a new set, or reopen this one in the UI only if neither it nor its batch base has ever been retrieved by another instance or exported (if unsure, treat it as left; update-sets skill: Complete early, reopen deliberately).',
  update_set_exists: 'An In progress set with this name already exists in the application. Use it (nex update-set use) or choose another name.',
  update_set_in_use: 'Another user is working in this set. Ask them to switch sets before completing.',
  update_set_not_found: 'No update set has that sys_id.',
  working_set_not_applied: 'The preferences did not read back. Check nex update-set current before making any change.',
}

export function projectWorkingSetError(error: WorkingSetError, action: string): WorkingSetFailure {
  // detail carries identifiers and counts only; core never puts names or payloads in it.
  return {action, code: error.code, ...(error.detail === undefined ? {} : {detail: error.detail}),
    message: `Update set ${action} refused: ${error.code}.`, remediation: [REMEDIATION[error.code] ?? 'Read the update set and preferences back before retrying.'],
    type: 'WorkingSetError'}
}

const clean = (text: string): string => text.replaceAll(/\p{Cc}/gu, ' ')
const setLine = (set: UpdateSetSummary): string =>
  `${clean(set.name)} (${set.sysId}); state: ${set.state}; application: ${set.application}${set.isDefault ? '; Default' : ''}`
const pair = (set: WorkingSet): string => `application ${clean(set.application)}, update set ${clean(set.updateSet)}`
// Preference values are printed as a command to copy: only identifiers are safe to print that way.
const restoreCommand = (set: WorkingSet): string => /^(global|[a-f\d]{32}|)$/i.test(set.application) && /^([a-f\d]{32}|)$/i.test(set.updateSet)
  ? `nex update-set restore --application ${set.application || 'global'} --update-set ${set.updateSet || '""'}`
  : `nex update-set restore (previous working set: ${pair(set)})`

export class WorkingSetDisplayService {
  completed(set: UpdateSetSummary): string[] {
    return [`Completed: ${setLine(set)}`,
      'Your preferences may still point at the completed set: restore your previous working set now (nex update-set restore).']
  }

  failure(failure: WorkingSetFailure): string[] {
    const previous = failure.detail?.previous
    return [failure.message, ...(failure.detail === undefined ? [] : [`Detail: ${JSON.stringify(failure.detail)}`]), ...failure.remediation,
      ...(previous === undefined ? [] : [`Your preferences may have changed. Put them back with: ${restoreCommand(previous)}`])]
  }

  moved(result: MoveCaptureResult): string[] {
    return [`Moved capture ${result.capture} (${clean(result.name)}), application ${result.application}`,
      `From: ${setLine(result.from)}`, `To:   ${setLine(result.to)}`]
  }

  restored(result: RestoreWorkingSetResult): string[] {
    return [`Working set restored: ${pair(result.restored)}`,
      ...(result.fallback === 'application_default' ? ['The previous set had closed: the application\'s Default is current instead.'] : [])]
  }

  summary(set: UpdateSetSummary): UpdateSetSummary {
    return {application: set.application, isDefault: set.isDefault, name: clean(set.name), state: set.state, sysId: set.sysId}
  }

  used(result: UseUpdateSetResult): string[] {
    return [`Working set: ${setLine(result.updateSet)}`, `Previous:    ${pair(result.previous)}`,
      `Restore with: ${restoreCommand(result.previous)}`]
  }
}
