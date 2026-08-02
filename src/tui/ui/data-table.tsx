import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useMemo } from 'react'

import type { ColumnSpec } from '../../services/shape/record-columns.js'

import { useUi } from '../context/ui-context.js'
import { fitCell, solveColumns } from './column-solver.js'
import { theme } from './theme.js'
import { Viewport } from './viewport.js'

export interface DataTableRow {
  /** Cell text per column key (display values). */
  cells: Record<string, string>
  /** Optional colour role per column key. */
  colors?: Record<string, string | undefined>
  id: string
  muted?: boolean
}

export interface DataTableProps {
  columns: ColumnSpec[]
  cursor: number
  emptyState?: ReactElement
  height: number
  rows: DataTableRow[]
  selection?: ReadonlySet<string>
  width: number
}

const GUTTER = 4 // cursor glyph + selection tick + spacing

/**
 * Responsive table: columns solved against the live width (dropping the
 * lowest priority when narrow — never silently: the header row ends with
 * +N when columns are hidden), rows windowed through Viewport.
 */
export function DataTable(props: DataTableProps): ReactElement {
  const { glyphs } = useUi()

  const solved = useMemo(
    () => solveColumns(props.columns, Math.max(10, props.width - GUTTER - 1)),
    [props.columns, props.width],
  )

  const header = solved.columns
    .map((c) => fitCell(props.columns.find((s) => s.key === c.key)?.header ?? c.key, c.width))
    .join('  ')

  return (
    <Box flexDirection="column">
      <Box>
        <Text> {'  '}</Text>
        <Text bold color={theme.fg.accent}>
          {header}
          {solved.dropped.length > 0 ? `  +${solved.dropped.length}` : ''}
        </Text>
      </Box>
      <Viewport
        cursor={props.cursor}
        emptyState={props.emptyState}
        height={props.height - 1}
        renderItem={(row: DataTableRow, _index, selected) => {
          const isSelected = props.selection?.has(row.id) ?? false
          const line = solved.columns
            .map((c) => fitCell(row.cells[c.key] ?? '', c.width))
            .join('  ')
          return (
            <Text
              bold={selected}
              color={row.muted ? theme.fg.muted : undefined}
              inverse={selected}
            >
              {selected ? glyphs.cursor : ' '}
              {isSelected ? glyphs.tick : ' '} {line}
            </Text>
          )
        }}
        source={{ at: (i) => props.rows[i], length: props.rows.length }}
      />
    </Box>
  )
}
