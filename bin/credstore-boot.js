/* eslint-disable n/no-process-exit, unicorn/no-process-exit -- this runs before
   oclif exists, so there is no error handler to throw into; an uncaught rejection
   here would print a stack trace instead of the remediation. */
/* eslint-disable n/no-extraneous-import -- sn-credstore is not published yet, so
   it cannot be a declared dependency; tolerating its absence is this file's job. */

/**
 * Redirect ServiceNow SDK credential storage off the OS keyring.
 *
 * Non-interactive sessions cannot unlock the keyring — even running as the same
 * user — and `KeyChain.getPassword()` swallows the failure and returns null, so
 * the SDK reports "Default Credential has not been set" rather than a keyring
 * error. @sonisoft/sn-credstore patches KeyChain.prototype to read from a
 * headless-safe store instead.
 *
 * Imported for its side effect by bin/run.js and bin/dev.js, before oclif.
 *
 * The import is dynamic because sn-credstore is not published yet, and a static
 * import of a missing package is an unrecoverable module-resolution error — it
 * would break `nex` outright for anyone who has not linked it. Once published
 * and added to dependencies this whole file collapses to:
 *
 *     import '@sonisoft/sn-credstore/register'
 */

/** Absence is normal today. A shim that loads and then fails is not. */
function isNotInstalled(err) {
    return (
        err?.code === 'ERR_MODULE_NOT_FOUND' &&
        // Only OUR specifier missing means "not installed". The same code from a
        // broken import *inside* sn-credstore means it is installed and broken,
        // which must not be mistaken for absence.
        /@sonisoft[/\\]sn-credstore/.test(String(err.message))
    )
}

try {
    await import('@sonisoft/sn-credstore/register')
} catch (error) {
    if (!isNotInstalled(error)) {
        // Installed but unable to patch. Continuing would silently fall back to
        // the keyring, and the SDK's next write reseeds from a failed read —
        // wiping every other alias. Refusing to start is the safe outcome.
        process.stderr.write(
            `nex: the credential shim failed to install: ${error?.message ?? error}\n` +
                `${error?.remediation ? `\nRemediation: ${error.remediation}\n` : ''}` +
                `\nTo start anyway using the OS keyring, set SN_CRED_STORE_DISABLE=1.\n`,
        )
        process.exit(1)
    }

    if (process.env.SN_CRED_STORE_REQUIRE) {
        // Headless harnesses set this: on those hosts the keyring path does not
        // work, so falling through to it just fails later and less clearly.
        process.stderr.write(
            `nex: SN_CRED_STORE_REQUIRE is set but @sonisoft/sn-credstore is not installed.\n` +
                `\nRemediation: npm install @sonisoft/sn-credstore (or npm link it for local development).\n`,
        )
        process.exit(1)
    }

    if (process.env.SN_CRED_STORE_DEBUG) {
        process.stderr.write('nex: @sonisoft/sn-credstore not installed — using the SDK keyring\n')
    }
}
