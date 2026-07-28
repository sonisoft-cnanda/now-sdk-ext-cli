/* eslint-disable @typescript-eslint/no-unused-vars */
 
 
import {Args, Command, Flags} from '@oclif/core'
import {  CompanyApplication, CompanyApplications, CompanyApplicationsResponse, Logger } from '@sonisoft/now-sdk-ext-core';
import fs from 'node:fs';
import path from 'node:path';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { isNilOrEmpty } from '../../common/utils.js';

export class RepoList extends AuthenticatedCommand<typeof RepoList> {

  static args = {
  }
static description = 'List applications available in your ServiceNow company repository.\n\n' +
    'This command retrieves and displays all applications that are available in your company\'s ' +
    'internal application repository. These are applications that have been published internally ' +
    'and are available for installation across your ServiceNow instances.\n\n' +
    'Features:\n' +
    '  • List all available company repository applications\n' +
    '  • Filter to show only installed applications\n' +
    '  • Filter to show only installable (not yet installed) applications\n' +
    '  • View application details including versions and dependencies\n' +
    '  • JSON output support for automation and scripting\n' +
    '  • Vendor-based filtering\n\n' +
    'Use Cases:\n' +
    '  • Discover available applications for installation\n' +
    '  • Audit installed company applications\n' +
    '  • Find applications that can be upgraded\n' +
    '  • Integration with CI/CD pipelines\n' +
    '  • Automated environment setup and configuration';
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --auth dev-instance',
      description: 'List all company repository applications',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --installed --auth dev-instance',
      description: 'List only installed applications',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --installable --auth dev-instance',
      description: 'List only installable (not installed) applications',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --json --auth dev-instance',
      description: 'Get JSON output for scripting',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -a dev-instance',
      description: 'List with short flags',
    },
  ]
static flags = {
    installable: Flags.boolean({
      char: 'n',
      default: false,
      description: 'Show only applications that can be installed (not yet installed)',
      required: false
    }),
    installed: Flags.boolean({
      char: 'i',
      default: false,
      description: 'Show only installed applications',
      required: false
    }),
    json: Flags.boolean({
      char: 'j',
      default: false,
      description: 'Output results as JSON',
      required: false
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(RepoList);
    
    try {
      this.log("Fetching company repository applications...\n");

      const companyApps = new CompanyApplications(this.instance);
      const response: CompanyApplicationsResponse = await companyApps.getCompanyApplications();
      
      let apps = response.data;
      
      // Apply filters
      if (flags.installed) {
        apps = apps.filter(app => app.isInstalled);
      } else if (flags.installable) {
        apps = apps.filter(app => !app.isInstalled && app.can_install_or_upgrade);
      }
      
      // Output results
      if (flags.json) {
        // JSON output
        this.log(JSON.stringify({
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
            vendor: app.vendor
          })),
          processingTime: response.dataProcessingTime,
          total: apps.length
        }, null, 2));
      } else {
        // Human-readable output
        this.log(`Found ${apps.length} application(s)`);
        this.log(`Processing Time: ${response.dataProcessingTime}ms\n`);
        
        if (apps.length === 0) {
          this.log("No applications found matching the specified criteria.");
          return;
        }
        
        this.log("─".repeat(100));
        
        for (const [index, app] of apps.entries()) {
          this.log(`${index + 1}. ${app.name}`);
          this.log(`   Scope:           ${app.scope}`);
          this.log(`   Sys ID:          ${app.sys_id}`);
          this.log(`   Vendor:          ${app.vendor}`);
          this.log(`   Latest Version:  ${app.latest_version}`);
          this.log(`   Installed:       ${app.isInstalled ? 'Yes (v' + app.version + ')' : 'No'}`);
          this.log(`   Can Install:     ${app.can_install_or_upgrade ? 'Yes' : 'No'}`);
          
          if (app.dependencies) {
            this.log(`   Dependencies:    ${app.dependencies}`);
          }
          
          if (app.short_description) {
            this.log(`   Description:     ${app.short_description}`);
          }
          
          this.log(`   Available Versions: ${app.versions.length}`);
          
          if (app.versions.length > 0) {
            const recentVersions = app.versions.slice(-3).reverse();
            this.log(`   Recent Versions:`);
            for (const v of recentVersions) {
              this.log(`     - v${v.version} (${v.publish_date_display})`);
            }
          }
          
          this.log("─".repeat(100));
        }
        
        this.log(`\nTotal: ${apps.length} application(s)`);
        
        // Show summary statistics
        const installedCount = apps.filter(a => a.isInstalled).length;
        const installableCount = apps.filter(a => !a.isInstalled && a.can_install_or_upgrade).length;
        
        this.log("\nSummary:");
        this.log(`  Installed:   ${installedCount}`);
        this.log(`  Installable: ${installableCount}`);
        this.log(`  Other:       ${apps.length - installedCount - installableCount}`);
      }
      
    } catch (error) {
      this._logger.error("Error occurred when fetching company applications.", error as Error);
      this.error(error as Error);
    }
  }
}

