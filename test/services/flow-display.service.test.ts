import { describe, it, expect } from '@jest/globals'
import { FlowDisplayService } from '../../src/services/flow-display.service.js'

describe('FlowDisplayService', () => {
  const service = new FlowDisplayService()

  describe('formatExecutionResult', () => {
    const successResult = {
      success: true,
      flowObjectName: 'global.test_flow',
      flowObjectType: 'flow',
      contextId: 'ctx-001',
      executionDate: '2025-01-01 12:00:00',
      outputs: { result: 'done', count: 5 },
      debugOutput: '',
    }

    describe('JSON output', () => {
      it('should return result as JSON', () => {
        const lines = service.formatExecutionResult(successResult, true)
        expect(lines).toHaveLength(1)
        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.flowObjectName).toBe('global.test_flow')
        expect(parsed.contextId).toBe('ctx-001')
      })
    })

    describe('text output', () => {
      it('should display flow type and name', () => {
        const output = service.formatExecutionResult(successResult, false).join('\n')
        expect(output).toContain('flow')
        expect(output).toContain('global.test_flow')
      })

      it('should display success icon', () => {
        const output = service.formatExecutionResult(successResult, false).join('\n')
        expect(output).toContain('\u2714')
        expect(output).toContain('Success')
      })

      it('should display context ID and execution date', () => {
        const output = service.formatExecutionResult(successResult, false).join('\n')
        expect(output).toContain('ctx-001')
        expect(output).toContain('2025-01-01 12:00:00')
      })

      it('should display outputs', () => {
        const output = service.formatExecutionResult(successResult, false).join('\n')
        expect(output).toContain('result: done')
        expect(output).toContain('count: 5')
      })

      it('should display error message on failure', () => {
        const failedResult = { ...successResult, success: false, errorMessage: 'Flow failed' }
        const output = service.formatExecutionResult(failedResult, false).join('\n')
        expect(output).toContain('\u2718')
        expect(output).toContain('Failed')
        expect(output).toContain('Flow failed')
      })

      it('should display debug output when present', () => {
        const withDebug = { ...successResult, debugOutput: 'Debug info here' }
        const output = service.formatExecutionResult(withDebug, false).join('\n')
        expect(output).toContain('Debug Output')
        expect(output).toContain('Debug info here')
      })
    })
  })

  describe('formatStatusResult', () => {
    const foundResult = {
      success: true,
      contextId: 'ctx-001',
      found: true,
      state: 'COMPLETE',
      name: 'Test Flow',
      started: '2025-01-01 12:00:00',
      ended: '2025-01-01 12:00:05',
    }

    describe('JSON output', () => {
      it('should return result as JSON', () => {
        const lines = service.formatStatusResult(foundResult, true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.state).toBe('COMPLETE')
        expect(parsed.found).toBe(true)
      })
    })

    describe('text output', () => {
      it('should display context details', () => {
        const output = service.formatStatusResult(foundResult, false).join('\n')
        expect(output).toContain('ctx-001')
        expect(output).toContain('Test Flow')
        expect(output).toContain('COMPLETE')
      })

      it('should display timestamps', () => {
        const output = service.formatStatusResult(foundResult, false).join('\n')
        expect(output).toContain('2025-01-01 12:00:00')
        expect(output).toContain('2025-01-01 12:00:05')
      })

      it('should show not found message', () => {
        const notFound = { success: true, contextId: 'ctx-999', found: false }
        const output = service.formatStatusResult(notFound, false).join('\n')
        expect(output).toContain('not found')
        expect(output).toContain('ctx-999')
      })

      it('should use state-specific icons', () => {
        const inProgress = { ...foundResult, state: 'IN_PROGRESS' }
        const output = service.formatStatusResult(inProgress, false).join('\n')
        expect(output).toContain('\u25B6')

        const error = { ...foundResult, state: 'ERROR' }
        const errorOutput = service.formatStatusResult(error, false).join('\n')
        expect(errorOutput).toContain('\u2718')
      })
    })
  })

  describe('formatOutputsResult', () => {
    describe('JSON output', () => {
      it('should return result as JSON', () => {
        const result = { success: true, contextId: 'ctx-001', outputs: { key: 'val' } }
        const lines = service.formatOutputsResult(result, true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.outputs.key).toBe('val')
      })
    })

    describe('text output', () => {
      it('should display outputs', () => {
        const result = { success: true, contextId: 'ctx-001', outputs: { key: 'val', num: 42 } }
        const output = service.formatOutputsResult(result, false).join('\n')
        expect(output).toContain('key: val')
        expect(output).toContain('num: 42')
      })

      it('should show no outputs message when empty', () => {
        const result = { success: true, contextId: 'ctx-001', outputs: {} }
        const output = service.formatOutputsResult(result, false).join('\n')
        expect(output).toContain('No outputs available')
      })
    })
  })

  describe('formatErrorResult', () => {
    describe('text output', () => {
      it('should display flow error message', () => {
        const result = { success: true, contextId: 'ctx-001', flowErrorMessage: 'Something broke' }
        const output = service.formatErrorResult(result, false).join('\n')
        expect(output).toContain('Something broke')
      })

      it('should show no error message when none present', () => {
        const result = { success: true, contextId: 'ctx-001' }
        const output = service.formatErrorResult(result, false).join('\n')
        expect(output).toContain('No error message available')
      })
    })
  })

  describe('formatCancelResult', () => {
    describe('text output', () => {
      it('should display success message', () => {
        const result = { success: true, contextId: 'ctx-001' }
        const output = service.formatCancelResult(result, false).join('\n')
        expect(output).toContain('\u2714')
        expect(output).toContain('cancelled successfully')
      })

      it('should display failure message', () => {
        const result = { success: false, contextId: 'ctx-001', errorMessage: 'Already completed' }
        const output = service.formatCancelResult(result, false).join('\n')
        expect(output).toContain('\u2718')
        expect(output).toContain('Failed to cancel')
        expect(output).toContain('Already completed')
      })
    })
  })

  describe('formatCopyResult', () => {
    const successResult = {
      success: true,
      newFlowSysId: 'new-flow-001',
      errorMessage: undefined as string | undefined,
      errorCode: 0,
    }

    describe('JSON output', () => {
      it('should return result as JSON', () => {
        const lines = service.formatCopyResult(successResult, true)
        expect(lines).toHaveLength(1)
        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.newFlowSysId).toBe('new-flow-001')
      })
    })

    describe('text output', () => {
      it('should display flow copy header with success icon', () => {
        const output = service.formatCopyResult(successResult, false).join('\n')
        expect(output).toContain('Flow Copy')
        expect(output).toContain('\u2714')
        expect(output).toContain('Success')
      })

      it('should display new flow sys_id', () => {
        const output = service.formatCopyResult(successResult, false).join('\n')
        expect(output).toContain('new-flow-001')
      })

      it('should display next steps guidance on success', () => {
        const output = service.formatCopyResult(successResult, false).join('\n')
        expect(output).toContain('Next steps')
        expect(output).toContain('now-sdk transform')
        expect(output).toContain('nex flow test')
      })

      it('should display error message on failure', () => {
        const failedResult = { ...successResult, success: false, newFlowSysId: undefined, errorMessage: 'Source flow not found' }
        const output = service.formatCopyResult(failedResult, false).join('\n')
        expect(output).toContain('\u2718')
        expect(output).toContain('Failed')
        expect(output).toContain('Source flow not found')
      })

      it('should not display next steps on failure', () => {
        const failedResult = { ...successResult, success: false, newFlowSysId: undefined, errorMessage: 'Failed' }
        const output = service.formatCopyResult(failedResult, false).join('\n')
        expect(output).not.toContain('Next steps')
      })
    })
  })

  describe('formatTestResult', () => {
    const successResult = {
      success: true,
      contextId: 'ctx-test-001',
      flowId: '887dda5583237210fdb8f7b6feaad32c',
      state: 'COMPLETE',
      outputs: { result: 'test_done', count: 3 },
    }

    describe('JSON output', () => {
      it('should return result as JSON', () => {
        const lines = service.formatTestResult(successResult, true)
        expect(lines).toHaveLength(1)
        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.flowId).toBe('887dda5583237210fdb8f7b6feaad32c')
        expect(parsed.contextId).toBe('ctx-test-001')
      })
    })

    describe('text output', () => {
      it('should display flow test header with flow ID', () => {
        const output = service.formatTestResult(successResult, false).join('\n')
        expect(output).toContain('Flow Test')
        expect(output).toContain('887dda5583237210fdb8f7b6feaad32c')
      })

      it('should display success icon and status', () => {
        const output = service.formatTestResult(successResult, false).join('\n')
        expect(output).toContain('\u2714')
        expect(output).toContain('Success')
      })

      it('should display context ID and state', () => {
        const output = service.formatTestResult(successResult, false).join('\n')
        expect(output).toContain('ctx-test-001')
        expect(output).toContain('COMPLETE')
      })

      it('should display outputs', () => {
        const output = service.formatTestResult(successResult, false).join('\n')
        expect(output).toContain('result: test_done')
        expect(output).toContain('count: 3')
      })

      it('should display error message on failure', () => {
        const failedResult = { ...successResult, success: false, errorMessage: 'Flow test failed' }
        const output = service.formatTestResult(failedResult, false).join('\n')
        expect(output).toContain('\u2718')
        expect(output).toContain('Failed')
        expect(output).toContain('Flow test failed')
      })

      it('should handle missing flow ID', () => {
        const noFlowId = { ...successResult, flowId: undefined }
        const output = service.formatTestResult(noFlowId, false).join('\n')
        expect(output).toContain('unknown')
      })
    })
  })

  describe('formatMessageResult', () => {
    describe('text output', () => {
      it('should display success message', () => {
        const result = { success: true, contextId: 'ctx-001' }
        const output = service.formatMessageResult(result, false).join('\n')
        expect(output).toContain('\u2714')
        expect(output).toContain('Message sent successfully')
      })

      it('should display failure message', () => {
        const result = { success: false, contextId: 'ctx-001', errorMessage: 'Flow not waiting' }
        const output = service.formatMessageResult(result, false).join('\n')
        expect(output).toContain('\u2718')
        expect(output).toContain('Failed to send')
        expect(output).toContain('Flow not waiting')
      })
    })
  })

  describe('formatDetailsResult', () => {
    const successResult = {
      success: true,
      contextId: 'ctx-details-001',
      flowContext: {
        name: 'Change - Unauthorized Review',
        state: 'COMPLETE',
        runTime: '1234',
        isTestRun: true,
        executedAs: 'admin',
        flowInitiatedBy: 'admin',
        executionSource: {
          callingSource: 'TEST_BUTTON',
          executionSourceTable: 'change_request',
          executionSourceRecordDisplay: 'CHG0010042',
        },
      },
      flowReport: {
        actionOperationsReports: {
          'act001': {
            actionName: 'act001',
            stepLabel: 'Create Incident',
            actionTypeName: 'Create Record',
            operationsCore: { error: '', state: 'COMPLETE', order: '1', runTime: '120' },
            operationsInput: { data: { table_name: { value: 'incident', displayValue: 'Incident' } } },
            operationsOutput: { data: { sys_id: { value: 'inc001', displayValue: 'INC0001234' } } },
          },
          'act002': {
            actionName: 'act002',
            stepLabel: undefined,
            actionTypeName: 'Update Record',
            operationsCore: { error: '', state: 'COMPLETE', order: '2', runTime: '85' },
            operationsInput: { data: {} },
            operationsOutput: { data: {} },
          },
        },
        subflowOperationsReports: {},
        operationsOutput: { data: {} },
      },
    }

    describe('JSON output', () => {
      it('should return result as JSON', () => {
        const lines = service.formatDetailsResult(successResult, true)
        expect(lines).toHaveLength(1)
        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.contextId).toBe('ctx-details-001')
        expect(parsed.flowContext.name).toBe('Change - Unauthorized Review')
      })
    })

    describe('text output', () => {
      it('should display flow name, state, and runtime', () => {
        const output = service.formatDetailsResult(successResult, false).join('\n')
        expect(output).toContain('Change - Unauthorized Review')
        expect(output).toContain('COMPLETE')
        expect(output).toContain('1234ms')
      })

      it('should display execution metadata', () => {
        const output = service.formatDetailsResult(successResult, false).join('\n')
        expect(output).toContain('true')
        expect(output).toContain('admin')
      })

      it('should display execution source', () => {
        const output = service.formatDetailsResult(successResult, false).join('\n')
        expect(output).toContain('TEST_BUTTON')
        expect(output).toContain('change_request')
        expect(output).toContain('CHG0010042')
      })

      it('should display action results sorted by order', () => {
        const output = service.formatDetailsResult(successResult, false).join('\n')
        const createIdx = output.indexOf('Create Incident')
        const updateIdx = output.indexOf('Update Record')
        expect(createIdx).toBeLessThan(updateIdx)
        expect(output).toContain('[COMPLETE, 120ms]')
        expect(output).toContain('[COMPLETE, 85ms]')
      })

      it('should display action inputs/outputs with display values', () => {
        const output = service.formatDetailsResult(successResult, false).join('\n')
        expect(output).toContain('"table_name":"Incident"')
        expect(output).toContain('"sys_id":"INC0001234"')
      })

      it('should display flow-level outputs when present', () => {
        const withOutputs = {
          ...successResult,
          flowReport: {
            ...successResult.flowReport,
            operationsOutput: { data: { result: { value: 'ok', displayValue: 'Success' } } },
          },
        }
        const output = service.formatDetailsResult(withOutputs, false).join('\n')
        expect(output).toContain('Flow Outputs')
        expect(output).toContain('result: Success')
      })

      it('should handle missing flow report with availability notice', () => {
        const noReport = {
          success: true,
          contextId: 'ctx-details-001',
          flowContext: successResult.flowContext,
          flowReportAvailabilityDetails: { errorMessage: 'Operations logging is disabled' },
        }
        const output = service.formatDetailsResult(noReport, false).join('\n')
        expect(output).toContain('Note: Operations logging is disabled')
      })

      it('should display error message on failure', () => {
        const errorResult = { success: false, contextId: 'ctx-details-001', errorMessage: 'Context not found' }
        const output = service.formatDetailsResult(errorResult, false).join('\n')
        expect(output).toContain('Error: Context not found')
      })

      it('should handle missing flow context gracefully', () => {
        const noContext = { success: true, contextId: 'ctx-details-001' }
        const output = service.formatDetailsResult(noContext, false).join('\n')
        expect(output).toContain('ctx-details-001')
      })

      it('should display action errors', () => {
        const withError = {
          ...successResult,
          flowReport: {
            ...successResult.flowReport,
            actionOperationsReports: {
              'act001': {
                actionName: 'act001',
                stepLabel: 'Failing Action',
                operationsCore: { error: 'Record not found', state: 'ERROR', order: '1', runTime: '50' },
              },
            },
          },
        }
        const output = service.formatDetailsResult(withError, false).join('\n')
        expect(output).toContain('Record not found')
        expect(output).toContain('ERROR')
      })
    })
  })

  describe('formatLogsResult', () => {
    const successResult = {
      success: true,
      contextId: 'ctx-logs-001',
      entries: [
        { sysId: 'log-001', level: '2', message: 'Record created', action: 'action.create_record', createdOn: '2025-01-01 12:00:00' },
        { sysId: 'log-002', level: '-1', message: 'Failed to send email', action: 'action.send_notification', createdOn: '2025-01-01 12:00:01' },
        { sysId: 'log-003', level: '3', message: 'Debug info', action: 'action.debug_step', createdOn: '2025-01-01 12:00:02' },
      ],
    }

    describe('JSON output', () => {
      it('should return result as JSON', () => {
        const lines = service.formatLogsResult(successResult, true)
        expect(lines).toHaveLength(1)
        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.entries).toHaveLength(3)
      })
    })

    describe('text output', () => {
      it('should display entry count and formatted entries', () => {
        const output = service.formatLogsResult(successResult, false).join('\n')
        expect(output).toContain('Entries: 3')
        expect(output).toContain('Record created')
        expect(output).toContain('Failed to send email')
      })

      it('should map log levels correctly', () => {
        const output = service.formatLogsResult(successResult, false).join('\n')
        expect(output).toContain('INFO ')
        expect(output).toContain('ERROR')
        expect(output).toContain('DEBUG')
      })

      it('should map WARN level correctly', () => {
        const warnResult = {
          ...successResult,
          entries: [{ sysId: 'log-w', level: '1', message: 'Warning msg', action: 'flow', createdOn: '2025-01-01' }],
        }
        const output = service.formatLogsResult(warnResult, false).join('\n')
        expect(output).toContain('WARN ')
      })

      it('should show timestamps and action names', () => {
        const output = service.formatLogsResult(successResult, false).join('\n')
        expect(output).toContain('[2025-01-01 12:00:00]')
        expect(output).toContain('action.create_record')
      })

      it('should handle empty entries with guidance message', () => {
        const emptyResult = { success: true, contextId: 'ctx-logs-001', entries: [] }
        const output = service.formatLogsResult(emptyResult, false).join('\n')
        expect(output).toContain('No log entries found')
        expect(output).toContain('reporting level NONE')
      })

      it('should display error message on API failure', () => {
        const errorResult = { success: false, contextId: 'ctx-logs-001', entries: [], errorMessage: 'Access denied' }
        const output = service.formatLogsResult(errorResult, false).join('\n')
        expect(output).toContain('Error: Access denied')
      })

      it('should handle unknown log levels', () => {
        const unknownLevel = {
          ...successResult,
          entries: [{ sysId: 'log-u', level: '99', message: 'Unknown', action: 'flow', createdOn: '' }],
        }
        const output = service.formatLogsResult(unknownLevel, false).join('\n')
        expect(output).toContain('L99')
      })
    })
  })
})
