/* eslint-disable n/no-process-exit, unicorn/no-process-exit -- this runs before
   oclif exists, so there is no error handler to throw into; an uncaught rejection
   here would print a stack trace instead of the remediation. */

/**
 * Side-effecting half of the argv secret check.
 *
 * Split from bin/argv-secrets.js so the detection logic can be imported and
 * tested without the import itself terminating the test process.
 *
 * Imported for its side effect by bin/run.js and bin/dev.js, before
 * credstore-boot.js — a secret in argv should be refused before anything reads,
 * stores, or logs a credential.
 */

import {findSecretArgument, secretArgumentMessage} from './argv-secrets.js'

// slice(2): skip the node binary and the script path, so a secret-shaped
// filename in the invocation cannot trip the check.
const found = findSecretArgument(process.argv.slice(2))

if (found) {
    process.stderr.write(secretArgumentMessage(found))
    process.exit(2)
}
