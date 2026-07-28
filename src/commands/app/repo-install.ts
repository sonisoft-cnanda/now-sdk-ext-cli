/* eslint-disable @typescript-eslint/no-unused-vars */
 
 
import {Args, Command, Flags} from '@oclif/core'
import {  
  AppRepoApplication, 
  AppRepoInstallRequest,
  AppRepoOperationResult,
  CompanyApplication,
  CompanyApplications,
  Logger,
  NowStringUtil 
} from '@sonisoft/now-sdk-ext-core';
import fs from 'node:fs';
import path from 'node:path';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { isNilOrEmpty } from '../../common/utils.js';

export class RepoInstall extends AuthenticatedCommand<typeof RepoInstall> {

  static args = {
  }
static description = 'Install an application from your ServiceNow company repository.\n\n' +
    'This command installs an application from your company\'s internal application repository. ' +
    'You can specify the application by its scope name, and optionally specify a particular version. ' +
    'The command will automatically look up the application details and initiate the installation.\n\n' +
    'Features:\n' +
    '  • Install applications by scope name\n' +
    '  • Automatic lookup of application sys_id\n' +
    '  • Optional version specification (defaults to latest)\n' +
    '  • Wait for installation completion with progress monitoring\n' +
    '  • No-wait mode for background installations\n' +
    '  • Configurable polling intervals and timeouts\n' +
    '  • Detailed installation status and error reporting\n\n' +
    'Installation Process:\n' +
    '  1. Looks up the application in the company repository by scope\n' +
    '  2. Verifies the application is available and installable\n' +
    '  3. Initiates the installation via CI/CD API\n' +
    '  4. Monitors progress until completion (unless --no-wait specified)\n' +
    '  5. Reports final status and any errors\n\n' +
    'Requirements:\n' +
    '  • User must have sn_cicd.sys_ci_automation role\n' +
    '  • Application must exist in company repository\n' +
    '  • Application must not be already installed (or use upgrade)';
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --scope x_my_custom_app --auth dev-instance',
      description: 'Install application by scope (latest version)',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --scope x_my_app --version 2.1.0 --auth dev-instance',
      description: 'Install specific version of an application',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --scope x_my_app --no-wait --auth dev-instance',
      description: 'Install without waiting for completion',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -s x_my_app -a dev-instance --timeout 3600000',
      description: 'Install with custom timeout (1 hour)',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -s x_my_app -a dev-instance --log-level debug',
      description: 'Install with debug logging',
    },
  ]
static flags = {
    'no-wait': Flags.boolean({
      char: 'w',
      default: false,
      description: 'Do not wait for installation to complete',
      required: false
    }),
    'poll-interval': Flags.integer({
      default: 5000,
      description: 'Polling interval in milliseconds (default: 5000)',
      required: false
    }),
    scope: Flags.string({
      char: 's',
      description: 'Application scope (e.g., x_my_custom_app)',
      required: true
    }),
    timeout: Flags.integer({
      char: 't',
      default: 1_800_000,
      description: 'Installation timeout in milliseconds (default: 1800000 = 30 min)',
      required: false
    }),
    version: Flags.string({
      char: 'v',
      description: 'Specific version to install (defaults to latest)',
      required: false
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(RepoInstall);
    
    try {
      this.log("App Repository Install Command Executed.\n");
      
      if (NowStringUtil.isStringEmpty(flags.scope)) {
        this.error("Scope is required to install an application from the company repository");
        return;
      }
      
      // Step 1: Look up the application in the company repository
      this.log(`Looking up application with scope: ${flags.scope}...`);
      const companyApps = new CompanyApplications(this.instance);
      const app = await companyApps.getCompanyApplicationByScope(flags.scope);
      
      if (!app) {
        this.error(`Application with scope '${flags.scope}' not found in company repository`);
        return;
      }
      
      this.log(`✓ Found application: ${app.name}`);
      this.log(`  Scope:          ${app.scope}`);
      this.log(`  Sys ID:         ${app.sys_id}`);
      this.log(`  Latest Version: ${app.latest_version}`);
      this.log(`  Installed:      ${app.isInstalled ? 'Yes (v' + app.version + ')' : 'No'}`);
      
      // Check if already installed
      if (app.isInstalled && !flags.version) {
        this.log(`\n⚠️  Application is already installed (version ${app.version})`);
        this.log('To upgrade or reinstall, specify a different version with --version');
        return;
      }
      
      // Check if installation is allowed
      if (!app.can_install_or_upgrade) {
        this.error(`Application '${app.name}' cannot be installed or upgraded at this time`);
        return;
      }
      
      // Determine version to install
      const targetVersion = flags.version || app.latest_version;
      this.log(`\nTarget version: ${targetVersion}`);
      
      // Show dependencies if any
      if (app.dependencies) {
        this.log(`Dependencies: ${app.dependencies}`);
      }
      
      // Step 2: Prepare install request
      const installRequest: AppRepoInstallRequest = {
        scope: app.scope,
        sys_id: app.sys_id,
        version: targetVersion
      };
      
      this.log(`\nInitiating installation from company repository...`);
      
      const appRepo = new AppRepoApplication(this.instance);
      
      // Step 3: Install
      if (flags['no-wait']) {
        // Non-blocking installation
        const response = await appRepo.installFromAppRepo(installRequest);
        
        this.log(`✓ Installation initiated successfully`);
        this.log(`  Progress ID:     ${response.links.progress.id}`);
        this.log(`  Status:          ${response.status_label}`);
        this.log(`  Progress:        ${response.percent_complete}%`);
        this.log(`\nInstallation is running in the background.`);
        this.log(`Use the progress ID to monitor status if needed.`);
        
      } else {
        // Blocking installation with progress monitoring
        this.log(`Waiting for installation to complete...`);
        this.log(`(Poll interval: ${flags['poll-interval']}ms, Timeout: ${flags.timeout}ms)\n`);
        
        const result: AppRepoOperationResult = await appRepo.installFromAppRepoAndWait(
          installRequest,
          flags['poll-interval'],
          flags.timeout
        );
        
        if (result.success) {
          this.log('\n✓ Installation completed successfully!');
          this.log(`  Application:     ${app.name}`);
          this.log(`  Scope:           ${app.scope}`);
          this.log(`  Version:         ${targetVersion}`);
          this.log(`  Final Status:    ${result.status_label}`);
          this.log(`  Progress:        ${result.percent_complete}%`);
          
          // Verify installation
          this.log(`\nVerifying installation...`);
          const verifyApp = await companyApps.getCompanyApplicationByScope(app.scope);
          if (verifyApp?.isInstalled) {
            this.log(`✓ Verified: Application is now installed (version ${verifyApp.version})`);
          }
          
        } else {
          this.log('\n✗ Installation failed');
          this.log(`  Status:          ${result.status_label}`);
          this.log(`  Error:           ${result.error || result.status_message}`);
          this.error(`Installation failed: ${result.error || result.status_label}`);
        }
      }
      
    } catch (error) {
      this._logger.error("Error occurred when installing application from company repository.", error as Error);
      this.error(error as Error);
    }
  }
}

