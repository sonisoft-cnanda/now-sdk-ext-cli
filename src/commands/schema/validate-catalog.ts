/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable perfectionist/sort-objects */
 
import {Args, Command, Flags} from '@oclif/core'
import { Logger, NowStringUtil, SchemaDiscovery, ServiceNowInstance } from '@sonisoft/now-sdk-ext-core';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { SchemaDisplayService } from '../../services/schema-display.service.js'

export class ValidateCatalog extends AuthenticatedCommand<typeof ValidateCatalog> {

  static args = {
  }
static description = 'Validate a ServiceNow catalog item configuration for common issues.\n\n' +
    'This command checks a catalog item configuration and reports any validation issues, ' +
    'warnings, or errors found. Useful for ensuring catalog items are properly configured ' +
    'before deployment.';
static examples = [
    {
      description: 'Validate a catalog item by sys_id',
      command: '<%= config.bin %> <%= command.id %> --sys-id a1b2c3d4e5f6 --auth dev',
    },
    {
      description: 'Validate a catalog item with JSON output',
      command: '<%= config.bin %> <%= command.id %> --sys-id a1b2c3d4e5f6 --json --auth dev',
    },
  ]
static flags = {
    'sys-id': Flags.string({
      char: 's',
      description: 'Catalog item sys_id to validate',
      required: true,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(ValidateCatalog);
    const displayService = new SchemaDisplayService();

    try {
      const schemaDiscovery = new SchemaDiscovery(this.instance);

      this.log(`Validating catalog item: ${flags['sys-id']}`);

      const result = await schemaDiscovery.validateCatalogConfiguration(flags['sys-id']);

      if (!result) {
        this.error(`Failed to validate catalog item: ${flags['sys-id']}`);
        return;
      }

      const lines = displayService.formatCatalogValidation(result, (flags.json ?? false) ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when validating catalog configuration.", error as Error);
      this.error(error as Error);
    }
  }
}
