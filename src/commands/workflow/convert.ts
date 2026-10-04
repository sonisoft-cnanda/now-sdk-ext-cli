import { Args, Flags } from '@oclif/core'
import { generateFluentFlow, planFlowConversion, renderFlowPlan, WorkflowManager } from '@sonisoft/now-sdk-ext-core'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { AuthenticatedCommand } from '../../common/authenticated-command.js'
import { loadWorkflowExport } from '../../common/workflow-args.js'

export class Convert extends AuthenticatedCommand<typeof Convert> {

  static args = {
    workflow: Args.string({ description: 'Workflow name or sys_id, or a version sys_id (or use --file)', required: false }),
  }
static description = 'Plan the move of a legacy workflow to Flow Designer, and write a Fluent (now-sdk) skeleton for it. Read-only.\n\n' +
    'The plan maps each activity to its Flow Designer equivalent (approvals to Ask For Approval with branches on its ' +
    'state, If/Switch to if/else, tasks, timers, waits, parallel lines), turns scratchpad values into flow variables, ' +
    'and lists what needs a person: scripts to port, loops, steps shared by several paths, catalog variables, ' +
    'subflows, spoke activities. It is printed as text (or --json); --plan saves it as JSON.\n\n' +
    '--fluent writes the skeleton into a now-sdk app (default src/fluent/flows/<name>.now.ts): it builds as generated, ' +
    'with TODO(convert) comments and the legacy scripts where design work remains. Works on the instance or offline on ' +
    'a `nex workflow export` file.'
static examples = [
    {
      command: '<%= config.bin %> <%= command.id %> "Laptop Request" --auth dev',
      description: 'Print the conversion plan',
    },
    {
      command: '<%= config.bin %> <%= command.id %> --file laptop.json --plan laptop.plan.json --fluent ./my-app',
      description: 'From a saved export: save the plan and write the Fluent skeleton into a now-sdk app',
    },
  ]
static flags = {
    'directory': Flags.string({ default: 'src/fluent/flows', description: 'Folder inside the app for the flow file (with --fluent)' }),
    'file': Flags.string({ char: 'f', description: 'Read a `nex workflow export` JSON file instead of the instance' }),
    'fluent': Flags.string({ description: 'Write the Fluent skeleton into this now-sdk app folder' }),
    'force': Flags.boolean({ description: 'Overwrite an existing flow file (with --fluent)' }),
    'plan': Flags.string({ description: 'Save the plan as JSON to this file' }),
    'version': Flags.option({
      default: 'current',
      description: 'current: your draft if you have one, else published',
      options: ['current', 'published', 'draft'] as const,
    })(),
  }

  protected needsInstance(): boolean {
    return !this.flags.file && Boolean(this.args.workflow)
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Convert)
    try {
      const data = await loadWorkflowExport(() => new WorkflowManager(this.instance), args.workflow, flags.file, flags.version)
      const plan = planFlowConversion(data)
      const files = generateFluentFlow(plan, { directory: flags.directory })
      const notes: string[] = []

      if (flags.fluent) {
        const targets = files.map(f => ({ ...f, target: resolve(join(flags.fluent as string, f.path)) }))
        const existing = targets.filter(t => existsSync(t.target))
        if (existing.length > 0 && !flags.force) {
          throw new Error(`${existing.map(t => t.target).join(', ')} already exists. Pass --force to overwrite it.`)
        }

        for (const t of targets) {
          mkdirSync(dirname(t.target), { recursive: true })
          writeFileSync(t.target, t.content, 'utf8')
          notes.push(`Wrote ${t.target} (${t.content.split('\n').length} lines). Build it with \`now-sdk build\` in the app.`)
        }
      }

      if (flags.plan) {
        if (flags.file && resolve(flags.plan) === resolve(flags.file)) throw new Error('--plan would overwrite the export given with --file.')
        writeFileSync(flags.plan, JSON.stringify(plan, null, 2) + '\n', 'utf8')
        notes.push(`Saved the plan to ${flags.plan}.`)
      }

      if (flags.json) {
        console.log(JSON.stringify({ files, plan }, null, 2))
        return
      }

      this.log(renderFlowPlan(plan))
      if (notes.length > 0) this.log(['', ...notes].join('\n'))
    } catch (error) {
      this._logger.error('Error occurred when converting workflow.', error as Error)
      this.error(error as Error)
    }
  }
}
