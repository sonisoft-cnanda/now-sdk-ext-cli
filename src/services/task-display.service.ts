 

export class TaskDisplayService {
  /**
   * Format find-by-number result for display.
   * Returns lines for console output, or a JSON string if jsonOutput is true.
   */
  formatFindResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    if (!result) {
      lines.push('No task found matching the specified number.');
      return lines;
    }

    lines.push('\n=== Task Details ===');
    lines.push("─".repeat(60));

    if (result.number) {
      lines.push(`  Number:            ${result.number}`);
    }

    if (result.sys_id) {
      lines.push(`  Sys ID:            ${result.sys_id}`);
    }

    if (result.short_description) {
      lines.push(`  Description:       ${result.short_description}`);
    }

    if (result.state) {
      lines.push(`  State:             ${result.state}`);
    }

    if (result.priority) {
      lines.push(`  Priority:          ${result.priority}`);
    }

    if (result.assigned_to) {
      lines.push(`  Assigned To:       ${result.assigned_to}`);
    }

    if (result.assignment_group) {
      lines.push(`  Assignment Group:  ${result.assignment_group}`);
    }

    if (result.opened_at) {
      lines.push(`  Opened At:         ${result.opened_at}`);
    }

    if (result.sys_class_name) {
      lines.push(`  Class:             ${result.sys_class_name}`);
    }

    lines.push("─".repeat(60));

    return lines;
  }

  /**
   * Format task operation result for display.
   * Handles operations: comment, assign, resolve, close, approve.
   * Returns lines for console output, or a JSON string if jsonOutput is true.
   */
  formatTaskResult(result: any, operation: string, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    if (!result) {
      lines.push(`No result returned from ${operation} operation.`);
      return lines;
    }

    lines.push(`\n=== Task ${operation.charAt(0).toUpperCase() + operation.slice(1)} Result ===`);
    lines.push("─".repeat(60));

    if (result.number) {
      lines.push(`  Number:      ${result.number}`);
    }

    if (result.sys_id) {
      lines.push(`  Sys ID:      ${result.sys_id}`);
    }

    if (result.state) {
      lines.push(`  State:       ${result.state}`);
    }

    if (result.approval) {
      lines.push(`  Approval:    ${result.approval}`);
    }

    if (result.assigned_to) {
      lines.push(`  Assigned To: ${result.assigned_to}`);
    }

    if (result.assignment_group) {
      lines.push(`  Group:       ${result.assignment_group}`);
    }

    lines.push("─".repeat(60));
    lines.push(`Operation '${operation}' completed successfully.`);

    return lines;
  }
}
