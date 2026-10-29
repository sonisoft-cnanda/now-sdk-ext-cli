import {afterEach, describe, expect, it, jest} from '@jest/globals'
import {
  ApplicationManager,
  refusalFor,
  ServiceNowInstance,
  StoreAppRepairError,
  type StoreAppRepairResult,
  type StoreAppRepairStart,
} from '@sonisoft/now-sdk-ext-core'

import StoreRepair from '../../../src/commands/store/repair.js'
import {AuthenticatedCommand} from '../../../src/common/authenticated-command.js'
import {projectStoreAppRepairError, StoreAppRepairDisplayService} from '../../../src/services/store-app-repair-display.service.js'

const APP = 'dfdf3c79ff4422104e80ffffffffffb7'
const HISTORY = 'b'.repeat(32)
const started: StoreAppRepairStart = {
  app: {hasDemoData: false, name: 'Bubble trend', scope: 'sn_bubble_trend', sysId: APP, version: '1.0.0'},
  endpoint: 'repair', operation: {}, previousHistoryIds: [], trackerId: 'TRK1',
}
const repaired: StoreAppRepairResult = {
  app: started.app, endpoint: 'repair',
  history: {
    counts: {added: 0, deleted: 0, skipped: 0, skippedApplyOnce: 0, skippedError: 0, skippedManualMerge: 0, unchanged: 1, updated: 2},
    finished: '2026-10-29 13:39:53', skippedFiles: [], skippedFilesTruncated: false, status: 'complete', sysId: HISTORY,
  },
  percent_complete: 100, repaired: true, status: '2', status_label: 'Successful', status_message: 'Success!', success: true, trackerId: 'TRK1', warnings: [],
}

