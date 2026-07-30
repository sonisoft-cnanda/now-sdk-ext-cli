import {Command} from '@oclif/core'
import {listAliases, loadConfig, PATCHED_ENV_VAR, probeAll} from '@sonisoft/sn-credstore'

import {credStoreFlag} from '../../common/cred-store-flag.js'

/**
 * Diagnose credential storage.
 *
 * The failure this exists for is silent: a locked keyring makes
 * `KeyChain.getPassword()` return null, which the SDK reports as "Default
 * Credential has not been set" — indistinguishable from having no credentials.
 * So the first thing to report is whether the shim actually installed.
 */
export class AuthDoctor extends Command {
  static args = {}
  static description =
    'Diagnose credential storage: whether the SDK shim is active, which backend is in use, and what is stored.'
  static enableJsonFlag = true
  static examples = [
    {command: '<%= config.bin %> <%= command.id %>', description: 'Check credential storage health'},
    {command: '<%= config.bin %> <%= command.id %> --json', description: 'Machine-readable output for CI'},
  ]
static flags = {...credStoreFlag}


  async run(): Promise<unknown> {
    await this.parse(AuthDoctor)

    const config = loadConfig()
    const shimActive = process.env[PATCHED_ENV_VAR] === '1'
    const backends = await probeAll(config)

    // listAliases reads the active backend, so it can legitimately fail (no
    // systemd in a container, an undecryptable blob after a reimage). That is a
    // finding to report, not a crash.
    let summary
    let readError: string | undefined
    try {
      summary = await listAliases(config)
    } catch (error) {
      readError = error instanceof Error ? error.message : String(error)
    }

    const report = {
      aliases: summary?.aliases ?? [],
      backends,
      path: config.blobPath,
      shimActive,
      store: config.store,
      ...(readError ? {readError} : {}),
    }

    if (this.jsonEnabled()) return report

    this.log(`shim active   : ${shimActive ? 'yes' : 'no'}`)
    if (!shimActive) {
      // "no" is the DEFAULT, not a fault — the shim is opt-in. The previous
      // wording ("NO", plus a hint to check SN_CRED_STORE_DISABLE) read as though
      // something were broken, and pointed at the one variable that is almost
      // never the reason. Say what to do instead.
      this.log('')
      this.log('  The SDK is reading the OS keyring. That is the default and works fine with an')
      this.log('  interactive desktop session.')
      this.log('')
      this.log('  In a headless session — SSH, systemd, CI, an agent — the keyring cannot be')
      this.log('  unlocked and will report no credentials whatever is stored. To use the store')
      this.log('  listed below instead, pass --cred-store or set SN_CRED_STORE_ENABLE=1.')
      if (process.env.SN_CRED_STORE_DISABLE) {
        this.log('')
        this.log('  NOTE: SN_CRED_STORE_DISABLE is set, which overrides both of those.')
      }
    }

    this.log(`store         : ${config.store}`)
    this.log(`path          : ${config.blobPath}`)
    this.log('')
    this.log('backends:')
    for (const backend of backends) {
      const state = backend.available ? 'available' : 'unavailable'
      this.log(`  ${backend.id.padEnd(14)} ${state}${backend.error ? ` — ${backend.error}` : ''}`)
      this.log(`  ${''.padEnd(14)} ${backend.description}`)
    }

    this.log('')
    if (readError) {
      this.log(`credentials   : COULD NOT READ — ${readError}`)
    } else {
      this.log(`credentials   : ${report.aliases.length} stored`)
      for (const info of report.aliases) {
        this.log(`  ${info.isDefault ? '*' : ' '} ${info.alias}  (${info.type})  ${info.instanceUrl}`)
      }
    }

    return report
  }
}
