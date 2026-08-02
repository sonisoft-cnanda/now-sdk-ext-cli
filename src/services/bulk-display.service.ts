import { toBulkResult } from "./shape/bulk-result.js";

export class BulkDisplayService {
  /**
   * Format query-based bulk delete result for display.
   */
  formatDeleteResult(result: any, table: string, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ table, ...result }, null, 2)];
    }

    const shaped = toBulkResult(result, 'delete');
    const lines: string[] = [];

    if (shaped.dryRun) {
      lines.push(`\nDry Run — Bulk Delete on "${table}"`);
    } else {
      lines.push(`\nBulk Delete on "${table}"`);
    }

    lines.push("  " + "\u2500".repeat(50));

    if (shaped.dryRun) {
      lines.push(`  Records matching query:  ${shaped.matchCount}`);
      lines.push("");
      lines.push("  No records were deleted (dry run).");
      lines.push("  Re-run with --confirm to execute the delete.");
    } else {
      lines.push(`  Records matched:   ${shaped.matchCount}`);
      lines.push(`  Records deleted:   ${result.deletedCount}`);

      const statusIcon = shaped.success ? '\u2714' : '\u2718';
      lines.push(`  Status:            ${statusIcon} ${shaped.success ? 'Success' : 'Completed with errors'}`);

      if (shaped.errors.length > 0) {
        lines.push("");
        lines.push(`  Errors (${shaped.errors.length}):`);
        for (const err of shaped.errors) {
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

    const shaped = toBulkResult(result, 'update');
    const lines: string[] = [];

    if (shaped.dryRun) {
      lines.push(`\nDry Run — Bulk Update on "${table}"`);
    } else {
      lines.push(`\nBulk Update on "${table}"`);
    }

    lines.push("  " + "\u2500".repeat(50));

    if (shaped.dryRun) {
      lines.push(`  Records matching query:  ${shaped.matchCount}`);
      lines.push("");
      lines.push("  No changes were made (dry run).");
      lines.push("  Re-run with --confirm to execute the update.");
    } else {
      lines.push(`  Records matched:   ${shaped.matchCount}`);
      lines.push(`  Records updated:   ${result.updatedCount}`);

      const statusIcon = shaped.success ? '\u2714' : '\u2718';
      lines.push(`  Status:            ${statusIcon} ${shaped.success ? 'Success' : 'Completed with errors'}`);

      if (shaped.errors.length > 0) {
        lines.push("");
        lines.push(`  Errors (${shaped.errors.length}):`);
        for (const err of shaped.errors) {
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
