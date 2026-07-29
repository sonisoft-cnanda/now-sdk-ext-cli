import {Flags} from '@oclif/core'

/**
 * `--cred-store`, accepted and ignored.
 *
 * The `auth` commands always operate on the sn-credstore store — that is what
 * they are for — so the flag is redundant on them. But it is a global flag on
 * every authenticated command, and people reasonably type it here too. Rejecting
 * it with "Nonexistent flag: --cred-store" reads like the feature is missing
 * rather than already implied.
 *
 * Declared, not acted on. The one place it has an effect is
 * bin/credstore-boot.js, which reads process.argv directly because the shim must
 * be installed before oclif parses anything.
 */
export const credStoreFlag = {
  'cred-store': Flags.boolean({
    description:
      'Accepted for symmetry with other commands and ignored — the auth commands always ' +
      'use @sonisoft/sn-credstore.',
    helpGroup: 'GLOBAL',
    required: false,
  }),
}
