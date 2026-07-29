/* eslint-disable n/no-process-exit, unicorn/no-process-exit -- this runs before
   oclif exists, so there is no error handler to throw into; an uncaught rejection
   here would print a stack trace instead of the remediation. */
/* eslint-disable n/no-extraneous-import -- sn-credstore is not published yet, so
   it cannot be a declared dependency; tolerating its absence is this file's job. */

/**
 * Opt in to headless-safe credential storage.
 *
 * By default `nex` uses the ServiceNow SDK exactly as it ships: credentials come
 * from the OS keyring, `now-sdk auth --add` still manages them, and this file
 * does nothing. That default is deliberate — `nex` must behave identically for
 * someone who has never heard of sn-credstore.
 *
 * Pass `--cred-store` (or set SN_CRED_STORE_ENABLE=1) to redirect the SDK's
 * credential storage to @sonisoft/sn-credstore instead. That matters when the
 * keyring cannot be unlocked: over SSH, from a systemd unit, in CI, or from an
 * agent. In those sessions `KeyChain.getPassword()` swallows the failure and
 * returns null, so the SDK reports "Default Credential has not been set" — which
 * is indistinguishable from genuinely having no credentials.
 *
 * Imported for its side effect by bin/run.js and bin/dev.js, before oclif.
 *
 * argv is read directly rather than through oclif's parser because the shim has
 * to be installed before AuthenticatedCommand.init() resolves credentials, and
 * that runs before any flag this file cares about has been parsed. The flag is
 * still declared in AuthenticatedCommand.baseFlags so it appears in --help and
 * is not rejected as unknown.
 *
 * The import is dynamic because sn-credstore is not published yet, and a static
 * import of a missing package is an unrecoverable module-resolution error — it
 * would break `nex` outright for anyone who has not linked it. Once published and
 * added to dependencies this collapses to a plain conditional import.
 */

/** Absence is normal. A shim that loads and then fails is not. */
function isNotInstalled(err) {
    return (
        err?.code === 'ERR_MODULE_NOT_FOUND' &&
        // Only OUR specifier missing means "not installed". The same code from a
        // broken import *inside* sn-credstore means it is installed and broken,
        // which must not be mistaken for absence.
        /@sonisoft[/\\]sn-credstore/.test(String(err.message))
    )
}

/**
 * True when the user asked for the credential store.
 *
 * SN_CRED_STORE_DISABLE wins over everything, so there is always one variable
 * that switches the shim off no matter what else is set — including in a shell
 * where SN_CRED_STORE_ENABLE is exported globally.
 */
function credStoreRequested() {
    if (process.env.SN_CRED_STORE_DISABLE) return false
    if (process.env.SN_CRED_STORE_ENABLE) return true
    return process.argv.includes('--cred-store')
}

if (credStoreRequested()) {
    try {
        await import('@sonisoft/sn-credstore/register')
    } catch (error) {
        if (isNotInstalled(error)) {
            // Asked for explicitly and not available. Falling back to the keyring
            // would be the one thing the user just said not to do, and on a
            // headless host it fails later and far less clearly.
            process.stderr.write(
                `nex: --cred-store was requested but @sonisoft/sn-credstore is not installed.\n` +
                    `\nRemediation: npm install -g @sonisoft/sn-credstore\n`,
            )
            process.exit(1)
        }

        // Installed but unable to patch. Continuing would silently fall back to
        // the keyring, and the SDK's next write reseeds from a failed read —
        // wiping every other alias. Refusing to start is the safe outcome.
        process.stderr.write(
            `nex: the credential store failed to initialise: ${error?.message ?? error}\n` +
                `${error?.remediation ? `\nRemediation: ${error.remediation}\n` : ''}` +
                `\nTo run against the OS keyring instead, drop --cred-store.\n`,
        )
        process.exit(1)
    }
} else if (process.env.SN_CRED_STORE_DEBUG) {
    process.stderr.write('nex: credential store not requested — using the SDK keyring\n')
}
