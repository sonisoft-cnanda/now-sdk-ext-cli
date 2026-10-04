import type { WorkflowExport, WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { readFileSync } from 'node:fs'

const SYS_ID = /^[0-9a-f]{32}$/i

/**
 * Merge `--vars-file` (a JSON object) and repeated `--var key=value` flags into one
 * variables object. Flags win over the file. Returns undefined when neither is given.
 */
export function parseVariables(vars: string[] | undefined, varsFile: string | undefined): Record<string, unknown> | undefined {
  let result: Record<string, unknown> | undefined
  if (varsFile) {
    const parsed: unknown = JSON.parse(readFileSync(varsFile, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`--vars-file must contain a JSON object of variable values: ${varsFile}`)
    }

    result = { ...(parsed as Record<string, unknown>) }
  }

  for (const entry of vars ?? []) {
    const at = entry.indexOf('=')
    if (at <= 0) throw new Error(`--var must be key=value, got '${entry}'`)
    result = { ...result, [entry.slice(0, at).trim()]: entry.slice(at + 1) }
  }

  return result
}

/**
 * The draft version to edit: `--version` as given, otherwise the current user's
 * checked-out draft of `--workflow`.
 */
export async function resolveDraftVersion(wm: WorkflowManager, workflow?: string, version?: string): Promise<string> {
  if (version) return version
  if (!workflow) throw new Error('Specify the workflow (--workflow) or the draft version (--version).')
  return wm.getDraftVersion(workflow)
}

/**
 * The version to read: `--version` as given, otherwise the current user's draft of the
 * workflow if they have one, else its published version.
 */
export async function resolveReadableVersion(wm: WorkflowManager, workflow?: string, version?: string): Promise<string> {
  if (version) return version
  if (!workflow) throw new Error('Specify the workflow or --version.')
  const summary = await wm.resolveWorkflow(workflow)
  if (summary.checkedOutVersion?.byCurrentUser) return summary.checkedOutVersion.sysId
  if (summary.publishedVersionSysId) return summary.publishedVersionSysId
  if (summary.checkedOutVersion) return summary.checkedOutVersion.sysId
  throw new Error(`Workflow '${summary.name}' has no published or checked-out version.`)
}

/**
 * An activity on a version, by sys_id or by its (unique) name.
 */
export async function resolveActivity(wm: WorkflowManager, versionSysId: string, ref: string): Promise<string> {
  if (SYS_ID.test(ref)) return ref
  const definition = await wm.getWorkflowDefinition(versionSysId, { includeStatus: false, includeVariables: false })
  const matches = definition.activities.filter(a => a.name.toLowerCase() === ref.toLowerCase())
  if (matches.length === 1) return matches[0].sysId
  if (matches.length === 0) {
    throw new Error(`No activity named '${ref}'. Activities: ${definition.activities.map(a => a.name).join(', ')}`)
  }

  throw new Error(`${matches.length} activities are named '${ref}'; use a sys_id: ${matches.map(a => a.sysId).join(', ')}`)
}

/**
 * Parse `--input` for Activity Designer activities: a JSON object.
 */
export function parseInput(input: string | undefined): Record<string, unknown> | undefined {
  if (input === undefined) return undefined
  const parsed: unknown = JSON.parse(input)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('--input must be a JSON object')
  return parsed as Record<string, unknown>
}

/**
 * An exit (wf_condition) of an activity, by sys_id or by name.
 */
export async function resolveExit(wm: WorkflowManager, versionSysId: string, activitySysId: string, ref: string): Promise<string> {
  if (SYS_ID.test(ref)) return ref
  const definition = await wm.getWorkflowDefinition(versionSysId, { includeStatus: false, includeVariables: false })
  const exits = definition.activities.find(a => a.sysId === activitySysId)?.conditions ?? []
  const match = exits.find(c => c.name.toLowerCase() === ref.toLowerCase())
  if (match) return match.sysId
  throw new Error(`The activity has no exit '${ref}'. Exits: ${exits.map(c => c.name).join(', ') || '(none)'}`)
}

/**
 * A workflow export to work on: read from `--file` (a `nex workflow export` document, no
 * instance needed) or exported from the instance.
 */
export async function loadWorkflowExport(
  wm: () => WorkflowManager, workflow: string | undefined, file: string | undefined, version: 'current' | 'draft' | 'published',
): Promise<WorkflowExport> {
  if (file) {
    if (workflow) throw new Error('Give either a workflow or --file, not both.')
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<WorkflowExport>
    if (parsed?.format !== 'now-sdk-ext/legacy-workflow@1' || !Array.isArray(parsed.activities)) {
      throw new Error(`${file} is not a \`nex workflow export\` document.`)
    }

    return parsed as WorkflowExport
  }

  if (!workflow) throw new Error('Specify the workflow, or --file with a `nex workflow export` document.')
  return wm().exportWorkflow(workflow, { version })
}
