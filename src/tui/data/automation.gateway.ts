/**
 * Flows, ATF and Update Sets — the "delivery" side of ServiceNow work.
 *
 * Every long-running operation here is POLLED, not awaited: core's
 * `*AndWait` variants block until completion, which would freeze the frame
 * for minutes. The non-waiting variants hand back a progress id, and the
 * pane drives the poll through use-stream-buffer.
 */
import { ATFTestExecutor, FlowManager, ScopeManager, UpdateSetManager } from '@sonisoft/now-sdk-ext-core'

import type { ApprovalRegistry, ApprovalSpec, ApprovalToken } from './approvals.js'

import { toFlowSteps } from '../../services/shape/flow-report.js'

export interface FlowContextSummary {
  contextId: string
  name: string
  runTimeMs: number
  source: string
  started: string
  state: string
}

export interface FlowDetail {
  error?: string
  name: string
  state: string
  steps: ReturnType<typeof toFlowSteps>
}

export interface AtfProgress {
  done: boolean
  percent: number
  resultsId?: string
  status: string
  statusLabel: string
  statusMessage: string
}

export interface AtfOutcome {
  errors: number
  failures: number
  passed: number
  resultSysId: string
  runTime: string
  skipped: number
  status: string
}

export interface UpdateSetSummary {
  application?: string
  isDefault: boolean
  name: string
  state: string
  sysId: string
}

export interface UpdateSetComponent {
  count: number
  items: string[]
  type: string
}

export class AutomationGateway {
  private readonly atf: ATFTestExecutor
  private readonly flows: FlowManager
  private readonly scopes: ScopeManager
  /**
   * setCurrentUpdateSet and setCurrentApplication mutate SERVER-SIDE
   * session state. Two in flight at once can interleave and leave the
   * session pointing somewhere neither call intended, so they are
   * serialised through one chain.
   */
  private sessionMutations: Promise<unknown> = Promise.resolve()
  private readonly updateSets: UpdateSetManager

  constructor(
    instance: unknown,
    private readonly approvals: ApprovalRegistry,
  ) {
    this.atf = new ATFTestExecutor(instance as never)
    this.flows = new FlowManager(instance as never)
    this.scopes = new ScopeManager(instance as never)
    this.updateSets = new UpdateSetManager(instance as never)
  }

  // ---- Flows ----------------------------------------------------------

  async cancelFlow(spec: ApprovalSpec, token: ApprovalToken, contextId: string, reason?: string): Promise<void> {
    this.approvals.consume(token, spec)
    await this.flows.cancelFlow(contextId, reason)
  }

  async getCurrentUpdateSet(): Promise<undefined | UpdateSetSummary> {
    const current = await this.updateSets.getCurrentUpdateSet().catch(() => null)
    return current ? toUpdateSetSummary(current) : undefined
  }

  /** Full execution detail: the action-by-action tree, correctly ordered. */
  async getFlowDetail(contextId: string): Promise<FlowDetail> {
    const result = await this.flows.getFlowContextDetails(contextId)
    const detail: FlowDetail = {
      name: result.flowContext?.name ?? contextId,
      state: result.flowContext?.state ?? '',
      steps: toFlowSteps(result.flowReport),
    }
    if (result.errorMessage) detail.error = result.errorMessage
    return detail
  }

  // ---- ATF ------------------------------------------------------------

  /** Log entries for one execution. limit-only — core has no cursor. */
  async getFlowLogs(contextId: string, limit = 100): Promise<Array<{ level: string; message: string }>> {
    const result = await this.flows.getFlowLogs(contextId, { limit })
    return (result.entries ?? []).map((e) => ({
      level: String((e as { level?: unknown }).level ?? ''),
      message: String((e as { message?: unknown }).message ?? ''),
    }))
  }

