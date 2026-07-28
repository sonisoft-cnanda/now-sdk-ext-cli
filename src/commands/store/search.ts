 

import { Flags } from '@oclif/core'
import { APP_TAB_CONTEXT, ApplicationManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { formatSearchResults } from '../../services/store-app-display.service.js'

export class Search extends AuthenticatedCommand<typeof Search> {

  static args = {
  }
static description = 'Search for applications in the ServiceNow Store.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --term "ITSM" --auth dev',
      description: 'Search for applications matching a term',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --tab installed --auth dev',
      description: 'List installed applications',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --tab updates --limit 10 --auth dev',
      description: 'List applications with available updates',
    },
  ]
static flags = {
    limit: Flags.integer({
      default: 20,
      description: 'Maximum number of results to return',
      required: false,
    }),
    tab: Flags.string({
      default: 'available_for_you',
      description: 'Store tab context to search',
      options: ['available_for_you', 'installed', 'updates'],
      required: false,
    }),
    term: Flags.string({
      char: 't',
      description: 'Search term',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Search)

    try {
      const tab = flags.tab as string
      const {term} = flags
      const limit = flags.limit as number

      this.log(`Searching store applications (tab: ${tab})...`)
      if (term) {
        this.log(`Search term: ${term}`)
      }

      const appMgr = new ApplicationManager(this.instance)
      const results = await appMgr.searchApplications({
        limit,
        searchKey: term,
        tabContext: tab as APP_TAB_CONTEXT,
      })

      const lines = formatSearchResults(results, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when searching store applications.", error as Error)
      this.error(error as Error)
    }
  }
}
