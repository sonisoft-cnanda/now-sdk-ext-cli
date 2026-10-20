import {Flags} from '@oclif/core'
import {type MoveCaptureResult, WorkingSetManager} from '@sonisoft/now-sdk-ext-core'

import {WorkingSetCommand} from '../../common/working-set-command.js'
import {WorkingSetDisplayService} from '../../services/working-set-display.service.js'

export default class UpdateSetMoveCapture extends WorkingSetCommand<typeof UpdateSetMoveCapture> {
  static description = `Move one capture (sys_update_xml) between two In progress sets of its own application, and read it back.

Refused before the move when the target belongs to another application, is a Default, already holds a capture
of the same record, or a newer capture of the record exists elsewhere. The reason is appended to the capture's comments.`
  static examples = ['<%= config.bin %> <%= command.id %> --capture 0123456789abcdef0123456789abcdef --source 0123456789abcdef0123456789abcdee --target 0123456789abcdef0123456789abcded --reason "STORY-123 belongs in the story set" --auth dev']
  static flags = {
    capture: Flags.string({description: 'sys_update_xml sys_id.', required: true}),
    reason: Flags.string({description: 'Why the capture moves (letters, digits and simple punctuation).', required: true}),
    source: Flags.string({description: 'The set the capture is in now.', required: true}),
    target: Flags.string({description: 'The In progress, non-Default set of the same application to move it to.', required: true}),
  }
  protected workingSetAction = 'move-capture'

  public async run(): Promise<MoveCaptureResult> {
    const {capture, reason, source, target} = this.flags
    const display = new WorkingSetDisplayService()
    const result = await new WorkingSetManager(this.instance).moveCapture({capture, reason, sourceSet: source, targetSet: target})
    const safe = {...result, from: display.summary(result.from), name: result.name.replaceAll(/\p{Cc}/gu, ' '), to: display.summary(result.to)}
    if (!this.jsonEnabled()) for (const line of display.moved(safe)) this.log(line)
    return safe
  }
}
