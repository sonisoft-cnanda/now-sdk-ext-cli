import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useMemo, useState } from 'react'

import { useKeymap } from '../hooks/use-keymap.js'
import { theme } from './theme.js'
import { Viewport } from './viewport.js'

export interface HelpEntry {
  group: string
  key: string
  label: string
}

export interface HelpOverlayProps {
  entries: HelpEntry[]
  height: number
  onClose(): void
}

type HelpRow =
  | { entry: HelpEntry; kind: 'entry'; }
  | { kind: 'header'; title: string }

/**
 * The ? sheet, derived from the command registry so it can never disagree
 * with the actual bindings. Windowed and scrollable: the registry grows
 * every phase, and an overlay taller than its box does not merely clip in
 * ink — it garbles the whole frame.
 */
export function HelpOverlay(props: HelpOverlayProps): ReactElement {
  const [cursor, setCursor] = useState(0)

  const rows = useMemo<HelpRow[]>(() => {
    const groups = new Map<string, HelpEntry[]>()
    for (const entry of props.entries) {
      const list = groups.get(entry.group) ?? []
      list.push(entry)
      groups.set(entry.group, list)
    }

    const flat: HelpRow[] = []
    for (const [title, entries] of groups) {
      flat.push({ kind: 'header', title })
      for (const entry of entries) flat.push({ entry, kind: 'entry' })
    }

    return flat
  }, [props.entries])

  useKeymap('modal', (event) => {
    if (event.key.escape || event.input === 'q' || event.input === '?') {
      props.onClose()
      return 'handled'
    }

    if (event.key.upArrow || event.input === 'k') {
      setCursor((c) => Math.max(0, c - 1))
      return 'handled'
    }

    if (event.key.downArrow || event.input === 'j') {
      setCursor((c) => Math.min(rows.length - 1, c + 1))
      return 'handled'
    }

    return 'handled' // an overlay owns the keyboard
  })

  // Box chrome (border 2 + title 1 + footer 1) must come out of the budget,
  // or the overlay overflows its container and corrupts the frame.
  const listHeight = Math.max(1, props.height - 5)

  return (
    <Box borderStyle="round" flexDirection="column" paddingX={2}>
      <Text bold>Keymap</Text>
      <Viewport
        cursor={cursor}
        height={listHeight}
        renderItem={(row: HelpRow) =>
          row.kind === 'header' ? (
            <Text bold color={theme.fg.accent}>
              {row.title}
            </Text>
          ) : (
            <Box>
              <Box width={14}>
                <Text color={theme.state.warn}>{row.entry.key}</Text>
              </Box>
              <Text wrap="truncate">{row.entry.label}</Text>
            </Box>
          )
        }
        source={{ at: (i) => rows[i], length: rows.length }}
      />
      <Text dimColor>
        ↑↓ scroll  ·  Esc / q close  ·  {rows.length} bindings
      </Text>
    </Box>
  )
}
