import type { ReactElement } from 'react'

import { Box, Text } from 'ink'

import { useKeymap } from '../hooks/use-keymap.js'
import { theme } from './theme.js'

export interface HelpEntry {
  group: string
  key: string
  label: string
}

export interface HelpOverlayProps {
  entries: HelpEntry[]
  onClose(): void
}

/**
 * The ? sheet. Rendered INSTEAD of the pane body (ink has no z-index — the
 * modal model is exclusive rendering, with banner and tabs persisting).
 * Entries come from the command registry so this can never disagree with
 * the actual bindings.
 */
export function HelpOverlay(props: HelpOverlayProps): ReactElement {
  useKeymap('modal', (event) => {
    if (event.key.escape || event.input === 'q' || event.input === '?') {
      props.onClose()
    }

    return 'handled' // an overlay owns the keyboard
  })

  const groups = new Map<string, HelpEntry[]>()
  for (const entry of props.entries) {
    const list = groups.get(entry.group) ?? []
    list.push(entry)
    groups.set(entry.group, list)
  }

  return (
    <Box borderStyle="round" flexDirection="column" paddingX={2} paddingY={1}>
      <Text bold>Keymap</Text>
      {[...groups.entries()].map(([group, entries]) => (
        <Box flexDirection="column" key={group} marginTop={1}>
          <Text bold color={theme.fg.accent}>{group}</Text>
          {entries.map((entry) => (
            <Box key={`${group}:${entry.key}:${entry.label}`}>
              <Box width={14}>
                <Text color={theme.state.warn}>{entry.key}</Text>
              </Box>
              <Text>{entry.label}</Text>
            </Box>
          ))}
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>Esc / q close</Text>
      </Box>
    </Box>
  )
}
