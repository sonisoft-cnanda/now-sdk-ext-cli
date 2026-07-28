/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable perfectionist/sort-objects */
 
import {Args, Command, Flags} from '@oclif/core'
import { Logger, NowStringUtil, SchemaDiscovery, ServiceNowInstance } from '@sonisoft/now-sdk-ext-core';

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { SchemaDisplayService } from '../../services/schema-display.service.js'

export class Schema extends AuthenticatedCommand<typeof Schema> {

  static args = {
  }
static description = 'Discover and inspect a ServiceNow table schema including fields, types, and relationships.\n\n' +
    'This command retrieves the full schema definition for a ServiceNow table, including all fields, ' +
    'their types, constraints, and optionally choices, relationships, UI policies, and business rules.\n\n' +
    'Features:\n' +
    '  \u2022 List all fields with types, lengths, and constraints\n' +
    '  \u2022 Optionally include field choices\n' +
    '  \u2022 Optionally include table relationships\n' +
    '  \u2022 Optionally include UI policies\n' +
    '  \u2022 Optionally include business rules\n' +
    '  \u2022 JSON output for CI/CD integration';
static examples = [
    {
      description: 'Discover incident table schema',
      command: '<%= config.bin %> <%= command.id %> --table incident --auth dev',
    },
    {
      description: 'Include choices and relationships',
      command: '<%= config.bin %> <%= command.id %> --table incident --include-choices --include-relationships --auth dev',
    },
  ]
static flags = {
    'table': Flags.string({
      char: 't',
      description: 'ServiceNow table name to discover schema for',
      required: true,
    }),
    'include-choices': Flags.boolean({
      description: 'Include field choices in the schema output',
      required: false,
      default: false,
    }),
    'include-relationships': Flags.boolean({
      description: 'Include table relationships in the schema output',
      required: false,
      default: false,
    }),
    'include-ui-policies': Flags.boolean({
      description: 'Include UI policies in the schema output',
      required: false,
      default: false,
    }),
    'include-business-rules': Flags.boolean({
      description: 'Include business rules in the schema output',
      required: false,
      default: false,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Schema);
    const displayService = new SchemaDisplayService();

    try {
      const schemaDiscovery = new SchemaDiscovery(this.instance);

      this.log(`Discovering schema for table: ${flags.table}`);

      const options = {
        includeChoices: flags['include-choices'],
        includeRelationships: flags['include-relationships'],
        includeUiPolicies: flags['include-ui-policies'],
        includeBusinessRules: flags['include-business-rules'],
      };

      const schema = await schemaDiscovery.discoverTableSchema(flags.table, options);

      if (!schema) {
        this.error(`Failed to discover schema for table: ${flags.table}`);
        return;
      }

      const lines = displayService.formatTableSchema(schema, (flags.json ?? false) ?? false);
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error occurred when discovering table schema.", error as Error);
      this.error(error as Error);
    }
  }
}
