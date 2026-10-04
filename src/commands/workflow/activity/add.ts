 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../../common/authenticated-command.js'
import { parseInput, parseVariables, resolveActivity, resolveDraftVersion } from '../../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../../services/workflow-display.service.js'

export class ActivityAdd extends AuthenticatedCommand<typeof ActivityAdd> {

  static args = {
  }
static description = 'Add an activity to your checked-out draft of a legacy workflow.\n\n' +
    'The activity is created through the Workflow Editor\'s activity form, so its variables are saved and its ' +
    'default exits are created exactly as in the UI. Use "workflow definitions <type>" to see the variables a type accepts.\n\n' +
    'Wiring:\n' +
    '  --insert-after / --insert-on  drop the activity onto an existing line, as the editor does\n' +
    '  --from / --to                 add transitions into and out of the new activity'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --type Timer --name "Wait 1 day" --insert-after Begin --var duration=86400 --auth dev',
      description: 'Insert a one-day timer right after Begin',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --type "Approval - User" --name "Manager approval" --from "Wait 1 day" --to End --exit Approved --vars-file approval.json --auth dev',
      description: 'Add an approval wired from the timer, Approved → End',
    },
  ]
static flags = {
    'after-exit': Flags.string({ description: 'With --insert-after: which exit\'s line to insert on, when the activity has several' }),
    'exit': Flags.string({ description: 'The new activity\'s exit used for --to / the inserted line (defaults to its first exit)' }),
    'from': Flags.string({ description: 'Activity (name or sys_id) to add a transition from' }),
    'from-exit': Flags.string({ description: 'Exit of --from to leave by (required when it has several)' }),
    'input': Flags.string({ description: 'Activity Designer input mapping as a JSON object' }),
    'insert-after': Flags.string({ description: 'Insert onto the line leaving this activity (name or sys_id)', exclusive: ['insert-on'] }),
    'insert-on': Flags.string({ description: 'Insert onto this transition (sys_id)' }),
    'name': Flags.string({ char: 'n', description: 'Name of the new activity', required: true }),
    'stage': Flags.string({ description: 'Stage name, value or sys_id' }),
    'to': Flags.string({ description: 'Activity (name or sys_id) to add a transition to' }),
    'type': Flags.string({ char: 't', description: 'Activity type name or sys_id (e.g. Timer, "Run Script", "Approval - User")', required: true }),
    'var': Flags.string({ description: 'Variable value as element=value (repeatable)', multiple: true }),
    'vars-file': Flags.string({ description: 'JSON file with variable values keyed by element' }),
    'version': Flags.string({ char: 'v', description: 'Draft version sys_id' }),
    'workflow': Flags.string({ char: 'w', description: 'Workflow name or sys_id (uses your checked-out draft)' }),
    'x': Flags.integer({ description: 'Canvas x position' }),
    'y': Flags.integer({ description: 'Canvas y position' }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(ActivityAdd)
    const json = flags.json ?? false
    try {
      const wm = new WorkflowManager(this.instance)
      const version = await resolveDraftVersion(wm, flags.workflow, flags.version)
      const activity = async (ref?: string): Promise<string | undefined> => {
        if (ref) return resolveActivity(wm, version, ref)
      }

      let insertOn = flags['insert-on']
      if (flags['insert-after']) insertOn = await this.lineLeaving(wm, version, flags['insert-after'], flags['after-exit'])

      const from = await activity(flags.from)
      const result = await wm.addActivity(version, {
        connectFrom: from ? { activity: from, condition: flags['from-exit'] } : undefined,
        connectTo: await activity(flags.to),
        definition: flags.type,
        exitCondition: flags.exit,
        input: parseInput(flags.input),
        insertOn,
        name: flags.name,
        stage: flags.stage,
        variables: parseVariables(flags.var, flags['vars-file']) as Parameters<WorkflowManager['addActivity']>[1]['variables'],
        x: flags.x,
        y: flags.y,
      })
      const lines = new WorkflowDisplayService().formatChange(`Activity '${result.name}' added.`, {
        activity: result.activitySysId,
        exits: result.conditions.map(c => c.name),
        transitions: result.transitionSysIds.length > 0 ? result.transitionSysIds : undefined,
      }, json)
      for (const line of lines) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when adding activity.', error as Error)
      this.error(error as Error)
    }
  }

  private async lineLeaving(wm: WorkflowManager, version: string, ref: string, exit?: string): Promise<string> {
    const source = await resolveActivity(wm, version, ref)
    const definition = await wm.getWorkflowDefinition(version, { includeStatus: false, includeVariables: false })
    const conditions = definition.activities.find(a => a.sysId === source)?.conditions ?? []
    const lines = definition.transitions.filter(t => t.from === source
      && (!exit || conditions.find(c => c.sysId === t.condition)?.name.toLowerCase() === exit.toLowerCase()))
    if (lines.length === 1) return lines[0].sysId
    if (lines.length === 0) throw new Error(`No line leaves '${ref}'${exit ? ` by exit '${exit}'` : ''}.`)
    throw new Error(`${lines.length} lines leave '${ref}'; choose one with --after-exit or use --insert-on <transition sys_id>.`)
  }
}
