/* eslint-disable perfectionist/sort-objects */

import { Flags } from '@oclif/core'
import { FlowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { FlowDisplayService } from '../../services/flow-display.service.js'

export class FlowCopy extends AuthenticatedCommand<typeof FlowCopy> {

  static args = {}
  static description = 'Copy an existing flow into a target scoped application.\n\n' +
    'This is the ServiceNow best practice before modifying any flow — OOB and shared ' +
    'flows must never be modified directly; always copy first. The copied flow lands ' +
    'in draft/unpublished state in the target scope.\n\n' +
    'Enables the full CLI-driven flow development lifecycle:\n' +
    '  copy → pull (now-sdk transform) → modify → push → test → publish\n\n' +
    'Features:\n' +
    '  \u2022 Copy flows by sys_id or scoped name\n' +
    '  \u2022 Specify a display name for the new copy\n' +
    '  \u2022 Target any scoped application by sys_id\n' +
    '  \u2022 Returns the new flow sys_id for use in subsequent commands';
  static examples = [
    {
      description: 'Copy an OOB flow into your app scope',
      command: '<%= config.bin %> <%= command.id %> --source-flow-id e89e3ade731310108ef62d2b04f6a744 --name "Copy of Change - Standard" --target-scope 4a5a6115402946939ee48e3fe80f60f8 --auth dev',
    },
    {
      description: 'Copy by scoped name',
      command: '<%= config.bin %> <%= command.id %> -s global.change__standard -n "My Custom Change Flow" -t 4a5a6115402946939ee48e3fe80f60f8 --auth dev',
    },
    {
      description: 'Copy with JSON output for scripting',
      command: '<%= config.bin %> <%= command.id %> -s e89e3ade731310108ef62d2b04f6a744 -n "Copy" -t 4a5a6115402946939ee48e3fe80f60f8 --json --auth dev',
    },
  ]
  static flags = {
    'source-flow-id': Flags.string({
      char: 's',
      description: 'Source flow sys_id or scoped name (e.g. global.change__standard)',
      required: true,
    }),
    'name': Flags.string({
      char: 'n',
      description: 'Display name for the new copied flow',
      required: true,
    }),
    'target-scope': Flags.string({
      char: 't',
      description: 'Scope sys_id of the target application (use `nex scope` to find scope sys_ids)',
      required: true,
    }),
    'json': Flags.boolean({
      char: 'j',
      description: 'Output results as JSON',
      required: false,
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(FlowCopy);
    const displayService = new FlowDisplayService();

    try {
      // No scope in constructor — copyFlow uses ProcessFlow REST API directly
      const flowManager = new FlowManager(this.instance);

      this.log(`Copying flow: ${flags['source-flow-id']} → "${flags.name}" in scope ${flags['target-scope']}`);

      const result = await flowManager.copyFlow({
        sourceFlowId: flags['source-flow-id'],
        name: flags.name,
        targetScope: flags['target-scope'],
      });

      const lines = displayService.formatCopyResult(result, flags.json);
      for (const line of lines) {
        flags.json ? console.log(line) : this.log(line);
      }

    } catch (error) {
      this._logger.error("Error copying flow.", error as Error);
      this.error(error as Error);
    }
  }
}
