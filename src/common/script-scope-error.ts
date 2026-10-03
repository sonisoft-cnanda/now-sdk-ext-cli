/**
 * Recognising and explaining core's ScriptScopeError — thrown when a script is asked to
 * run in a scope Scripts - Background cannot use (an installed store app, a name that
 * matches nothing, …).
 *
 * Matched on `code` rather than imported from @sonisoft/now-sdk-ext-core: a named import
 * of a symbol the installed core does not export fails the whole module at load time,
 * and `code` is the contract core documents for recognising its errors across copies.
 */

export const SCRIPT_SCOPE_ERROR_CODE = 'NEX_SCRIPT_SCOPE_UNAVAILABLE'

export interface ScriptScopeErrorLike extends Error {
  code: string
  /** The record the scope matched when it exists but cannot be used, e.g. a store app. */
  foundAs?: {name?: string; scope?: string}
  reason?: string
  remediation?: string
  /** The scope exactly as passed: a name, or a sys_id. */
  scope?: string
}

export function isScriptScopeError(error: unknown): error is ScriptScopeErrorLike {
  return error instanceof Error && (error as { code?: unknown }).code === SCRIPT_SCOPE_ERROR_CODE
}

/**
 * Next steps a user or agent can act on directly, as `nex` commands.
 *
 * @param error the scope error to explain.
 * @param connectionArgs flags to repeat on each suggested command (`--auth x --cred-store`),
 *   so the suggestion can be copied and run as-is.
 */
export function scriptScopeSuggestions(error: ScriptScopeErrorLike, connectionArgs: string = ''): string[] {
  const auth = connectionArgs.trim() ? ` ${connectionArgs.trim()}` : ''
  // When a sys_id was passed, the record it matched supplies the scope name.
  const passedSysId = /^[\dA-Fa-f]{32}$/.test(error.scope ?? '')
  const scopeName = error.foundAs?.scope || (passedSysId ? '' : error.scope ?? '')
  // Letters only: the fragment goes into a quoted encoded query.
  const fragment = scopeName.replace(/^x_/, '').replaceAll(/[^A-Za-z0-9]/g, ' ').trim().split(/\s+/)[0]
  const listScopes =
    `List the scopes scripts can run in: nex query -t sys_app -f scope,name` +
    `${fragment ? ` -q 'scopeLIKE${fragment}'` : ''}${auth}`

  switch (error.reason) {
    case 'INVALID_SCOPE_NAME':
    case 'SCOPE_NOT_FOUND': {
      return [listScopes, `Or run in global: nex exec global <file>${auth}`]
    }

    case 'NOT_A_DEVELOPED_APP': {
      return [
        `Run in global and call the app fully qualified, e.g. ${scopeName || '<scope>'}.MyScriptInclude: nex exec global <file>${auth}`,
        listScopes,
      ]
    }

    default: {
      return [error.remediation ?? 'Check that this user can read sys_app and sys_scope, then retry.']
    }
  }
}
