 
import { Args, Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { WorkflowDisplayService } from '../../services/workflow-display.service.js'

export class Definitions extends AuthenticatedCommand<typeof Definitions> {

  static args = {
    type: Args.string({ description: 'Activity type name or sys_id to describe (omit to list types)', required: false }),
  }
static description = 'List workflow activity types, or describe one as this instance defines it.\n\n' +
    'Describing a type shows its own description, its exits, and the variables it accepts (types, choices, defaults, hints) ' +
    '— or, for Activity Designer types, its inputs and outputs. Add --script for its implementation (how each variable is ' +
    'used and which results drive the exits) and --usage to see how published workflows on this instance configure it.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --category Approvals --auth dev',
      description: 'List approval activity types',
    },
    {
      command: '<%= config.bin %> <%= command.id %> Timer --auth dev',
      description: 'Describe the Timer activity type and its variables',
    },
    {
      command: '<%= config.bin %> <%= command.id %> "Approval - User" --usage --auth dev',
      description: 'See how this instance\'s published workflows configure user approvals',
    },
    {
      command: '<%= config.bin %> <%= command.id %> If --script --auth dev',
      description: 'Read the If activity\'s implementation',
    },
  ]
static flags = {
    'category': Flags.string({ char: 'c', description: 'Category (e.g. Approvals, Timers, Utilities)' }),
    'core-only': Flags.boolean({ default: false, description: 'Exclude Activity Designer / Orchestration activities' }),
    'name': Flags.string({ char: 'n', description: 'Name contains this text' }),
    'sample': Flags.integer({ default: 100, dependsOn: ['usage'], description: 'With --usage: activities to sample' }),
    'script': Flags.boolean({ default: false, description: 'With a type: include its implementation script' }),
    'usage': Flags.boolean({ default: false, description: 'With a type: show how published workflows on this instance configure it' }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Definitions)
    const json = flags.json ?? false
    const display = new WorkflowDisplayService()
    try {
      const wm = new WorkflowManager(this.instance)
      if ((flags.script || flags.usage) && !args.type) throw new Error('--script and --usage need an activity type.')
      if (flags.script && flags.usage) throw new Error('--script and --usage are separate views; run them one at a time.')
      let lines: string[]
      if (!args.type) {
        lines = display.formatActivityTypes(await wm.listActivityDefinitions({
          category: flags.category, includeDesigner: !flags['core-only'], name: flags.name,
        }), json)
      } else if (flags.usage) {
        lines = display.formatActivityUsage(await wm.getActivityUsage(args.type, { sampleSize: flags.sample }), json)
      } else {
        lines = display.formatActivityType(await wm.getActivityDefinition(args.type, { includeScript: flags.script }), json)
      }

      for (const line of lines) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error('Error occurred when reading activity types.', error as Error)
      this.error(error as Error)
    }
  }
}
