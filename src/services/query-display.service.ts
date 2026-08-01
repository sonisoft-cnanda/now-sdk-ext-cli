 

import { computeColumnWidths, deriveColumns, truncateCell } from './shape/record-columns.js';
import { schemaFieldCells } from './shape/schema-field.js';

export class QueryDisplayService {
  /**
   * Format app search results for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatAppResults(apps: any[], searchTerm: string, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ apps, count: apps.length, search: searchTerm }, null, 2)];
    }

    const lines: string[] = [];

    if (apps.length === 0) {
      lines.push(`\nNo applications found matching "${searchTerm}".`);
      return lines;
    }

    lines.push(`\nApplication Search: "${searchTerm}" (${apps.length} result${apps.length === 1 ? '' : 's'})`);
    lines.push("  " + "\u2500".repeat(90));
    lines.push(
      "  " +
        "Name".padEnd(30) +
        "Scope".padEnd(30) +
        "Version".padEnd(12) +
        "Active".padEnd(10) +
        "Source"
    );
    lines.push("  " + "\u2500".repeat(90));

    for (const app of apps) {
      const name = String(app.name || app.title || '');
      const scope = String(app.scope || '');
      const version = String(app.version || '');
      const active = String(app.active ?? '');
      const source = String(app.source || '');

      lines.push(
        "  " +
          (name.length > 28 ? name.slice(0, 25) + '...' : name).padEnd(30) +
          (scope.length > 28 ? scope.slice(0, 25) + '...' : scope).padEnd(30) +
          version.padEnd(12) +
          active.padEnd(10) +
          source
      );
    }

    lines.push("  " + "\u2500".repeat(90));

    return lines;
  }

  /**
   * Format column listing results for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatColumnsResults(fields: any[], tableName: string, searchTerm: string | undefined, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ count: fields.length, fields, search: searchTerm, table: tableName }, null, 2)];
    }

    const lines: string[] = [];

    if (fields.length === 0) {
      const searchMsg = searchTerm ? ` matching "${searchTerm}"` : '';
      lines.push(`\nNo columns found on table "${tableName}"${searchMsg}.`);
      return lines;
    }

    const searchMsg = searchTerm ? ` matching "${searchTerm}"` : '';
    lines.push(`\nColumns on "${tableName}"${searchMsg} (${fields.length} field${fields.length === 1 ? '' : 's'})`);
    lines.push("  " + "\u2500".repeat(90));
    lines.push(
      "  " +
        "Name".padEnd(25) +
        "Label".padEnd(25) +
        "Type".padEnd(15) +
        "Max Length".padEnd(12) +
        "Mandatory".padEnd(12) +
        "Read Only"
    );
    lines.push("  " + "\u2500".repeat(90));

    for (const field of fields) {
      const cells = schemaFieldCells(field);
      lines.push(
        "  " +
          cells.name.padEnd(25) +
          cells.label.padEnd(25) +
          cells.type.padEnd(15) +
          cells.maxLength.padEnd(12) +
          cells.mandatory.padEnd(12) +
          cells.readOnly
      );
    }

    lines.push("  " + "\u2500".repeat(90));

    return lines;
  }

  /**
   * Format syslog query results for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatSyslogResults(records: any[], jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ count: records.length, records }, null, 2)];
    }

    const lines: string[] = [];

    if (records.length === 0) {
      lines.push('\nNo syslog records found.');
      return lines;
    }

    lines.push(`\nSyslog Records (${records.length} record${records.length === 1 ? '' : 's'})`);
    lines.push("  " + "\u2500".repeat(100));
    lines.push(
      "  " +
        "Created On".padEnd(22) +
        "Level".padEnd(10) +
        "Source".padEnd(25) +
        "Message"
    );
    lines.push("  " + "\u2500".repeat(100));

    for (const record of records) {
      const createdOn = String(record.sys_created_on || '');
      const level = String(record.level || '');
      const source = String(record.source || '');
      const message = String(record.message || '');
      const truncatedMsg = message.length > 60 ? message.slice(0, 57) + '...' : message;

      lines.push(
        "  " +
          createdOn.padEnd(22) +
          level.padEnd(10) +
          (source.length > 23 ? source.slice(0, 20) + '...' : source).padEnd(25) +
          truncatedMsg
      );
    }

    lines.push("  " + "\u2500".repeat(100));

    return lines;
  }

  /**
   * Format generic table query results for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatTableResults(records: any[], tableName: string, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ count: records.length, records, table: tableName }, null, 2)];
    }

    const lines: string[] = [];

    if (records.length === 0) {
      lines.push(`\nNo records found in table "${tableName}".`);
      return lines;
    }

    lines.push(`\nQuery Results: ${tableName} (${records.length} record${records.length === 1 ? '' : 's'})`);
    lines.push("  " + "\u2500".repeat(90));

    // Column choice and width math live in shape/record-columns \u2014 one
    // definition shared with the TUI. Byte-compatible with the historical
    // inline logic.
    const displayColumns = deriveColumns(records);
    const colWidths = computeColumnWidths(records, displayColumns);

    // Header row
    lines.push(
      "  " + displayColumns.map((col, i) => col.padEnd(colWidths[i])).join('')
    );
    lines.push("  " + "\u2500".repeat(90));

    // Data rows
    for (const record of records) {
      lines.push(
        "  " + displayColumns
          .map((col, i) => truncateCell(record[col], colWidths[i]))
          .map((val, i) => val.padEnd(colWidths[i])).join('')
      );
    }

    lines.push("  " + "\u2500".repeat(90));

    return lines;
  }
}
