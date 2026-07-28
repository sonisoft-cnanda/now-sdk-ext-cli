 

import { Flags } from '@oclif/core'
import { ApplicationManager } from '@sonisoft/now-sdk-ext-core'
import { readFileSync } from 'node:fs'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { formatValidationResult } from '../../services/store-app-display.service.js'

export class Validate extends AuthenticatedCommand<typeof Validate> {

  static args = {
  }
static description = 'Validate a batch installation definition file.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --file ./batch-definition.json --auth dev',
      description: 'Validate a batch definition file',
    },
  ]
static flags = {
    file: Flags.string({
      char: 'f',
      description: 'Path to batch definition JSON file',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Validate)

    try {
      const filePath = flags.file as string

      this.log(`Validating batch definition file: ${filePath}...`)

      // Read and parse file to ensure it is valid JSON
      const fileContent = readFileSync(filePath, 'utf-8')
      JSON.parse(fileContent)

      const appMgr = new ApplicationManager(this.instance)
      const result = await appMgr.validateBatchDefinition(filePath)

      const lines = formatValidationResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when validating batch definition.", error as Error)
      this.error(error as Error)
    }
  }
}
