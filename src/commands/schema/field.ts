/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable perfectionist/sort-objects */
 
import {Args, Command, Flags} from '@oclif/core'
import { Logger, NowStringUtil, SchemaDiscovery, ServiceNowInstance } from '@sonisoft/now-sdk-ext-core';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { SchemaDisplayService } from '../../services/schema-display.service.js'

export class Field extends AuthenticatedCommand<typeof Field> {

  static args = {
  }
static description = 'Get detailed information about a specific field on a ServiceNow table.\n\n' +
    'This command retrieves comprehensive details about a single field, including its type, constraints, ' +
    'choices, and other metadata. Useful for understanding field definitions during development.';
static examples = [
    {
      description: 'Explain the state field on incident table',
      command: '<%= config.bin %> <%= command.id %> --table incident --field state --auth dev',
    },
    {
      description: 'Explain the priority field on incident table with JSON output',
      command: '<%= config.bin %> <%= command.id %> --table incident --field priority --json --auth dev',
    },
  ]
static flags = {
    'table': Flags.string({
      char: 't',
      description: 'ServiceNow table name',
      required: true,
    }),
    'field': Flags.string({
      char: 'f',
      description: 'Field name to explain',
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
    const {args, flags} = await this.parse(Field);
    const displayService = new SchemaDisplayService();

    try {
      const schemaDiscovery = new SchemaDiscovery(this.instance);

      this.log(`Explaining field "${flags.field}" on table "${flags.table}"`);

      const fieldInfo = await schemaDiscovery.explainField(flags.table, flags.field);

      if (!fieldInfo) {
        this.error(`Failed to explain field "${flags.field}" on table "${flags.table}"`);
        return;
      }

      const lines = displayService.formatFieldExplanation(fieldInfo, (flags.json ?? false) ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when explaining field.", error as Error);
      this.error(error as Error);
    }
  }
}
