/* eslint-disable perfectionist/sort-objects */
 
import { Flags } from '@oclif/core'
import { XMLRecordManager } from '@sonisoft/now-sdk-ext-core'
import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { XmlDisplayService } from '../../services/xml-display.service.js'

export class XmlExport extends AuthenticatedCommand<typeof XmlExport> {

  static args = {}
static description = 'Export a single ServiceNow record as XML.\n\n' +
    'Downloads the XML representation of a specific record from a ServiceNow table. ' +
    'Without --output, the XML is printed to stdout. ' +
    'With --output, the XML is written to the specified file path.\n\n' +
    'Features:\n' +
    '  \u2022 Export any record by table and sys_id\n' +
    '  \u2022 Print XML to stdout for piping to other tools\n' +
    '  \u2022 Save directly to a file with --output\n' +
    '  \u2022 JSON output mode for CI/CD integration'
static examples = [
    {
      description: 'Export a record to stdout',
      command: '<%= config.bin %> <%= command.id %> --table sys_script_include --sys-id abc123def456 --auth dev',
    },
    {
      description: 'Export and save to a file',
      command: '<%= config.bin %> <%= command.id %> --table incident --sys-id abc123 --output ./export.xml --auth dev',
    },
    {
      description: 'Export as JSON metadata',
      command: '<%= config.bin %> <%= command.id %> --table sys_script --sys-id abc123 --json --auth dev',
    },
  ]
static flags = {
    'table': Flags.string({
      char: 't',
      description: 'Table name of the record to export',
      required: true,
    }),
    'sys-id': Flags.string({
      char: 's',
      description: 'Sys ID of the record to export',
      required: true,
    }),
    'output': Flags.string({
      char: 'o',
      description: 'File path to write the exported XML to. If omitted, XML is printed to stdout.',
      required: false,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(XmlExport)
    const displayService = new XmlDisplayService()

    try {
      const xmlManager = new XMLRecordManager(this.instance)

      this.log(`Exporting record ${flags['sys-id']} from table '${flags.table}'...`)

      const result = await xmlManager.exportRecord({
        table: flags.table,
        sysId: flags['sys-id'],
      })

      if (flags.output) {
        const resolvedPath = path.resolve(flags.output)
        writeFileSync(resolvedPath, result.xml, 'utf-8')
        this.log(`XML written to ${resolvedPath}`)
      }

      const lines = displayService.formatExportResult(result, flags.output, flags.json ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }

      // If no output file and not JSON mode, print the raw XML to stdout
      if (!flags.output && !(flags.json ?? false)) {
        this.log('')
        console.log(result.xml)
      }
    } catch (error) {
      this._logger.error("Error occurred during XML export.", error as Error)
      this.error(error as Error)
    }
  }
}
