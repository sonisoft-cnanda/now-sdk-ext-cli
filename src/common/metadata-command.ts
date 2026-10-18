import {Command, Errors, Flags} from '@oclif/core'
import {flushLogs, type MetadataDeleteOptions, MetadataFormWriter, type MetadataWriteOptions, type MetadataWriteResult} from '@sonisoft/now-sdk-ext-core'
import {readFile} from 'node:fs/promises'

import {MetadataDisplayService, MetadataInputError, projectMetadataError} from '../services/metadata-display.service.js'
import {AuthenticatedCommand} from './authenticated-command.js'

export const metadataFlags = {
  scope: Flags.string({description: 'Explicit application scope name, or literal global.', exclusive: ['scope-id']}),
  'scope-id': Flags.string({description: 'Explicit application scope sys_id.', exclusive: ['scope']}),
  table: Flags.string({description: 'Metadata table name.', required: true}),
  'update-set': Flags.string({description: 'In progress update set in the requested scope.'}),
  view: Flags.string({description: 'Form view name.'}),
}

export const metadataWriteFlags = {
  fields: Flags.string({description: 'Field values as a JSON object. Prefer --fields-file for scripts.', exclusive: ['fields-file']}),
  'fields-file': Flags.string({description: 'Read field values from a JSON object file.', exclusive: ['fields']}),
  'initial-query': Flags.string({description: 'Literal equality terms separated by ^, with lowercase field identifiers. CLI checks syntax; core checks allowed fields.'}),
  'variable-field': Flags.string({description: 'Variable column name. Requires variables.'}),
  variables: Flags.string({description: 'Variable values as a JSON object.', exclusive: ['variables-file']}),
  'variables-file': Flags.string({description: 'Read variable values from a JSON object file.', exclusive: ['variables']}),
}

export type MetadataAction = MetadataWriteResult['action']
export type MetadataFlags = Record<string, unknown>
const ID = /^[a-f\d]{32}$/i
const NAME = /^[a-z\d_]+$/i
const UNSAFE = new Set(['__proto__', 'constructor', 'prototype'])

function reject(message: string): never {
  throw new MetadataInputError(message)
}

export function validateInitialQuery(value: unknown): asserts value is string | undefined {
  if (value === undefined) return
  if (typeof value !== 'string' || /\p{Cc}/u.test(value) || /javascript:/i.test(value)) {
    reject('The initial query must contain literal equality terms with lowercase field identifiers.')
  }

  for (const term of (value as string).split('^')) {
    const equals = term.indexOf('=')
    const field = term.slice(0, equals)
    if (equals < 1 || !/^[a-z][a-z0-9_]*$/.test(field) || field.startsWith('sys_') || UNSAFE.has(field)) {
      reject('The initial query must contain literal equality terms with lowercase field identifiers.')
    }
  }
}

function identifier(flags: MetadataFlags, name: string, pattern: RegExp, required = false): string | undefined {
  const value = flags[name]
  if (value === undefined && !required) return undefined
  if (typeof value !== 'string' || !pattern.test(value)) reject(`--${name} has an invalid identifier.`)
  return value as string
}

async function objectInput(flags: MetadataFlags, name: string): Promise<MetadataWriteOptions['fields']> {
  if (flags[name] !== undefined && flags[`${name}-file`] !== undefined) reject(`Use one ${name} source.`)
  let text = flags[name]
  if (flags[`${name}-file`] !== undefined) {
    try {
      text = await readFile(flags[`${name}-file`] as string, 'utf8')
    } catch {
      reject(`Cannot read the ${name} file.`)
    }
  }

  if (text === undefined) return undefined
  let value: unknown
  try {
    value = JSON.parse(text as string)
  } catch {
    reject(`The ${name} input must be valid JSON.`)
  }

  if (!value || Array.isArray(value) || typeof value !== 'object') reject(`The ${name} input must be a JSON object.`)
  for (const [key, field] of Object.entries(value as object)) {
    if (UNSAFE.has(key)) reject(`The ${name} input contains a prohibited key.`)
    if (field === null || typeof field === 'string' || typeof field === 'boolean') continue
    if (typeof field === 'number' && Number.isFinite(field)) continue
    if (Array.isArray(field) && field.every(item => typeof item === 'string')) continue
    if (field && typeof field === 'object' && !Array.isArray(field) &&
      Object.entries(field).every(([part, amount]) =>
        ['days', 'hours', 'minutes', 'seconds'].includes(part) && typeof amount === 'number' && Number.isFinite(amount))) continue
    reject(`The ${name} input contains an unsupported value.`)
  }

  return value as MetadataWriteOptions['fields']
}

