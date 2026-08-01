import type { ReactElement } from 'react'

import { Box, Text, useApp, useInput } from 'ink'

export interface AppProps {
  alias: string
  host: string
  user: string
}

/**
 * Root of the TUI. Phase-0 skeleton: proves the toolchain (JSX build, alt
 * screen, raw-mode input, clean teardown) before any pane exists.
 */
export function App(props: AppProps): ReactElement {
  const { exit } = useApp()

  useInput((input) => {
    if (input === 'q') {
      exit()
    }
  })

  return (
    <Box borderStyle="round" flexDirection="column" paddingX={1}>
      <Text bold>nex tui</Text>
      <Text>
        {props.alias} · {props.host} · {props.user}
      </Text>
      <Text dimColor>Phase 0 skeleton — press q to quit</Text>
    </Box>
  )
}
