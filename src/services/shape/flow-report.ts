/**
 * Flow execution shaping — the step-ordering and label-fallback decisions
 * extracted from flow-display.service.ts:formatDetailsResult, shared with
 * the TUI's Ops→Flows detail tree.
 *
 * The CLI keeps its own padding and glyphs; this owns only WHAT a step is
 * and in WHICH order steps happened.
 */

export type FlowStepKind = 'action' | 'subflow'

export interface FlowStep {
  error?: string
  /** Flattened {value, displayValue} pairs, display preferred. */
  inputs: Record<string, string>
  kind: FlowStepKind
  label: string
  order: number
  outputs: Record<string, string>
  runTimeMs: number
  state: string
}

/**
 * The CLI's historical label fallback chain, extracted verbatim:
 * stepLabel → actionTypeName → `Action ${actionName}`.
 */
export function stepLabel(report: {
  actionName?: string
  actionTypeName?: string
  stepLabel?: string
}): string {
  return report.stepLabel ?? report.actionTypeName ?? `Action ${report.actionName}`
}

/**
 * Flatten an operations input/output block. Core hands back
 * `{data: {key: {value, displayValue}}}`; the display value is what a
 * human means, falling back to the raw value.
 */
export function flattenOperationData(block: unknown): Record<string, string> {
  const data = (block as undefined | { data?: Record<string, unknown> })?.data
  if (!data) return {}
  const out: Record<string, string> = {}
  for (const [key, cell] of Object.entries(data)) {
    if (cell !== null && typeof cell === 'object') {
      const c = cell as { displayValue?: unknown; value?: unknown }
      out[key] = String(c.displayValue ?? c.value ?? '')
    } else {
      out[key] = String(cell ?? '')
    }
  }

  return out
}

/**
 * Merge action and subflow reports and sort by execution order — the same
 * merge+sort the CLI does, so both layers agree on what "step 3" means.
 * A missing/uninterpretable order sorts as 0, matching the CLI's parseInt.
 */
export function toFlowSteps(report: unknown): FlowStep[] {
  const r = report as undefined | {
    actionOperationsReports?: Record<string, unknown>
    subflowOperationsReports?: Record<string, unknown>
  }
  if (!r) return []

  const collect = (bucket: Record<string, unknown> | undefined, kind: FlowStepKind): FlowStep[] =>
    Object.values(bucket ?? {}).map((raw) => {
      const a = raw as {
        actionName?: string
        actionTypeName?: string
        fStepCount?: number | string
        operationsCore?: { error?: string; order?: string; runTime?: string; state?: string }
        operationsInput?: unknown
        operationsOutput?: unknown
        stepLabel?: string
      }
      const core = a.operationsCore ?? {}
      const step: FlowStep = {
        inputs: flattenOperationData(a.operationsInput),
        kind,
        label: stepLabel(a),
        // `operationsCore.order` is the documented field, but on real
        // executions it is frequently absent — verified against a live
        // instance where operationsCore came back as `{}` for every action
        // while each carried `fStepCount`. Without this fallback every
        // step sorts as 0 and the tree shows in arbitrary key order.
        // (The CLI's sortFlowReports deliberately does NOT do this: its
        // output is pinned byte-for-byte. Worth a follow-up there.)
        order: Number.parseInt(core.order ?? '', 10) || Number(a.fStepCount ?? 0) || 0,
        outputs: flattenOperationData(a.operationsOutput),
        runTimeMs: Number.parseInt(core.runTime ?? '', 10) || 0,
        state: core.state ?? '',
      }
      if (core.error) step.error = core.error
      return step
    })

  return [
    ...collect(r.actionOperationsReports, 'action'),
    ...collect(r.subflowOperationsReports, 'subflow'),
  ].sort((a, b) => a.order - b.order)
}

/**
 * Merge action + subflow reports and sort by execution order, returning
 * the RAW report objects. The CLI consumes this so both layers agree on
 * step ordering, while the CLI keeps its own value formatting (it emits
 * `displayValue ?? value` unstringified inside JSON.stringify, and
 * coercing here would change its output bytes).
 */
export function sortFlowReports<T extends { operationsCore: { order: string } }>(
  actionReports: T[],
  subflowReports: T[],
): T[] {
  return [...actionReports, ...subflowReports].sort(
    (a, b) =>
      (Number.parseInt(a.operationsCore.order, 10) || 0) -
      (Number.parseInt(b.operationsCore.order, 10) || 0),
  )
}

/** Flow context state → the glyph/severity role both layers use. */
export type FlowStateRole = 'error' | 'muted' | 'ok' | 'running' | 'waiting'

export function flowStateRole(state: string | undefined): FlowStateRole {
  switch (state) {
    case 'CANCELLED': {
      return 'muted'
    }

    case 'COMPLETE': {
      return 'ok'
    }

    case 'ERROR': {
      return 'error'
    }

    case 'IN_PROGRESS': {
      return 'running'
    }

    case 'QUEUED':
    case 'WAITING': {
      return 'waiting'
    }

    default: {
      return 'muted'
    }
  }
}
