import {type ColumnWriteResult, type FormLayout, type FormLayoutWriteResult, isPolicyRefusal, type ListLayout, type ListLayoutWriteResult, type MetadataErrorDetail,
  MetadataScopeError, MetadataVerificationError, type MetadataWriteResult, redactMessage} from '@sonisoft/now-sdk-ext-core'

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
  column_exists: 'The table, or a table it extends, already has a column of that name (detail.table, detail.field). Choose another name; the name includes the platform\'s prefix.',
  domain_not_supported: 'The list or your user is outside the global domain. A save would create a new list in your session\'s domain and leave this one unchanged: change it in the List Layout UI from the right domain.',
  field_not_supported: 'The field named in detail.field is not on the form (or not offered by the List Layout page) for this table and view, or cannot be written there.',
  form_redirected: 'The form redirected to detail.redirectPath instead of loading: the table may not support form writes, or the session lacks access.',
  protected_record: 'The vendor protected this file (sys_policy read or protected). It cannot be changed; create a new record instead.',
  section_not_supported: 'The section holds an annotation, chart or embedded list (detail.field), which this save cannot write back. Change it in the Form Layout UI; never drop those elements from the list.',
  store_scope: 'This is an installed Store application. Changing its files makes upgrades skip them. After review, re-run with --acknowledge-upgrade-skip and --update-set, and record the customization in the update set description.',
  table_not_supported: 'The table (or the referenced table, detail.table) does not exist, or is one of the platform\'s own schema tables, or extends one.',
  update_set_not_current: 'Make the update set the working set first: nex update-set use <set sys_id>.',
  update_set_required: 'Pass --update-set with an In progress set of the application: nex update-set create --application <app>, then nex update-set use <set>.',
}

// Items of `from` not matched in `to`, counted as multisets: a section can repeat .split, and removing one is a change.
function difference(from: string[], to: string[]): string[] {
  const left = new Map<string, number>()
  for (const item of to) left.set(item, (left.get(item) ?? 0) + 1)
  return from.filter(item => {
    const count = left.get(item) ?? 0
    if (count > 0) left.set(item, count - 1)
    return count === 0
  })
}

