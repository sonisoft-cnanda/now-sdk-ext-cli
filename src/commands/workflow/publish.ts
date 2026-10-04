 
import { Flags } from '@oclif/core'
import { WorkflowManager } from '@sonisoft/now-sdk-ext-core'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { resolveDraftVersion } from '../../common/workflow-args.js'
import { WorkflowDisplayService } from '../../services/workflow-display.service.js'

export class Publish extends AuthenticatedCommand<typeof Publish> {

  static args = {
  }
static description = 'Publish a workflow version.\n\n' +
    'Publishes your checked-out draft the way the Workflow Editor does: it is validated first, and warnings stop ' +
    'the publish unless --allow-warnings is given. Critical findings always stop it. The instance records the ' +
    'workflow in your current update set.\n\n' +
    'With --start-activity, the version\'s start activity is set and it is published without validation ' +
    '(the original behaviour of this command).'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> --workflow "Laptop Request" --auth dev',
      description: 'Validate and publish your draft',
    },
    {
      command: '<%= config.bin %> <%= command.id %> -w "Laptop Request" --allow-warnings --auth dev',
      description: 'Publish even if validation reports warnings',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --version-id wfv-001 --start-activity act-001 --auth dev',
      description: 'Set the start activity and publish a version without validation',
    },
  ]
static flags = {
    'allow-warnings': Flags.boolean({ default: false, description: 'Publish even when validation reports warnings' }),
    'start-activity': Flags.string({
      char: 's',
      dependsOn: ['version-id'],
      description: 'Sys ID of the start activity (sets it and publishes without validation)',
      required: false,
    }),
    'version-id': Flags.string({
      char: 'v',
      description: 'Sys ID of the workflow version to publish',
      required: false,
    }),
    'workflow': Flags.string({
      char: 'w',
      description: 'Workflow name or sys_id; publishes your checked-out draft',
      exclusive: ['version-id'],
      required: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Publish)
    const json = flags.json ?? false
    const displayService = new WorkflowDisplayService()

    try {
      const workflowMgr = new WorkflowManager(this.instance)

      if (flags['start-activity']) {
        const versionId = flags['version-id'] as string
        if (!json) this.log(`Publishing workflow version ${versionId}...`)
        await workflowMgr.publishWorkflow({
          startActivitySysId: flags['start-activity'],
          versionSysId: versionId,
        })
        for (const line of displayService.formatPublishResult(json)) {
          json ? console.log(line) : this.log(line)
        }

        return
      }

      const versionId = await resolveDraftVersion(workflowMgr, flags.workflow, flags['version-id'])
      if (!json) this.log(`Publishing workflow version ${versionId}...`)
      const result = await workflowMgr.publish(versionId, { allowWarnings: flags['allow-warnings'] })
      for (const line of displayService.formatPublish(result, json)) {
        json ? console.log(line) : this.log(line)
      }
    } catch (error) {
      this._logger.error("Error occurred when publishing workflow.", error as Error)
      this.error(error as Error)
    }
  }
}
