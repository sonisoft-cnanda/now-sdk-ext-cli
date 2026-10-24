import {type Choice, type ChoiceList, type ChoiceWriteResult, type ColumnRemoveResult, type ColumnWriteResult, type FormLayout, type FormLayoutWriteResult, isPolicyRefusal, type ListLayout, type ListLayoutWriteResult, type MetadataErrorDetail,
  MetadataScopeError, MetadataVerificationError, type MetadataWriteResult, redactMessage} from '@sonisoft/now-sdk-ext-core'

/** A ServiceNow sys_id. */
export const ID = /^[a-f\d]{32}$/i
/** A table, field or scope name. */
export const NAME = /^[a-z\d_]+$/i
/** A choice language (sys_choice.language), as core accepts it. */
export const LANGUAGE = /^[a-z][a-z_]{1,9}$/i

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
  choice_ambiguous: 'The list has more than one choice with that value in this language (detail.table, detail.field). Change them in the UI.',
  choice_in_use: 'Records hold this value (detail.records). Prefer nex metadata choice set --inactive, which keeps its label and hides it from new selections; '
    + 'or re-run with --confirm-in-use: the records keep the value, which then has no choice in the list.',
  choice_list_inherited: 'The column is defined on detail.table and this table has no choice list of its own, so it shows detail.table\'s list. '
    + 'Change that list (--table <detail.table>); a list of its own here would replace it on this table.',
  choice_not_found: 'The list has no choice with that value in this language. Read it with nex metadata choice get.',
  choice_unchanged: 'The choice already has those values; nothing was posted.',
  column_exists: 'The table, or a table it extends, already has a column of that name (detail.table, detail.field). Choose another name; the name includes the platform\'s prefix.',
  column_has_data: 'Rows hold a value in this column (detail.records); removing it deletes those values here and wherever the DELETE is committed. '
    + 'Re-run with --acknowledge-data-loss only if that is intended.',
  column_has_dependents: 'The platform will also delete the onChange client scripts and UI policy actions that name this column (detail.records). '
    + 'Review them, then re-run with --acknowledge-dependent-deletes.',
  column_not_deletable: 'The platform does not allow this column to be deleted: only a u_ column, or a scoped application\'s own column loaded in '
    + 'that application, can be. A vendor column cannot be removed.',
  column_not_found: 'The table and the tables it extends have no column of that name (detail.table, detail.field). Check the name, prefix included (u_ in Global).',
  column_referenced: 'A client script or UI policy action of another application names this column (detail.table), and the platform would delete it '
    + 'with the column. Remove or change it in its own application first.',
  confirmation_required: 'Pass --confirm <table>.<column> naming the column exactly.',
  domain_not_supported: 'The list or your user is outside the global domain. A save would create a new list in your session\'s domain and leave this one unchanged: change it in the List Layout UI from the right domain.',
  field_not_supported: 'The field named in detail.field is not on the form (or not offered by the List Layout page) for this table and view, or cannot be written there.',
  form_redirected: 'The form redirected to detail.redirectPath instead of loading: the table may not support form writes, or the session lacks access.',
  protected_record: 'The vendor protected this file (sys_policy read or protected). It cannot be changed; create a new record instead.',
  scope_mismatch: 'The record belongs to another application (for a choice: the list, or the column when the table has no list yet). '
    + 'Use that application (--scope <name> or --scope-id <sys_id>) with an update set of it. For a choice, nex metadata choice get shows '
    + 'the list\'s application sys_id: pass it as --scope-id, or --scope global when it is global.',
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

function choiceProjection(choice: Choice): Choice {
  return {dependentValue: cleanName(choice.dependentValue), hint: cleanName(choice.hint), inactive: choice.inactive, label: cleanName(choice.label),
    language: choice.language, ...(choice.sequence === undefined ? {} : {sequence: choice.sequence}), sysId: choice.sysId, value: cleanName(choice.value)}
}

function choiceColumnProjection(column: ChoiceList['column']): ChoiceList['column'] {
  return {choice: cleanName(column.choice), scope: cleanName(column.scope), table: cleanName(column.table), type: cleanName(column.type)}
}

/** The flag that takes an application as core reports it: a sys_id, or the literal global. */
function scopeFlag(scope: string): string {
  return scope === 'global' ? '--scope global' : `--scope-id ${cleanName(scope)}`
}

function choiceLine(choice: Choice): string {
  return `  ${String(choice.sequence ?? '-').padStart(5)}  ${JSON.stringify(choice.value)} ${JSON.stringify(choice.label)}${choice.inactive ? ' (inactive)' : ''}`
    + `${choice.dependentValue ? ` [depends on ${JSON.stringify(choice.dependentValue)}]` : ''}`
}

/** The column's dictionary Choice setting, and a warning when the form will not offer the choices. */
function choiceColumnLine(column: ChoiceList['column'], element: string): string {
  const setting: Record<string, string> = {1: 'dropdown with -- None --', 2: 'suggestion', 3: 'dropdown without -- None --'}
  return setting[column.choice]
    ? `Column: ${column.table}.${element} (${column.type}); Choice: ${setting[column.choice]}; column scope: ${column.scope}`
    : `Column: ${column.table}.${element} (${column.type}); Choice: none, so the form shows a plain field and does not offer these choices. `
      + 'Set the dictionary Choice to a dropdown for them to show.'
}

export class MetadataDisplayService {
  choiceList(list: ChoiceList): ChoiceList {
    return {choices: list.choices.map(choice => choiceProjection(choice)), column: choiceColumnProjection(list.column), element: list.element, language: list.language,
      table: list.table, ...(list.choiceSet === undefined ? {} : {choiceSet: {...list.choiceSet, updateName: cleanName(list.choiceSet.updateName)}})}
  }

