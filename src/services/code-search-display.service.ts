export class CodeSearchDisplayService {
  /**
   * Format add table result for display.
   * Returns lines to output, or a JSON string if jsonOutput is true.
   */
  formatAddTableResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    if (result.error) {
      lines.push(`\n✗ Failed to add table: ${result.error}`);
      return lines;
    }

    lines.push('\n✓ Table added to search group successfully!');

    if (result.table) {
      lines.push(`  Table:          ${result.table}`);
    }

    if (result.search_fields) {
      lines.push(`  Search Fields:  ${result.search_fields}`);
    }

    if (result.search_group) {
      lines.push(`  Search Group:   ${result.search_group}`);
    }

    if (result.sys_id) {
      lines.push(`  Sys ID:         ${result.sys_id}`);
    }

    return lines;
  }

  /**
   * Format search groups for display.
   * Returns lines to output, or a JSON string if jsonOutput is true.
   */
  formatSearchGroups(groups: any[], jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(groups, null, 2)];
    }

    const lines: string[] = [];

    if (groups.length === 0) {
      lines.push('No search groups found.');
      return lines;
    }

    lines.push(`\n=== Search Groups (${groups.length}) ===`);
    lines.push("─".repeat(80));

    for (const [index, group] of groups.entries()) {
      lines.push(`${index + 1}. ${group.name || group.label || 'Unnamed'}`);

      if (group.sys_id) {
        lines.push(`   Sys ID:       ${group.sys_id}`);
      }

      if (group.description) {
        lines.push(`   Description:  ${group.description}`);
      }

      if (group.order !== undefined) {
        lines.push(`   Order:        ${group.order}`);
      }

      lines.push("─".repeat(80));
    }

    lines.push(`\nTotal: ${groups.length} group(s)`);

    return lines;
  }

  /**
   * Format search results for display.
   * Returns lines to output, or a JSON string if jsonOutput is true.
   */
  formatSearchResults(results: any[], jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(results, null, 2)];
    }

    const lines: string[] = [];

    if (results.length === 0) {
      lines.push('No search results found.');
      return lines;
    }

    lines.push(`\n=== Code Search Results (${results.length}) ===`);
    lines.push("─".repeat(80));

    for (const [index, result] of results.entries()) {
      lines.push(`${index + 1}. ${result.name || 'Unnamed'}`);

      if (result.table) {
        lines.push(`   Table:    ${result.table}`);
      }

      if (result.sys_id) {
        lines.push(`   Sys ID:   ${result.sys_id}`);
      }

      if (result.field) {
        lines.push(`   Field:    ${result.field}`);
      }

      if (result.match) {
        lines.push(`   Match:    ${result.match}`);
      }

      if (result.context) {
        lines.push(`   Context:  ${result.context}`);
      }

      lines.push("─".repeat(80));
    }

    lines.push(`\nTotal: ${results.length} result(s)`);

    return lines;
  }

  /**
   * Format tables for a search group for display.
   * Returns lines to output, or a JSON string if jsonOutput is true.
   */
  formatTablesForGroup(tables: any[], groupName: string, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ group: groupName, tables }, null, 2)];
    }

    const lines: string[] = [];

    if (tables.length === 0) {
      lines.push(`No tables found for search group "${groupName}".`);
      return lines;
    }

    lines.push(`\n=== Tables in Search Group "${groupName}" (${tables.length}) ===`);
    lines.push("─".repeat(80));

    for (const [index, table] of tables.entries()) {
      lines.push(`${index + 1}. ${table.name || table.label || 'Unnamed'}`);

      if (table.sys_id) {
        lines.push(`   Sys ID:          ${table.sys_id}`);
      }

      if (table.search_fields) {
        lines.push(`   Search Fields:   ${table.search_fields}`);
      }

      if (table.table) {
        lines.push(`   Table:           ${table.table}`);
      }

      lines.push("─".repeat(80));
    }

    lines.push(`\nTotal: ${tables.length} table(s)`);

    return lines;
  }
}