const command = (args: object, flags: object, json = true) => {
  const lines: string[] = []
  const target = Object.assign(Object.create(StoreRepair.prototype), {
    args, flags: {'demo-data': false, 'no-wait': false, 'poll-interval': 5000, timeout: 1_800_000, ...flags},
    instance: new ServiceNowInstance({alias: 'unit-test'}), jsonEnabled: () => json, log: (line: string) => lines.push(line),
  })
  return {lines, target}
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('nex store repair', () => {
  it('starts the repair of the app it is given, waits with the flags, and returns the result', async () => {
    const start = jest.spyOn(ApplicationManager.prototype, 'repairStoreApplication').mockResolvedValue(started)
    const wait = jest.spyOn(ApplicationManager.prototype, 'waitForStoreApplicationRepair').mockResolvedValue(repaired)
    const {lines, target} = command({app: 'sn_bubble_trend'}, {'demo-data': true, 'poll-interval': 2000, timeout: 60_000})
    await expect(target.run()).resolves.toBe(repaired)
    expect(start).toHaveBeenCalledWith({app: 'sn_bubble_trend', loadDemoData: true})
    expect(wait).toHaveBeenCalledWith(started, 2000, 60_000, expect.any(Function))
    expect(lines).toEqual([])
  })

  it('prints the start, progress and the history in text mode', async () => {
    jest.spyOn(ApplicationManager.prototype, 'repairStoreApplication').mockResolvedValue(started)
    jest.spyOn(ApplicationManager.prototype, 'waitForStoreApplicationRepair').mockImplementation(async (_s, _p, _t, onProgress) => {
      onProgress?.({message: 'Executing queued operation', percentComplete: 73, status: '1'})
      return repaired
    })
    const {lines, target} = command({app: APP}, {}, false)
    await target.run()
    expect(lines[0]).toBe('Repair started: Bubble trend (sn_bubble_trend) 1.0.0')
    expect(lines).toContain('  Executing queued operation (73%)')
    expect(lines).toContain('Repaired: Bubble trend (sn_bubble_trend) 1.0.0')
    expect(lines).toContain(`Upgrade history ${HISTORY}: complete, finished 2026-10-29 13:39:53`)
  })

  it('with --no-wait, returns the started repair and how to follow it', async () => {
    jest.spyOn(ApplicationManager.prototype, 'repairStoreApplication').mockResolvedValue(started)
    const wait = jest.spyOn(ApplicationManager.prototype, 'waitForStoreApplicationRepair')
    const {lines, target} = command({app: APP}, {'no-wait': true}, false)
    await expect(target.run()).resolves.toBe(started)
    expect(wait).not.toHaveBeenCalled()
    expect(lines.at(-1)).toBe('Follow it: nex query -t sys_execution_tracker -q sys_id=TRK1 -f state,message,percent_complete')
    const withAuth = command({app: APP}, {auth: 'dev', 'no-wait': true}, false)
    await withAuth.target.run()
    expect(withAuth.lines.at(-1)).toMatch(/ --auth dev$/)
  })

  it.each([
    ['not_confirmed', {...repaired, history: undefined, repaired: false, warnings: ['no history']}, 'no finished upgrade history'],
    ['repair_failed', {...repaired, error: 'Unable to install', percent_complete: 100, repaired: false, status: '3', success: false}, 'did not succeed: Unable to install'],
    ['timed_out', {...repaired, error: 'Installation timed out', history: undefined, percent_complete: 40, repaired: false, status: '1', success: false},
      'Do not repair again until tracker TRK1 has ended'],
  ])('exits non-zero with code %s and the result when the repair is not confirmed', async (code, result, reason) => {
    jest.spyOn(ApplicationManager.prototype, 'repairStoreApplication').mockResolvedValue(started)
    jest.spyOn(ApplicationManager.prototype, 'waitForStoreApplicationRepair').mockResolvedValue(result as StoreAppRepairResult)
    const error = await command({app: APP}, {}).target.run().catch((error_: unknown) => error_) as any
    expect(error.code).toBe(code)
    expect(error.oclif.exit).toBe(1)
    expect(error.storeAppRepair).toBe(result)
    const text = await command({app: APP}, {}, false).target.run().catch((error_: unknown) => error_) as any
    expect(text.message).toContain(reason)
  })

  it('keeps the started repair and its tracker when waiting for it fails, so nobody starts another', async () => {
    jest.spyOn(ApplicationManager.prototype, 'repairStoreApplication').mockResolvedValue(started)
    jest.spyOn(ApplicationManager.prototype, 'waitForStoreApplicationRepair').mockRejectedValue(new Error('Error during request. Status: 502 Body: <html>'))
    const error = await command({app: APP}, {auth: 'dev'}).target.run().catch((error_: unknown) => error_) as any
    expect(error.code).toBe('wait_failed')
    expect(error.storeAppRepair).toBe(started)
    expect(error.message).toContain('tracker TRK1')
    expect(error.message).toContain('--auth dev')
    expect(error.message).not.toContain('<html>')
  })

  it('passes a policy refusal while waiting through unchanged', async () => {
    jest.spyOn(ApplicationManager.prototype, 'repairStoreApplication').mockResolvedValue(started)
    const refusal = refusalFor('write', 'flag')
    jest.spyOn(ApplicationManager.prototype, 'waitForStoreApplicationRepair').mockRejectedValue(refusal)
    await expect(command({app: APP}, {}).target.run()).rejects.toBe(refusal)
  })

  it('strips control characters from progress and failure text from the instance', async () => {
    jest.spyOn(ApplicationManager.prototype, 'repairStoreApplication').mockResolvedValue(started)
    jest.spyOn(ApplicationManager.prototype, 'waitForStoreApplicationRepair').mockImplementation(async (_s, _p, _t, onProgress) => {
      onProgress?.({message: 'Queued\u001B]0;owned\u0007\r', percentComplete: 0})
      return {...repaired, error: 'bad\u001B[2Jthing', percent_complete: 100, repaired: false, status: '3', success: false}
    })
    const {lines, target} = command({app: APP}, {}, false)
    const error = await target.run().catch((error_: unknown) => error_) as Error
    const printed = [...lines, error.message].join('\n')
    expect(printed).not.toMatch(/[\u0000-\u0009\u000B-\u001F\u007F]/)
    expect(lines).toContain('  Queued ]0;owned   (0%)')
  })

  it('renders a refusal as its code, detail and remediation, and passes anything else on', async () => {
    const parent = jest.spyOn(AuthenticatedCommand.prototype as any, 'catch').mockResolvedValue(undefined)
    const {target} = command({app: 'x_mine'}, {})
    await target.catch(new StoreAppRepairError('not_a_store_app', {app: 'x_mine'}))
    const rendered = parent.mock.calls[0][0] as any
    expect(rendered.code).toBe('not_a_store_app')
    expect(rendered.storeAppRepair).toMatchObject({code: 'not_a_store_app', detail: {app: 'x_mine'}, type: 'StoreAppRepairError'})
    expect(rendered.message).toBe('Store application repair refused: not_a_store_app.')
    const other = new Error('boom')
    await target.catch(other)
    expect(parent.mock.calls[1][0]).toBe(other)
    const text = command({app: 'x'}, {}, false).target
    await text.catch(new StoreAppRepairError('start_failed', {app: APP, serverMessage: 'You do not have read permission', status: 403}))
    expect((parent.mock.calls[2][0] as Error).message).toContain('App Client: You do not have read permission\nHTTP status: 403')
  })

  it('declares no --allow-* flag and takes the app as its one argument', () => {
    expect(Object.keys(StoreRepair.flags).some(flag => flag.startsWith('allow'))).toBe(false)
    expect(Object.keys(StoreRepair.args)).toEqual(['app'])
  })
})

describe('store app repair display', () => {
  const display = new StoreAppRepairDisplayService()

  it('lists the files that were not applied, the warnings, and a pointer when the list is cut', () => {
    const lines = display.result({
      ...repaired,
      app: {...started.app, customizationVersion: '2.1.0', name: 'Bubble\ntrend'},
      history: {
        ...repaired.history!,
        counts: {...repaired.history!.counts, skipped: 1},
        skippedFiles: [{disposition: '4', dispositionLabel: 'Skipped', fileName: 'sys_script_include_1', reason: 'Customized', targetName: 'Util', type: 'Script Include'}],
        skippedFilesTruncated: true,
      },
      warnings: ['1 file(s) were not applied'],
    })
    expect(lines[0]).toBe('Repaired: Bubble trend (sn_bubble_trend) 1.0.0, customization 2.1.0')
    expect(lines).toContain('  added 0, updated 2, deleted 0, unchanged 1, skipped 1, errors 0, manual merge 0, apply once 0')
    expect(lines).toContain(`  ${'Skipped'.padEnd(20)} Script Include: Util (sys_script_include_1): Customized`)
    expect(lines).toContain(`  … more; see sys_upgrade_history_log where upgrade_history=${HISTORY}`)
    expect(lines.at(-1)).toBe('! 1 file(s) were not applied')
  })

  it('says when no history was written, and names a failure', () => {
    expect(display.result({...repaired, history: undefined, repaired: false})).toContain('Upgrade history: none written for this repair')
    expect(display.result({...repaired, error: 'Unable to install', repaired: false, success: false})[0])
      .toBe('Repair failed: Bubble trend (sn_bubble_trend) 1.0.0: Unable to install')
    expect(display.result({...repaired, repaired: false})[0]).toBe('Not confirmed as repaired: Bubble trend (sn_bubble_trend) 1.0.0')
  })

  it('names the endpoint a repair started through', () => {
    expect(display.started({...started, endpoint: 'install'})[1]).toBe('Tracker TRK1 (App Client app/install with isReinstall)')
  })

  it('projects every refusal code to a remediation', () => {
    for (const code of ['app_inactive', 'app_not_found', 'contains_plugins', 'invalid_app', 'no_demo_data', 'not_a_store_app', 'start_failed'] as const) {
      const failure = projectStoreAppRepairError({code, detail: undefined})
      expect(failure.remediation[0]).not.toContain('Read the application back')
      expect(failure.message).toBe(`Store application repair refused: ${code}.`)
    }
  })
})
