import {describe, expect, it} from '@jest/globals'
import type {ClusterTransaction} from '@sonisoft/now-sdk-ext-core'

import {TransactionDisplayService} from '../../src/services/transaction-display.service.js'

const transaction = (overrides: Partial<ClusterTransaction> = {}): ClusterTransaction => ({
  acl_time: '1',
  age: '12 seconds',
  br_count: '2',
  br_time: '3',
  business_rule: 'Example rule',
  db_time: '4',
  event_count: '5',
  foreground: 'true',
  node_id: 'node-1',
  query_count: '6',
  state: 'running',
  sys_id: '0123456789abcdef0123456789abcdef',
  thread: 'worker-1',
  type: 'background',
  url: '/incident_list.do?sysparm_query=active=true',
  user: 'admin',
  ...overrides,
})

describe('TransactionDisplayService', () => {
  const display = new TransactionDisplayService()

  it('shows every required text field and the complete transaction identifier', () => {
    const output = display.formatTransactions([transaction()]).join('\n')
    for (const value of ['0123456789abcdef0123456789abcdef', 'node-1', 'admin', '12 seconds', 'running', 'background', 'worker-1', '/incident_list.do']) {
      expect(output).toContain(value)
    }
  })

  it('keeps long fields on one row without hiding the complete identifier', () => {
    const id = 'fedcba9876543210fedcba9876543210'
    const lines = display.formatTransactions([transaction({sys_id: id, thread: `a\nb\t${'x'.repeat(500)}`, url: `/${'y'.repeat(2000)}`})])
    expect(lines).toHaveLength(3)
    expect(lines[2]).toContain(id)
    expect(lines[2]).not.toContain('\n')
    expect(lines[2]).not.toContain('\t')
    expect(lines[2]).toContain(`/${'y'.repeat(2000)}`)
  })

  it('states clearly when no active transactions were found', () => {
    expect(display.formatTransactions([])).toEqual(['No active transactions found.'])
  })

  it('uses singular and plural count headings', () => {
    expect(display.formatTransactions([transaction()])[0]).toBe('1 active transaction found.')
    expect(display.formatTransactions([transaction(), transaction({sys_id: '1'.repeat(32)})])[0]).toBe('2 active transactions found.')
  })
})
