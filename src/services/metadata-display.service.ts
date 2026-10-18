import {isPolicyRefusal, MetadataScopeError, MetadataVerificationError, type MetadataWriteResult, redactMessage} from '@sonisoft/now-sdk-ext-core'

export class MetadataInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MetadataInputError'
  }
}

export interface MetadataFailure {
  action: string
  capture?: MetadataVerificationError['capture']
  code: string
  message: string
  messages: string[]
  remediation: string[]
  sysId?: string
  table?: string
  type: string
  verification?: 'failed'
  writeAttempted?: boolean
}

const inspect = 'The record can exist after failed verification. Read its exact table/ID and capture evidence before deciding on retry or cleanup.'
const clean = (text: string): string => redactMessage(text).replaceAll(/<[^>]*>/g, '[omitted]').replaceAll(/\p{Cc}/gu, ' ')

// Copy only public capture fields. Errors can also hold requests, HTML and causes.
function captureProjection(capture: MetadataVerificationError['capture']): MetadataVerificationError['capture'] {
  if (capture === undefined) return undefined
  const result: NonNullable<MetadataVerificationError['capture']> = {}
  for (const key of ['action', 'predictedUpdateSetSysId', 'recordScope', 'updateSetName', 'updateSetScope', 'updateSetSysId'] as const) {
    if (capture[key] !== undefined) result[key] = clean(capture[key]!)
  }

  if (capture.preferencesUnchanged !== undefined) result.preferencesUnchanged = capture.preferencesUnchanged
  if (capture.preferenceRowsReplaced !== undefined) result.preferenceRowsReplaced = capture.preferenceRowsReplaced.map(item => clean(item))
  if (capture.currentUpdateSet !== undefined) {
    const {after, before, switched} = capture.currentUpdateSet
    result.currentUpdateSet = {switched, ...(before === undefined ? {} : {before: clean(before)}),
      ...(after === undefined ? {} : {after: clean(after)})}
  }

  return result
}

export function projectMetadataError(error: unknown, context: {action: string; sysId?: unknown; table?: unknown}): MetadataFailure {
  const failure: MetadataFailure = {action: context.action, code: 'metadata_failed', message: 'Metadata command failed.',
    messages: [], remediation: ['Check command help, authentication, and instance access.'], type: 'MetadataError'}
  if (typeof context.table === 'string' && /^[a-z\d_]+$/i.test(context.table)) failure.table = context.table
  if (typeof context.sysId === 'string' && /^[a-f\d]{32}$/i.test(context.sysId)) failure.sysId = context.sysId
  if (error instanceof MetadataVerificationError) {
    Object.assign(failure, {capture: captureProjection(error.capture), code: error.code,
      message: `Metadata verification failed: ${error.code}.`, messages: error.messages.map(item => clean(item)),
      remediation: [inspect], sysId: error.sysId, table: error.table, type: error.name,
      verification: 'failed', writeAttempted: error.writeAttempted})
  } else if (error instanceof MetadataScopeError) {
    Object.assign(failure, {code: error.code, message: `Metadata write refused before submission: ${error.code}.`,
      remediation: ['Check the scope, table, form permissions, and In progress update set.'], type: error.name, writeAttempted: false})
  } else if (error instanceof MetadataInputError) {
    Object.assign(failure, {code: 'invalid_input', message: error.message, type: error.name, writeAttempted: false})
  } else if (isPolicyRefusal(error)) {
    Object.assign(failure, {code: 'policy_refused', message: 'Metadata operation refused by policy.',
      remediation: ['Run nex policy status to inspect the active policy. Reads remain available.'], type: 'PolicyRefusal'})
  } else {
    // Preserve credential-store remediation across its ESM/CJS builds. Do not
    // serialize arbitrary SDK exception messages, stacks or attached objects.
    const auth = error as {remediation?: string; suggestions?: string[]}
    if (auth?.remediation) failure.remediation = [clean(auth.remediation)]
    else if (auth?.suggestions?.some(item => item.includes('nex auth doctor'))) {
      failure.code = 'authentication_failed'
      failure.message = 'Credential lookup or renewal failed.'
      failure.remediation = auth.suggestions.map(item => clean(item))
    }
  }

  return failure
}

export class MetadataDisplayService {
  failure(failure: MetadataFailure): string[] {
    return [failure.message,
      `Action: ${failure.action}; target: ${failure.table ?? '(not available)'}/${failure.sysId ?? '(not available)'}`,
      ...(failure.writeAttempted === undefined ? [] : [`Write attempted: ${failure.writeAttempted}`]),
      ...(failure.capture === undefined ? [] : [`Capture evidence: ${JSON.stringify(failure.capture)}`]),
      ...failure.messages,
    ]
  }

  result(result: MetadataWriteResult): MetadataWriteResult {
    return {action: result.action, capture: captureProjection(result.capture) as MetadataWriteResult['capture'],
      messages: result.messages.map(item => clean(item)), scope: {scope: result.scope.scope, sysId: result.scope.sysId},
      sysId: result.sysId, table: result.table}
  }

  success(result: MetadataWriteResult): string[] {
    const {capture} = result
    const current = capture.currentUpdateSet
    return [
      `Verified metadata ${result.action}: ${result.table}/${result.sysId}`,
      `Scope: ${result.scope.scope} (${result.scope.sysId})`,
      `Capture: ${capture.action} in ${capture.updateSetName} (${capture.updateSetSysId})`,
      `Capture scope: ${capture.updateSetScope}; record scope: ${capture.recordScope}`,
      `Predicted update set: ${capture.predictedUpdateSetSysId === undefined ? '(not available)' : capture.predictedUpdateSetSysId}`,
      `Preferences unchanged: ${capture.preferencesUnchanged}`,
      `Preference rows replaced: ${JSON.stringify(capture.preferenceRowsReplaced)}`,
      `Current update set: ${current.before === undefined ? '(not available)' : JSON.stringify(current.before)} -> ${current.after === undefined ? '(not available)' : JSON.stringify(current.after)}; switched: ${current.switched}`,
      ...result.messages,
    ]
  }
}
