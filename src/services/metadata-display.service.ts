import {type FormLayout, type FormLayoutWriteResult, isPolicyRefusal, type MetadataErrorDetail, MetadataScopeError, MetadataVerificationError,
  type MetadataWriteResult, redactMessage} from '@sonisoft/now-sdk-ext-core'

/** A ServiceNow sys_id. */
export const ID = /^[a-f\d]{32}$/i
/** A table, field or scope name. */
export const NAME = /^[a-z\d_]+$/i

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
  detail?: MetadataErrorDetail
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
// Messages can carry server text: strip markup as well as control characters.
const cleanMessage = (text: string): string => redactMessage(text).replaceAll(/<[^>]*>/g, '[omitted]').replaceAll(/\p{Cc}/gu, ' ')
// Names and identifiers are shown as the instance has them, so they still compare equal.
const cleanName = (text: string): string => text.replaceAll(/\p{Cc}/gu, ' ')

const REFUSAL_REMEDIATION: Record<string, string> = {
  field_not_supported: 'The field named in detail.field is not on the form for this table and view, or cannot be written there.',
  form_redirected: 'The form redirected to detail.redirectPath instead of loading: the table may not support form writes, or the session lacks access.',
  protected_record: 'The vendor protected this file (sys_policy read or protected). It cannot be changed; create a new record instead.',
  store_scope: 'This is an installed Store application. Changing its files makes upgrades skip them. After review, re-run with --acknowledge-upgrade-skip and --update-set, and record the customization in the update set description.',
  update_set_not_current: 'Make the update set the working set first: nex update-set use <set sys_id>.',
  update_set_required: 'Pass --update-set with an In progress set of the application: nex update-set create --application <app>, then nex update-set use <set>.',
}

// Copy only public capture fields. Errors can also hold requests, HTML and causes.
function captureProjection(capture: MetadataVerificationError['capture']): MetadataVerificationError['capture'] {
  if (capture === undefined) return undefined
  const result: NonNullable<MetadataVerificationError['capture']> = {}
  for (const key of ['action', 'predictedUpdateSetSysId', 'recordScope', 'updateName', 'updateSetName', 'updateSetScope', 'updateSetSysId'] as const) {
    if (capture[key] !== undefined) result[key] = cleanName(capture[key]!)
  }

  if (capture.preferencesUnchanged !== undefined) result.preferencesUnchanged = capture.preferencesUnchanged
  if (capture.preferenceRowsReplaced !== undefined) result.preferenceRowsReplaced = capture.preferenceRowsReplaced.map(item => cleanName(item))
  if (capture.currentUpdateSet !== undefined) {
    const {after, before, switched} = capture.currentUpdateSet
    result.currentUpdateSet = {switched, ...(before === undefined ? {} : {before: cleanName(before)}),
      ...(after === undefined ? {} : {after: cleanName(after)})}
  }

  if (capture.customization !== undefined) {
    const {baselineVersion, replaceOnUpgrade} = capture.customization
    result.customization = {storeApplication: true, ...(replaceOnUpgrade === undefined ? {} : {replaceOnUpgrade}),
      ...(baselineVersion === undefined ? {} : {baselineVersion})}
  }

  return result
}

export function projectMetadataError(error: unknown, context: {action: string; sysId?: unknown; table?: unknown}): MetadataFailure {
  const failure: MetadataFailure = {action: context.action, code: 'metadata_failed', message: 'Metadata command failed.',
    messages: [], remediation: ['Check command help, authentication, and instance access.'], type: 'MetadataError'}
  if (typeof context.table === 'string' && NAME.test(context.table)) failure.table = context.table
  if (typeof context.sysId === 'string' && ID.test(context.sysId)) failure.sysId = context.sysId
  if (error instanceof MetadataVerificationError) {
    Object.assign(failure, {capture: captureProjection(error.capture), code: error.code,
      message: `Metadata verification failed: ${error.code}.`, messages: error.messages.map(item => cleanMessage(item)),
      remediation: [inspect], sysId: error.sysId, table: error.table, type: error.name,
      verification: 'failed', writeAttempted: error.writeAttempted})
  } else if (error instanceof MetadataScopeError) {
    // detail holds identifiers, states and paths only; core sanitises it.
    Object.assign(failure, {code: error.code, message: `Metadata write refused before submission: ${error.code}.`,
      remediation: [REFUSAL_REMEDIATION[error.code] ?? 'Check the scope, table, form permissions, and In progress update set.'],
      type: error.name, writeAttempted: false, ...(error.detail === undefined ? {} : {detail: error.detail})})
  } else if (error instanceof MetadataInputError) {
    Object.assign(failure, {code: 'invalid_input', message: error.message, type: error.name, writeAttempted: false})
  } else if (isPolicyRefusal(error)) {
    Object.assign(failure, {code: 'policy_refused', message: 'Metadata operation refused by policy.',
      remediation: ['Run nex policy status to inspect the active policy. Reads remain available.'], type: 'PolicyRefusal'})
  } else {
    // Preserve credential-store remediation across its ESM/CJS builds. Do not
    // serialize arbitrary SDK exception messages, stacks or attached objects.
    const auth = error as {remediation?: string; suggestions?: string[]}
    if (auth?.remediation) failure.remediation = [cleanMessage(auth.remediation)]
    else if (auth?.suggestions?.some(item => item.includes('nex auth doctor'))) {
      failure.code = 'authentication_failed'
      failure.message = 'Credential lookup or renewal failed.'
      failure.remediation = auth.suggestions.map(item => cleanMessage(item))
    }
  }

  return failure
}

