import {Command, Flags} from '@oclif/core'
import {createBrowserSession, injectBrowserSessionCdp} from '@sonisoft/now-sdk-ext-core'
import {mkdir} from 'node:fs/promises'

import {silenceSdkLoggers} from '../../common/sdk-logger.js'
import {writeBrowserSession} from '../../services/browser-session-writer.js'
import {
  allocateLoopbackPort,
  BROWSER_LABELS,
  type DesktopBrowserName,
  profileDirectory,
  resolveBrowserBinary,
  spawnDedicatedBrowser,
} from '../../services/desktop-browser.service.js'

function remediationOf(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return
  const value = error as {remediation?: unknown}
  return typeof value.remediation === 'string' ? value.remediation : undefined
}

export default class AuthOpen extends Command {
  static description = 'Open a verified UI session in a dedicated desktop browser using a stored SDK alias.'
  static enableJsonFlag = true
  static examples = [
    {command: '<%= config.bin %> <%= command.id %> -a bcbsscdev --cred-store', description: 'Open the alias in Edge'},
    {command: '<%= config.bin %> <%= command.id %> -a dev206299 --browser chrome', description: 'Open in Chrome'},
    {command: '<%= config.bin %> <%= command.id %> -a dev206299 --cdp http://127.0.0.1:9222', description: 'Inject into an already-debuggable browser'},
  ]
  static flags = {
    auth: Flags.string({char: 'a', description: 'Stored SDK credential alias.', required: true}),
    browser: Flags.option({
      default: 'edge',
      description: 'Desktop browser to launch. Ignored when --cdp is set.',
      options: ['edge', 'chrome', 'brave'] as const,
    })(),
    cdp: Flags.string({description: 'Existing DevTools URL. Skips launching a browser.'}),
    'cred-store': Flags.boolean({description: 'Use the headless credential store.'}),
    force: Flags.boolean({description: 'Replace an existing regular output file.'}),
    output: Flags.string({description: 'Optional owner-only Playwright storage-state file.'}),
  }

  async run(): Promise<unknown> {
    const {flags} = await this.parse(AuthOpen)
    silenceSdkLoggers()
    if ((flags['cred-store'] || process.env.SN_CRED_STORE_ENABLE) && process.env.NOW_SDK_KEYCHAIN_PATCHED !== '1') {
      this.error('The requested credential store is inactive. Unset SN_CRED_STORE_DISABLE and check nex auth doctor.')
    }

    const browser = flags.browser as DesktopBrowserName
    try {
      const session = await createBrowserSession({alias: flags.auth})
      const path = flags.output ? await writeBrowserSession(session, flags.output, flags.force) : undefined
      let cdpUrl = flags.cdp
      if (!cdpUrl) {
        const binary = await resolveBrowserBinary(browser)
        const port = await allocateLoopbackPort()
        const userDataDir = profileDirectory(flags.auth)
        await mkdir(userDataDir, {mode: 0o700, recursive: true})
        spawnDedicatedBrowser({binary, port, userDataDir})
        cdpUrl = `http://127.0.0.1:${port}`
      }

      await injectBrowserSessionCdp({cdpUrl, session})
      const metadata = {
        alias: session.alias,
        browser,
        cdpUrl,
        instanceUrl: session.instanceUrl,
        ...(path ? {path} : {}),
        ...(session.oauthExpiresAt ? {oauthExpiresAt: session.oauthExpiresAt} : {}),
      }
      if (!this.jsonEnabled()) this.log(`Opened ${session.instanceUrl} in ${BROWSER_LABELS[browser]}`)
      return metadata
    } catch (error: unknown) {
      const remediation = remediationOf(error)
      if (remediation) this.error(remediation)
      throw error
    }
  }
}
