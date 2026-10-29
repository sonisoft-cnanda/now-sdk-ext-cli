import {Args, Errors, Flags} from '@oclif/core'
import {
  ApplicationManager,
  flushLogs,
  isPolicyRefusal,
  StoreAppRepairError,
  type StoreAppRepairResult,
  type StoreAppRepairStart,
} from '@sonisoft/now-sdk-ext-core'

import {AuthenticatedCommand} from '../../common/authenticated-command.js'
import {projectStoreAppRepairError, repairOutcome, StoreAppRepairDisplayService} from '../../services/store-app-repair-display.service.js'

export default class StoreRepair extends AuthenticatedCommand<typeof StoreRepair> {
  static args = {
    app: Args.string({description: 'The installed application: its scope (e.g. x_acme_app) or its sys_store_app sys_id.', required: true}),
  }
  static description = `Repair an installed store or company application: reinstall its installed version from the application repository, without uninstalling it.

This is the Repair Application link on the application's sys_store_app record. Use it when an installed application is broken, or an install or update skipped files it should have applied. It waits for the repair and reports the upgrade history it wrote, including every file it did not apply.

Repaired is reported only when the App Client succeeded AND wrote a new, finished upgrade history row: it also reports success when it decided no reinstall was necessary. A repair is a write, so --read-only and --deny-write refuse it.`
  static enableJsonFlag = true
  static examples = [
    {command: '<%= config.bin %> <%= command.id %> x_acme_app --auth dev', description: 'Repair an installed application by scope and wait for it'},
    {command: '<%= config.bin %> <%= command.id %> 0123456789abcdef0123456789abcdef --json --auth dev', description: 'By sys_store_app sys_id, as JSON'},
    {command: '<%= config.bin %> <%= command.id %> x_acme_app --no-wait --auth dev', description: 'Start it and return the tracker id'},
  ]
  static flags = {
    'demo-data': Flags.boolean({default: false, description: 'Also load the application\'s demo data. Refused for an application that has none.'}),
    'no-wait': Flags.boolean({default: false, description: 'Start the repair and return its tracker id without waiting.'}),
    'poll-interval': Flags.integer({default: 5000, description: 'Polling interval in milliseconds.', min: 1000}),
    timeout: Flags.integer({
      default: 1_800_000,
      description: 'How long to wait, in milliseconds. A queued repair can wait minutes before it runs.',
      min: 1000,
    }),
  }

  protected async catch(error: Error & {exitCode?: number}): Promise<void> {
    if (!(error instanceof StoreAppRepairError)) return super.catch(error)
    const failure = projectStoreAppRepairError(error)
    await flushLogs()
    const message = this.jsonEnabled() ? failure.message : new StoreAppRepairDisplayService().failure(failure).join('\n')
    const safe = new Errors.CLIError(message, {code: failure.code, exit: 1, suggestions: failure.remediation})
    Object.assign(safe, {storeAppRepair: failure})
    return super.catch(safe)
  }

  public async run(): Promise<StoreAppRepairResult | StoreAppRepairStart> {
    const manager = new ApplicationManager(this.instance)
    const display = new StoreAppRepairDisplayService()
    const text = !this.jsonEnabled()

    const started = await manager.repairStoreApplication({app: this.args.app, loadDemoData: this.flags['demo-data']})
    if (text) for (const line of display.started(started)) this.log(line)
    if (this.flags['no-wait']) {
      if (text) this.log(display.follow(started.trackerId, this.flags.auth))
      return started
    }

    let result: StoreAppRepairResult
    try {
      result = await manager.waitForStoreApplicationRepair(started, this.flags['poll-interval'], this.flags.timeout, progress => {
        if (text) this.log(display.progress(progress))
      })
    } catch (error) {
      if (isPolicyRefusal(error)) throw error
      // The repair is on the instance by now: say so, with its tracker, so nobody starts a second one.
      const failure = new Errors.CLIError(
        `The repair started (tracker ${started.trackerId}) but waiting for it failed, so it may still be running. ${display.follow(started.trackerId, this.flags.auth)}`,
        {code: 'wait_failed', exit: 1},
      )
      Object.assign(failure, {storeAppRepair: started})
      throw failure
    }

    if (text) for (const line of display.result(result)) this.log(line)
    if (!result.repaired) {
      const code = repairOutcome(result)
      const failure = new Errors.CLIError(text ? display.outcome(result) : `Store application repair ${code}.`, {code, exit: 1})
      Object.assign(failure, {storeAppRepair: result})
      throw failure
    }

    return result
  }
}
