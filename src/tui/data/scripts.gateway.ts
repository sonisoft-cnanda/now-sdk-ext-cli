/**
 * Background script execution and the scope list behind the scope picker.
 */
import { BackgroundScriptExecutor, ScopeManager } from '@sonisoft/now-sdk-ext-core'

import type { ApprovalRegistry, ApprovalSpec, ApprovalToken } from './approvals.js'

import { TtlCache } from './cache.js'

const SCOPE_TTL_MS = 5 * 60 * 1000

export interface ScopeOption {
  name: string
  scope: string
  sysId: string
}

export interface ScriptRunResult {
  lines: string[]
}

/**
 * ServiceNow's background-script page returns HTML, so output lines arrive
 * carrying `<BR/>` markers and HTML entities — visible as literal noise in
 * a terminal (`gs.info` output rendered as `hello<BR/>`). Split on the
 * breaks and decode the handful of entities the page emits.
 */
export function cleanOutputLine(line: string): string[] {
  return line
    .split(/<br\s*\/?>/gi)
    .map((part) =>
      part
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&nbsp;', ' ')
        // &amp; last, or it would double-decode the entities above.
        .replaceAll('&amp;', '&')
        .trimEnd(),
    )
    .filter((part, index, all) => part.length > 0 || all.length === 1)
}

export class ScriptsGateway {
  private readonly executors = new Map<string, BackgroundScriptExecutor>()
  private readonly scopeCache = new TtlCache<ScopeOption[]>({ maxEntries: 1, ttlMs: SCOPE_TTL_MS })
  private readonly scopes: ScopeManager

  constructor(
    private readonly instance: unknown,
    private readonly approvals: ApprovalRegistry,
  ) {
    this.scopes = new ScopeManager(instance as never)
  }

  /**
   * Run a background script in a scope.
   *
   * NOTE: the executor returns its output ONCE, at the end — there is no
   * streaming API. The pane therefore shows a spinner and correlates with
   * syslog for live output rather than pretending to stream.
   */
  async execute(
    spec: ApprovalSpec,
    token: ApprovalToken,
    options: { scope: string; script: string },
  ): Promise<ScriptRunResult> {
    this.approvals.consume(token, spec)
    const executor = this.executorFor(options.scope)
    const result = await executor.executeScript(options.script, options.scope, this.instance as never)
    const raw = (result as undefined | { scriptResults?: Array<{ line?: string }> })?.scriptResults
    if (!Array.isArray(raw)) {
      // Same lesson as NEX-92: a write-shaped call that comes back without
      // a recognisable payload did not do what the user asked. Say so.
      throw new TypeError('script execution returned no output — the script may not have run')
    }

    return { lines: raw.flatMap((r) => cleanOutputLine(String(r.line ?? ''))) }
  }

  /** Scopes for the picker: `global` first, then applications by name. */
  async listScopes(): Promise<ScopeOption[]> {
    return this.scopeCache.getOrLoad('scopes', async () => {
      const apps = await this.scopes.listApplications({ limit: 500 } as never).catch(() => [])
      const options = (apps as Array<Record<string, unknown>>)
        .map((app) => ({
          name: String(app.name ?? ''),
          scope: String(app.scope ?? ''),
          sysId: String(app.sys_id ?? ''),
        }))
        .filter((o) => o.scope.length > 0 && o.scope !== 'global')
        .sort((a, b) => a.scope.localeCompare(b.scope))
      return [{ name: 'Global', scope: 'global', sysId: 'global' }, ...options]
    })
  }

  /**
   * One executor per scope. The constructor takes a scope, and building a
   * fresh one per run would discard its internal scope→sys_id cache.
   */
  private executorFor(scope: string): BackgroundScriptExecutor {
    let executor = this.executors.get(scope)
    if (!executor) {
      executor = new BackgroundScriptExecutor(this.instance as never, scope)
      this.executors.set(scope, executor)
    }

    return executor
  }
}