export async function metadataOptions(flags: MetadataFlags, action: MetadataAction): Promise<MetadataDeleteOptions | MetadataWriteOptions> {
  identifier(flags, 'table', NAME, true)
  if (action !== 'insert') identifier(flags, 'sys-id', ID, true)
  const updateSet = identifier(flags, 'update-set', ID)
  const scopeName = identifier(flags, 'scope', NAME)
  const scopeId = identifier(flags, 'scope-id', ID)
  if (Boolean(scopeName) === Boolean(scopeId)) reject('Supply exactly one of --scope and --scope-id.')
  const scope = scopeId ? {sysId: scopeId} : scopeName === 'global' ? 'global' : {scope: scopeName!}
  const common: MetadataWriteOptions = {scope, ...(updateSet === undefined ? {} : {updateSet}),
    ...(flags.view === undefined ? {} : {view: flags.view as string})}
  if (action === 'delete') {
    if (flags['confirm-table'] !== flags.table || flags['confirm-sys-id'] !== flags['sys-id']) {
      reject('Delete confirmation must match --table and --sys-id exactly.')
    }

    return {...common, confirm: {sysId: flags['sys-id'] as string, table: flags.table as string}}
  }

  validateInitialQuery(flags['initial-query'])
  const fields = await objectInput(flags, 'fields')
  const variables = await objectInput(flags, 'variables')
  const variableField = identifier(flags, 'variable-field', NAME)
  if (variableField && variables === undefined) reject('--variable-field requires variables.')
  if (Object.keys(fields ?? {}).length === 0 && Object.keys(variables ?? {}).length === 0 && !flags['initial-query']) {
    reject('Supply fields, variables, or an initial query for the write.')
  }

  return {...common, ...(fields === undefined ? {} : {fields}), ...(variables === undefined ? {} : {variables}),
    ...(variableField === undefined ? {} : {variableField}),
    ...(flags['initial-query'] === undefined ? {} : {initialQuery: flags['initial-query'] as string})}
}

export abstract class MetadataCommand<T extends typeof Command> extends AuthenticatedCommand<T> {
  protected abstract metadataAction: MetadataAction

  protected async catch(error: Error & {exitCode?: number}): Promise<void> {
    const flags = this.flags as MetadataFlags | undefined
    const failure = projectMetadataError(error, {action: this.metadataAction,
      sysId: flags?.['sys-id'], table: flags?.table})
    // Only the projected error can reach the shared catch handler and logger.
    await flushLogs()
    const message = this.jsonEnabled() ? failure.message : new MetadataDisplayService().failure(failure).join('\n')
    const safe = new Errors.CLIError(message, {code: failure.code, exit: 1, suggestions: failure.remediation})
    Object.assign(safe, {metadata: failure})
    return super.catch(safe)
  }

  public async run(): Promise<MetadataWriteResult> {
    const flags = this.flags as MetadataFlags
    const options = await metadataOptions(flags, this.metadataAction)
    const writer = new MetadataFormWriter(this.instance)
    const table = flags.table as string
    const sysId = flags['sys-id'] as string
    const result = this.metadataAction === 'insert' ? await writer.insert(table, options) :
      this.metadataAction === 'update' ? await writer.update(table, sysId, options) :
        await writer.delete(table, sysId, options as MetadataDeleteOptions)
    const display = new MetadataDisplayService()
    const safe = display.result(result)
    if (!this.jsonEnabled()) for (const line of display.success(safe)) this.log(line)
    return safe
  }
}
