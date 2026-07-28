 

import { Flags } from '@oclif/core'
import { ApplicationManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { formatInstallResult } from '../../services/store-app-display.service.js'

export class Update extends AuthenticatedCommand<typeof Update> {

  static args = {
  }
static description = 'Update a ServiceNow Store application to a new version.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --app-id abc123 --version 2.0.0 --auth dev',
      description: 'Update a store application and wait for completion',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --app-id abc123 --version 2.0.0 --no-wait --auth dev',
      description: 'Update without waiting for completion',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -a abc123 -v 2.0.0 --timeout 3600000 --auth dev',
      description: 'Update with custom timeout (1 hour)',
    },
  ]
static flags = {
    'app-id': Flags.string({
      char: 'a',
      description: 'Store application sys_id',
      required: true,
    }),
    'no-wait': Flags.boolean({
      default: false,
      description: 'Do not wait for update to complete',
      required: false,
    }),
    'poll-interval': Flags.integer({
      default: 5000,
      description: 'Polling interval in milliseconds',
      required: false,
    }),
    timeout: Flags.integer({
      default: 1_800_000,
      description: 'Update timeout in milliseconds',
      required: false,
    }),
    version: Flags.string({
      char: 'v',
      description: 'Target application version',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Update)

    try {
      const appId = flags['app-id'] as string
      const version = flags.version as string
      const noWait = flags['no-wait']
      const pollInterval = flags['poll-interval'] as number
      const timeout = flags.timeout as number

      this.log(`Updating store application ${appId} to version ${version}...`)

      const appMgr = new ApplicationManager(this.instance)

      let result: any

      const jsonOutput = flags.json ?? false

      if (noWait) {
        result = await appMgr.updateStoreApplication({
          appId,
          version,
        })
        this.log('Update initiated. Use progress ID to monitor status.')
      } else {
        this.log(`Waiting for update to complete (poll: ${pollInterval}ms, timeout: ${timeout}ms)...`)
        result = await appMgr.updateStoreApplicationAndWait(
          { appId, version },
          pollInterval,
          timeout,
        )
      }

      const lines = formatInstallResult(result, jsonOutput)
      for (const line of lines) {
        jsonOutput ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when updating store application.", error as Error)
      this.error(error as Error)
    }
  }
}