  async getTestSuiteOutcome(resultsId: string): Promise<AtfOutcome> {
    const result = await this.atf.getTestSuiteResults(resultsId)
    return {
      errors: Number(result?.error_count ?? 0),
      failures: Number(result?.failure_count ?? 0),
      passed: Number(result?.success_count ?? 0),
      resultSysId: String(result?.sys_id ?? ''),
      runTime: String(result?.run_time ?? ''),
      skipped: Number(result?.skip_count ?? 0),
      status: String(result?.status ?? ''),
    }
  }

  async inspectUpdateSet(sysId: string): Promise<{ components: UpdateSetComponent[]; total: number }> {
    const result = await this.updateSets.inspectUpdateSet(sysId as never)
    const r = result as undefined | { components?: Array<Record<string, unknown>>; totalRecords?: number }
    return {
      components: (r?.components ?? []).map((c) => ({
        count: Number(c.count ?? 0),
        items: Array.isArray(c.items) ? c.items.map(String) : [],
        type: String(c.type ?? ''),
      })),
      total: Number(r?.totalRecords ?? 0),
    }
  }

  // ---- Update sets ----------------------------------------------------

  async listUpdateSets(limit = 50): Promise<UpdateSetSummary[]> {
    const list = await this.updateSets.listUpdateSets({ limit } as never).catch(() => [])
    return (list as Array<Record<string, unknown>>).map((u) => toUpdateSetSummary(u))
  }

  async pollTestSuite(progressId: string): Promise<AtfProgress> {
    const response = await this.atf.getTestSuiteProgress(progressId)
    const status = String(response?.status ?? '')
    return {
      // ServiceNow reports 2 = successful, 3 = failed, 4 = cancelled.
      done: ['2', '3', '4'].includes(status) || Number(response?.percent_complete ?? 0) >= 100,
      percent: Number(response?.percent_complete ?? 0),
      resultsId: response?.links?.results?.id,
      status,
      statusLabel: String(response?.status_label ?? ''),
      statusMessage: String(response?.status_message ?? ''),
    }
  }

  async setCurrentScope(spec: ApprovalSpec, token: ApprovalToken, appSysId: string): Promise<void> {
    this.approvals.consume(token, spec)
    await this.serialise(() => this.scopes.setCurrentApplication(appSysId as never))
  }

  /**
   * Switch the session's current update set. Serialised — see
   * `sessionMutations`. Everything the user does afterwards is captured
   * here, which is why the approval body has to say so.
   */
  async setCurrentUpdateSet(spec: ApprovalSpec, token: ApprovalToken, sysId: string): Promise<void> {
    this.approvals.consume(token, spec)
    await this.serialise(() => this.updateSets.setCurrentUpdateSet({ sysId } as never))
  }

  /**
   * Start a suite WITHOUT waiting. Returns the progress id the pane polls,
   * so the UI stays responsive for the whole run.
   */
  async startTestSuite(
    spec: ApprovalSpec,
    token: ApprovalToken,
    suiteSysId: string,
  ): Promise<string> {
    this.approvals.consume(token, spec)
    const response = await this.atf.executeTestSuite(suiteSysId)
    const progressId = response?.links?.progress?.id
    if (!progressId) {
      throw new Error('ATF did not return a progress id — the suite was not started')
    }

    return progressId
  }

  private async serialise<T>(op: () => Promise<T>): Promise<T> {
    const next = this.sessionMutations.then(op, op)
    // Keep the chain alive even when a mutation rejects.
    this.sessionMutations = next.catch(() => {})
    return next
  }
}

function toUpdateSetSummary(raw: Record<string, unknown>): UpdateSetSummary {
  const name = String(raw.name ?? '')
  const summary: UpdateSetSummary = {
    isDefault: name.toLowerCase() === 'default',
    name,
    state: String(raw.state ?? ''),
    sysId: String(raw.sys_id ?? ''),
  }
  const app = raw.application
  if (app) {
    summary.application = typeof app === 'object'
      ? String((app as { value?: unknown }).value ?? '')
      : String(app)
  }

  return summary
}
