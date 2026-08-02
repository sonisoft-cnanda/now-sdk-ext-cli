import type { ReactElement } from 'react'

import { Box, Text, useApp, useInput } from 'ink'
import { useState } from 'react'

import type { TuiSession } from './boot/session.js'
import type { PaneId } from './commands/registry.js'
import type { KeyEvent } from './keymap/scope-stack.js'

import { bindingsForPane } from './commands/registry.js'
import { ApprovalProvider } from './context/approval-context.js'
import { SessionProvider, useSession } from './context/session-context.js'
import { UiProvider, useUi } from './context/ui-context.js'
import { useKeymap } from './hooks/use-keymap.js'
import { useTerminalSize } from './hooks/use-terminal-size.js'
import { LogsPane } from './panes/logs/logs-pane.js'
import { RecordPane } from './panes/records/record-pane.js'
import { ScriptsPane } from './panes/scripts/scripts-pane.js'
import { HelpOverlay } from './ui/help-overlay.js'
import { InstanceBanner } from './ui/instance-banner.js'
import { theme } from './ui/theme.js'
import { ToastProvider, useToast } from './ui/toast-host.js'

/** A cross-pane request to open a specific record in the Records pane. */
export interface OpenRecordRequest {
  requestId: number
  sysId: string
  table: string
}

export interface AppProps {
  ascii?: boolean
  /** Lets the Scripts pane hand the terminal to $EDITOR and take it back. */
  foregroundHost?: { resume(): void; suspend(): void }
  initialPane?: PaneId
  initialQuery?: string
  initialTable?: string
  session: TuiSession
}

const NOOP_FOREGROUND = { resume() {}, suspend() {} }

const PANES: Array<{ id: PaneId; label: string }> = [
  { id: 'records', label: 'Records' },
  { id: 'logs', label: 'Logs' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'ops', label: 'Ops' },
]

export function App(props: AppProps): ReactElement {
  return (
    <SessionProvider session={props.session}>
      <UiProvider ascii={props.ascii}>
        <ToastProvider>
          <Shell
            foregroundHost={props.foregroundHost ?? NOOP_FOREGROUND}
            initialPane={props.initialPane}
            initialQuery={props.initialQuery}
            initialTable={props.initialTable}
          />
        </ToastProvider>
      </UiProvider>
    </SessionProvider>
  )
}

interface ShellProps {
  foregroundHost: { resume(): void; suspend(): void }
  initialPane?: PaneId
  initialQuery?: string
  initialTable?: string
}

/**
 * The workspace shell. Holds THE one command-dispatching useInput: every
 * key becomes a KeyEvent and goes through the scope stack, so 'Esc' can
 * only ever mean one thing at a time. The shell itself registers the
 * 'global' scope (pane digits, help, quit) at the bottom of the stack.
 */
