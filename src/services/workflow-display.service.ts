import type {
  ActivityDefinitionDetail,
  ActivityDefinitionSummary,
  ActivityUsage,
  CheckoutResult,
  NewWorkflowResult,
  PublishResult,
  WorkflowDefinition,
  WorkflowSummary,
  WorkflowValidationReport,
} from '@sonisoft/now-sdk-ext-core'

const RULE = '─'.repeat(60)

export class WorkflowDisplayService {
  /**
   * Format the result of an activity type lookup: its variables and the exits a new
   * activity of the type starts with.
   */
  formatActivityType(detail: ActivityDefinitionDetail, jsonOutput: boolean): string[] {
    if (jsonOutput) return [JSON.stringify(detail, null, 2)]

    const lines: string[] = [`\n=== Activity Type: ${detail.name} ===`, RULE]
    lines.push(`  Sys ID:     ${detail.sysId}`, `  Category:   ${detail.category || '-'}`, `  Class:      ${detail.sysClassName}`)
    if (detail.attributes) lines.push(`  Attributes: ${detail.attributes}`)
    lines.push(`  Exits:      ${describeExits(detail)}`)
    if (detail.description) {
      lines.push('', '  Description:')
      for (const line of detail.description.trim().split(/\r?\n/)) lines.push(`    ${line}`)
    }

    if (detail.inputs || detail.outputs) {
      lines.push('', '  Inputs (set through --input JSON):')
      for (const f of detail.inputs ?? []) lines.push(`    ${f.name.padEnd(26)} ${f.type}${f.mandatory ? ' (mandatory)' : ''}`)
      lines.push('  Outputs (activityOutput.<name>):')
      for (const f of detail.outputs ?? []) lines.push(`    ${f.name.padEnd(26)} ${f.type}`)
    } else if (detail.variables.length === 0) {
      lines.push('', '  Variables: none')
    } else {
      lines.push('', '  Variables (set through --var element=value):')
      for (const v of detail.variables) lines.push(...describeVariable(v))
    }

    if (detail.script !== undefined) lines.push('', '  Implementation script:', detail.script)
    lines.push(RULE)
    return lines
  }

  /**
   * Format a list of activity types.
   */
  formatActivityTypes(types: ActivityDefinitionSummary[], jsonOutput: boolean): string[] {
    if (jsonOutput) return [JSON.stringify(types, null, 2)]

    const lines: string[] = [`\n=== Activity Types (${types.length}) ===`, RULE]
    for (const t of types) {
      const kind = t.sysClassName === 'wf_activity_definition' ? '' : ` [${t.sysClassName}]`
      lines.push(`  ${t.name.padEnd(40)} ${(t.category || '-').padEnd(16)} ${t.sysId}${kind}`)
    }

    lines.push(RULE)
    return lines
  }

  /**
   * Format how published workflows on the instance configure an activity type.
   */
  formatActivityUsage(usage: ActivityUsage, jsonOutput: boolean): string[] {
    if (jsonOutput) return [JSON.stringify(usage, null, 2)]

    const lines: string[] = [
      `\n=== How this instance uses: ${usage.definitionName} ===`,
      RULE,
      `  ${usage.publishedActivities} activities in published workflows; ${usage.sampled} sampled.`,
    ]
    for (const field of usage.fields) {
      if (field.setCount === 0) continue
      lines.push(`  ${field.name} — set in ${field.setCount}`)
      for (const example of field.examples) {
        lines.push(`    ${String(example.count).padStart(4)}× ${oneLine(example.value)}${example.isDefault ? '  (default)' : ''}`)
      }
    }

    const unset = usage.fields.filter(f => f.setCount === 0).map(f => f.name)
    if (unset.length > 0) lines.push(`  never set: ${unset.join(', ')}`)
    lines.push(RULE)
    return lines
  }

  /**
   * Format a confirmation for a change to a draft.
   */
  formatChange(message: string, details: Record<string, unknown>, jsonOutput: boolean): string[] {
    if (jsonOutput) return [JSON.stringify({ message, ...details, success: true }, null, 2)]
    const lines: string[] = [`\n${message}`]
    for (const [key, value] of Object.entries(details)) {
      if (value === undefined) continue
      lines.push(`  ${key.padEnd(16)} ${Array.isArray(value) ? value.join(', ') : String(value)}`)
    }

    return lines
  }

