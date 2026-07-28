 
import { Flags } from '@oclif/core'
import { ScopeManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { ScopeDisplayService } from '../../services/scope-display.service.js'

export class Scope extends AuthenticatedCommand<typeof Scope> {

  static args = {
  }
static description = 'Get the current application scope or list available applications.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --auth dev',
      description: 'Get the current application scope',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --list --auth dev',
      description: 'List all available applications',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -l --json --auth dev',
      description: 'List applications as JSON',
    },
  ]
static flags = {
    'list': Flags.boolean({
      char: 'l',
      default: false,
      description: 'List all available applications',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Scope)
    const displayService = new ScopeDisplayService()

    try {
      const scopeMgr = new ScopeManager(this.instance)

      if (flags.list) {
        this.log('Fetching available applications...')
        const apps = await scopeMgr.listApplications()

        const lines = displayService.formatAppList(apps, (flags.json ?? false) ?? false)
        for (const line of lines) {
          (flags.json ?? false) ? console.log(line) : this.log(line)
        }
      } else {
        this.log('Fetching current application scope...')
        const app = await scopeMgr.getCurrentApplication()

        const lines = displayService.formatCurrentApp(app, (flags.json ?? false) ?? false)
        for (const line of lines) {
          (flags.json ?? false) ? console.log(line) : this.log(line)
        }
      }
    } catch (error) {
      this._logger.error("Error occurred when fetching scope information.", error as Error)
      this.error(error as Error)
    }
  }
}
