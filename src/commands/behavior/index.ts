import { Flags } from '@oclif/core'
import { BEHAVIOR_CATEGORIES, TableBehaviorDiscovery } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { behaviorFlags, behaviorOptions } from '../../common/behavior-flags.js'
import { BehaviorDisplayService } from '../../services/behavior-display.service.js'

/** Discover configuration that can affect a table, including optional detail immediately. */
export class Behavior extends AuthenticatedCommand<typeof Behavior> {
  static description = 'Discover table behavior: rules, UI actions/scripts, UI/data policies, workflows, flows and state models. Active and applicable inherited behavior is included by default. Conditions describe configuration, not a prediction of execution. Select categories and details to control output size.'
  static examples = [
    '<%= config.bin %> <%= command.id %> --table incident --auth dev --json',
    '<%= config.bin %> <%= command.id %> --table change_request --category business_rules --details scripts --auth dev --json',
  ]
  static flags = {
    ...behaviorFlags,
    category: Flags.option({ description: 'Category to inspect; repeat to select several, default all', multiple: true, options: BEHAVIOR_CATEGORIES })(),
    cursor: Flags.string({ description: 'Continuation token; requires exactly one --category and the same filters' }),
    'include-inactive': Flags.boolean({ default: false, description: 'Include inactive/published and draft candidates when discoverable' }),
    'include-inherited': Flags.boolean({ allowNo: true, default: true, description: 'Include applicable ancestor behavior' }),
    limit: Flags.integer({ default: 50, description: 'Maximum items per category', max: 200, min: 1 }),
    name: Flags.string({ description: 'Metadata name contains this text' }),
    'sys-id': Flags.string({ description: 'Metadata source sys_id to include; repeat for multiple records', multiple: true }),
    table: Flags.string({ char: 't', description: 'Target table name', required: true }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Behavior)
    if (flags.cursor && flags.category?.length !== 1) this.error('--cursor requires exactly one --category')
    const result = await new TableBehaviorDiscovery(this.instance).discoverTableBehavior(flags.table, {
      ...behaviorOptions(flags), categories: flags.category, cursors: flags.cursor && flags.category ? { [flags.category[0]]: flags.cursor } : undefined,
      includeInactive: flags['include-inactive'], includeInherited: flags['include-inherited'], limit: flags.limit, name: flags.name,
      sysIds: flags['sys-id'],
    })
    for (const line of new BehaviorDisplayService().format(result, flags.json)) {
      if (flags.json) process.stdout.write(`${line}\n`)
      else this.log(line)
    }
  }
}
