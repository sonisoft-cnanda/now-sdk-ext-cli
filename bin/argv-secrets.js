/**
 * Refuse to run when a secret was passed as a command-line argument.
 *
 * Anything in argv is already exposed by the time this runs: the shell has
 * written it to history, and it is visible to every process on the host via
 * `ps auxww` for as long as this one lives. Neither can be undone from here.
 *
 * So this is not really prevention — it is detection plus an honest message. The
 * user needs to know the value leaked and should be rotated, which is strictly
 * more useful than oclif's "Nonexistent flag: --password". Refusing to run also
 * makes the habit fail fast rather than working quietly until someone greps a
 * shell history.
 *
 * None of these flags exist on any `nex` command today, so nothing legitimate is
 * blocked. The check is deliberately conservative about that: it matches on flag
 * NAME only, never on the shape of a value, because `nex exec` takes arbitrary
 * scripts and `--query`, `--filter`, `--data`, `--payload` and `--spec` all take
 * arbitrary text that can look like anything.
 *
 * Kept as plain JS in bin/ for the same reason as credstore-boot.js: it runs
 * before oclif and before any build output is required.
 */

/**
 * Long flags whose value would be a credential.
 *
 * Short flags are deliberately excluded — `-p` and `-t` are too easily something
 * else, and a false positive here blocks legitimate work.
 */
const SECRET_FLAGS = new Set([
    '--password',
    '--passwd',
    '--pass',
    '--secret',
    '--client-secret',
    '--clientsecret',
    '--token',
    '--access-token',
    '--refresh-token',
    '--id-token',
    '--auth-token',
    '--user-token',
    '--session-token',
    '--api-key',
    '--apikey',
    '--credential',
    '--credentials',
])

/**
 * Returns details of the first secret-bearing argument, or null.
 *
 * Only reports when a value is actually present. `--password` with nothing after
 * it, or followed by another flag, carries no secret — oclif will reject it as a
 * missing value, which is not this file's problem.
 *
 * @param {string[]} argv
 * @returns {{flag: string, form: 'inline' | 'separate'} | null}
 */
export function findSecretArgument(argv) {
    if (!Array.isArray(argv)) return null

    for (const [index, arg] of argv.entries()) {
        if (typeof arg !== 'string' || !arg.startsWith('--')) continue

        const equals = arg.indexOf('=')
        const name = (equals === -1 ? arg : arg.slice(0, equals)).toLowerCase()
        if (!SECRET_FLAGS.has(name)) continue

        if (equals !== -1) {
            // `--password=` with nothing after it carries no value.
            if (arg.length > equals + 1) return {flag: name, form: 'inline'}
            continue
        }

        const next = argv[index + 1]
        if (next !== undefined && !next.startsWith('-')) return {flag: name, form: 'separate'}
    }

    return null
}

/**
 * Human-facing message for a detected secret argument.
 *
 * Leads with the exposure rather than the refusal, because the exposure is the
 * part the user has to act on and cannot undo.
 *
 * @param {{flag: string}} found
 * @returns {string}
 */
export function secretArgumentMessage(found) {
    return (
        `nex: refusing to run — a secret was passed on the command line (${found.flag}).\n` +
        `\nThat value is already in your shell history and was visible in the process\n` +
        `list while this command started. Treat it as compromised and rotate it.\n` +
        `\nRemediation: store credentials once instead of passing them per command.\n` +
        `  now-sdk auth --add <instance>     # add a credential\n` +
        `  nex auth list                     # see what is stored\n` +
        `  nex --auth <alias> ...            # select one per command\n` +
        `\nFor non-interactive use, set the value in the environment rather than argv.\n`
    )
}
