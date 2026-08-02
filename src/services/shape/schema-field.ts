/**
 * Field-level schema shaping — the single definition of the type-fallback
 * chain and the field → UI-control mapping, shared by the CLI display
 * services and the TUI form renderer.
 *
 * The exact strings the CLI prints (schemaFieldCells) and the typed spec the
 * TUI consumes (toFieldSpec) both live here so the fallback logic cannot
 * drift between the two layers.
 */

export type FieldControlKind =
  | 'boolean'
  | 'choice'
  | 'datetime'
  | 'number'
  | 'reference'
  | 'text'
  | 'textarea'

export interface FieldChoice {
  label: string
  value: string
}

export interface FieldSpec {
  controlKind: FieldControlKind
  label: string
  mandatory: boolean
  maxLength?: number
  name: string
  readOnly: boolean
  /** Referenced table, when known. */
  reference?: string
  type: string
}

/** The shared fallback chain: internalType, then type, then empty. */
export function fieldTypeText(field: {internalType?: string; type?: string}): string {
  return field.internalType || field.type || ''
}

/**
 * The exact cell strings the CLI's field tables print today — extracted
 * byte-for-byte from query-display.service.ts:formatColumnsResults and
 * schema-display.service.ts:formatTableSchema (which were byte-identical
 * copies of each other). The services pad these; do not change the
 * coercions here without accepting a CLI output change.
 */
export function schemaFieldCells(field: any): {
  label: string
  mandatory: string
  maxLength: string
  name: string
  readOnly: string
  type: string
} {
  return {
    label: field.label || '',
    mandatory: String(field.mandatory ?? false),
    maxLength: String(field.maxLength ?? ''),
    name: field.name || '',
    readOnly: String(field.readOnly ?? false),
    type: fieldTypeText(field),
  }
}

const CONTROL_BY_TYPE: Record<string, FieldControlKind> = {
  boolean: 'boolean',
  decimal: 'number',
  due_date: 'datetime',
  float: 'number',
  glide_date: 'datetime',
  glide_date_time: 'datetime',
  html: 'textarea',
  integer: 'number',
  journal: 'textarea',
  journal_input: 'textarea',
  longint: 'number',
  reference: 'reference',
  script: 'textarea',
  script_plain: 'textarea',
}

/** ServiceNow dictionary type → which TUI control edits it. */
export function fieldControlKind(type: string): FieldControlKind {
  return CONTROL_BY_TYPE[type] ?? 'text'
}

/** Typed spec for the TUI. Choices load lazily via explainField, not here. */
export function toFieldSpec(field: any): FieldSpec {
  const type = fieldTypeText(field)
  const spec: FieldSpec = {
    controlKind: field.choices && field.choices.length > 0 ? 'choice' : fieldControlKind(type),
    label: field.label || field.name || '',
    mandatory: Boolean(field.mandatory),
    name: field.name || '',
    readOnly: Boolean(field.readOnly),
    type,
  }
  if (field.maxLength !== undefined && field.maxLength !== null) {
    spec.maxLength = Number(field.maxLength)
  }

  if (field.reference) {
    spec.reference = String(field.reference)
  }

  return spec
}
