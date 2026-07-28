 

import { Flags } from '@oclif/core'
import { BatchOperations } from '@sonisoft/now-sdk-ext-core'
import { readFileSync } from 'node:fs'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { formatBatchUpdateResult } from '../../services/batch-display.service.js'

export class Update extends AuthenticatedCommand<typeof Update> {

  static args = {
  }
static description = 'Batch update records on a ServiceNow instance from a JSON file.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --file ./updates.json --auth dev',
      description: 'Update records from a JSON file',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --file ./updates.json --stop-on-error --auth dev',
      description: 'Update records and stop on first error',
    },
  ]
static flags = {
    file: Flags.string({
      char: 'f',
      description: 'Path to JSON file with update operations',
      required: true,
    }),
    'stop-on-error': Flags.boolean({
      default: false,
      description: 'Stop processing on first error',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Update)

    try {
      const fileContent = readFileSync(flags.file as string, 'utf-8')
      const data = JSON.parse(fileContent)

      const stopOnError = flags['stop-on-error']
      this.log(`Batch updating records from ${flags.file}...`)
      this.log(`Stop on error: ${stopOnError}`)

      const batchOps = new BatchOperations(this.instance)
      const result = await batchOps.batchUpdate({
        onProgress: (p: string) => this.log(p),
        stopOnError,
        updates: data.updates || data,
      })

      const lines = formatBatchUpdateResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred during batch update.", error as Error)
      this.error(error as Error)
    }
  }
}