export class MetadataDisplayService {
  failure(failure: MetadataFailure): string[] {
    return [failure.message,
      `Action: ${failure.action}; target: ${failure.table ?? '(not available)'}/${failure.sysId ?? '(not available)'}`,
      ...(failure.writeAttempted === undefined ? [] : [`Write attempted: ${failure.writeAttempted}`]),
      ...(failure.detail === undefined ? [] : [`Detail: ${JSON.stringify(failure.detail)}`]),
      ...(failure.capture === undefined ? [] : [`Capture evidence: ${JSON.stringify(failure.capture)}`]),
      ...failure.messages,
      ...failure.remediation,
    ]
  }

  layout(layout: FormLayout): FormLayout {
    return {caption: cleanName(layout.caption), elements: layout.elements.map(item => cleanName(item)), scope: layout.scope,
      section: layout.section, table: layout.table, view: cleanName(layout.view)}
  }

  layoutLines(layout: FormLayout): string[] {
    return [`Form layout: ${layout.table} section ${layout.section}`,
      `View: ${layout.view || '(Default view)'}; caption: ${layout.caption || '(none)'}; scope: ${layout.scope}`,
      ...layout.elements.map((element, index) => `  ${String(index).padStart(3)}  ${element}`)]
  }

  layoutResult(result: FormLayoutWriteResult): FormLayoutWriteResult {
    return {capture: captureProjection(result.capture) as FormLayoutWriteResult['capture'], elements: result.elements.map(item => cleanName(item)),
      previousElements: result.previousElements.map(item => cleanName(item)), scope: result.scope, section: result.section,
      table: result.table, view: cleanName(result.view)}
  }

  layoutSuccess(result: FormLayoutWriteResult): string[] {
    const added = result.elements.filter(item => !result.previousElements.includes(item))
    const removed = result.previousElements.filter(item => !result.elements.includes(item))
    return [`Verified form layout: ${result.table} section ${result.section} (${result.view || 'Default view'})`,
      `Elements: ${result.previousElements.length} -> ${result.elements.length}; added: ${added.join(', ') || '(none)'}; removed: ${removed.join(', ') || '(none)'}`,
      ...this.captureLines(result.capture),
      `Previous layout (to put it back): ${result.previousElements.join(',')}`]
  }

  result(result: MetadataWriteResult): MetadataWriteResult {
    return {action: result.action, capture: captureProjection(result.capture) as MetadataWriteResult['capture'],
      messages: result.messages.map(item => cleanMessage(item)), scope: {scope: result.scope.scope, sysId: result.scope.sysId},
      sysId: result.sysId, table: result.table}
  }

  success(result: MetadataWriteResult): string[] {
    return [
      `Verified metadata ${result.action}: ${result.table}/${result.sysId}`,
      `Scope: ${result.scope.scope} (${result.scope.sysId})`,
      ...this.captureLines(result.capture),
      ...result.messages,
    ]
  }

  private captureLines(capture: MetadataWriteResult['capture']): string[] {
    const current = capture.currentUpdateSet
    const {customization} = capture
    return [
      `Capture: ${capture.action} in ${capture.updateSetName} (${capture.updateSetSysId})`,
      ...(capture.updateName === undefined ? [] : [`Update name: ${capture.updateName}`]),
      `Capture scope: ${capture.updateSetScope}; record scope: ${capture.recordScope}`,
      `Predicted update set: ${capture.predictedUpdateSetSysId === undefined ? '(not available)' : capture.predictedUpdateSetSysId}`,
      `Preferences unchanged: ${capture.preferencesUnchanged}`,
      `Preference rows replaced: ${JSON.stringify(capture.preferenceRowsReplaced)}`,
      `Current update set: ${current.before === undefined ? '(not available)' : JSON.stringify(current.before)} -> ${current.after === undefined ? '(not available)' : JSON.stringify(current.after)}; switched: ${current.switched}`,
      ...(customization === undefined ? [] : [
        `Store customization: replace on upgrade ${customization.replaceOnUpgrade ?? '(not available)'}; vendor baseline ${customization.baselineVersion ?? '(not available)'}`,
        ...(customization.replaceOnUpgrade === false ? ['Upgrades of this application will skip this file until the customization is reviewed.'] : []),
      ]),
    ]
  }
}
