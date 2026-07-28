 

import { Flags } from '@oclif/core'
import { ApplicationManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { formatInstallResult } from '../../services/store-app-display.service.js'

export class Install extends AuthenticatedCommand<typeof Install> {

  static args = {
  }
static description = 'Install an application from the ServiceNow Store.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --app-id abc123 --version 1.0.0 --auth dev',
      description: 'Install a store application and wait for completion',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --app-id abc123 --version 1.0.0 --no-wait --auth dev',
      description: 'Install without waiting for completion',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -a abc123 -v 1.0.0 --demo-data --auth dev',
      description: 'Install with demo data',
    },
  ]
static flags = {
    'app-id': Flags.string({
      char: 'a',
      description: 'Store application sys_id',
      required: true,
    }),
    'demo-data': Flags.boolean({
      default: false,
      description: 'Load demo data during installation',
      required: false,
    }),
    'no-wait': Flags.boolean({
      default: false,
      description: 'Do not wait for installation to complete',
      required: false,
    }),
    'poll-interval': Flags.integer({
      default: 5000,
      description: 'Polling interval in milliseconds',
      required: false,
    }),
    timeout: Flags.integer({
      default: 1_800_000,
      description: 'Installation timeout in milliseconds',
      required: false,
    }),
    version: Flags.string({
      char: 'v',
      description: 'Application version to install',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Install)

    try {
      const appId = flags['app-id'] as string
      const version = flags.version as string
      const demoData = flags['demo-data']
      const noWait = flags['no-wait']
      const pollInterval = flags['poll-interval'] as number
      const timeout = flags.timeout as number

      this.log(`Installing store application ${appId} (version: ${version})...`)

      const appMgr = new ApplicationManager(this.instance)

      let result: any

      const jsonOutput = flags.json ?? false

      if (noWait) {
        result = await appMgr.installStoreApplication({
          appId,
          loadDemoData: demoData,
          version,
        })
        this.log('Installation initiated. Use progress ID to monitor status.')
      } else {
        this.log(`Waiting for installation to complete (poll: ${pollInterval}ms, timeout: ${timeout}ms)...`)
        result = await appMgr.installStoreApplicationAndWait(
          { appId, loadDemoData: demoData, version },
          pollInterval,
          timeout,
        )
      }

      const lines = formatInstallResult(result, jsonOutput)
      for (const line of lines) {
        jsonOutput ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when installing store application.", error as Error)
      this.error(error as Error)
    }
  }
}