// Length of the longest common subsequence: how many elements both lists keep in the same relative order.
function commonInOrder(from: string[], to: string[]): number {
  let previous = Array.from({length: to.length + 1}, () => 0)
  for (const item of from) {
    const row = [0]
    for (const [index, other] of to.entries()) row.push(item === other ? previous[index] + 1 : Math.max(previous[index + 1], row[index]))
    previous = row
  }

  return previous[to.length]
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

function remedy(error: MetadataScopeError): string {
  // invalid_input naming an option is a bad value, not a scope or update set problem.
  if (error.code === 'invalid_input' && error.detail?.field && !error.detail.updateSetState) {
    return `The value for ${error.detail.field} is not valid: check its format and limits in the command help.`
  }

  return REFUSAL_REMEDIATION[error.code] ?? 'Check the scope, table, form permissions, and In progress update set.'
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
    // A read (layout get, list-layout get) refuses too, for example an unknown view: do not call it a write.
    const read = context.action.endsWith(' get')
    Object.assign(failure, {code: error.code, message: read ? `Metadata read refused: ${error.code}.` : `Metadata write refused before submission: ${error.code}.`,
      remediation: [remedy(error)],
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
  columnResult(result: ColumnWriteResult): ColumnWriteResult {
    return {capture: captureProjection(result.capture) as ColumnWriteResult['capture'], captures: result.captures.map(item => cleanName(item)),
      column: result.column, formSections: result.formSections, label: cleanName(result.label), messages: result.messages.map(item => cleanMessage(item)),
      scope: {scope: result.scope.scope, sysId: result.scope.sysId}, sysId: result.sysId, table: result.table, type: result.type}
  }

  columnSuccess(result: ColumnWriteResult): string[] {
    return [`Verified column: ${result.table}.${result.column} (${result.type}) labelled ${JSON.stringify(result.label)}`,
      `Dictionary: ${result.sysId}; scope: ${result.scope.scope} (${result.scope.sysId})`,
      result.formSections.length === 0
        ? 'Form: not placed by this save (the platform places nothing for a column on another application\'s table, '
          + 'or when a field of that name is already on the form, as after re-adding a deleted column)'
        : `Form: appended to the end of section ${result.formSections.join(', ')} (Default view main section); move it with nex metadata layout set`,
      `Captures: ${result.captures.join(', ')}`,
      ...this.captureLines(result.capture),
      ...result.messages,
      'This command does not remove columns: deleting one deletes its data wherever its capture is committed.']
  }

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
    const added = difference(result.elements, result.previousElements)
    const removed = difference(result.previousElements, result.elements)
    // Without a move, everything both lists keep (counted as multisets) stays in the same relative order.
    const reordered = commonInOrder(result.previousElements, result.elements) < result.previousElements.length - removed.length
    return [`Verified form layout: ${result.table} section ${result.section} (${result.view || 'Default view'})`,
      `Elements: ${result.previousElements.length} -> ${result.elements.length}; added: ${added.join(', ') || '(none)'}; removed: ${removed.join(', ') || '(none)'}${reordered ? '; order changed' : ''}`,
      ...this.captureLines(result.capture),
      `Previous layout (to put it back): ${result.previousElements.join(',')}`]
  }

  listLayout(layout: ListLayout): ListLayout {
    return {columns: layout.columns.map(item => cleanName(item)), exists: layout.exists, table: layout.table, view: cleanName(layout.view),
      ...(layout.sysId === undefined ? {} : {sysId: layout.sysId}), ...(layout.scope === undefined ? {} : {scope: layout.scope}),
      ...(layout.updateName === undefined ? {} : {updateName: cleanName(layout.updateName)})}
  }

  listLayoutLines(layout: ListLayout): string[] {
    if (!layout.exists) {
      return [`List layout: ${layout.table} (${layout.view || 'Default view'})`,
        'The table has no list of its own for this view and shows its parent\'s. metadata list-layout set creates one.']
    }

    return [`List layout: ${layout.table} (${layout.view || 'Default view'})`, `List: ${layout.sysId}; scope: ${layout.scope}; update name: ${layout.updateName}`,
      ...layout.columns.map((column, index) => `  ${String(index).padStart(3)}  ${column}`)]
  }

  listLayoutResult(result: ListLayoutWriteResult): ListLayoutWriteResult {
    return {capture: captureProjection(result.capture) as ListLayoutWriteResult['capture'], columns: result.columns.map(item => cleanName(item)),
      created: result.created, previousColumns: result.previousColumns.map(item => cleanName(item)),
      ...(result.previousSysId === undefined ? {} : {previousSysId: result.previousSysId}), scope: result.scope, sysId: result.sysId, table: result.table,
      view: cleanName(result.view)}
  }

  listLayoutSuccess(result: ListLayoutWriteResult): string[] {
    const added = difference(result.columns, result.previousColumns)
    const removed = difference(result.previousColumns, result.columns)
    const reordered = commonInOrder(result.previousColumns, result.columns) < result.previousColumns.length - removed.length
    return [`Verified list layout: ${result.table} (${result.view || 'Default view'})${result.created ? ', created: the table had no list of its own' : ''}`,
      `List: ${result.sysId}${result.previousSysId ? ` (replaced ${result.previousSysId})` : ''}`,
      `Columns: ${result.previousColumns.length} -> ${result.columns.length}; added: ${added.join(', ') || '(none)'}; removed: ${removed.join(', ') || '(none)'}${reordered ? '; order changed' : ''}`,
      ...this.captureLines(result.capture),
      result.created
        ? `To put it back, delete the new sys_ui_list row ${result.sysId} (saving columns keeps a list of its own), then move its DELETE capture to the application's Default: shipped, it would delete this list on the target.`
        : `Previous columns (to put them back): ${result.previousColumns.join(',')}`]
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
