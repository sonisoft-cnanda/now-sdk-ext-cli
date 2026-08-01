import type { ReactElement } from 'react'

import { Box, Text, useApp, useInput } from 'ink'
import { useState } from 'react'

import type { TuiSession } from './boot/session.js'
import type { PaneId } from './commands/registry.js'
import type { KeyEvent } from './keymap/scope-stack.js'

import { bindingsForPane } from './commands/registry.js'
import { SessionProvider } from './context/session-context.js'
import { UiProvider, useUi } from './context/ui-context.js'
import { useKeymap } from './hooks/use-keymap.js'
import { useTerminalSize } from './hooks/use-terminal-size.js'
import { RecordPane } from './panes/records/record-pane.js'
import { HelpOverlay } from './ui/help-overlay.js'
import { InstanceBanner } from './ui/instance-banner.js'
import { theme } from './ui/theme.js'

export interface AppProps {
  ascii?: boolean
  initialPane?: PaneId
  initialQuery?: string
  initialTable?: string
  session: TuiSession
}

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
        <Shell
          initialPane={props.initialPane}
          initialQuery={props.initialQuery}
          initialTable={props.initialTable}
        />
      </UiProvider>
    </SessionProvider>
  )
}

interface ShellProps {
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
  const size = useTerminalSize()
  const [pane, setPane] = useState<PaneId>(props.initialPane ?? 'records')
  const [helpOpen, setHelpOpen] = useState(false)

  useInput((input, key) => {
    const event: KeyEvent = {
      ctrl: key.ctrl,
      input,
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
    }
    scopes.dispatch(event)
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
            onClose={() => {
              setHelpOpen(false)
            }}
          />
        ) : (
          <PaneBody
            height={bodyHeight}
            initialQuery={props.initialQuery}
            initialTable={props.initialTable}
            pane={pane}
            width={size.columns}
          />
        )}
      </Box>
      <Text dimColor>
        {' '}1-4 pane  ?  help  q quit
      </Text>
    </Box>
  )
}

interface PaneBodyProps {
  height: number
  initialQuery?: string
  initialTable?: string
  pane: PaneId
  width: number
}

function PaneBody(props: PaneBodyProps): ReactElement {
  switch (props.pane) {
    case 'logs': {
      return <ComingSoon label="Logs — live syslog tail" phase="2" />
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
          width={props.width}
        />
      )
    }

    case 'scripts': {
      return <ComingSoon label="Scripts — background-script notebook" phase="4" />
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
