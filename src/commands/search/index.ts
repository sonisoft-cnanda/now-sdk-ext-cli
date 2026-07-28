 
import { Flags } from '@oclif/core'
import { CodeSearch } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { isNilOrEmpty } from '../../common/utils.js'
import { CodeSearchDisplayService } from '../../services/code-search-display.service.js'

export class Search extends AuthenticatedCommand<typeof Search> {

  static args = {
  }
static description = 'Search platform code across a ServiceNow instance.\n\n' +
    'This command allows you to search through code stored on the platform, including scripts, ' +
    'business rules, UI pages, and other scriptable records. You can search globally, within a ' +
    'specific application scope, or within a specific table and search group.\n\n' +
    'Features:\n' +
    '  • Full-text code search across the platform\n' +
    '  • Scope-specific search within application boundaries\n' +
    '  • Table-specific search within a search group\n' +
    '  • JSON output for CI/CD integration\n' +
    '  • Configurable result limits'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --term "GlideRecord" --auth dev-instance',
      description: 'Search for a term across the entire instance',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --term "getValue" --scope x_my_app --auth dev-instance',
      description: 'Search within a specific application scope',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --term "initialize" --search-group "Script Includes" --table sys_script_include --auth dev-instance',
      description: 'Search within a specific table and search group',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --term "GlideRecord" --limit 10 --json --auth dev-instance',
      description: 'Search with a result limit and JSON output',
    },
  ]
static flags = {
    'limit': Flags.integer({
      char: 'l',
      description: 'Maximum number of results to return',
      required: false,
    }),
    'scope': Flags.string({
      char: 's',
      description: 'Application scope to search within',
      required: false,
    }),
    'search-group': Flags.string({
      char: 'g',
      description: 'Search group to search within (required when using --table)',
      required: false,
    }),
    'table': Flags.string({
      description: 'Table name to search within (requires --search-group)',
      required: false,
    }),
    'term': Flags.string({
      char: 't',
      description: 'Search term to look for in platform code',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Search)
    const displayService = new CodeSearchDisplayService()

    try {
      const codeSearch = new CodeSearch(this.instance)

      let results: any

      const jsonOutput = flags.json ?? false

      if (!isNilOrEmpty(flags.table) && !isNilOrEmpty(flags['search-group'])) {
        // Search within a specific table and search group
        this.log(`Searching for "${flags.term}" in table "${flags.table}" (group: ${flags['search-group']})...`)
        results = await codeSearch.searchInTable(flags.term, flags.table as string, flags['search-group'] as string)

        const lines = displayService.formatSearchResults(Array.isArray(results) ? results : [results], jsonOutput)
        for (const line of lines) {
          jsonOutput ? console.log(line) : this.log(line)
        }
      } else if (isNilOrEmpty(flags.scope)) {
        // Global search
        this.log(`Searching for "${flags.term}"...`)
        results = await codeSearch.search({ limit: flags.limit, term: flags.term })

        const lines = displayService.formatSearchResults(results, jsonOutput)
        for (const line of lines) {
          jsonOutput ? console.log(line) : this.log(line)
        }
      } else {
        // Search within an application scope
        this.log(`Searching for "${flags.term}" in scope "${flags.scope}"...`)
        results = await codeSearch.searchInApp(flags.term, flags.scope as string)

        const lines = displayService.formatSearchResults(results, jsonOutput)
        for (const line of lines) {
          jsonOutput ? console.log(line) : this.log(line)
        }
      }
    } catch (error) {
      this._logger.error("Error occurred when executing code search.", error as Error)
      this.error(error as Error)
    }
  }
}
