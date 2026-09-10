import {Command, Flags} from '@oclif/core'
import {logger as sdkLogger} from '@servicenow/sdk-cli/dist/logger/index.js'
import {createBrowserSession} from '@sonisoft/now-sdk-ext-core'

import {writeBrowserSession} from '../../services/browser-session-writer.js'

export default class BrowserSessionCommand extends Command {
  static description = 'Create a verified Playwright cookie session using a stored SDK alias.'
  static enableJsonFlag = true
  static flags = {
    auth: Flags.string({char: 'a', description: 'Stored SDK credential alias.', required: true}),
    'cred-store': Flags.boolean({description: 'Use the headless credential store.'}),
    force: Flags.boolean({description: 'Replace an existing regular output file.'}),
    output: Flags.string({description: 'Owner-only Playwright storage-state file.', required: true}),
  }

  async run(): Promise<unknown> {
    const {flags} = await this.parse(BrowserSessionCommand)
    sdkLogger.setLevel('silent')
    if ((flags['cred-store'] || process.env.SN_CRED_STORE_ENABLE) && process.env.NOW_SDK_KEYCHAIN_PATCHED !== '1') {
      this.error('The requested credential store is inactive. Unset SN_CRED_STORE_DISABLE and check nex auth doctor.')
    }

    const session = await createBrowserSession({alias: flags.auth})
    const path = await writeBrowserSession(session, flags.output, flags.force)
    const metadata = {
      alias: session.alias, createdAt: session.createdAt, instanceUrl: session.instanceUrl,
      oauthExpiresAt: session.oauthExpiresAt, path,
    }
    if (!this.jsonEnabled()) this.log(path)
    return metadata
  }
}
