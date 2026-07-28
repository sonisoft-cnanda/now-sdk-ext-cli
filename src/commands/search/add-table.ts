 
import { Flags } from '@oclif/core'
import { CodeSearch } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { CodeSearchDisplayService } from '../../services/code-search-display.service.js'

export class SearchAddTable extends AuthenticatedCommand<typeof SearchAddTable> {

  static args = {
  }
static description = 'Add a table to a code search group on a ServiceNow instance.\n\n' +
    'This command registers a new table and its searchable fields with a search group, making ' +
    'the table\'s records discoverable through code search. This is useful when you need to ' +
    'include custom tables in code search results.\n\n' +
    'Features:\n' +
    '  • Add custom tables to search groups\n' +
    '  • Specify which fields should be indexed\n' +
    '  • JSON output for scripting and automation'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --table sys_script_include --search-fields script --search-group "Script Includes" --auth dev-instance',
      description: 'Add a table to a search group',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --table sys_ui_page --search-fields "html,client_script,processing_script" --search-group "UI Pages" --auth dev-instance',
      description: 'Add a table with multiple search fields',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --table u_custom_script --search-fields script --search-group "Custom" --json --auth dev-instance',
      description: 'Add a table with JSON output',
    },
  ]
static flags = {
    'search-fields': Flags.string({
      char: 'f',
      description: 'Comma-separated list of fields to index for search',
      required: true,
    }),
    'search-group': Flags.string({
      char: 'g',
      description: 'Search group to add the table to',
      required: true,
    }),
    'table': Flags.string({
      char: 't',
      description: 'Table name to add to the search group',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(SearchAddTable)
    const displayService = new CodeSearchDisplayService()

    try {
      const codeSearch = new CodeSearch(this.instance)

      this.log(`Adding table "${flags.table}" to search group "${flags['search-group']}"...`)
      const result = await codeSearch.addTableToSearchGroup({
        search_fields: flags['search-fields'],
        search_group: flags['search-group'],
        table: flags.table,
      })

      const lines = displayService.formatAddTableResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when adding table to search group.", error as Error)
      this.error(error as Error)
    }
  }
}
