 
import { Flags } from '@oclif/core'
import { ScopeManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { ScopeDisplayService } from '../../services/scope-display.service.js'

export class Set extends AuthenticatedCommand<typeof Set> {

  static args = {
  }
static description = 'Set the current application scope on a ServiceNow instance.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --app-id abc123def456ghi789jkl012mno345pq --auth dev',
      description: 'Set application scope by sys_id',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -a abc123def456ghi789jkl012mno345pq --json --auth dev',
      description: 'Set application scope and output as JSON',
    },
  ]
static flags = {
    'app-id': Flags.string({
      char: 'a',
      description: '32-char sys_id of application',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Set)
    const displayService = new ScopeDisplayService()

    try {
      const scopeMgr = new ScopeManager(this.instance)
      const appId = flags['app-id'] as string

      this.log(`Setting application scope to ${appId}...`)
      const result = await scopeMgr.setCurrentApplication(appId)

      const lines = displayService.formatSetResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when setting application scope.", error as Error)
      this.error(error as Error)
    }
  }
}
