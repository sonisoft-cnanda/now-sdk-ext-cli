/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { XMLRecordManager } from '@sonisoft/now-sdk-ext-core'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { XmlDisplayService } from '../../services/xml-display.service.js'

export class XmlImport extends AuthenticatedCommand<typeof XmlImport> {

  static args = {}
static description = 'Import XML records into a ServiceNow instance.\n\n' +
    'Reads an XML file and imports its contents into the specified target table. ' +
    'The XML should be in ServiceNow unload format.\n\n' +
    'Features:\n' +
    '  \u2022 Import from local XML files\n' +
    '  \u2022 Target a specific table\n' +
    '  \u2022 JSON output mode for CI/CD integration'
static examples = [
    {
      description: 'Import records from an XML file',
      command: '<%= config.bin %> <%= command.id %> --file ./export.xml --table sys_script_include --auth dev',
    },
    {
      description: 'Import with JSON output',
      command: '<%= config.bin %> <%= command.id %> --file ./records.xml --table incident --json --auth dev',
    },
  ]
static flags = {
    'file': Flags.string({
      char: 'f',
      description: 'Path to the XML file to import',
      required: true,
    }),
    'table': Flags.string({
      char: 't',
      description: 'Target table to import records into',
      required: true,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(XmlImport)
    const displayService = new XmlDisplayService()

    try {
      const xmlManager = new XMLRecordManager(this.instance)

      const resolvedPath = path.resolve(flags.file)
      this.log(`Reading XML file: ${resolvedPath}`)
      const xmlContent = readFileSync(resolvedPath, 'utf-8')

      this.log(`Importing records into table '${flags.table}'...`)

      const result = await xmlManager.importRecords({
        xmlContent,
        targetTable: flags.table,
      })

      const lines = displayService.formatImportResult(result, flags.json ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred during XML import.", error as Error)
      this.error(error as Error)
    }
  }
}
