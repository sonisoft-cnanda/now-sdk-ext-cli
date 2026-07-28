 

import { Flags } from '@oclif/core'
import { BatchOperations } from '@sonisoft/now-sdk-ext-core'
import { readFileSync } from 'node:fs'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { formatBatchCreateResult } from '../../services/batch-display.service.js'

export class Create extends AuthenticatedCommand<typeof Create> {

  static args = {
  }
static description = 'Batch create records on a ServiceNow instance from a JSON file.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --file ./records.json --auth dev',
      description: 'Create records from a JSON file',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --file ./records.json --no-transaction --auth dev',
      description: 'Create records without transactional mode',
    },
  ]
static flags = {
    file: Flags.string({
      char: 'f',
      description: 'Path to JSON file with create operations',
      required: true,
    }),
    transaction: Flags.boolean({
      default: true,
      description: 'Stop on first error (transactional)',
      required: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Create)

    try {
      const fileContent = readFileSync(flags.file as string, 'utf-8')
      const data = JSON.parse(fileContent)

      const {transaction} = flags
      this.log(`Batch creating records from ${flags.file}...`)
      this.log(`Transactional mode: ${transaction}`)

      const batchOps = new BatchOperations(this.instance)
      const result = await batchOps.batchCreate({
        onProgress: (p: string) => this.log(p),
        operations: data.operations || data,
        transaction,
      })

      const lines = formatBatchCreateResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred during batch create.", error as Error)
      this.error(error as Error)
    }
  }
}
