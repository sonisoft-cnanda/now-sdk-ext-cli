 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../../common/authenticated-command.js'
import { resolveActivity, resolveDraftVersion } from '../../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../../services/workflow-display.service.js'

export class TransitionRemove extends AuthenticatedCommand<typeof TransitionRemove> {

  static args = {
  }
static description = 'Remove a transition from your checked-out draft of a legacy workflow, by sys_id or by its ends.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --from "Manager approval" --to End --auth dev',
      description: 'Remove the transition between two activities',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --transition <transition_sys_id> --auth dev',
      description: 'Remove a transition by sys_id',
    },
  ]
static flags = {
    'exit': Flags.string({ description: 'With --from/--to: the exit, when several lines join the two activities' }),
    'from': Flags.string({ description: 'Source activity (name or sys_id)', exclusive: ['transition'] }),
    'to': Flags.string({ description: 'Target activity (name or sys_id)', exclusive: ['transition'] }),
    'transition': Flags.string({ description: 'Transition sys_id' }),
    'version': Flags.string({ char: 'v', description: 'Draft version sys_id' }),
    'workflow': Flags.string({ char: 'w', description: 'Workflow name or sys_id (uses your checked-out draft)' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(TransitionRemove)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const transition = flags.transition ?? await this.findTransition(wm, flags)
      await wm.removeTransition(transition)
      for (const line of new WorkflowDisplayService().formatChange('Transition removed.', { transition }, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when removing transition.', error as Error)
      this.error(error as Error)
    }
  }

  private async findTransition(
    wm: WorkflowManager,
    flags: { exit?: string; from?: string; to?: string; version?: string; workflow?: string },
  ): Promise<string> {
    if (!flags.from || !flags.to) throw new Error('Specify --transition, or both --from and --to.')
    const version = await resolveDraftVersion(wm, flags.workflow, flags.version)
    const from = await resolveActivity(wm, version, flags.from)
    const to = await resolveActivity(wm, version, flags.to)
    const definition = await wm.getWorkflowDefinition(version, { includeStatus: false, includeVariables: false })
    const exits = definition.activities.find(a => a.sysId === from)?.conditions ?? []
    const exitName = flags.exit?.toLowerCase()
    const matches = definition.transitions.filter(t => t.from === from && t.to === to
      && (!exitName || exits.find(c => c.sysId === t.condition)?.name.toLowerCase() === exitName))
    if (matches.length === 1) return matches[0].sysId
    throw new Error(matches.length === 0
      ? `No transition from '${flags.from}' to '${flags.to}'${flags.exit ? ` by exit '${flags.exit}'` : ''}.`
      : `${matches.length} transitions join '${flags.from}' and '${flags.to}'; choose one with --exit.`)
  }
}
