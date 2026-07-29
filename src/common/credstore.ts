/**
 * Lazy access to @sonisoft/sn-credstore for the `nex auth` commands.
 *
 * The import is dynamic for the same reason as bin/credstore-boot.js: the
 * package is not published yet, and a static import of a missing package is an
 * unrecoverable module-resolution error that would break oclif's command
 * discovery — every command, not just `auth`.
 *
 * When it is published and added to dependencies, this collapses to a plain
 * static import.
 */
type CredStoreModule = typeof import('@sonisoft/sn-credstore')

let cached: CredStoreModule | undefined

export class CredStoreUnavailableError extends Error {
  readonly remediation =
    'Install it with: npm install @sonisoft/sn-credstore\n' +
    'For local development from a sibling checkout: npm link @sonisoft/sn-credstore'

  constructor(cause: unknown) {
    super('@sonisoft/sn-credstore is not installed, so credential storage is unavailable.')
    this.name = 'CredStoreUnavailableError'
    this.cause = cause
  }
}

export async function credstore(): Promise<CredStoreModule> {
  if (cached) return cached
  try {
    // Genuinely extraneous for now, and deliberately so: sn-credstore is not
    // published yet, so it cannot be a declared dependency. The whole point of
    // this module is to tolerate its absence. Remove this once it ships.
    // eslint-disable-next-line n/no-extraneous-import
    cached = await import('@sonisoft/sn-credstore')
    return cached
  } catch (error) {
    throw new CredStoreUnavailableError(error)
  }
}
