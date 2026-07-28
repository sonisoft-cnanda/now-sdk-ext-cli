/* eslint-disable @typescript-eslint/no-unused-vars */
 
import {Args, Command, Flags} from '@oclif/core'
import {  Application, ApplicationManager, BackgroundScriptExecutor , Logger, NowStringUtil , ServiceNowInstance } from '@sonisoft/now-sdk-ext-core';
import fs from 'node:fs';
import path from 'node:path';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { isNilOrEmpty } from '../../common/utils.js';

export class Uninstall extends AuthenticatedCommand<typeof Uninstall> {

  static args = {
  }
static description = 'Uninstall a ServiceNow application from your instance.\n\n' +
    'This command provides programmatic control over ServiceNow application removal, allowing you to uninstall ' +
    'applications remotely. This is useful for automated environment cleanup, testing workflows, and ' +
    'application lifecycle management.\n\n' +
    'Features:\n' +
    '  • Uninstall applications by sys_id and scope\n' +
    '  • Automated application removal in CI/CD pipelines\n' +
    '  • Proper cleanup and rollback handling\n' +
    '  • Detailed logging and error reporting\n\n' +
    'Requirements:\n' +
    '  • User must have admin role\n' +
    '  • Application must be in a removable state\n' +
    '  • Both application sys_id and scope are required';
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --applicationId a1b2c3d4e5f6 --scope x_my_custom_app --auth dev-instance',
      description: 'Uninstall an application by sys_id and scope',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -i a1b2c3d4e5f6 -s x_my_custom_app --auth dev-instance --log-level debug',
      description: 'Uninstall with enhanced debug logging',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -i a1b2c3d4e5f6 -s x_my_custom_app -a dev-instance',
      description: 'Uninstall using short flags',
    },
  ]
static flags = {
    applicationId: Flags.string({char: 'i', description: 'Application sys_id', required: true}),
    scope: Flags.string({char: 's', description: 'Scope of application', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Uninstall);
    
    this.log("App Uninstall Command Executed.");
    
    if(!isNilOrEmpty(flags.applicationId) && !isNilOrEmpty(flags.scope)){
      try{
        this.log("Uninstalling app");
  
        if(NowStringUtil.isStringEmpty(flags.applicationId)){
          this.error("Application ID is required when uninstalling an app");
          return;
        }
  
        if(NowStringUtil.isStringEmpty(flags.scope)){
          this.error("Scope is required when uninstalling an app");
          return;
        }
  
        this.log("Passed checks. Uninstalling app.");
        const app = new Application(this.instance, flags.scope as string , flags.applicationId as string);
        await app.changeApplication();
        await app.uninstall();
        
        this.log("Application uninstalled successfully.");
      
      }catch(error){
        this._logger.error("Error occurred when uninstalling application.", error as Error);
        this.error(error as Error);
      }

    }else{
      this.error("Validation failed. Please provide applicationId and scope.");
    }

  }
}

