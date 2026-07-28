 

export class BulkDisplayService {
  /**
   * Format query-based bulk delete result for display.
   */
  formatDeleteResult(result: any, table: string, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ table, ...result }, null, 2)];
    }

    const lines: string[] = [];

    if (result.dryRun) {
      lines.push(`\nDry Run — Bulk Delete on "${table}"`);
    } else {
      lines.push(`\nBulk Delete on "${table}"`);
    }

    lines.push("  " + "\u2500".repeat(50));

    if (result.dryRun) {
      lines.push(`  Records matching query:  ${result.matchCount}`);
      lines.push("");
      lines.push("  No records were deleted (dry run).");
      lines.push("  Re-run with --confirm to execute the delete.");
    } else {
      lines.push(`  Records matched:   ${result.matchCount}`);
      lines.push(`  Records deleted:   ${result.deletedCount}`);

      const statusIcon = result.success ? '\u2714' : '\u2718';
      lines.push(`  Status:            ${statusIcon} ${result.success ? 'Success' : 'Completed with errors'}`);

      if (result.errors && result.errors.length > 0) {
        lines.push("");
        lines.push(`  Errors (${result.errors.length}):`);
        for (const err of result.errors) {
          lines.push(`    - ${err.sysId}: ${err.error}`);
        }
      }
    }

    if (result.executionTimeMs !== undefined) {
      lines.push("");
      lines.push(`  Execution time:    ${result.executionTimeMs}ms`);
    }

    lines.push("  " + "\u2500".repeat(50));

    return lines;
  }

  /**
   * Format query-based bulk update result for display.
   */
  formatUpdateResult(result: any, table: string, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ table, ...result }, null, 2)];
    }

    const lines: string[] = [];

    if (result.dryRun) {
      lines.push(`\nDry Run — Bulk Update on "${table}"`);
    } else {
      lines.push(`\nBulk Update on "${table}"`);
    }

    lines.push("  " + "\u2500".repeat(50));

    if (result.dryRun) {
      lines.push(`  Records matching query:  ${result.matchCount}`);
      lines.push("");
      lines.push("  No changes were made (dry run).");
      lines.push("  Re-run with --confirm to execute the update.");
    } else {
      lines.push(`  Records matched:   ${result.matchCount}`);
      lines.push(`  Records updated:   ${result.updatedCount}`);

      const statusIcon = result.success ? '\u2714' : '\u2718';
      lines.push(`  Status:            ${statusIcon} ${result.success ? 'Success' : 'Completed with errors'}`);

      if (result.errors && result.errors.length > 0) {
        lines.push("");
        lines.push(`  Errors (${result.errors.length}):`);
        for (const err of result.errors) {
          lines.push(`    - ${err.sysId}: ${err.error}`);
        }
      }
    }

    if (result.executionTimeMs !== undefined) {
      lines.push("");
      lines.push(`  Execution time:    ${result.executionTimeMs}ms`);
    }

    lines.push("  " + "\u2500".repeat(50));

    return lines;
  }
}
