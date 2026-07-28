export interface AppInfo {
  can_install_or_upgrade: boolean;
  dependencies: null | string;
  isInstalled: boolean;
  latest_version: string;
  name: string;
  scope: string;
  short_description: string;
  sys_id: string;
  vendor: string;
  version: null | string;
  versions: Array<{ publish_date_display: string; version: string; }>;
}

export interface AppFilterOptions {
  installable?: boolean;
  installed?: boolean;
}

export class AppDisplayService {
  /**
   * Filter applications based on installed/installable criteria.
   */
  filterApps(apps: AppInfo[], options: AppFilterOptions): AppInfo[] {
    if (options.installed) {
      return apps.filter(app => app.isInstalled);
    }

    if (options.installable) {
      return apps.filter(app => !app.isInstalled && app.can_install_or_upgrade);
    }

    return apps;
  }

  /**
   * Format application list for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatAppList(apps: AppInfo[], jsonOutput: boolean, processingTime?: number): string[] {
    if (jsonOutput) {
      return [JSON.stringify({
        applications: apps.map(app => ({
          available_versions: app.versions.length,
          can_install_or_upgrade: app.can_install_or_upgrade,
          current_version: app.version || null,
          dependencies: app.dependencies || null,
          isInstalled: app.isInstalled,
          latest_version: app.latest_version,
          name: app.name,
          scope: app.scope,
          short_description: app.short_description,
          sys_id: app.sys_id,
          vendor: app.vendor,
        })),
        processingTime,
        total: apps.length,
      }, null, 2)];
    }

    const lines: string[] = [];

    lines.push(`Found ${apps.length} application(s)`);
    if (processingTime !== undefined) {
      lines.push(`Processing Time: ${processingTime}ms\n`);
    }

    if (apps.length === 0) {
      lines.push("No applications found matching the specified criteria.");
      return lines;
    }

    lines.push("─".repeat(100));

    for (const [index, app] of apps.entries()) {
      lines.push(`${index + 1}. ${app.name}`);
      lines.push(`   Scope:           ${app.scope}`);
      lines.push(`   Sys ID:          ${app.sys_id}`);
      lines.push(`   Vendor:          ${app.vendor}`);
      lines.push(`   Latest Version:  ${app.latest_version}`);
      lines.push(`   Installed:       ${app.isInstalled ? 'Yes (v' + app.version + ')' : 'No'}`);
      lines.push(`   Can Install:     ${app.can_install_or_upgrade ? 'Yes' : 'No'}`);

      if (app.dependencies) {
        lines.push(`   Dependencies:    ${app.dependencies}`);
      }

      if (app.short_description) {
        lines.push(`   Description:     ${app.short_description}`);
      }

      lines.push(`   Available Versions: ${app.versions.length}`);

      if (app.versions.length > 0) {
        const recentVersions = app.versions.slice(-3).reverse();
        lines.push(`   Recent Versions:`);
        for (const v of recentVersions) {
          lines.push(`     - v${v.version} (${v.publish_date_display})`);
        }
      }

      lines.push("─".repeat(100));
    }

    lines.push(`\nTotal: ${apps.length} application(s)`);

    const installedCount = apps.filter(a => a.isInstalled).length;
    const installableCount = apps.filter(a => !a.isInstalled && a.can_install_or_upgrade).length;

    lines.push("\nSummary:");
    lines.push(`  Installed:   ${installedCount}`);
    lines.push(`  Installable: ${installableCount}`);
    lines.push(`  Other:       ${apps.length - installedCount - installableCount}`);

    return lines;
  }

  /**
   * Format the install result for display.
   */
  formatInstallResult(appName: string, appScope: string, targetVersion: string, success: boolean, statusLabel: string, error?: string): string[] {
    const lines: string[] = [];

    if (success) {
      lines.push('\n✓ Installation completed successfully!');
      lines.push(`  Application:     ${appName}`);
      lines.push(`  Scope:           ${appScope}`);
      lines.push(`  Version:         ${targetVersion}`);
      lines.push(`  Final Status:    ${statusLabel}`);
    } else {
      lines.push('\n✗ Installation failed');
      lines.push(`  Status:          ${statusLabel}`);
      lines.push(`  Error:           ${error || statusLabel}`);
    }

    return lines;
  }
}
