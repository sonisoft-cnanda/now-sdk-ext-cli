 

import type { ApplicationDetailModel, BatchValidationResult } from '@sonisoft/now-sdk-ext-core'

interface StoreIndicator {
  message?: string
}

function getIndicatorMessages(indicators: unknown): string[] {
  try {
    const parsed = typeof indicators === 'string' ? JSON.parse(indicators) : indicators
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((indicator: StoreIndicator) => indicator?.message ? [indicator.message] : [])
  } catch {
    return []
  }
}

/**
 * Format store search results for display.
 * Returns lines for console output, or JSON string if jsonOutput is true.
 */
export function formatSearchResults(apps: ApplicationDetailModel[], jsonOutput: boolean, limit?: number): string[] {
  if (jsonOutput) {
    return [JSON.stringify(apps, null, 2)]
  }

  const lines: string[] = []

  if (apps.length === 0) {
    lines.push('No applications matched the search criteria.')
    return lines;
  }

  lines.push('\n=== Store Search Results ===')
  lines.push(`Showing ${apps.length} application(s)`)
  if (limit !== undefined && apps.length === limit) {
    lines.push(`Results may be truncated. Use --limit or --offset to view more applications.`)
  }

  lines.push('─'.repeat(80))

  for (const [index, app] of apps.entries()) {
    const wireFields = app as unknown as { indicators?: unknown; update_available?: string }
    lines.push(`${index + 1}. ${app.name}`)
    if (app.scope) {
      lines.push(`   Scope:       ${app.scope}`)
    }

    if (app.short_description) {
      lines.push(`   Description: ${app.short_description}`)
    }

    if (wireFields.update_available === '1' && app.version && app.latest_version) {
      lines.push(`   Version:     ${app.version} → ${app.latest_version}`)
    } else if (app.latest_version) {
      const installed = app.version ? ` (installed: ${app.version})` : ''
      lines.push(`   Version:     ${app.latest_version}${installed}`)
    } else if (app.version) {
      lines.push(`   Version:     ${app.version}`)
    }

    if (app.vendor) {
      lines.push(`   Vendor:      ${app.vendor}`)
    }

    if (app.sys_id) {
      lines.push(`   Sys ID:      ${app.sys_id}`)
    }

    for (const message of getIndicatorMessages(wireFields.indicators)) {
      lines.push(`   Indicator:   ${message}`)
    }

    lines.push('─'.repeat(80))
  }

  lines.push(`\nShowing: ${apps.length} application(s)`)

  return lines
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
export function formatValidationResult(result: BatchValidationResult, jsonOutput: boolean): string[] {
  if (jsonOutput) {
    return [JSON.stringify(result, null, 2)];
  }

  const lines: string[] = [];

  lines.push('\n=== Validation Result ===');
  lines.push("─".repeat(60));

  lines.push(`  Valid:              ${result.isValid ? 'Yes' : 'No'}`)
  lines.push(`  Total applications: ${result.totalApplications}`)
  lines.push(`  Already valid:      ${result.alreadyValid}`)
  lines.push(`  Need installation:  ${result.needsInstallation}`)
  lines.push(`  Need upgrade:       ${result.needsUpgrade}`)
  lines.push(`  Errors:             ${result.errors}`)

  const applications = [...result.applications].sort((a, b) => Number(b.needsAction) - Number(a.needsAction))
  if (applications.length > 0) {
    lines.push('')
    lines.push('  Applications:')
  }

  for (const app of applications) {
    lines.push(`    - ${app.name ?? app.id} (${app.validationStatus})`)
    lines.push(`      ID: ${app.id}`)
    lines.push(`      Requested: ${app.requested_version}`)
    if (app.installed_version) lines.push(`      Installed: ${app.installed_version}`)
    if (app.error) lines.push(`      Error: ${app.error}`)
  }

  lines.push("─".repeat(60));

  if (result.isValid) {
    lines.push('Validation passed successfully.');
  } else {
    lines.push('Validation failed. Please fix the errors above.');
  }

  return lines;
}
