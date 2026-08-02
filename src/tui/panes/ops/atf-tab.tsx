import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ApprovalSpec } from '../../data/approvals.js'
import type { AtfOutcome, AtfProgress } from '../../data/automation.gateway.js'
import type { PickerItem } from '../../ui/picker.js'

import { useApproval } from '../../context/approval-context.js'
import { useSession } from '../../context/session-context.js'
import { useUi } from '../../context/ui-context.js'
import { useAsyncResource } from '../../hooks/use-async-resource.js'
import { useKeymap } from '../../hooks/use-keymap.js'
import { Picker } from '../../ui/picker.js'
import { theme } from '../../ui/theme.js'
import { useToast } from '../../ui/toast-host.js'

export interface AtfTabProps {
  active: boolean
  height: number
  onOpenRecord(table: string, sysId: string): void
  width: number
}

const POLL_MS = 3000

/**
 * ATF suite runs with LIVE progress.
 *
 * Uses the non-`AndWait` executor plus getTestSuiteProgress on a timer:
 * `executeTestSuiteAndWait` blocks until the suite finishes, which for a
 * real suite means freezing the UI for minutes. The CLI can afford that;
 * a workspace cannot.
 */
export function AtfTab(props: AtfTabProps): ReactElement {
  const session = useSession()
  const { glyphs } = useUi()
  const approve = useApproval()
  const toast = useToast()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [suite, setSuite] = useState<null | { name: string; sysId: string }>(null)
  const [progress, setProgress] = useState<AtfProgress | null>(null)
  const [outcome, setOutcome] = useState<AtfOutcome | null>(null)
  const progressIdRef = useRef<null | string>(null)

  const suites = useAsyncResource<PickerItem[]>()
  const { run: loadSuites } = suites

  // Poll while a run is in flight; stop the moment it completes.
  useEffect(() => {
    if (!progressIdRef.current || progress?.done) return
    const timer = setInterval(() => {
      const id = progressIdRef.current
      if (!id) return
      session.gateway.automation
        .pollTestSuite(id)
        .then(async (p) => {
          setProgress(p)
          if (p.done && p.resultsId) {
            const o = await session.gateway.automation.getTestSuiteOutcome(p.resultsId)
            setOutcome(o)
            toast(
              o.failures + o.errors > 0 ? 'error' : 'success',
              `suite ${o.status}: ${o.passed} passed, ${o.failures} failed`,
            )
          }
        })
        .catch(() => {
          // A failed poll is transient; the next tick retries.
        })
    }, POLL_MS)
    return () => {
      clearInterval(timer)
    }
  }, [progress?.done, session, toast])

  const start = useCallback(async () => {
    if (!suite) {
      toast('info', 'pick a suite first (t)')
      return
    }

    const spec: ApprovalSpec = {
      actionKind: 'atf.run',
      danger: 'ATF suites create and modify records on this instance.',
      detail: [{ after: suite.name, label: 'suite' }],
      target: { count: 1, identifier: suite.name, instance: session.host, table: 'sys_atf_test_suite' },
      title: `run ATF suite ${suite.name}`,
    }
    const token = await approve(spec)
    if (!token) return

    setOutcome(null)
    setProgress({ done: false, percent: 0, status: '', statusLabel: 'starting…', statusMessage: '' })
    try {
      progressIdRef.current = await session.gateway.automation.startTestSuite(spec, token, suite.sysId)
      toast('info', `suite started`)
    } catch (error) {
      progressIdRef.current = null
      setProgress(null)
      toast('error', (error as Error).message)
    }
  }, [approve, session, suite, toast])

  useKeymap(
    'pane',
    (event) => {
      if (event.input === 't') {
        setPickerOpen(true)
        loadSuites(async () => {
          const page = await session.gateway.records.fetchPage({
            fields: ['sys_id', 'name'],
            limit: 200,
            offset: 0,
            query: 'active=true^ORDERBYname',
            table: 'sys_atf_test_suite',
          })
          return page.rows.map((r) => ({ id: r.sysId, label: r.cells.name?.displayValue ?? r.sysId }))
        })
        return 'handled'
      }

      if (event.input === 'r') {
        start().catch((): undefined => undefined)
        return 'handled'
      }

      if (event.input === 'o' && outcome?.resultSysId) {
        props.onOpenRecord('sys_atf_test_suite_result', outcome.resultSysId)
        return 'handled'
      }

      return 'pass'
    },
    props.active && !pickerOpen,
  )

  if (pickerOpen) {
    return (
      <Picker
        height={props.height}
        items={suites.resource.status === 'ready' ? suites.resource.data : []}
        onCancel={() => { setPickerOpen(false) }}
        onSelect={(item) => {
          setSuite({ name: item.label, sysId: item.id })
          setPickerOpen(false)
        }}
        placeholder={suites.resource.status === 'loading' ? 'loading suites…' : 'type to filter suites'}
        title="ATF test suite"
      />
    )
  }

  const barWidth = Math.max(10, Math.min(40, props.width - 30))
  const filled = progress ? Math.round((progress.percent / 100) * barWidth) : 0

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>suite </Text>
        <Text bold color={theme.fg.accent}>{suite?.name ?? '(none — press t)'}</Text>
      </Box>

      {progress ? (
        <Box flexDirection="column" marginTop={1}>
          <Text>
            <Text color={progress.done ? theme.state.ok : theme.state.running}>
              {glyphs.progressFull.repeat(filled)}
            </Text>
            <Text dimColor>{glyphs.progressEmpty.repeat(Math.max(0, barWidth - filled))}</Text>
            <Text>  {progress.percent}%</Text>
          </Text>
          <Text dimColor>{progress.statusLabel}{progress.statusMessage ? ` — ${progress.statusMessage}` : ''}</Text>
        </Box>
      ) : (
        <Text dimColor>No run yet — t picks a suite, r runs it</Text>
      )}

      {outcome ? (
        <Box flexDirection="column" marginTop={1}>
          <Text>
            <Text color={outcome.failures + outcome.errors > 0 ? theme.state.error : theme.state.ok}>
              {outcome.failures + outcome.errors > 0 ? glyphs.cross : glyphs.tick}
            </Text>
            {' '}
            <Text bold>{outcome.status}</Text>
            <Text dimColor>  {outcome.runTime}</Text>
          </Text>
          <Text>
            <Text color={theme.state.ok}>{outcome.passed} passed</Text>
            <Text>  </Text>
            <Text color={outcome.failures > 0 ? theme.state.error : theme.fg.muted}>{outcome.failures} failed</Text>
            <Text>  </Text>
            <Text color={outcome.errors > 0 ? theme.state.error : theme.fg.muted}>{outcome.errors} errors</Text>
            <Text dimColor>  {outcome.skipped} skipped</Text>
          </Text>
          <Text dimColor>o opens the suite result record</Text>
        </Box>
      ) : null}

      <Box flexGrow={1} />
      <Text dimColor>t suite  r run  o result record</Text>
    </Box>
  )
}
