export class ScriptSyncDisplayService {
  /**
   * Format a sync-all summary result for display.
   * Returns lines for console output, or a JSON string if jsonOutput is true.
   */
  formatSyncAllResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    lines.push(`\n=== Script Sync Summary ===`);
    lines.push("─".repeat(60));

    if (result.directory) {
      lines.push(`   Directory:    ${result.directory}`);
    }

    if (result.scriptTypes && result.scriptTypes.length > 0) {
      lines.push(`   Script Types: ${result.scriptTypes.join(', ')}`);
    }

    lines.push(`   Total Files:  ${result.totalFiles ?? 0}`);
    lines.push(`   Synced:       ${result.synced ?? 0}`);
    lines.push(`   Failed:       ${result.failed ?? 0}`);

    if (result.timestamp) {
      lines.push(`   Timestamp:    ${result.timestamp}`);
    }

    lines.push("─".repeat(60));

    if (result.scripts && result.scripts.length > 0) {
      lines.push(`\n   Scripts:`);
      for (const [index, script] of result.scripts.entries()) {
        const icon = script.success ? '\u2713' : '\u2717';
        lines.push(`     ${index + 1}. ${icon} ${script.scriptName || script.name || 'Unknown'}`);
      }
    }

    const successRate = result.totalFiles > 0
      ? Math.round((result.synced / result.totalFiles) * 100)
      : 0;
    lines.push(`\nResult: ${result.synced}/${result.totalFiles} synced (${successRate}%)`);

    return lines;
  }

  /**
   * Format a single pull/push sync result for display.
   * Returns lines for console output, or a JSON string if jsonOutput is true.
   */
  formatSyncResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];
    const direction = result.direction === 'pull' ? '\u2193 Pull' : '\u2191 Push';
    const statusIcon = result.success ? '\u2713' : '\u2717';

    lines.push(`\n${statusIcon} ${direction}: ${result.scriptName}`);
    lines.push("─".repeat(60));

    if (result.scriptType) {
      lines.push(`   Type:      ${result.scriptType}`);
    }

    if (result.filePath) {
      lines.push(`   File:      ${result.filePath}`);
    }

    if (result.sysId) {
      lines.push(`   Sys ID:    ${result.sysId}`);
    }

    if (result.message) {
      lines.push(`   Message:   ${result.message}`);
    }

    if (result.timestamp) {
      lines.push(`   Timestamp: ${result.timestamp}`);
    }

    lines.push("─".repeat(60));

    return lines;
  }
}
