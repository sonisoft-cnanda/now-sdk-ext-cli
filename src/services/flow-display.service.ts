import type { FlowContextDetailsResult, FlowLogResult } from '@sonisoft/now-sdk-ext-core'

import { sortFlowReports, stepLabel } from './shape/flow-report.js'

export interface FlowCopyResult {
  success: boolean;
  newFlowSysId?: string;
  errorMessage?: string;
  errorCode?: number;
}

export interface FlowTestResult {
  success: boolean;
  contextId?: string;
  flowId?: string;
  state?: string;
  outputs?: Record<string, unknown>;
  errorMessage?: string;
}

export class FlowDisplayService {
  formatCopyResult(result: FlowCopyResult, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];
    const icon = result.success ? '\u2714' : '\u2718';

    lines.push(`\n${icon} Flow Copy`);
    lines.push("  " + "\u2500".repeat(60));

    lines.push(`  Status:         ${result.success ? 'Success' : 'Failed'}`);

    if (result.newFlowSysId) {
      lines.push(`  New Flow ID:    ${result.newFlowSysId}`);
    }

    if (result.errorMessage) {
      lines.push("");
      lines.push(`  Error: ${result.errorMessage}`);
    }

    if (result.success && result.newFlowSysId) {
      lines.push("");
      lines.push("  Next steps:");
      lines.push(`    1. Pull the flow:  now-sdk transform --flow ${result.newFlowSysId}`);
      lines.push("    2. Modify the pulled source in your project");
      lines.push("    3. Push your changes back to the instance");
      lines.push(`    4. Test the flow:  nex flow test -f ${result.newFlowSysId} -o '{...}'`);
      lines.push("    5. Publish when ready");
    }