  /**
   * Format a checkout result.
   */
  formatCheckout(result: CheckoutResult, workflowName: string, jsonOutput: boolean): string[] {
    if (jsonOutput) return [JSON.stringify(result, null, 2)]
    return [
      `\n=== Workflow Checked Out: ${workflowName} ===`,
      RULE,
      `  Workflow Sys ID:  ${result.workflowSysId}`,
      `  Draft Version:    ${result.versionSysId}`,
      result.alreadyCheckedOut ? '  You already had this draft checked out.' : '  A new draft was created from the published version.',
      RULE,
    ]
  }

  /**
   * Format a workflow version's contents: activities with their exits and variables,
   * and the transitions between them.
   */
  formatDefinition(definition: WorkflowDefinition, jsonOutput: boolean, showVariables = true): string[] {
    if (jsonOutput) return [JSON.stringify(definition, null, 2)]

    const names = new Map(definition.activities.map(a => [a.sysId, a.name]))
    const exits = new Map(definition.activities.flatMap(a => a.conditions.map(c => [c.sysId, c.name] as const)))
    const lines: string[] = [`\n=== Workflow: ${definition.name} ===`, RULE]
    lines.push(
      `  Table:            ${definition.table}`,
      `  Version:          ${definition.versionSysId} (${versionState(definition)}${definition.active ? '' : ', inactive'})`,
      `  Workflow Sys ID:  ${definition.workflowSysId}`,
    )
    if (definition.status) lines.push(`  Status:           ${definition.status.statusDisplay}`)
    if (definition.condition) lines.push(`  Condition:        ${definition.condition}`)

    lines.push(`\n  Activities (${definition.activities.length}):`)
    for (const activity of definition.activities) {
      const position = activity.x === undefined ? '' : ` @ ${activity.x},${activity.y}`
      lines.push(`    ${activity.name}  [${activity.definitionName}]  ${activity.sysId}${position}`)
      if (activity.conditions.length > 0) lines.push(`      exits: ${activity.conditions.map(c => c.name).join(', ')}`)
      if (showVariables && activity.variables) {
        for (const [element, value] of Object.entries(activity.variables)) {
          if (value !== '') lines.push(`      ${element} = ${oneLine(value)}`)
        }
      }

      if (activity.input && activity.input !== '{}') lines.push(`      input = ${oneLine(activity.input)}`)
    }

    lines.push(`\n  Transitions (${definition.transitions.length}):`)
    for (const t of definition.transitions) {
      lines.push(`    ${names.get(t.from) ?? t.from} -[${exits.get(t.condition) ?? '?'}]-> ${names.get(t.to) ?? t.to}  (${t.sysId})`)
    }

    lines.push(RULE)
    return lines
  }

  /**
   * Format the result of creating a workflow.
   */
  formatNewWorkflow(result: NewWorkflowResult, name: string, jsonOutput: boolean): string[] {
    if (jsonOutput) return [JSON.stringify(result, null, 2)]
    return [
      `\n=== Workflow Created: ${name} ===`,
      RULE,
      `  Workflow Sys ID:  ${result.workflowSysId}`,
      `  Draft Version:    ${result.versionSysId}`,
      `  Begin:            ${result.beginActivitySysId}`,
      `  End:              ${result.endActivitySysId}`,
      '  The new version is checked out to you. Publish it when ready.',
      RULE,
    ]
  }

  /**
   * Format the result of a publish.
   */
  formatPublish(result: PublishResult, jsonOutput: boolean): string[] {
    if (jsonOutput) return [JSON.stringify({ ...result, success: true }, null, 2)]
    const lines = ['\n=== Workflow Published ===', RULE, `  Version:  ${result.versionSysId}`]
    if (result.warnings.length > 0) {
      lines.push('  Published with warnings:')
      for (const w of result.warnings) lines.push(`    [${w.level}] ${w.type}: ${w.message}`)
    }

    lines.push(RULE)
    return lines
  }

