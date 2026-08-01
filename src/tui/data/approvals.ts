/**
 * The approval contract. Claude-Code-style per-action approval: every write
 * asks, and you can teach it to stop asking for the safe repetitive things.
 *
 * Enforcement is STRUCTURAL, not remembered. `ApprovalToken` is a branded
 * opaque type that only `ApprovalRegistry.mint()` can produce, and every
 * gateway write method requires one. A component cannot call a write
 * without having gone through the approval path — the type system says no,
 * and `consume()` rejects reuse and spec mismatches at runtime.
 */
import { createHash } from 'node:crypto'

import type { InstanceEnv } from './types.js'

declare const brand: unique symbol

/** Proof that a specific write was approved. Single-use. */
export interface ApprovalToken {
  readonly [brand]: 'approval'
  readonly specHash: string
}

/**
 * What kind of write this is. The tier table below is keyed on this, and
 * session memory is scoped to (actionKind, alias) — approving "field edits
 * on dev" never silently approves "bulk delete on dev".
 */
export type ActionKind =
  | 'app.install'
  | 'app.uninstall'
  | 'atf.run'
  | 'attachment.upload'
  | 'batch.write'
  | 'bulk.delete'
  | 'bulk.update'
  | 'flow.cancel'
  | 'flow.run'
  | 'record.update'
  | 'scope.set'
  | 'script.execute'
  | 'task.approve'
  | 'task.assign'
  | 'task.close'
  | 'task.comment'
  | 'task.resolve'
  | 'updateset.create'
  | 'updateset.move'
  | 'updateset.set'
  | 'xml.import'

/**
 * - `none`     — reads and local staging; never prompts.
 * - `remember` — prompts y/a/n; `a` suppresses future identical prompts.
 * - `always`   — prompts every time, no `a`, and demands the typed alias.
 */
export type ApprovalTier = 'always' | 'none' | 'remember'

const BASE_TIER: Record<ActionKind, ApprovalTier> = {
  'app.install': 'always',
  'app.uninstall': 'always',
  'atf.run': 'remember',
  'attachment.upload': 'remember',
  'batch.write': 'always',
  'bulk.delete': 'always',
  'bulk.update': 'always',
  'flow.cancel': 'remember',
  'flow.run': 'remember',
  'record.update': 'remember',
  'scope.set': 'remember',
  'script.execute': 'remember',
  'task.approve': 'remember',
  'task.assign': 'remember',
  'task.close': 'remember',
  'task.comment': 'remember',
  'task.resolve': 'remember',
  'updateset.create': 'remember',
  'updateset.move': 'always',
  'updateset.set': 'remember',
  'xml.import': 'always',
}

/** Above this many affected records, everything becomes always-ask. */
export const BULK_ESCALATION_THRESHOLD = 25

export interface ApprovalTarget {
  /** Number of records affected, when known. */
  count?: number
  /** Human identifier (record number, flow name, file). */
  identifier?: string
  /** Resolved host — from the same instance object that performs the write. */
  instance: string
  table?: string
}

export interface ApprovalDetail {
  after?: string
  before?: string
  label: string
}

export interface ApprovalSpec {
  actionKind: ActionKind
  /** Plain-language worst case, for the always-ask tier. */
  danger?: string
  /** The diff / operation body. */
  detail: ApprovalDetail[]
  /** How the target set was determined (provenance line). */
  provenance?: string
  target: ApprovalTarget
  title: string
}

export class ReadOnlyError extends Error {
  constructor(alias: string) {
    super(`session is read-only on ${alias} — restart without --read-only to enable writes`)
    this.name = 'ReadOnlyError'
  }
}

export class ApprovalRequiredError extends Error {
  constructor(actionKind: string) {
    super(`${actionKind} requires an approval token — route this write through useApproval()`)
    this.name = 'ApprovalRequiredError'
  }
}

