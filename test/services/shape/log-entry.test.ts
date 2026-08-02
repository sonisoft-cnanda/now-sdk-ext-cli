import { describe, expect, it } from '@jest/globals'

import {
  classifySeverity,
  levelLabel,
  SEVERITY_KEYWORDS,
  toLogEntry,
} from '../../../src/services/shape/log-entry.js'

describe('classifySeverity (byte-compatible branch order)', () => {
  it('error beats everything', () => {
    expect(classifySeverity('Warning: request failed')).toBe('error')
    expect(classifySeverity('NullPointerException at line 42')).toBe('error')
  })

  it('warn beats success and system', () => {
    expect(classifySeverity('deprecated API used by transaction')).toBe('warn')
  })

  it('success beats system', () => {
    expect(classifySeverity('user sync completed')).toBe('success')
  })

  it('system catches transaction/request/user/system mentions', () => {
    expect(classifySeverity('transaction /incident_list.do took 412ms')).toBe('system')
  })

  it('everything else is plain', () => {
    expect(classifySeverity('SLA engine tick, 4 breaches pending')).toBe('plain')
  })

  it('keyword lists stay byte-identical to the CLI formatter', () => {
    expect(SEVERITY_KEYWORDS.error).toEqual(['error', 'exception', 'failed', 'failure', 'ERROR', 'Exception', 'Failed', 'Failure'])
    expect(SEVERITY_KEYWORDS.warn).toEqual(['warn', 'warning', 'deprecated', 'Warning', 'WARN', 'Deprecated'])
    expect(SEVERITY_KEYWORDS.success).toEqual(['success', 'completed', 'finished', 'done', 'Success', 'Completed', 'Finished', 'Done'])
  })
})

describe('levelLabel', () => {
  it('maps string and numeric levels', () => {
    expect(levelLabel('error')).toBe('ERR')
    expect(levelLabel('0')).toBe('ERR')
    expect(levelLabel('-1')).toBe('ERR')
    expect(levelLabel('warning')).toBe('WRN')
    expect(levelLabel('1')).toBe('WRN')
    expect(levelLabel('info')).toBe('INF')
    expect(levelLabel('2')).toBe('INF')
    expect(levelLabel('debug')).toBe('DBG')
    expect(levelLabel('3')).toBe('DBG')
  })

  it('degrades unknown levels to a padded 3-char tag', () => {
    expect(levelLabel('trace')).toBe('TRA')
    expect(levelLabel('')).toBe('?  ')
  })
})

describe('toLogEntry', () => {
  it('normalizes a syslog record — level and message severity are independent', () => {
    const entry = toLogEntry({
      level: 'error',
      // 'refused' matches no severity keyword: the LEVEL is error but the
      // message classifies plain. Both signals reach the UI separately.
      message: 'Outbound relay refused',
      source: 'x_acme.MailProbe',
      sys_created_by: 'admin',
      sys_created_on: '2026-08-01 10:41:58',
      sys_id: 'abc123',
    })
    expect(entry).toMatchObject({
      createdBy: 'admin',
      createdOn: '2026-08-01 10:41:58',
      levelLabel: 'ERR',
      severity: 'plain',
      source: 'x_acme.MailProbe',
      sysId: 'abc123',
    })
  })

  it('tolerates missing fields', () => {
    const entry = toLogEntry({})
    expect(entry.message).toBe('')
    expect(entry.severity).toBe('plain')
    expect(entry.sequence).toBeUndefined()
    expect(entry.createdBy).toBeUndefined()
  })
})
