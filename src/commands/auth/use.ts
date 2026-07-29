import {Args, Command} from '@oclif/core'

import {credstore} from '../../common/credstore.js'

export class AuthUse extends Command {
  static args = {
    alias: Args.string({description: 'Alias to make the default', required: true}),
  }
static description =
    'Set the default credential alias.\n\n' +
    'Commands run without --auth use this alias.'
static examples = [{command: '<%= config.bin %> <%= command.id %> dev206299', description: 'Make dev206299 the default'}]

  async run(): Promise<void> {
    const {args} = await this.parse(AuthUse)
    const {setDefaultAlias} = await credstore()

    if (!(await setDefaultAlias(args.alias))) {
      this.error(`No such alias "${args.alias}".`, {suggestions: ['Run "nex auth list" to see stored aliases.']})
    }

    this.log(`Default alias is now "${args.alias}"`)
  }
}
