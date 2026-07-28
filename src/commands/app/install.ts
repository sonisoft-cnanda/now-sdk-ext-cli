/* eslint-disable @typescript-eslint/no-unused-vars */
 
import {Args, Command, Flags} from '@oclif/core'
import {  Application, ApplicationManager, BackgroundScriptExecutor , Logger, NowStringUtil , ServiceNowInstance } from '@sonisoft/now-sdk-ext-core';
import fs from 'node:fs';
import path from 'node:path';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'

export class Install extends AuthenticatedCommand<typeof Install> {

  static args = {
  }
static description = 'Install or upgrade multiple ServiceNow applications from a batch definition file.\n\n' +
    'This command enables automated installation and upgrade of multiple applications using a JSON definition file. ' +
    'Perfect for setting up new environments, deploying application bundles, or managing application dependencies. ' +
    'The batch file can specify multiple applications with their versions, scopes, and installation options.\n\n' +
    'Features:\n' +
    '  • Install multiple applications in a single operation\n' +
    '  • Upgrade existing applications to new versions\n' +
    '  • Control demo data loading per application\n' +
    '  • Detailed installation progress and results\n' +
    '  • Automatic dependency resolution\n' +
    '  • Rollback support on failures\n\n' +
    'Batch Definition Format:\n' +
    '  The JSON file should contain an "applications" array with objects defining:\n' +
    '  • name: Application name\n' +
    '  • scope: Application scope (e.g., x_my_app)\n' +
    '  • version: Target version number\n' +
    '  • load_demo_data: Whether to load demo data (optional)\n' +
    '  • notes: Installation notes (optional)';
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --batch --definitionPath ./apps-to-install.json --auth dev-instance',
      description: 'Install applications from a batch definition file',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -b -d ./batch-apps.json -a dev-instance',
      description: 'Install with short flags',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -b -d ./apps.json -a dev-instance --log-level debug',
      description: 'Install with debug logging to troubleshoot issues',
    },
  ]
static flags = {
    batch: Flags.boolean({
      char: 'b', 
      description: 'Enable batch installation mode from definition file', 
      required: false
    }),
    definitionPath: Flags.string({
      char: 'd', 
      description: 'Path to JSON batch definition file containing applications to install', 
      required: false
    }),
  }


  async run(): Promise<void> {
    const {args, flags} = await this.parse(Install);
    
    this.log("App Install Command Executed.");
    
    if(!NowStringUtil.isStringEmpty(flags.batch) && !NowStringUtil.isStringEmpty(flags.definitionPath)){
      try{
        this.log("Installing app");

        if(NowStringUtil.isStringEmpty(flags.definitionPath)){
          this.error("Batch definition patch is required to execute install.");
          return;
        }
  
        const appManager = new ApplicationManager(this.instance);
        const result = await appManager.installBatch(path.resolve(flags.definitionPath as string));
        this.log(result.toString());
     
      }catch(error){
        this._logger.error("Error occurred.", error as Error);
        this.error(error as Error);
      }
       
    
    }

  }
}
