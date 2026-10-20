import {afterEach, describe, expect, it, jest} from '@jest/globals'
import {MetadataScopeError, ServiceNowInstance, WorkingSetError, WorkingSetManager} from '@sonisoft/now-sdk-ext-core'

import UpdateSetComplete from '../../../src/commands/update-set/complete.js'
import UpdateSetMoveCapture from '../../../src/commands/update-set/move-capture.js'
import UpdateSetRestore from '../../../src/commands/update-set/restore.js'
import UpdateSetUse from '../../../src/commands/update-set/use.js'
import {AuthenticatedCommand} from '../../../src/common/authenticated-command.js'

const SET = 'a'.repeat(32), APP = 'b'.repeat(32), OTHER = 'c'.repeat(32), XML = 'd'.repeat(32)
const summary = {sysId: SET, name: 'STORY-1', state: 'in progress', application: APP, isDefault: false}
const command = (Command: any, extra: object) => Object.assign(Object.create(Command.prototype), {instance: new ServiceNowInstance({alias: 'unit-test'}), jsonEnabled: () => true, ...extra})
afterEach(() => jest.restoreAllMocks())

describe('update set working-set commands', () => {
  it('use makes the set current and returns where you were', async () => {
    const result = {previous: {application: 'global', updateSet: OTHER}, current: {application: APP, updateSet: SET}, updateSet: summary}
    const use = jest.spyOn(WorkingSetManager.prototype, 'useUpdateSet').mockResolvedValue(result)
    await expect(command(UpdateSetUse, {args: {set: SET}}).run()).resolves.toEqual(result)
    expect(use).toHaveBeenCalledWith(SET)
  })

  it('restore passes the previous pair through', async () => {
    const restore = jest.spyOn(WorkingSetManager.prototype, 'restoreWorkingSet').mockResolvedValue({restored: {application: 'global', updateSet: OTHER}})
    await command(UpdateSetRestore, {flags: {application: 'global', 'update-set': OTHER}}).run()
    expect(restore).toHaveBeenCalledWith({application: 'global', updateSet: OTHER})
  })

  it('move-capture maps source and target', async () => {
    const move = jest.spyOn(WorkingSetManager.prototype, 'moveCapture').mockResolvedValue({capture: XML, name: `sys_ui_section_${XML}`, application: APP, from: summary, to: {...summary, sysId: OTHER}})
    await command(UpdateSetMoveCapture, {flags: {capture: XML, source: SET, target: OTHER, reason: 'STORY-1 belongs here'}}).run()
    expect(move).toHaveBeenCalledWith({capture: XML, sourceSet: SET, targetSet: OTHER, reason: 'STORY-1 belongs here'})
  })

  it('complete requires the reviewed count', async () => {
    const complete = jest.spyOn(WorkingSetManager.prototype, 'completeUpdateSet').mockResolvedValue({...summary, state: 'complete'})
    await expect(command(UpdateSetComplete, {args: {set: SET}, flags: {'expected-captures': 2}}).run()).resolves.toMatchObject({state: 'complete'})
    expect(complete).toHaveBeenCalledWith(SET, {expectedCaptures: 2})
  })

  it('renders a refusal as its public code and passes anything else on', async () => {
    const parent = jest.spyOn(AuthenticatedCommand.prototype as any, 'catch').mockResolvedValue(undefined)
    const target = command(UpdateSetComplete, {workingSetAction: 'complete'})
    await target.catch(new WorkingSetError('mixed_scope_capture', {captures: [XML]}))
    expect((parent.mock.calls[0][0] as any).updateSet).toMatchObject({code: 'mixed_scope_capture', detail: {captures: [XML]}})
    await target.catch(new MetadataScopeError('evidence_unavailable'))
    expect((parent.mock.calls[1][0] as any).updateSet).toMatchObject({code: 'evidence_unavailable', message: 'Update set complete refused: evidence_unavailable.'})
    const other = new Error('Missing required flag expected-captures')
    await target.catch(other)
    expect(parent.mock.calls[2][0]).toBe(other)
  })
})

describe('working set output after a failed switch', () => {
  it('prints the restore pair from the error detail', async () => {
    const {projectWorkingSetError, WorkingSetDisplayService} = await import('../../../src/services/working-set-display.service.js')
    const failure = projectWorkingSetError(new WorkingSetError('working_set_not_applied', {previous: {application: 'global', updateSet: OTHER}}), 'use')
    expect(new WorkingSetDisplayService().failure(failure).join('\n')).toContain(`nex update-set restore --application global --update-set ${OTHER}`)
  })

  it('never prints a non-identifier preference value as a command', async () => {
    const {WorkingSetDisplayService} = await import('../../../src/services/working-set-display.service.js')
    const lines = new WorkingSetDisplayService().used({previous: {application: 'x; rm -rf ~', updateSet: 'a\nForged line'}, current: {application: APP, updateSet: SET}, updateSet: summary}).join('\n')
    expect(lines).not.toContain('--application x;')
    expect(lines).not.toMatch(/\nForged line/)
  })
})
