import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useMemo, useState } from 'react'

import { useUi } from '../context/ui-context.js'
import { useKeymap } from '../hooks/use-keymap.js'
import { theme } from './theme.js'
import { Viewport } from './viewport.js'

export interface PickerItem {
  hint?: string
  id: string
  label: string
}

export interface PickerProps {
  /**
   * Shown when the SOURCE is empty, as opposed to the filter excluding
   * everything. "No matches" under a blank filter reads as "your typing
   * was wrong" when the real answer is "there is nothing to choose here."
   */
  emptyMessage?: string
  height: number
  items: PickerItem[]
  onCancel(): void
  onSelect(item: PickerItem): void
  placeholder?: string
  /** Items floated to the top before any filtering (recently used). */
  recentIds?: string[]
  title: string
}

/**
 * THE generic type-to-filter + arrow-select list — table picker, scope
 * picker, flow picker, ATF picker are all this component. No surface in
 * the TUI requires typing an identifier from memory.
 *
 * Registers a 'modal' keymap scope: printable keys type into the filter,
 * arrows move, Enter selects, Esc cancels. Everything is consumed — a
 * picker on screen owns the keyboard.
 */
export function Picker(props: PickerProps): ReactElement {
  const { glyphs } = useUi()
  const [filter, setFilter] = useState('')
  const [cursor, setCursor] = useState(0)

  const { items: allItems, recentIds } = props
  const filtered = useMemo(() => {
    const needle = filter.toLowerCase()
    let items = allItems
    if (needle) {
      items = items.filter(
        (item) =>
          item.label.toLowerCase().includes(needle) ||
          (item.hint ?? '').toLowerCase().includes(needle) ||
          item.id.toLowerCase().includes(needle),
      )
    } else if (recentIds && recentIds.length > 0) {
      const recent = new Set(recentIds)
      items = [...items].sort((a, b) => Number(recent.has(b.id)) - Number(recent.has(a.id)))
    }

    return items
  }, [allItems, recentIds, filter])

  const clampedCursor = Math.min(cursor, Math.max(0, filtered.length - 1))

  useKeymap('modal', (event) => {
    if (event.key.escape) {
      props.onCancel()
      return 'handled'
    }

    if (event.key.return) {
      if (filtered.length > 0) props.onSelect(filtered[clampedCursor])
      return 'handled'
    }

    if (event.key.upArrow) {
      setCursor(Math.max(0, clampedCursor - 1))
      return 'handled'
    }

    if (event.key.downArrow) {
      setCursor(Math.min(filtered.length - 1, clampedCursor + 1))
      return 'handled'
    }

    if (event.key.backspace || event.key.delete) {
      setFilter((f) => f.slice(0, -1))
      setCursor(0)
      return 'handled'
    }

    if (event.input && !event.ctrl && !event.meta) {
      setFilter((f) => f + event.input)
      setCursor(0)
      return 'handled'
    }

    return 'handled' // a picker on screen owns the keyboard
  })

  const listHeight = Math.max(1, props.height - 3)

  return (
    <Box borderStyle="round" flexDirection="column" paddingX={1}>
      <Text bold>{props.title}</Text>
      <Box>
        <Text color={theme.fg.accent}>❯ </Text>
        <Text>{filter}</Text>
        <Text inverse> </Text>
        {filter.length === 0 && props.placeholder ? <Text dimColor> {props.placeholder}</Text> : null}
      </Box>
      <Viewport
        cursor={clampedCursor}
        emptyState={
          <Text color={props.items.length === 0 && props.emptyMessage ? theme.state.warn : undefined} dimColor>
            {props.items.length === 0 && props.emptyMessage ? props.emptyMessage : 'No matches'}
          </Text>
        }
        height={listHeight}
        renderItem={(item: PickerItem, _index, selected) => (
          <Text bold={selected} inverse={selected}>
            {selected ? glyphs.cursor : ' '} {item.label}
            {item.hint ? <Text dimColor>  {item.hint}</Text> : null}
          </Text>
        )}
        source={{ at: (i) => filtered[i], length: filtered.length }}
      />
      <Text dimColor>↑↓ move  ⏎ select  Esc cancel  ·  {filtered.length}/{props.items.length}</Text>
    </Box>
  )
}
