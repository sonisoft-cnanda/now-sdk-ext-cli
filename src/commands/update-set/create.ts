 
import { Flags } from '@oclif/core'
import { UpdateSetManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { UpdateSetDisplayService } from '../../services/update-set-display.service.js'

export class Create extends AuthenticatedCommand<typeof Create> {

  static args = {
  }
static description = 'Create a new update set.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --name "My Feature Set" --auth dev-instance',
      description: 'Create a new update set with a name',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --name "My Feature Set" --description "Update set for feature X" --auth dev-instance',
      description: 'Create with name and description',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --name "My Feature Set" --application x_my_app --auth dev-instance',
      description: 'Create within a specific application scope',
    },
  ]
static flags = {
    'application': Flags.string({
      description: 'Application scope for the new update set',
      required: false,
    }),
    'description': Flags.string({
      char: 'd',
      description: 'Description for the new update set',
      required: false,
    }),
    'name': Flags.string({
      char: 'n',
      description: 'Name for the new update set',
      required: true,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Create)
    const displayService = new UpdateSetDisplayService()

    try {
      const updateSetMgr = new UpdateSetManager(this.instance)

      this.log(`Creating update set: ${flags.name}`)
      const result: any = await updateSetMgr.createUpdateSet({
        application: flags.application,
        description: flags.description,
        name: flags.name,
      })

      const lines = displayService.formatCreateResult(result, (flags.json ?? false) ?? false)
      for (const line of lines) {
        (flags.json ?? false) ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when creating update set.", error as Error)
      this.error(error as Error)
    }
  }
}