/** Stable hash over the fields that define WHAT was approved. */
export function hashSpec(spec: ApprovalSpec): string {
  const canonical = JSON.stringify({
    actionKind: spec.actionKind,
    detail: spec.detail.map((d) => [d.label, d.before ?? null, d.after ?? null]),
    target: {
      count: spec.target.count ?? null,
      identifier: spec.target.identifier ?? null,
      instance: spec.target.instance,
      table: spec.target.table ?? null,
    },
  })
  return createHash('sha256').update(canonical).digest('hex').slice(0, 32)
}

export interface ApprovalRegistryOptions {
  alias: string
  approveAll?: boolean
  env: InstanceEnv
  readOnly?: boolean
}

export class ApprovalRegistry {
  readonly alias: string
  readonly approveAll: boolean
  readonly env: InstanceEnv
  readonly readOnly: boolean
private counter = 0
  /** Minted, not yet consumed. Single-use enforcement. */
  private readonly outstanding = new Set<string>()
  /** (actionKind, alias) pairs the user chose to stop being asked about. */
  private readonly remembered = new Set<string>()

  constructor(options: ApprovalRegistryOptions) {
    this.alias = options.alias
    this.env = options.env
    this.readOnly = options.readOnly ?? false
    // --approve-all is a dev-loop convenience and REFUSES to engage where
    // it would matter most. An unclassified alias counts as prod.
    this.approveAll = (options.approveAll ?? false) && options.env !== 'prod' && options.env !== 'unknown'
  }

  /**
   * The tier that actually applies, after escalation. Escalates to
   * always-ask when the instance is prod/unclassified, or when the blast
   * radius exceeds the bulk threshold.
   */
  classify(spec: ApprovalSpec): ApprovalTier {
    const base = BASE_TIER[spec.actionKind]
    if (base === 'none') return 'none'
    if (this.env === 'prod' || this.env === 'unknown') return 'always'
    if ((spec.target.count ?? 1) > BULK_ESCALATION_THRESHOLD) return 'always'
    return base
  }

  /** Forget every remembered approval (instance switch, explicit reset). */
  clearMemory(): void {
    this.remembered.clear()
  }

  /**
   * Validate and burn a token. Throws rather than returning false: a write
   * reaching this point with a bad token is a programming error, not a
   * user-facing condition.
   */
  consume(token: ApprovalToken | undefined, spec: ApprovalSpec): void {
    if (this.readOnly) throw new ReadOnlyError(this.alias)
    if (!token) throw new ApprovalRequiredError(spec.actionKind)
    const expected = hashSpec(spec)
    if (!token.specHash.startsWith(expected)) {
      throw new ApprovalRequiredError(
        `${spec.actionKind} (approval was for a different operation)`,
      )
    }

    if (!this.outstanding.delete(token.specHash)) {
      throw new ApprovalRequiredError(`${spec.actionKind} (approval already used)`)
    }
  }

  /** True when this exact action kind was remembered for this alias. */
  isRemembered(actionKind: ActionKind): boolean {
    return this.remembered.has(this.memoryKey(actionKind))
  }

  /**
   * Mint a token for an approved spec. ONLY the approval flow calls this;
   * it is not exported as a standalone function precisely so a component
   * cannot fabricate one.
   */
  mint(spec: ApprovalSpec): ApprovalToken {
    this.counter += 1
    const specHash = `${hashSpec(spec)}:${this.counter}`
    this.outstanding.add(specHash)
    return { specHash } as ApprovalToken
  }

  /**
   * Can this spec proceed without showing a dialog? True only for the
   * remember tier when already remembered, or under --approve-all.
   */
  needsPrompt(spec: ApprovalSpec): boolean {
    const tier = this.classify(spec)
    if (tier === 'none') return false
    if (tier === 'always') return true
    if (this.approveAll) return false
    return !this.isRemembered(spec.actionKind)
  }

  /** Record "don't ask again" for this action kind on this alias. */
  remember(actionKind: ActionKind): void {
    this.remembered.add(this.memoryKey(actionKind))
  }

  /** Whether the dialog should offer the `a` (remember) choice. */
  supportsRemember(spec: ApprovalSpec): boolean {
    return this.classify(spec) === 'remember'
  }

  private memoryKey(actionKind: ActionKind): string {
    return `${this.alias}::${actionKind}`
  }
}
