import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useCallback, useEffect, useState } from 'react'

import type { ApprovalSpec } from '../../data/approvals.js'
import type { FlowContextSummary, FlowDetail } from '../../data/automation.gateway.js'

import { flowStateRole } from '../../../services/shape/flow-report.js'
import { useApproval } from '../../context/approval-context.js'
import { useSession } from '../../context/session-context.js'
import { useUi } from '../../context/ui-context.js'
import { useAsyncResource } from '../../hooks/use-async-resource.js'
import { useKeymap } from '../../hooks/use-keymap.js'
import { theme } from '../../ui/theme.js'
import { useToast } from '../../ui/toast-host.js'
import { Viewport } from '../../ui/viewport.js'

export interface FlowsTabProps {
  active: boolean
  height: number
  onOpenRecord(table: string, sysId: string): void
  width: number
}

const ROLE_COLOR: Record<string, string | undefined> = {
  error: theme.state.error,
  muted: theme.fg.muted,
  ok: theme.state.ok,
  running: theme.state.running,
  waiting: theme.state.warn,
}

/** Flow executions and their action-by-action detail. */
export function FlowsTab(props: FlowsTabProps): ReactElement {
  const session = useSession()
  const { glyphs } = useUi()
  const approve = useApproval()
  const toast = useToast()

  const [cursor, setCursor] = useState(0)
  const [openContext, setOpenContext] = useState<null | string>(null)
  const [stepCursor, setStepCursor] = useState(0)

  const contexts = useAsyncResource<FlowContextSummary[]>()
  const detail = useAsyncResource<FlowDetail>()
  const { run: runContexts } = contexts
  const { run: runDetail } = detail

  const load = useCallback(() => {
    runContexts(async () => {
      const page = await session.gateway.records.fetchPage({
        fields: ['sys_id', 'flow', 'state', 'started', 'run_time', 'source_record'],
        limit: 50,
        offset: 0,
        query: 'ORDERBYDESCsys_created_on',
        table: 'sys_flow_context',
      })
      return page.rows.map((row) => ({
        contextId: row.sysId,
        name: row.cells.flow?.displayValue || '(unnamed flow)',
        runTimeMs: Number(row.cells.run_time?.value ?? 0),
        source: row.cells.source_record?.displayValue ?? '',
        started: row.cells.started?.displayValue ?? '',
        state: row.cells.state?.value ?? '',
      }))
    })
  }, [runContexts, session])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!openContext) return
    runDetail(() => session.gateway.automation.getFlowDetail(openContext))
  }, [openContext, runDetail, session])

  const rows = contexts.resource.status === 'ready' ? contexts.resource.data : []
  const steps = detail.resource.status === 'ready' ? detail.resource.data.steps : []

  const cancel = useCallback(async () => {
    const target = rows[cursor]
    if (!target) return
    const spec: ApprovalSpec = {
      actionKind: 'flow.cancel',
      detail: [
        { after: 'CANCELLED', before: target.state, label: 'state' },
        { after: target.name, label: 'flow' },
      ],
      target: { count: 1, identifier: target.contextId.slice(0, 12), instance: session.host, table: 'sys_flow_context' },
      title: `cancel flow execution ${target.name}`,
    }
    const token = await approve(spec)
    if (!token) return
    try {
      await session.gateway.automation.cancelFlow(spec, token, target.contextId)
      toast('success', 'cancel requested')
      load()
    } catch (error) {
      toast('error', (error as Error).message)
    }
  }, [approve, cursor, load, rows, session, toast])

  useKeymap(
    'pane',
    (event) => {
      if (openContext) {
        if (event.key.escape) {
          setOpenContext(null)
          return 'handled'
        }

        if (event.key.upArrow || event.input === 'k') {
          setStepCursor((c) => Math.max(0, c - 1))
          return 'handled'
        }

        if (event.key.downArrow || event.input === 'j') {
          setStepCursor((c) => Math.min(steps.length - 1, c + 1))
          return 'handled'
        }

        return 'pass'
      }

      if (event.key.upArrow || event.input === 'k') {
        setCursor((c) => Math.max(0, c - 1))
        return 'handled'
      }

      if (event.key.downArrow || event.input === 'j') {
        setCursor((c) => Math.min(rows.length - 1, c + 1))
        return 'handled'
      }

      if (event.key.return && rows[cursor]) {
        setOpenContext(rows[cursor].contextId)
        setStepCursor(0)
        return 'handled'
      }

      if (event.input === 'r') {
        load()
        return 'handled'
      }

      if (event.input === 'o' && rows[cursor]) {
        props.onOpenRecord('sys_flow_context', rows[cursor].contextId)
        return 'handled'
      }

      if (event.input === 'c' && rows[cursor]) {
        cancel().catch((): undefined => undefined)
        return 'handled'
      }

      return 'pass'
    },
    props.active,
  )

  const listHeight = Math.max(1, props.height - 1)

  if (openContext) {
    const d = detail.resource
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={theme.fg.accent}>
            {d.status === 'ready' ? d.data.name : openContext}
          </Text>
          {d.status === 'ready' ? (
            <Text color={ROLE_COLOR[flowStateRole(d.data.state)]}>  {d.data.state}</Text>
          ) : null}
          <Text dimColor>  Esc back</Text>
        </Box>
        {d.status === 'error' ? (
          <Text color={theme.state.error}>{glyphs.cross} {d.error.message}</Text>
        ) : (
          <Viewport
            cursor={Math.min(stepCursor, Math.max(0, steps.length - 1))}
            emptyState={
              <Text dimColor>
                {d.status === 'ready' ? 'No step report — reporting may be off for this flow' : 'Loading…'}
              </Text>
            }
            height={listHeight - 1}
            renderItem={(step: (typeof steps)[number], index, selected) => (
              <Box flexDirection="column">
                <Text inverse={selected} wrap="truncate">
                  <Text dimColor>{String(index + 1).padStart(2)}. </Text>
                  {/*
                    operationsCore is often empty on real executions, so
                    state and timing are genuinely unknown rather than
                    zero — say so instead of printing a confident "0ms".
                  */}
                  <Text color={ROLE_COLOR[flowStateRole(step.state)]}>
                    {(step.state || glyphs.emptyValue).padEnd(12)}
                  </Text>
                  <Text>{step.label}</Text>
                  <Text dimColor>  {step.runTimeMs > 0 ? `${step.runTimeMs}ms` : glyphs.emptyValue}</Text>
                </Text>
                {selected && step.error ? (
                  <Text color={theme.state.error} wrap="truncate">     {step.error}</Text>
                ) : null}
                {selected && Object.keys(step.outputs).length > 0 ? (
                  <Text dimColor wrap="truncate">
                    {'     out: '}
                    {Object.entries(step.outputs).map(([k, v]) => `${k}=${v}`).join('  ')}
                  </Text>
                ) : null}
              </Box>
            )}
            source={{ at: (i) => steps[i], length: steps.length }}
          />
        )}
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Viewport
        cursor={Math.min(cursor, Math.max(0, rows.length - 1))}
        emptyState={
          <Text dimColor>
            {contexts.resource.status === 'ready' ? 'No flow executions' : 'Loading executions…'}
          </Text>
        }
        height={listHeight}
        renderItem={(row: FlowContextSummary, _i, selected) => (
          <Text inverse={selected} wrap="truncate">
            {selected ? glyphs.cursor : ' '}
            <Text color={ROLE_COLOR[flowStateRole(row.state)]}> {(row.state || '?').padEnd(12)}</Text>
            <Text>{row.name.slice(0, 34).padEnd(34)}</Text>
            <Text dimColor> {row.started}</Text>
            {row.source ? <Text dimColor>  {row.source}</Text> : null}
          </Text>
        )}
        source={{ at: (i) => rows[i], length: rows.length }}
      />
      <Text dimColor>⏎ detail  o open context record  c cancel  r refresh</Text>
    </Box>
  )
}
