 
import { Flags } from '@oclif/core'
import { UpdateSetManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { UpdateSetDisplayService } from '../../services/update-set-display.service.js'

export class Move extends AuthenticatedCommand<typeof Move> {

  static args = {
  }
static description = 'Move records between update sets.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --target us-002 --source us-001 --auth dev-instance',
      description: 'Move all records from one update set to another',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --target us-002 --records "rec-001,rec-002,rec-003" --auth dev-instance',
      description: 'Move specific records to a target update set',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --target us-002 --source us-001 --json --auth dev-instance',
      description: 'Move records with JSON output',
    },
  ]
static flags = {
    'records': Flags.string({
      description: 'Comma-separated sys_ids of records to move',
      required: false,
    }),
    'source': Flags.string({
      description: 'Source update set sys_id',
      required: false,
    }),
    'target': Flags.string({
      description: 'Target update set sys_id',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Move)
    const displayService = new UpdateSetDisplayService()

    try {
      const updateSetMgr = new UpdateSetManager(this.instance)

      this.log(`Moving records to update set: ${flags.target}`)
      const result: any = await updateSetMgr.moveRecordsToUpdateSet(flags.target, {
        recordSysIds: flags.records?.split(',')?.map(r => r.trim()),
        sourceUpdateSet: flags.source,
      })

      const lines = displayService.formatMoveResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when moving records between update sets.", error as Error)
      this.error(error as Error)
    }
  }
}
