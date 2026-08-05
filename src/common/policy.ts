import {
  
  allowFromEnvironment,
  DENY_ENV,
  denyFromEnvironment,
  denyLayer,
  grantLayer,
  installPolicy,
  type PolicyLayer,
  setRemediationWriter,
  Verb,
} from '@sonisoft/now-sdk-ext-core'

/**
 * Builds and installs the permission ladder for one `nex` invocation.
 *
 * Changes are PERMITTED by default. This is not the strongest posture available — an
 * agent that decides to run `nex bulk delete` still just does it — but it is the one
 * that does not break every existing script and CI job, and the machinery is arranged
 * so flipping is a one-line change (see DEFAULT_ALLOW below).
 *
 * What it does buy today: `NEX_POLICY_DENY`, set somewhere the agent cannot write,
 * outranks every flag. That is the difference between "the agent probably will not
 * write to prod" and "the agent cannot".
 */

export interface PolicyFlags {
  'deny-execute'?: boolean
  'deny-write'?: boolean
  'read-only'?: boolean
}

/** The verbs a set of flags takes away. */
export function deniedByFlags(flags: PolicyFlags): Verb[] {
  const denied = new Set<Verb>()
  if (flags['read-only']) {
    denied.add('write')
    denied.add('execute')
  }

  if (flags['deny-write']) denied.add('write')
  if (flags['deny-execute']) denied.add('execute')
  return [...denied]
}

/**
 * Assembles the ladder, highest priority first.
 *
 * Order is the whole design. `NEX_POLICY_DENY` sits above the flags so a flag cannot
 * grant past it; the permissive default sits at the bottom so anything above it can
 * take permission away.
 */
export function buildLayers(flags: PolicyFlags, warn: (message: string) => void): PolicyLayer[] {
  const layers: PolicyLayer[] = []

  // 0. Operator lockdown. The only rung an agent cannot reach — and only when set
  //    somewhere it cannot write. A project-local .mcp.json or a committed .env is
  //    still editable by anything with file access; a shell profile is not.
  const envDeny = denyFromEnvironment(process.env, warn)
  if (envDeny) layers.push(envDeny)

  // 1. Per-invocation denials. Agent-reachable, but they only ever restrict.
  const flagDenied = deniedByFlags(flags)
  if (flagDenied.length > 0) layers.push(denyLayer('command-line flag', flagDenied))

  // 2. Grants from the environment. Inert while the default is permissive; kept in
  //    place so the ladder does not have to be rebuilt when the default flips.
  const envAllow = allowFromEnvironment(process.env, warn)
  if (envAllow) layers.push(envAllow)

  // 3. THE DEFAULT. Delete this one layer to make `nex` deny-by-default; everything
  //    above keeps working unchanged.
  layers.push(grantLayer('default (changes permitted)', ['write', 'execute']))

  return layers
}

/**
 * Explains a refusal in terms of what the user can actually do about it.
 *
 * Names the deciding layer, because "refused" without "by what" is unactionable — and
 * the fix differs completely: unset an environment variable, or drop a flag.
 */
function remediation(verbs: readonly Verb[], missing: Verb, layer: string): string {
  const what = missing === 'execute' ? 'running scripts or flows' : 'changing instance data'

  if (layer.startsWith(DENY_ENV)) {
    return `Refused: ${what} is denied by ${DENY_ENV}. ` +
      `This is set in the environment, not on the command line — unset it there to allow this.`
  }

  if (layer === 'command-line flag') {
    return `Refused: ${what} is denied by a flag on this command. ` +
      `Remove --read-only / --deny-${missing} to allow it.`
  }

  return `Refused: ${what} is not permitted (${layer}).`
}

/** Installs the policy for this process. Call once, from init(), before any request. */
export function installCliPolicy(flags: PolicyFlags, warn: (message: string) => void): void {
  installPolicy(buildLayers(flags, warn))
  setRemediationWriter(remediation)
}



export {ALLOW_ENV, DENY_ENV} from '@sonisoft/now-sdk-ext-core'