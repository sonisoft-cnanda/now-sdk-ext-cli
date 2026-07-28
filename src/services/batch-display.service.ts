 

/**
 * Format batch create result for display.
 * Returns lines for console output, or JSON string if jsonOutput is true.
 */
export function formatBatchCreateResult(result: any, jsonOutput: boolean): string[] {
  if (jsonOutput) {
    return [JSON.stringify(result, null, 2)];
  }

  const lines: string[] = [];

  if (!result) {
    lines.push('No result returned from batch create operation.');
    return lines;
  }

  lines.push('\n=== Batch Create Result ===');
  lines.push("─".repeat(60));

  if (result.createdCount !== undefined) {
    lines.push(`  Created:         ${result.createdCount}`);
  }

  if (result.sysIds && typeof result.sysIds === 'object') {
    lines.push('  Sys IDs:');
    for (const [key, value] of Object.entries(result.sysIds)) {
      lines.push(`    ${key}: ${value}`);
    }
  }

  if (result.executionTimeMs !== undefined) {
    lines.push(`  Execution Time:  ${result.executionTimeMs}ms`);
  }

  if (result.success !== undefined) {
    lines.push(`  Success:         ${result.success}`);
  }

  if (result.errors && result.errors.length > 0) {
    lines.push(`  Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      lines.push(`    - ${typeof err === 'string' ? err : JSON.stringify(err)}`);
    }
  }

  lines.push("─".repeat(60));
  lines.push('Batch create operation completed.');

  return lines;
}

/**
 * Format batch update result for display.
 * Returns lines for console output, or JSON string if jsonOutput is true.
 */
export function formatBatchUpdateResult(result: any, jsonOutput: boolean): string[] {
  if (jsonOutput) {
    return [JSON.stringify(result, null, 2)];
  }

  const lines: string[] = [];

  if (!result) {
    lines.push('No result returned from batch update operation.');
    return lines;
  }

  lines.push('\n=== Batch Update Result ===');
  lines.push("─".repeat(60));

  if (result.updatedCount !== undefined) {
    lines.push(`  Updated:         ${result.updatedCount}`);
  }

  if (result.executionTimeMs !== undefined) {
    lines.push(`  Execution Time:  ${result.executionTimeMs}ms`);
  }

  if (result.success !== undefined) {
    lines.push(`  Success:         ${result.success}`);
  }

  if (result.errors && result.errors.length > 0) {
    lines.push(`  Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      lines.push(`    - ${typeof err === 'string' ? err : JSON.stringify(err)}`);
    }
  }

  lines.push("─".repeat(60));
  lines.push('Batch update operation completed.');

  return lines;
}