function Shell(props: ShellProps): ReactElement {
  const { exit } = useApp()
  const { scopes } = useUi()
  const session = useSession()
  const toast = useToast()
  const size = useTerminalSize()
  const [pane, setPane] = useState<PaneId>(props.initialPane ?? 'records')
  const [helpOpen, setHelpOpen] = useState(false)
  const [openRequest, setOpenRequest] = useState<OpenRecordRequest | undefined>()

  // Cross-pane jump: a log line names a record → land on its form.
  const openRecord = (table: string, sysId: string) => {
    setOpenRequest((previous) => ({ requestId: (previous?.requestId ?? 0) + 1, sysId, table }))
    setPane('records')
  }

  // Cross-pane: "show me the logs for that script run". The Logs pane owns
  // a live tail already, so this switches to it and clears filter rules so
  // nothing from the run window is hidden. The run's own returned output
  // stays in the transcript; this is for what the script logged.
  const showRunLogs = (startedAt: number, endedAt: number) => {
    session.gateway.logs.setRules([])
    setPane('logs')
    toast(
      'info',
      `logs cleared of filters — run window ${new Date(startedAt).toTimeString().slice(0, 8)}–${new Date(endedAt).toTimeString().slice(0, 8)}`,
    )
  }

  // Record numbers (INC0010023) resolve to a sys_id via one filtered fetch.
  const resolveNumber = (table: string, number: string) => {
    session.gateway.records
      .fetchPage({ limit: 1, offset: 0, query: `number=${number}`, table })
      .then((page) => {
        if (page.rows.length > 0) openRecord(table, page.rows[0].sysId)
      })
      .catch(() => {
        // resolution is best-effort; the log line stays where it was
      })
  }

  useInput((input, key) => {
    const toEvent = (chunk: string): KeyEvent => ({
      ctrl: key.ctrl,
      input: chunk,
      key: {
        backspace: key.backspace,
        delete: key.delete,
        downArrow: key.downArrow,
        end: false,
        escape: key.escape,
        home: false,
        leftArrow: key.leftArrow,
        pageDown: key.pageDown,
        pageUp: key.pageUp,
        return: key.return,
        rightArrow: key.rightArrow,
        shift: key.shift,
        tab: key.tab,
        upArrow: key.upArrow,
      },
      meta: key.meta,
    })

    // Ink batches stdin: holding a key, fast typing, or a paste all arrive
    // as ONE event whose input is several characters. Text scopes want the
    // whole chunk (that IS the paste); command scopes compare single keys
    // and would silently ignore 'jjjj'.
    //
    // So: offer the chunk whole first — an editor/modal scope consumes it —
    // and only if nobody wanted it, replay it as individual keypresses so
    // key repeat works in lists.
    const whole = toEvent(input)
    if (scopes.dispatch(whole)) return
    if (input.length <= 1) return
    for (const ch of input) scopes.dispatch(toEvent(ch))
  })

  useKeymap('global', (event) => {
    const paneIndex = ['1', '2', '3', '4'].indexOf(event.input)
    if (paneIndex !== -1) {
      setPane(PANES[paneIndex].id)
      return 'handled'
    }

    if (event.input === '?') {
      setHelpOpen(true)
      return 'handled'
    }

    if (event.input === 'q') {
      exit()
      return 'handled'
    }

    return 'pass'
  })

  // The frame must be STRICTLY shorter than the terminal: ink emits a
  // trailing newline per frame, and a frame of exactly `rows` lines
  // overflows the viewport — ink then paints nothing at all. (Found the
  // hard way under a 24-row pty; see the phase-1 PR notes.)
  const frameHeight = size.rows - 1
  // Chrome budget: banner + tabs above, hint line below.
  const bodyHeight = Math.max(4, frameHeight - 3)

  return (
    <Box flexDirection="column" height={frameHeight}>
      <InstanceBanner columns={size.columns} />
      <Box>
        {PANES.map((p, i) => (
          <Text
            bold={p.id === pane}
            color={p.id === pane ? theme.fg.accent : theme.fg.muted}
            key={p.id}
          >
            {i + 1} {p.label}{'   '}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column" height={bodyHeight}>
        {helpOpen ? (
          <HelpOverlay
            entries={bindingsForPane(pane)}
            height={bodyHeight}
            onClose={() => {
              setHelpOpen(false)
            }}
          />
        ) : (
          // ApprovalProvider renders EXCLUSIVELY: while a write is pending
          // approval the dialog replaces the pane body, so the user cannot
          // act on anything else mid-decision.
          <ApprovalProvider>
            <PaneBody
              foregroundHost={props.foregroundHost}
              height={bodyHeight}
              initialQuery={props.initialQuery}
              initialTable={props.initialTable}
              onOpenRecord={openRecord}
              onResolveNumber={resolveNumber}
              onShowRunLogs={showRunLogs}
              openRequest={openRequest}
              pane={pane}
              width={size.columns}
            />
          </ApprovalProvider>
        )}
      </Box>
      <Text dimColor>
        {' '}1-4 pane  ?  help  q quit
      </Text>
    </Box>
  )
}

interface PaneBodyProps {
  foregroundHost: { resume(): void; suspend(): void }
  height: number
  initialQuery?: string
  initialTable?: string
  onOpenRecord(table: string, sysId: string): void
  onResolveNumber(table: string, number: string): void
  onShowRunLogs(startedAt: number, endedAt: number): void
  openRequest?: OpenRecordRequest
  pane: PaneId
  width: number
}

function PaneBody(props: PaneBodyProps): ReactElement {
  switch (props.pane) {
    case 'logs': {
      return (
        <LogsPane
          active
          height={props.height}
          onOpenRecord={props.onOpenRecord}
          onResolveNumber={props.onResolveNumber}
          width={props.width}
        />
      )
    }

    case 'ops': {
      return <ComingSoon label="Ops — Flows / ATF / Update Sets" phase="5" />
    }

    case 'records': {
      return (
        <RecordPane
          active
          height={props.height}
          initialQuery={props.initialQuery}
          initialTable={props.initialTable}
          openRequest={props.openRequest}
          width={props.width}
        />
      )
    }

    case 'scripts': {
      return (
        <ScriptsPane
          active
          foregroundHost={props.foregroundHost}
          height={props.height}
          onShowRunLogs={props.onShowRunLogs}
          width={props.width}
        />
      )
    }
  }
}

function ComingSoon(props: { label: string; phase: string }): ReactElement {
  return (
    <Box alignItems="center" flexGrow={1} justifyContent="center">
      <Text dimColor>
        {props.label} arrives in phase {props.phase} (docs/TUI_PLAN.md)
      </Text>
    </Box>
  )
}
