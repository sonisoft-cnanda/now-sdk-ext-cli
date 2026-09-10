import { describe, expect, it } from '@jest/globals'
import { BehaviorDisplayService } from '../../src/services/behavior-display.service.js'
import type { TableBehaviorResult } from '@sonisoft/now-sdk-ext-core'

const result: TableBehaviorResult = {
  table: 'incident', ancestors: ['task'], requestedDetails: [], dependencies: [], warnings: [], visibility: 'accessible_configuration',
  categories: [{ category: 'ui_policies', status: 'partial', nextCursor: 'next', items: [], warnings: [{ code: 'permission_denied', message: 'Access denied' }] }],
}
describe('BehaviorDisplayService', () => {
  it('retains partial results and continuation in JSON', () => {
    const lines = new BehaviorDisplayService().format(result, true)
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0])).toEqual(result)
  })
  it('shows failures and continuation in text', () => {
    const text = new BehaviorDisplayService().format(result, false).join('\n')
    expect(text).toContain('permission_denied: Access denied')
    expect(text).toContain('--category ui_policies --cursor next')
    expect(text).toContain('conditions are not evaluated')
  })
})
