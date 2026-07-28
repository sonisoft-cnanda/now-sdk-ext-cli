 

export class WorkflowDisplayService {
  /**
   * Format publish confirmation for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatPublishResult(jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ message: 'Workflow published successfully.', success: true }, null, 2)];
    }

    const lines: string[] = [];

    lines.push('\n=== Workflow Published ===');
    lines.push("─".repeat(60));
    lines.push('Workflow version published successfully.');
    lines.push("─".repeat(60));

    return lines;
  }

  /**
   * Format createCompleteWorkflow result for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatWorkflowResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    lines.push('\n=== Workflow Created ===');
    lines.push("─".repeat(60));

    if (result.workflowSysId) {
      lines.push(`  Workflow Sys ID:  ${result.workflowSysId}`);
    }

    if (result.versionSysId) {
      lines.push(`  Version Sys ID:   ${result.versionSysId}`);
    }

    if (result.activitySysIds) {
      const activityKeys = Object.keys(result.activitySysIds);
      lines.push(`  Activities:       ${activityKeys.length}`);
      for (const key of activityKeys) {
        lines.push(`    [${key}]: ${result.activitySysIds[key]}`);
      }
    }

    if (result.transitionSysIds && result.transitionSysIds.length > 0) {
      lines.push(`  Transitions:      ${result.transitionSysIds.length}`);
      for (const [index, id] of result.transitionSysIds.entries()) {
        lines.push(`    [${index}]: ${id}`);
      }
    }

    lines.push(`  Published:        ${result.published ?? false}`);
    lines.push("─".repeat(60));
    lines.push('Workflow creation completed successfully.');

    return lines;
  }
}
