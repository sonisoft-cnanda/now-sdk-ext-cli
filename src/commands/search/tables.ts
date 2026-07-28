 
import { Flags } from '@oclif/core'
import { CodeSearch } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { CodeSearchDisplayService } from '../../services/code-search-display.service.js'

export class SearchTables extends AuthenticatedCommand<typeof SearchTables> {

  static args = {
  }
static description = 'List tables configured for a specific code search group.\n\n' +
    'Each search group contains one or more tables that are indexed for code search. Use this ' +
    'command to discover which tables belong to a search group, including the fields that are ' +
    'searchable on each table.\n\n' +
    'Features:\n' +
    '  • List all tables in a search group\n' +
    '  • View searchable fields per table\n' +
    '  • JSON output for scripting and automation'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --search-group "Script Includes" --auth dev-instance',
      description: 'List tables in a search group',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --search-group "Business Rules" --json --auth dev-instance',
      description: 'List tables with JSON output',
    },
  ]
static flags = {
    'search-group': Flags.string({
      char: 'g',
      description: 'Search group name to list tables for',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(SearchTables)
    const displayService = new CodeSearchDisplayService()

    try {
      const codeSearch = new CodeSearch(this.instance)

      this.log(`Retrieving tables for search group "${flags['search-group']}"...`)
      const tables = await codeSearch.getTablesForSearchGroup(flags['search-group'])

      const lines = displayService.formatTablesForGroup(tables, flags['search-group'], (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when retrieving tables for search group.", error as Error)
      this.error(error as Error)
    }
  }
}
