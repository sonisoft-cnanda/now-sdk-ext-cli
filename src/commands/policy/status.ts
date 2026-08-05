import {Command, Flags} from '@oclif/core'
import {checkRequirement, currentLayers, DENY_ENV, type Verb} from '@sonisoft/now-sdk-ext-core'

import {installCliPolicy, type PolicyFlags} from '../../common/policy.js'

/**
 * Reports what this invocation is permitted to do, and which layer decided.
 *
 * Exists because precedence bugs are otherwise invisible: a user sees "refused" with no
 * way to tell whether the environment denied it, a flag denied it, or nothing granted
 * it — and the fix is completely different in each case.
 *
 * Extends plain `Command`, not `AuthenticatedCommand`: answering "what may I do" must
 * not require working credentials. Someone diagnosing a refusal should not have to get
 * past auth first.
 */
export default class PolicyStatus extends Command {
  static description =
    'Show what this invocation is permitted to change on the instance, and why.\n\n' +
    'Changes are permitted by default. NEX_POLICY_DENY, set in the environment, ' +
    'outranks every command-line flag — that is the only layer an agent driving this ' +
    'CLI cannot reach.'
static enableJsonFlag = true
static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --read-only',
    'NEX_POLICY_DENY=all <%= config.bin %> <%= command.id %>',
  ]
static flags = {
    'deny-execute': Flags.boolean({description: 'Evaluate as if --deny-execute were passed.'}),
    'deny-write': Flags.boolean({description: 'Evaluate as if --deny-write were passed.'}),
    'read-only': Flags.boolean({description: 'Evaluate as if --read-only were passed.'}),
  }

  public async run(): Promise<{permitted: Record<string, unknown>; source: string}> {
    const {flags} = await this.parse(PolicyStatus)

    const warnings: string[] = []
    installCliPolicy(flags as PolicyFlags, (m) => warnings.push(m))

    const verbs: Verb[] = ['write', 'execute']
    const permitted: Record<string, unknown> = {}
    for (const verb of verbs) {
      const decision = checkRequirement({target: 'instance', verbs: [verb]})
      permitted[verb] = {allowed: decision.allowed, decidedBy: decision.decidingLayer}
    }

    const envSet = Boolean(process.env[DENY_ENV])
    const result = {permitted, source: envSet ? `${DENY_ENV} is set` : 'no environment lockdown'}

    if (!this.jsonEnabled()) {
      this.log('Instance changes')
      for (const verb of verbs) {
        const entry = permitted[verb] as {allowed: boolean; decidedBy: string}
        const mark = entry.allowed ? 'permitted' : 'REFUSED  '
        this.log(`  ${verb.padEnd(8)} ${mark}  (${entry.decidedBy})`)
      }

      this.log('')
      this.log('Reads are never gated.')
      this.log(
        envSet
          ? `${DENY_ENV} is set in the environment and outranks every flag.`
          : `${DENY_ENV} is not set. Set it in your shell profile or container ` +
            `environment to deny changes in a way a command-line flag cannot undo.`,
      )

      // Ordered, because the order IS the behaviour.
      this.log('')
      this.log('Layers, highest priority first:')
      for (const layer of currentLayers()) this.log(`  ${layer.name}`)

      for (const warning of warnings) this.warn(warning)
    }

    return result
  }
}