  /**
   * Format publish confirmation for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatPublishResult(jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ message: 'Workflow published successfully.', success: true }, null, 2)];
    }

    const lines: string[] = [];

    lines.push('\n=== Workflow Published ===');
    lines.push("─".repeat(60));
    lines.push('Workflow version published successfully.');
    lines.push("─".repeat(60));

    return lines;
  }

  /**
   * Format a validation report.
   */
  formatValidation(report: WorkflowValidationReport, jsonOutput: boolean): string[] {
    if (jsonOutput) return [JSON.stringify(report, null, 2)]
    const lines = ['\n=== Workflow Validation ===', RULE, `  ${report.summary || (report.valid ? 'Valid' : 'Not valid')}`]
    for (const item of report.items.filter(i => i.level !== 'Info')) {
      lines.push(`  [${item.level}] ${item.type}: ${item.message}`)
      const detail = /msg=([^\n]*)/.exec(item.details)?.[1]
      if (detail) lines.push(`      ${detail}`)
    }

    lines.push(RULE)
    return lines
  }

  /**
   * Format a list of workflows with the state of their versions.
   */
  formatWorkflowList(workflows: WorkflowSummary[], jsonOutput: boolean): string[] {
    if (jsonOutput) return [JSON.stringify(workflows, null, 2)]

    const lines: string[] = [`\n=== Workflows (${workflows.length}) ===`, RULE]
    for (const wf of workflows) {
      const draft = wf.checkedOutVersion
      let status = wf.publishedVersionSysId ? 'published' : 'unpublished'
      if (draft) status += `, checked out by ${draft.byCurrentUser ? 'you' : (draft.checkedOutByName || draft.checkedOutBy)}`
      if (!wf.active) status += ', inactive'
      lines.push(`  ${wf.name}`, `    ${wf.table.padEnd(24)} ${wf.sysId}  (${status})`)
    }

    lines.push(RULE)
    return lines
  }

  /**
   * Format createCompleteWorkflow result for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatWorkflowResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    lines.push('\n=== Workflow Created ===');
    lines.push("─".repeat(60));

    if (result.workflowSysId) {
      lines.push(`  Workflow Sys ID:  ${result.workflowSysId}`);
    }

    if (result.versionSysId) {
      lines.push(`  Version Sys ID:   ${result.versionSysId}`);
    }

    if (result.activitySysIds) {
      const activityKeys = Object.keys(result.activitySysIds);
      lines.push(`  Activities:       ${activityKeys.length}`);
      for (const key of activityKeys) {
        lines.push(`    [${key}]: ${result.activitySysIds[key]}`);
      }
    }

    if (result.transitionSysIds && result.transitionSysIds.length > 0) {
      lines.push(`  Transitions:      ${result.transitionSysIds.length}`);
      for (const [index, id] of result.transitionSysIds.entries()) {
        lines.push(`    [${index}]: ${id}`);
      }
    }

    lines.push(`  Published:        ${result.published ?? false}`);
    lines.push("─".repeat(60));
    lines.push('Workflow creation completed successfully.');

    return lines;
  }
}

function describeExits(detail: ActivityDefinitionDetail): string {
  if (detail.defaultConditions.length > 0) {
    return detail.defaultConditions.map(c => `${c.name} (${c.condition || 'otherwise'})`).join(', ')
  }

  return /(^|,)\s*end\s*=\s*true/i.test(detail.attributes) ? 'none' : 'Always (true)'
}

function describeVariable(v: ActivityDefinitionDetail['variables'][number]): string[] {
  const lines = [`    ${v.element.padEnd(26)} ${v.internalType.padEnd(16)} ${v.label}${v.mandatory ? ' (mandatory)' : ''}`]
  if (v.hint) lines.push(`      hint: ${v.hint.replaceAll(/\s+/g, ' ').trim()}`)
  if (v.choices?.length) lines.push(`      choices: ${v.choices.map(c => (c.value === '' ? `'' (${c.label})` : `${c.value} (${c.label})`)).join(' | ')}`)
  if (v.reference) lines.push(`      reference: ${v.reference}`)
  if (v.defaultValue) lines.push(`      default: ${oneLine(v.defaultValue)}`)
  return lines
}

function versionState(definition: WorkflowDefinition): string {
  if (definition.published) return 'published'
  return definition.checkedOut ? 'draft' : 'superseded'
}

function oneLine(value: string): string {
  const flat = value.replaceAll(/\s+/g, ' ').trim()
  return flat.length > 100 ? `${flat.slice(0, 97)}...` : flat
}
