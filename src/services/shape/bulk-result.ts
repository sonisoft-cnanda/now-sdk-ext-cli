/**
 * Normalizing what core's QueryBatchOperations returns.
 *
 * `queryUpdate`/`queryDelete` return a loose `any` whose shape differs
 * between the dry-run and executed cases (`matchCount` always;
 * `updatedCount`/`deletedCount` and `errors` only after execution). Both
 * the CLI display service and the TUI need the same decisions about what
 * that means, so the decisions live here and the painting stays where it
 * belongs.
 */

export interface BulkError {
  error: string
  sysId: string
}

export interface BulkResult {
  /** Written (updated or deleted). Absent on a dry run. */
  changedCount?: number
  /** Nothing was written; this is a preview. */
  dryRun: boolean
  errors: BulkError[]
  executionTimeMs?: number
  /** How many records the query selected. */
  matchCount: number
  success: boolean
}

/**
 * `kind` picks which count field core used — `updatedCount` for an update,
 * `deletedCount` for a delete. Everything else is identical.
 */
export function toBulkResult(raw: unknown, kind: 'delete' | 'update'): BulkResult {
  const r = (raw ?? {}) as Record<string, unknown>
  const dryRun = r.dryRun === true
  const changed = kind === 'update' ? r.updatedCount : r.deletedCount

  return {
    dryRun,
    errors: Array.isArray(r.errors)
      ? (r.errors as Record<string, unknown>[]).map((e) => ({
          error: String(e.error ?? ''),
          sysId: String(e.sysId ?? ''),
        }))
      : [],
    matchCount: Number(r.matchCount ?? 0),
    // A dry run reports no changed count at all, which is different from
    // reporting zero — keep the distinction rather than defaulting to 0.
    ...(dryRun || changed === undefined ? {} : { changedCount: Number(changed) }),
    ...(r.executionTimeMs === undefined ? {} : { executionTimeMs: Number(r.executionTimeMs) }),
    success: r.success === true,
  }
}

/**
 * Did every matched record actually change?
 *
 * Core reports `success` from the HTTP layer, which can be true while
 * individual records failed. A partial result must never read as a clean
 * one — that is the difference between "done" and "half your records are
 * in the old state".
 */
export function isPartial(result: BulkResult): boolean {
  if (result.dryRun || result.changedCount === undefined) return false
  return result.errors.length > 0 || result.changedCount < result.matchCount
}

/**
 * Split ids into batches.
 *
 * A `sys_idIN` query is a URL query parameter, so an unbounded id list
 * eventually exceeds what the instance accepts and the request fails as a
 * whole. Chunking keeps each request well inside that, and the chunks run
 * under ONE approval covering all of them.
 */
export function chunkIds(ids: string[], size: number): string[][] {
  if (size <= 0) throw new Error('chunk size must be positive')
  const out: string[][] = []
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size))
  return out
}

/** The encoded query targeting exactly these records, and nothing else. */
export function sysIdInQuery(ids: string[]): string {
  return `sys_idIN${ids.join(',')}`
}
