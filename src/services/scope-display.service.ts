 

export class ScopeDisplayService {
  /**
   * Format list of applications for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatAppList(apps: any[], jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ applications: apps, total: apps.length }, null, 2)];
    }

    const lines: string[] = [];

    lines.push(`\nFound ${apps.length} application(s)`);
    lines.push("─".repeat(60));

    if (apps.length === 0) {
      lines.push('No applications found.');
      return lines;
    }

    for (const [index, app] of apps.entries()) {
      lines.push(`${index + 1}. ${app.name}`);
      lines.push(`   Scope:    ${app.scope}`);
      lines.push(`   Sys ID:   ${app.sys_id}`);
      lines.push("─".repeat(60));
    }

    lines.push(`\nTotal: ${apps.length} application(s)`);

    return lines;
  }

  /**
   * Format current application for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatCurrentApp(app: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(app, null, 2)];
    }

    const lines: string[] = [];

    lines.push('\n=== Current Application Scope ===');
    lines.push("─".repeat(60));

    if (app.name) {
      lines.push(`  Name:      ${app.name}`);
    }

    if (app.scope) {
      lines.push(`  Scope:     ${app.scope}`);
    }

    if (app.sys_id) {
      lines.push(`  Sys ID:    ${app.sys_id}`);
    }

    lines.push("─".repeat(60));

    return lines;
  }

  /**
   * Format set application result for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatSetResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    if (result.success) {
      lines.push('\n=== Application Scope Updated ===');
      lines.push("─".repeat(60));
      lines.push(`  Application: ${result.application}`);
      lines.push(`  Scope:       ${result.scope}`);
      lines.push(`  Sys ID:      ${result.sysId}`);
      lines.push(`  Verified:    ${result.verified}`);

      if (result.warnings && result.warnings.length > 0) {
        lines.push(`\n  Warnings:`);
        for (const warning of result.warnings) {
          lines.push(`    - ${warning}`);
        }
      }

      lines.push("─".repeat(60));
      lines.push('Scope change completed successfully.');
    } else {
      lines.push('\nFailed to set application scope.');
      if (result.error) {
        lines.push(`  Error: ${result.error}`);
      }
    }

    return lines;
  }
}
