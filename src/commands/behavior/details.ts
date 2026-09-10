import { Flags } from '@oclif/core'
import { BehaviorReference, TableBehaviorDiscovery } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { behaviorFlags, behaviorOptions } from '../../common/behavior-flags.js'
import { BehaviorDisplayService } from '../../services/behavior-display.service.js'

/** Retrieve known behavior references in a batch, without table discovery. */
export class BehaviorDetails extends AuthenticatedCommand<typeof BehaviorDetails> {
  static description = 'Retrieve known behavior artifacts without rediscovery. Repeat --reference kind:source_table:sys_id for up to 50 records. Add --details scripts, --details definitions or --details dependencies to include bodies immediately. Source references are returned by behavior discovery; flows also accept flows:sys_hub_flow:<sys_id>.'
  static examples = ['<%= config.bin %> <%= command.id %> --reference business_rules:sys_script:0123456789abcdef0123456789abcdef --details scripts --auth dev --json']
  static flags = {
    ...behaviorFlags,
    reference: Flags.string({ description: 'kind:source_table:sys_id; repeat for a batch', multiple: true, required: true }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(BehaviorDetails)
    const references = flags.reference.map(value => {
      const parts = value.split(':')
      if (parts.length !== 3) this.error('Reference must be kind:source_table:sys_id')
      return { kind: parts[0] as BehaviorReference['kind'], sourceTable: parts[1], sysId: parts[2] }
    })
    const result = await new TableBehaviorDiscovery(this.instance).getBehaviorDetails(references, behaviorOptions(flags))
    for (const line of new BehaviorDisplayService().format(result, flags.json)) {
      if (flags.json) process.stdout.write(`${line}\n`)
      else this.log(line)
    }
  }
}
