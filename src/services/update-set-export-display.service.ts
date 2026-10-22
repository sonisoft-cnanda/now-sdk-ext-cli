import type {UpdateSetExportError, UpdateSetExportErrorDetail, UpdateSetExportResult} from '@sonisoft/now-sdk-ext-core'

/** What `nex update-set export --json` returns: everything but the XML, which goes only to the file. */
export interface UpdateSetExportOutput {
  bytes: number
  cleanup?: UpdateSetExportResult['cleanup']
  excluded: UpdateSetExportResult['excluded']
  file: string
  kind: UpdateSetExportResult['kind']
  messages: string[]
  recordCount: number
  sets: UpdateSetExportResult['sets']
  sha256: string
  source: UpdateSetExportResult['source']
  updateSet: UpdateSetExportResult['updateSet']
}

export interface UpdateSetExportFailure {
  code: string
  detail?: UpdateSetExportErrorDetail
  message: string
  remediation: string[]
  type: 'UpdateSetExportError'
}

const ID = /^[a-f\d]{32}$/i
const REMEDIATION: Record<string, string> = {
  batch_member: 'The set belongs to a batch: export the batch base (detail.base), which includes it.',
  cleanup_unverified: 'A temporary copy may remain under Retrieved Update Sets. Delete the sys_remote_update_set rows in detail.temporary, and do not preview or commit them.',
  evidence_unavailable: 'The instance did not return complete evidence, and nothing was copied. Retry.',
  export_failed: 'The download failed (detail.status) and the temporary copy was removed. The processors need admin, delegated_developer or update_set_admin.',
  export_mismatch: 'The file did not hold exactly the set\'s records (detail.expected, detail.actual), so nothing was written. Retry; if it repeats, inspect the set (nex update-set inspect).',
  invalid_input: 'Pass the 32-character sys_id of a sys_update_set or a sys_remote_update_set.',
  output_exists: 'The output file exists. Pass --force to replace it, or choose another --output.',
  output_invalid: 'The --output directory does not exist, or the path is not a file you can write.',
  retrieved_state: 'The platform exports a Retrieved Update Set only while it is Loaded (detail.state). Export the source set on its own instance.',
  script_result_unavailable: 'The background script\'s result could not be read. If detail.temporary lists sys_ids, they are Retrieved Update Set copies of this set: check and delete them.',
  update_set_incomplete: 'The platform exports only Complete sets. Complete it (nex update-set complete), or pass --include-incomplete for a snapshot of unfinished work.',
  update_set_not_found: 'No local or retrieved update set has that sys_id.',
}

export function projectExportError(error: Pick<UpdateSetExportError, 'code' | 'detail'>): UpdateSetExportFailure {
  // detail carries identifiers and counts only; core never puts names or payloads in it.
  const base = error.detail?.base
  const remediation = [REMEDIATION[error.code] ?? 'Read the update set back before retrying.',
    ...(error.code === 'batch_member' && base && ID.test(base) ? [`nex update-set export ${base}`] : [])]
  return {code: error.code, ...(error.detail === undefined ? {} : {detail: error.detail}),
    message: `Update set export refused: ${error.code}.`, remediation, type: 'UpdateSetExportError'}
}

const clean = (text: string): string => String(text ?? '').replaceAll(/\p{Cc}/gu, ' ')

export class UpdateSetExportDisplayService {
  failure(failure: UpdateSetExportFailure): string[] {
    return [failure.message, ...(failure.detail === undefined ? [] : [`Detail: ${JSON.stringify(failure.detail)}`]), ...failure.remediation]
  }

  output(result: UpdateSetExportResult, file: string, bytes: number, sha256: string): UpdateSetExportOutput {
    return {bytes, ...(result.cleanup === undefined ? {} : {cleanup: result.cleanup}),
      excluded: result.excluded.map(set => ({...set, name: clean(set.name)})), file, kind: result.kind,
      messages: result.messages.map(message => clean(message)), recordCount: result.recordCount,
      sets: result.sets.map(set => ({...set, name: clean(set.name)})), sha256, source: result.source,
      updateSet: {...result.updateSet, name: clean(result.updateSet.name)}}
  }

  success(output: UpdateSetExportOutput): string[] {
    const {updateSet} = output
    const removed = output.cleanup === undefined ? []
      : [`Temporary copy ${output.cleanup.temporarySysId} removed by ${output.cleanup.removedBy === 'nex' ? 'nex' : 'the platform'}; none remains.`]
    return [
      `Exported ${output.source === 'retrieved' ? 'Retrieved Update Set' : 'update set'} ${updateSet.name} (${updateSet.sysId}); state: ${updateSet.state}`,
      `File: ${output.file} (${output.bytes} bytes, sha256 ${output.sha256})`,
      `${output.kind === 'batch' ? `Batch of ${output.sets.length} sets` : 'Single set'}, ${output.recordCount} record(s), checked against the instance:`,
      ...output.sets.map(set => `  ${set.name} (${set.sysId}); ${set.state}; ${set.records} record(s)`),
      ...(output.excluded.length > 0 ? ['Left out (not Complete):', ...output.excluded.map(set => `  ${set.name} (${set.sysId}); ${set.state}`)] : []),
      ...removed,
      ...output.messages,
      'The file holds every record\'s full payload: share it only where the instance\'s configuration may go.',
    ]
  }
}
