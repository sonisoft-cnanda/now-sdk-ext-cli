import {Args, Command, Flags} from '@oclif/core'

import {credstore} from '../../common/credstore.js'

export class AuthDelete extends Command {
  static args = {
    alias: Args.string({description: 'Alias to remove', required: false}),
  }
static description =
    'Remove a credential from the store.\n\n' +
    'This does not touch the OS keyring — a copy stored there before migrating remains.'
static examples = [
    {command: '<%= config.bin %> <%= command.id %> dev206299', description: 'Remove one alias'},
    {command: '<%= config.bin %> <%= command.id %> --all', description: 'Remove every stored credential'},
  ]
static flags = {
    all: Flags.boolean({description: 'Remove every stored credential', required: false}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(AuthDelete)
    const {deleteAlias, deleteAllAliases} = await credstore()

    if (flags.all) {
      await deleteAllAliases()
      this.log('Removed all stored credentials.')
      return
    }

    if (!args.alias) {
      this.error('An alias is required, or --all to remove every credential.')
    }

    if (!(await deleteAlias(args.alias))) {
      this.error(`No such alias "${args.alias}".`, {suggestions: ['Run "nex auth list" to see stored aliases.']})
    }

    this.log(`Removed "${args.alias}".`)
  }
}
