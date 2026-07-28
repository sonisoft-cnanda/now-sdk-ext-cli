 

export class AggregateDisplayService {
  /**
   * Format aggregate (non-grouped) result for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatAggregateResult(stats: any, tableName: string, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ stats, table: tableName }, null, 2)];
    }

    const lines: string[] = [];

    lines.push(`\nAggregate Results: ${tableName}`);
    lines.push("  " + "\u2500".repeat(50));

    if (stats.count !== undefined) {
      lines.push(`  Count:  ${stats.count}`);
    }

    // Display stat fields (avg.field, min.field, max.field, sum.field)
    const statKeys = Object.keys(stats).filter(k => k !== 'count');
    if (statKeys.length > 0) {
      lines.push("");
      lines.push("  " + "Metric".padEnd(35) + "Value");
      lines.push("  " + "\u2500".repeat(50));

      for (const key of statKeys) {
        lines.push("  " + key.padEnd(35) + String(stats[key] ?? ''));
      }
    }

    lines.push("  " + "\u2500".repeat(50));

    return lines;
  }

  /**
   * Format count result for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatCountResult(count: number, tableName: string, query: string | undefined, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ count, query: query || '', table: tableName }, null, 2)];
    }

    const lines: string[] = [];
    const queryMsg = query ? ` (query: "${query}")` : '';
    lines.push(`\nRecord Count: ${tableName}${queryMsg}`);
    lines.push("  " + "\u2500".repeat(50));
    lines.push(`  Count:  ${count}`);
    lines.push("  " + "\u2500".repeat(50));

    return lines;
  }

  /**
   * Format grouped aggregate result for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatGroupedResult(groups: any[], tableName: string, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ groupCount: groups.length, groups, table: tableName }, null, 2)];
    }

    const lines: string[] = [];

    if (groups.length === 0) {
      lines.push(`\nNo grouped results for table "${tableName}".`);
      return lines;
    }

    lines.push(`\nGrouped Aggregate Results: ${tableName} (${groups.length} group${groups.length === 1 ? '' : 's'})`);
    lines.push("  " + "\u2500".repeat(90));

    for (const [index, group] of groups.entries()) {
      // Display group-by fields
      const groupLabel = (group.groupby_fields || [])
        .map((f: any) => `${f.field}=${f.display_value || f.value}`)
        .join(', ');

      lines.push(`  Group ${index + 1}: ${groupLabel}`);

      // Display stats for this group
      const stats = group.stats || {};
      if (stats.count !== undefined) {
        lines.push(`    Count:  ${stats.count}`);
      }

      const statKeys = Object.keys(stats).filter(k => k !== 'count');
      for (const key of statKeys) {
        lines.push(`    ${key}:  ${stats[key]}`);
      }

      if (index < groups.length - 1) {
        lines.push("");
      }
    }

    lines.push("  " + "\u2500".repeat(90));

    return lines;
  }
}
