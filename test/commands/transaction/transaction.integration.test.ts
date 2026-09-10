import {describe, expect, it} from '@jest/globals'

import TransactionKill from '../../../src/commands/transaction/kill.js'
import TransactionList from '../../../src/commands/transaction/list.js'

describe('transaction command structure', () => {
  it('defines list retrieval controls and examples', () => {
    expect(Object.keys(TransactionList.flags)).toEqual(expect.arrayContaining(['poll-interval-ms', 'timeout-ms', 'query', 'limit']))
    expect(TransactionList.examples).toHaveLength(4)
  })

  it('requires an exact transaction identifier and exposes confirmation', () => {
    expect(TransactionKill.flags['transaction-id'].required).toBe(true)
    expect(TransactionKill.flags.confirm).toBeDefined()
    expect(TransactionKill.examples).toHaveLength(2)
  })
})
