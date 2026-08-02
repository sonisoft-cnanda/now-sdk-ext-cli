import { describe, expect, it } from '@jest/globals'

import {
  fieldControlKind,
  fieldTypeText,
  schemaFieldCells,
  toFieldSpec,
} from '../../../src/services/shape/schema-field.js'

describe('fieldTypeText', () => {
  it('prefers internalType, then type, then empty', () => {
    expect(fieldTypeText({ internalType: 'string', type: 'other' })).toBe('string')
    expect(fieldTypeText({ type: 'integer' })).toBe('integer')
    expect(fieldTypeText({})).toBe('')
  })
})

describe('schemaFieldCells (CLI byte-compatibility)', () => {
  it('matches the historical coercions exactly', () => {
    const cells = schemaFieldCells({ label: 'State', mandatory: false, maxLength: 40, name: 'state', readOnly: false, type: 'integer' })
    expect(cells).toEqual({
      label: 'State',
      mandatory: 'false',
      maxLength: '40',
      name: 'state',
      readOnly: 'false',
      type: 'integer',
    })
  })

  it('renders missing fields the way padEnd chains did', () => {
    const cells = schemaFieldCells({})
    expect(cells).toEqual({ label: '', mandatory: 'false', maxLength: '', name: '', readOnly: 'false', type: '' })
  })
})

describe('fieldControlKind', () => {
  it('maps dictionary types to controls', () => {
    expect(fieldControlKind('boolean')).toBe('boolean')
    expect(fieldControlKind('glide_date_time')).toBe('datetime')
    expect(fieldControlKind('integer')).toBe('number')
    expect(fieldControlKind('reference')).toBe('reference')
    expect(fieldControlKind('journal_input')).toBe('textarea')
    expect(fieldControlKind('script')).toBe('textarea')
    expect(fieldControlKind('string')).toBe('text')
    expect(fieldControlKind('anything_else')).toBe('text')
  })
})

describe('toFieldSpec', () => {
  it('builds a typed spec with the shared fallback chain', () => {
    const spec = toFieldSpec({ internalType: 'reference', label: 'Assigned to', mandatory: true, maxLength: '32', name: 'assigned_to', readOnly: false, reference: 'sys_user' })
    expect(spec).toEqual({
      controlKind: 'reference',
      label: 'Assigned to',
      mandatory: true,
      maxLength: 32,
      name: 'assigned_to',
      readOnly: false,
      reference: 'sys_user',
      type: 'reference',
    })
  })

  it('prefers choice control when choices are present', () => {
    const spec = toFieldSpec({ choices: [{ label: 'New', value: '1' }], name: 'state', type: 'integer' })
    expect(spec.controlKind).toBe('choice')
  })

  it('omits maxLength/reference when absent', () => {
    const spec = toFieldSpec({ name: 'active', type: 'boolean' })
    expect(spec.maxLength).toBeUndefined()
    expect(spec.reference).toBeUndefined()
    expect(spec.controlKind).toBe('boolean')
  })
})
