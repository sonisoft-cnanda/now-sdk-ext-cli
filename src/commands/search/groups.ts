 
import { CodeSearch } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { CodeSearchDisplayService } from '../../services/code-search-display.service.js'

export class SearchGroups extends AuthenticatedCommand<typeof SearchGroups> {

  static args = {
  }
static description = 'List all available code search groups on a ServiceNow instance.\n\n' +
    'Search groups organize searchable tables into logical categories. Use this command to discover ' +
    'which search groups are configured, then use the group names with other search commands to ' +
    'narrow your search scope.\n\n' +
    'Features:\n' +
    '  • List all configured search groups\n' +
    '  • JSON output for scripting and automation'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --auth dev-instance',
      description: 'List all search groups',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --json --auth dev-instance',
      description: 'List search groups with JSON output',
    },
  ]
static flags = {
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(SearchGroups)
    const displayService = new CodeSearchDisplayService()

    try {
      const codeSearch = new CodeSearch(this.instance)

      this.log('Retrieving search groups...')
      const groups = await codeSearch.getSearchGroups()

      const lines = displayService.formatSearchGroups(groups, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when retrieving search groups.", error as Error)
      this.error(error as Error)
    }
  }
}