    lines.push("  " + "\u2500".repeat(60));
    return lines;
  }

  formatCancelResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];
    const icon = result.success ? '\u2714' : '\u2718';

    lines.push(`\n${icon} Flow Cancel — ${result.contextId}`);
    lines.push("  " + "\u2500".repeat(50));
    lines.push(`  ${result.success ? 'Flow cancelled successfully.' : 'Failed to cancel flow.'}`);

    if (result.errorMessage) {
      lines.push(`  Error: ${result.errorMessage}`);
    }

    lines.push("  " + "\u2500".repeat(50));
    return lines;
  }

  formatErrorResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    lines.push(`\nFlow Error — ${result.contextId}`);
    lines.push("  " + "\u2500".repeat(50));

    if (result.flowErrorMessage) {
      lines.push(`  Flow Error:  ${result.flowErrorMessage}`);
    } else {
      lines.push("  No error message available.");
    }

    if (result.errorMessage) {
      lines.push(`  API Error:   ${result.errorMessage}`);
    }

    lines.push("  " + "\u2500".repeat(50));
    return lines;
  }

  formatExecutionResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];
    const icon = result.success ? '\u2714' : '\u2718';

    lines.push(`\n${icon} Flow Execution — ${result.flowObjectType}: ${result.flowObjectName}`);
    lines.push("  " + "\u2500".repeat(60));

    lines.push(`  Status:         ${result.success ? 'Success' : 'Failed'}`);

    if (result.contextId) {
      lines.push(`  Context ID:     ${result.contextId}`);
    }

    if (result.executionDate) {
      lines.push(`  Executed At:    ${result.executionDate}`);
    }

    if (result.outputs && Object.keys(result.outputs).length > 0) {
      lines.push("");
      lines.push("  Outputs:");
      for (const [key, value] of Object.entries(result.outputs)) {
        const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
        lines.push(`    ${key}: ${display}`);
      }
    }

    if (result.debugOutput) {
      lines.push("");
      lines.push("  Debug Output:");
      lines.push(`    ${result.debugOutput}`);
    }

    if (result.errorMessage) {
      lines.push("");
      lines.push(`  Error: ${result.errorMessage}`);
    }

    lines.push("  " + "\u2500".repeat(60));
    return lines;
  }

  formatMessageResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];
    const icon = result.success ? '\u2714' : '\u2718';

    lines.push(`\n${icon} Flow Message — ${result.contextId}`);
    lines.push("  " + "\u2500".repeat(50));
    lines.push(`  ${result.success ? 'Message sent successfully.' : 'Failed to send message.'}`);

    if (result.errorMessage) {
      lines.push(`  Error: ${result.errorMessage}`);
    }

    lines.push("  " + "\u2500".repeat(50));
    return lines;
  }

  formatOutputsResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];
    const icon = result.success ? '\u2714' : '\u2718';

    lines.push(`\n${icon} Flow Outputs — ${result.contextId}`);
    lines.push("  " + "\u2500".repeat(50));

    if (result.outputs && Object.keys(result.outputs).length > 0) {
      for (const [key, value] of Object.entries(result.outputs)) {
        const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
        lines.push(`  ${key}: ${display}`);
      }
    } else {
      lines.push("  No outputs available.");
    }

    if (result.errorMessage) {
      lines.push(`  Error: ${result.errorMessage}`);
    }

    lines.push("  " + "\u2500".repeat(50));
    return lines;
  }

  formatStatusResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    if (!result.found) {
      lines.push(`\n\u2718 Flow context not found: ${result.contextId}`);
      return lines;
    }

    const stateIcon = this._stateIcon(result.state);

    lines.push(`\n${stateIcon} Flow Context Status`);
    lines.push("  " + "\u2500".repeat(50));
    lines.push(`  Context ID:  ${result.contextId}`);

    if (result.name) {
      lines.push(`  Name:        ${result.name}`);
    }

    lines.push(`  State:       ${result.state ?? 'UNKNOWN'}`);

    if (result.started) {
      lines.push(`  Started:     ${result.started}`);
    }

    if (result.ended) {
      lines.push(`  Ended:       ${result.ended}`);
    }

    if (result.errorMessage) {
      lines.push(`  Error:       ${result.errorMessage}`);
    }

    lines.push("  " + "\u2500".repeat(50));
    return lines;
  }

  formatTestResult(result: FlowTestResult, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];
    const icon = result.success ? '\u2714' : '\u2718';

    lines.push(`\n${icon} Flow Test — ${result.flowId ?? 'unknown'}`);
    lines.push("  " + "\u2500".repeat(60));

    lines.push(`  Status:         ${result.success ? 'Success' : 'Failed'}`);

    if (result.contextId) {
      lines.push(`  Context ID:     ${result.contextId}`);
    }

    if (result.state) {
      lines.push(`  State:          ${result.state}`);
    }

    if (result.outputs && Object.keys(result.outputs).length > 0) {
      lines.push("");
      lines.push("  Outputs:");
      for (const [key, value] of Object.entries(result.outputs)) {
        const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
        lines.push(`    ${key}: ${display}`);
      }
    }

    if (result.errorMessage) {
      lines.push("");
      lines.push(`  Error: ${result.errorMessage}`);
    }

    lines.push("  " + "\u2500".repeat(60));
    return lines;
  }

  formatDetailsResult(result: FlowContextDetailsResult, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];
    const ctx = result.flowContext;
    const stateIcon = ctx ? this._stateIcon(ctx.state) : (result.success ? '\u2714' : '\u2718');

    lines.push(`\n${stateIcon} Flow Execution Details — ${result.contextId}`);
    lines.push("  " + "\u2500".repeat(60));

    if (ctx) {
      lines.push(`  Flow:           ${ctx.name}`);
      lines.push(`  State:          ${ctx.state}`);
      lines.push(`  Runtime:        ${ctx.runTime}ms`);
      lines.push(`  Test Run:       ${ctx.isTestRun}`);
      lines.push(`  Executed As:    ${ctx.executedAs}`);
      lines.push(`  Initiated By:   ${ctx.flowInitiatedBy}`);

      if (ctx.executionSource?.callingSource) {
        lines.push(`  Triggered By:   ${ctx.executionSource.callingSource}`);
      }

      if (ctx.executionSource?.executionSourceTable) {
        lines.push(`  Source Table:   ${ctx.executionSource.executionSourceTable}`);
      }

      if (ctx.executionSource?.executionSourceRecordDisplay) {
        lines.push(`  Source Record:  ${ctx.executionSource.executionSourceRecordDisplay}`);
      }
    }

    const report = result.flowReport;
    if (report) {
      const actionReports = Object.values(report.actionOperationsReports ?? {});
      const subflowReports = Object.values(report.subflowOperationsReports ?? {});
      // Step ordering lives in shape/flow-report — shared with the TUI's
      // execution tree so both agree on what "step 3" means.
      const allReports = sortFlowReports(actionReports, subflowReports);

      if (allReports.length > 0) {
        lines.push("");
        lines.push("  Action Results:");
        allReports.forEach((action, idx) => {
          const label = stepLabel(action);
          const state = action.operationsCore.state;
          const runTime = action.operationsCore.runTime;
          lines.push(`    ${idx + 1}. ${label}  [${state}, ${runTime}ms]`);

          if (action.operationsCore.error) {
            lines.push(`       Error: ${action.operationsCore.error}`);
          }

          const inputs = action.operationsInput?.data;
          if (inputs && Object.keys(inputs).length > 0) {
            const simplified: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(inputs)) {
              simplified[k] = v.displayValue ?? v.value;
            }

            lines.push(`       Inputs: ${JSON.stringify(simplified)}`);
          }

          const outputs = action.operationsOutput?.data;
          if (outputs && Object.keys(outputs).length > 0) {
            const simplified: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(outputs)) {
              simplified[k] = v.displayValue ?? v.value;
            }

            lines.push(`       Outputs: ${JSON.stringify(simplified)}`);
          }
        });
      }

      const flowOutputs = report.operationsOutput?.data;
      if (flowOutputs && Object.keys(flowOutputs).length > 0) {
        lines.push("");
        lines.push("  Flow Outputs:");
        for (const [k, v] of Object.entries(flowOutputs)) {
          lines.push(`    ${k}: ${v.displayValue ?? v.value}`);
        }
      }
    }

    const avail = result.flowReportAvailabilityDetails;
    if (avail?.errorMessage) {
      lines.push("");
      lines.push(`  Note: ${avail.errorMessage}`);
    }

    if (result.errorMessage) {
      lines.push("");
      lines.push(`  Error: ${result.errorMessage}`);
    }

    lines.push("  " + "\u2500".repeat(60));
    return lines;
  }

  formatLogsResult(result: FlowLogResult, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];
    const icon = result.success ? '\u2714' : '\u2718';

    lines.push(`\n${icon} Flow Execution Logs — ${result.contextId}`);
    lines.push("  " + "\u2500".repeat(60));
    lines.push(`  Entries: ${result.entries.length}`);

    if (result.entries.length === 0) {
      lines.push("");
      lines.push("  No log entries found. Logs may be empty for simple successful");
      lines.push("  executions, or flow logging may be disabled (reporting level NONE).");
    } else {
      lines.push("");
      result.entries.forEach((entry, idx) => {
        const level = this._mapLogLevel(entry.level);
        const action = (entry.action || '(flow)').slice(0, 30).padEnd(30);
        const ts = entry.createdOn ? ` [${entry.createdOn}]` : '';
        lines.push(`  [${idx + 1}] ${level} | ${action} | ${entry.message}${ts}`);
      });
    }

    if (result.errorMessage) {
      lines.push("");
      lines.push(`  Error: ${result.errorMessage}`);
    }

    lines.push("  " + "\u2500".repeat(60));
    return lines;
  }

  private _mapLogLevel(level: string): string {
    switch (level) {
      case '-1': { return 'ERROR';
      }

      case '1': { return 'WARN ';
      }

      case '2': { return 'INFO ';
      }

      case '3': { return 'DEBUG';
      }

      default: { return `L${level}  `.slice(0, 5);
      }
    }
  }

  private _stateIcon(state?: string): string {
    switch (state) {
      case 'CANCELLED': { return '\u2718';
      }

      case 'COMPLETE': { return '\u2714';
      }

      case 'ERROR': { return '\u2718';
      }

      case 'IN_PROGRESS': { return '\u25B6';
      }

      case 'QUEUED': { return '\u23F3';
      }

      case 'WAITING': { return '\u23F8';
      }

      default: { return '\u2022';
      }
    }
  }
}
