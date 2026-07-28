 

/**
 * Format store search results for display.
 * Returns lines for console output, or JSON string if jsonOutput is true.
 */
export function formatSearchResults(results: any, jsonOutput: boolean): string[] {
  if (jsonOutput) {
    return [JSON.stringify(results, null, 2)];
  }

  const lines: string[] = [];

  if (!results || !results.apps) {
    lines.push('No results returned from store search.');
    return lines;
  }

  lines.push(`\n=== Store Search Results ===`);
  lines.push(`Found ${results.total ?? results.apps.length} application(s)`);
  lines.push("─".repeat(80));

  if (results.apps.length === 0) {
    lines.push('No applications found matching the search criteria.');
    return lines;
  }

  for (const [index, app] of results.apps.entries()) {
    lines.push(`${index + 1}. ${app.name}`);
    if (app.scope) {
      lines.push(`   Scope:    ${app.scope}`);
    }

    if (app.version) {
      lines.push(`   Version:  ${app.version}`);
    }

    if (app.vendor) {
      lines.push(`   Vendor:   ${app.vendor}`);
    }

    if (app.sys_id) {
      lines.push(`   Sys ID:   ${app.sys_id}`);
    }

    lines.push("─".repeat(80));
  }

  lines.push(`\nTotal: ${results.total ?? results.apps.length} application(s)`);

  return lines;
}

/**
 * Format install or update result for display.
 * Returns lines for console output, or JSON string if jsonOutput is true.
 */
export function formatInstallResult(result: any, jsonOutput: boolean): string[] {
  if (jsonOutput) {
    return [JSON.stringify(result, null, 2)];
  }

  const lines: string[] = [];

  if (!result) {
    lines.push('No result returned from the operation.');
    return lines;
  }

  lines.push('\n=== Operation Result ===');
  lines.push("─".repeat(60));

  if (result.success !== undefined) {
    lines.push(`  Success:         ${result.success}`);
  }

  if (result.status_label) {
    lines.push(`  Status:          ${result.status_label}`);
  }

  if (result.percent_complete !== undefined) {
    lines.push(`  Progress:        ${result.percent_complete}%`);
  }

  if (result.status_message) {
    lines.push(`  Message:         ${result.status_message}`);
  }

  if (result.error) {
    lines.push(`  Error:           ${result.error}`);
  }

  if (result.links?.progress) {
    lines.push(`  Progress ID:     ${result.links.progress.id}`);
    lines.push(`  Progress URL:    ${result.links.progress.url}`);
  }

  lines.push("─".repeat(60));

  return lines;
}

/**
 * Format batch validation result for display.
 * Returns lines for console output, or JSON string if jsonOutput is true.
 */
export function formatValidationResult(result: any, jsonOutput: boolean): string[] {
  if (jsonOutput) {
    return [JSON.stringify(result, null, 2)];
  }

  const lines: string[] = [];

  if (!result) {
    lines.push('No result returned from validation.');
    return lines;
  }

  lines.push('\n=== Validation Result ===');
  lines.push("─".repeat(60));

  lines.push(`  Valid:           ${result.valid ? 'Yes' : 'No'}`);

  if (result.errors && result.errors.length > 0) {
    lines.push(`  Errors (${result.errors.length}):`);
    for (const err of result.errors) {
      lines.push(`    - ${typeof err === 'string' ? err : JSON.stringify(err)}`);
    }
  }

  if (result.warnings && result.warnings.length > 0) {
    lines.push(`  Warnings (${result.warnings.length}):`);
    for (const warn of result.warnings) {
      lines.push(`    - ${typeof warn === 'string' ? warn : JSON.stringify(warn)}`);
    }
  }

  lines.push("─".repeat(60));

  if (result.valid) {
    lines.push('Validation passed successfully.');
  } else {
    lines.push('Validation failed. Please fix the errors above.');
  }

  return lines;
}