  choiceListLines(list: ChoiceList): string[] {
    return [`Choice list: ${list.table}.${list.element} (${list.language}), ${list.choices.length} choice(s)`,
      choiceColumnLine(list.column, list.element),
      list.choiceSet
        ? `Choice set: ${list.choiceSet.sysId}; scope: ${list.choiceSet.scope} (change it with ${scopeFlag(list.choiceSet.scope)}); update name: ${list.choiceSet.updateName}`
        : list.column.table === list.table
          ? `Choice set: none; the first choice creates one in the column's application (${scopeFlag(list.column.scope)}).`
          : `Choice set: none; the table shows ${list.column.table}'s list for this column.`,
      ...list.choices.map(choice => choiceLine(choice))]
  }

  choiceResult(result: ChoiceWriteResult): ChoiceWriteResult {
    return {action: result.action, capture: captureProjection(result.capture) as ChoiceWriteResult['capture'],
      choices: result.choices.map(choice => choiceProjection(choice)), column: choiceColumnProjection(result.column), element: result.element, language: result.language,
      messages: result.messages.map(item => cleanMessage(item)), scope: {scope: result.scope.scope, sysId: result.scope.sysId}, sysId: result.sysId,
      table: result.table, value: cleanName(result.value),
      ...(result.choice === undefined ? {} : {choice: choiceProjection(result.choice)}),
      ...(result.previous === undefined ? {} : {previous: choiceProjection(result.previous)}),
      ...(result.choiceSet === undefined ? {} : {choiceSet: {...result.choiceSet, updateName: cleanName(result.choiceSet.updateName)}}),
      ...(result.inUse === undefined ? {} : {inUse: result.inUse})}
  }

  choiceSuccess(result: ChoiceWriteResult): string[] {
    const verb = {delete: 'removed', insert: 'added', update: 'changed'}[result.action]
    return [`Verified choice ${verb}: ${result.table}.${result.element} value ${JSON.stringify(result.value)} (${result.language}); choice ${result.sysId}`,
      ...(result.previous === undefined ? [] : [`Before:${choiceLine(result.previous)}`]),
      ...(result.choice === undefined ? [] : [`After: ${choiceLine(result.choice)}`]),
      ...(result.inUse === undefined ? [] : [`Records holding the value: ${result.inUse}${result.inUse > 0 ? ' (they keep it)' : ''}`]),
      result.choiceSet
        ? `Choice set: ${result.choiceSet.sysId}${result.choiceSet.created ? ', created by this save' : ''}; scope: ${result.scope.scope} (${result.choiceSet.scope})`
        : 'Choice set: none left',
      choiceColumnLine(result.column, result.element),
      `List now (${result.choices.length}):`,
      ...result.choices.map(choice => choiceLine(choice)),
      ...this.captureLines(result.capture),
      ...result.messages]
  }

  columnRemoveResult(result: ColumnRemoveResult): ColumnRemoveResult {
    const {leftovers} = result
    return {capture: captureProjection(result.capture) as ColumnRemoveResult['capture'], captures: result.captures.map(item => cleanName(item)),
      column: result.column, createdInThisSet: result.createdInThisSet,
      deleted: {clientScripts: [...result.deleted.clientScripts], labels: result.deleted.labels.map(item => cleanName(item)),
        uiPolicyActions: [...result.deleted.uiPolicyActions]},
      leftovers: {choices: leftovers.choices, ...(leftovers.choiceSet === undefined ? {} : {choiceSet: leftovers.choiceSet}),
        formElements: leftovers.formElements.map(item => ({...item})), listElements: leftovers.listElements.map(item => ({...item}))},
      messages: result.messages.map(item => cleanMessage(item)), records: result.records, scope: {scope: result.scope.scope, sysId: result.scope.sysId},
      sysId: result.sysId, table: result.table}
  }

  columnRemoveSuccess(result: ColumnRemoveResult): string[] {
    const {deleted, leftovers} = result
    const left = [
      ...(leftovers.choices || leftovers.choiceSet ? [`${leftovers.choices} choice(s)${leftovers.choiceSet ? ` and choice set ${leftovers.choiceSet}` : ''}`] : []),
      ...leftovers.formElements.map(item => `form element ${item.sysId} in section ${item.section}`),
      ...leftovers.listElements.map(item => `list element ${item.sysId} in list ${item.list}`),
    ]
    return [`Verified column removed: ${result.table}.${result.column} (dictionary ${result.sysId}); scope: ${result.scope.scope} (${result.scope.sysId})`,
      `Rows that held a value: ${result.records}${result.records > 0 ? ' (deleted with the column)' : ''}`,
      `Also deleted by the platform: ${deleted.labels.length} label(s), ${deleted.clientScripts.length} client script(s), ${deleted.uiPolicyActions.length} UI policy action(s)`,
      `DELETE captures: ${result.captures.join(', ')}`,
      ...this.captureLines(result.capture),
      left.length > 0
        ? `Left behind by the platform, naming a column that no longer exists: ${left.join('; ')}. Remove the form and list elements with `
          + 'nex metadata layout set / list-layout set in the same set.'
        : 'Left behind by the platform: nothing.',
      result.createdInThisSet
        ? 'The column was created in this set: do not ship its DELETE captures. Move them to a set that never ships and Ignore it, '
          + 'or Ignore this set if it holds nothing else.'
        : 'The column existed before this set: committing the set deletes the column and its data on the target.',
      ...result.messages]
  }

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
      'Removing a column deletes its data wherever its capture is committed: that is nex metadata column remove, explicitly confirmed.']
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
