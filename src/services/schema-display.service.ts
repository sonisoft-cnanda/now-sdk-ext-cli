 

import { schemaFieldCells } from './shape/schema-field.js';

export class SchemaDisplayService {
  /**
   * Format catalog validation result for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatCatalogValidation(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    lines.push(`\nCatalog Validation Result`);
    lines.push("  " + "\u2500".repeat(50));
    lines.push(`  Valid:      ${result.valid ? "Yes" : "No"}`);
    lines.push(`  Warnings:   ${result.warnings ?? 0}`);
    lines.push(`  Errors:     ${result.errors ?? 0}`);

    if (result.issues && result.issues.length > 0) {
      lines.push(`\n  Issues (${result.issues.length}):`);
      for (const [index, issue] of result.issues.entries()) {
        lines.push(`    ${index + 1}. ${issue}`);
      }
    } else {
      lines.push("\n  No issues found.");
    }

    lines.push("  " + "\u2500".repeat(50));

    return lines;
  }

  /**
   * Format field explanation for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatFieldExplanation(field: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(field, null, 2)];
    }

    const lines: string[] = [];

    lines.push(`\nField Details: ${field.label || field.field}`);
    lines.push(`  Field:        ${field.field}`);
    lines.push(`  Table:        ${field.table}`);
    if (field.label) {
      lines.push(`  Label:        ${field.label}`);
    }

    lines.push(`  Type:         ${field.type || "unknown"}`);
    if (field.maxLength !== undefined) {
      lines.push(`  Max Length:   ${field.maxLength}`);
    }

    lines.push(`  Mandatory:    ${field.mandatory ?? false}`);
    lines.push(`  Read Only:    ${field.readOnly ?? false}`);

    if (field.choices && field.choices.length > 0) {
      lines.push(`\n  Choices (${field.choices.length}):`);
      lines.push("  " + "\u2500".repeat(50));
      lines.push("  " + "Label".padEnd(25) + "Value");
      lines.push("  " + "\u2500".repeat(50));

      for (const choice of field.choices) {
        lines.push("  " + (choice.label || "").padEnd(25) + (choice.value || ""));
      }

      lines.push("  " + "\u2500".repeat(50));
    }

    return lines;
  }

  /**
   * Format table schema for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatTableSchema(schema: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(schema, null, 2)];
    }

    const lines: string[] = [];

    lines.push(`\nTable Schema: ${schema.label || schema.table}`);
    lines.push(`  Table:        ${schema.table}`);
    if (schema.label) {
      lines.push(`  Label:        ${schema.label}`);
    }

    if (schema.superClass) {
      lines.push(`  Super Class:  ${schema.superClass}`);
    }

    if (schema.fields && schema.fields.length > 0) {
      lines.push(`\n  Fields (${schema.fields.length}):`);
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

      for (const field of schema.fields) {
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
    } else {
      lines.push("\n  No fields found.");
    }

    return lines;
  }
}
