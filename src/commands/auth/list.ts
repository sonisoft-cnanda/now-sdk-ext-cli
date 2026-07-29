import {Command} from '@oclif/core'

import {credstore} from '../../common/credstore.js'

export class AuthList extends Command {
  static args = {}
  static description =
    'List credentials in the headless-safe credential store.\n\n' +
    'These are the credentials the ServiceNow SDK reads via the sn-credstore shim, ' +
    'which works in non-interactive sessions where the OS keyring cannot be unlocked.\n\n' +
    'Secrets are never printed.'
  static enableJsonFlag = true
static examples = [
    {command: '<%= config.bin %> <%= command.id %>', description: 'List stored credentials'},
    {command: '<%= config.bin %> <%= command.id %> --json', description: 'List as JSON for scripting'},
  ]


  async run(): Promise<unknown> {
    await this.parse(AuthList)
    const {listAliases} = await credstore()
    const summary = await listAliases()

    if (this.jsonEnabled()) return summary

    this.log(summary.description)
    this.log('')

    if (summary.aliases.length === 0) {
      this.log('No credentials stored.')
      this.log('')
      this.log('Import existing ones:  sn-credstore import --from keyring')
      this.log('Or add a new one:      now-sdk-x auth --add <instance>')
      return summary
    }

    for (const info of summary.aliases) {
      this.log(`${info.isDefault ? '*' : ' '} ${info.alias}`)
      this.log(`      host = ${info.instanceUrl}`)
      this.log(`      type = ${info.type}`)
      this.log(
        info.type === 'basic'
          ? `      username = ${info.username}`
          : // Expired is not an error worth flagging red: the next use refreshes it.
            `      expires = ${new Date(info.expiresAt! * 1000).toISOString()}${
              info.expired ? '  (EXPIRED — refreshes on next use)' : ''
            }`,
      )
    }

    return summary
  }
}
