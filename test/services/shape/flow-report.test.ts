import { describe, expect, it } from '@jest/globals'

import {
  flattenOperationData,
  flowStateRole,
  sortFlowReports,
  stepLabel,
  toFlowSteps,
} from '../../../src/services/shape/flow-report.js'

describe('stepLabel (CLI fallback chain)', () => {
  it('prefers stepLabel, then actionTypeName, then the action name', () => {
    expect(stepLabel({ actionTypeName: 'B', stepLabel: 'A' })).toBe('A')
    expect(stepLabel({ actionName: 'C', actionTypeName: 'B' })).toBe('B')
    expect(stepLabel({ actionName: 'C' })).toBe('Action C')
  })
})

describe('sortFlowReports', () => {
  const r = (order: string, tag: string) => ({ operationsCore: { order }, tag })

  it('merges actions and subflows and sorts by execution order', () => {
    const sorted = sortFlowReports([r('3', 'a3'), r('1', 'a1')], [r('2', 's2')])
    expect(sorted.map((x) => x.tag)).toEqual(['a1', 's2', 'a3'])
  })

  it('treats an unparseable order as 0, like the CLI parseInt did', () => {
    const sorted = sortFlowReports([r('2', 'two'), r('', 'blank')], [])
    expect(sorted.map((x) => x.tag)).toEqual(['blank', 'two'])
  })
})

describe('flattenOperationData', () => {
  it('prefers displayValue over value', () => {
    expect(flattenOperationData({ data: { u: { displayValue: 'Beth', value: 'abc123' } } })).toEqual({ u: 'Beth' })
  })

  it('falls back to value and tolerates plain cells', () => {
    expect(flattenOperationData({ data: { a: { value: 'x' }, b: 'plain' } })).toEqual({ a: 'x', b: 'plain' })
  })

  it('handles a missing block', () => {
    expect(flattenOperationData(undefined)).toEqual({})
    expect(flattenOperationData({})).toEqual({})
  })
})

describe('toFlowSteps', () => {
  const report = {
    actionOperationsReports: {
      x: {
        operationsCore: { order: '2', runTime: '150', state: 'COMPLETE' },
        operationsOutput: { data: { record: { displayValue: 'INC0010023', value: 'sys1' } } },
        stepLabel: 'Update Record',
      },
      y: {
        actionTypeName: 'Look Up',
        operationsCore: { error: 'no rows', order: '1', runTime: '12', state: 'ERROR' },
        operationsInput: { data: { table: { value: 'incident' } } },
      },
    },
    subflowOperationsReports: {
      z: { operationsCore: { order: '3', runTime: '5', state: 'COMPLETE' }, stepLabel: 'Notify' },
    },
  }

  it('orders steps by execution order across actions and subflows', () => {
    expect(toFlowSteps(report).map((s) => s.label)).toEqual(['Look Up', 'Update Record', 'Notify'])
  })

  it('marks which steps came from subflows', () => {
    expect(toFlowSteps(report).map((s) => s.kind)).toEqual(['action', 'action', 'subflow'])
  })

  it('carries the error, timing and flattened inputs/outputs', () => {
    const [first, second] = toFlowSteps(report)
    expect(first.error).toBe('no rows')
    expect(first.state).toBe('ERROR')
    expect(first.inputs).toEqual({ table: 'incident' })
    expect(second.runTimeMs).toBe(150)
    expect(second.outputs).toEqual({ record: 'INC0010023' })
  })

  it('returns nothing for a missing report (reporting off)', () => {
    expect(toFlowSteps(undefined)).toEqual([])
    expect(toFlowSteps({})).toEqual([])
  })

  it('falls back to fStepCount when operationsCore is empty', () => {
    // Verified against a live instance: real executions frequently return
    // operationsCore as {} while each action carries fStepCount. Without
    // the fallback every step sorts as 0 and the tree order is arbitrary.
    const real = {
      actionOperationsReports: {
        a: { fStepCount: 3, operationsCore: {}, stepLabel: 'Third' },
        b: { fStepCount: 1, operationsCore: {}, stepLabel: 'First' },
        c: { fStepCount: 2, operationsCore: {}, stepLabel: 'Second' },
      },
    }
    expect(toFlowSteps(real).map((s) => s.label)).toEqual(['First', 'Second', 'Third'])
  })

  it('prefers operationsCore.order over fStepCount when both exist', () => {
    const mixed = {
      actionOperationsReports: {
        a: { fStepCount: 99, operationsCore: { order: '1' }, stepLabel: 'A' },
        b: { fStepCount: 1, operationsCore: { order: '2' }, stepLabel: 'B' },
      },
    }
    expect(toFlowSteps(mixed).map((s) => s.label)).toEqual(['A', 'B'])
  })

  it('reports unknown state and timing as empty rather than inventing zeros', () => {
    const [step] = toFlowSteps({ actionOperationsReports: { a: { operationsCore: {}, stepLabel: 'X' } } })
    expect(step.state).toBe('')
    expect(step.runTimeMs).toBe(0)
  })
})

describe('flowStateRole', () => {
  it('maps every state core emits', () => {
    expect(flowStateRole('COMPLETE')).toBe('ok')
    expect(flowStateRole('ERROR')).toBe('error')
    expect(flowStateRole('IN_PROGRESS')).toBe('running')
    expect(flowStateRole('WAITING')).toBe('waiting')
    expect(flowStateRole('QUEUED')).toBe('waiting')
    expect(flowStateRole('CANCELLED')).toBe('muted')
    expect(flowStateRole(undefined)).toBe('muted')
  })
})
