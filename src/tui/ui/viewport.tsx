import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useRef } from 'react'

import { useUi } from '../context/ui-context.js'
import { computeScrollbar, computeWindow } from './viewport-window.js'

/** Anything indexable — arrays and (later) the log ring buffer alike. */
export interface ViewportSource<T> {
  at(index: number): T
  length: number
}

export interface ViewportProps<T> {
  /** Cursor is CONTROLLED — key handling lives with the owner, not here. */
  cursor: number
  emptyState?: ReactElement
  follow?: boolean
  height: number
  renderItem(item: T, index: number, selected: boolean): ReactElement
  scrolloff?: number
  source: ViewportSource<T>
}

/**
 * Windowed list: renders exactly the visible rows plus a scrollbar gutter.
 * Purely presentational — the pure window math lives in viewport-window.ts;
 * the previous top persists in a ref so scrolling is relative.
 */
export function Viewport<T>(props: ViewportProps<T>): ReactElement {
  const { glyphs } = useUi()
  const prevTopRef = useRef(0)

  const { cursor, top, visible } = computeWindow({
    cursor: props.cursor,
    follow: props.follow,
    height: props.height,
    length: props.source.length,
    prevTop: prevTopRef.current,
    scrolloff: props.scrolloff,
  })
  prevTopRef.current = top

  if (props.source.length === 0) {
    return (
      <Box height={props.height} justifyContent="center">
        {props.emptyState ?? <Text dimColor>Nothing to show</Text>}
      </Box>
    )
  }

  const bar = computeScrollbar(props.source.length, props.height, top)
  const rows: ReactElement[] = []
  for (let i = 0; i < visible; i++) {
    const index = top + i
    rows.push(
      <Box key={index}>
        <Box flexGrow={1}>{props.renderItem(props.source.at(index), index, index === cursor)}</Box>
        {bar ? (
          <Text dimColor>{i >= bar.from && i <= bar.to ? glyphs.scrollThumb : glyphs.scrollTrack}</Text>
        ) : null}
      </Box>,
    )
  }

  return (
    <Box flexDirection="column" height={props.height}>
      {rows}
    </Box>
  )
}
