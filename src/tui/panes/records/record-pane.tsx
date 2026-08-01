import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { RecordPage } from '../../data/types.js'
import type { PickerItem } from '../../ui/picker.js'

import { chooseRecordColumns } from '../../../services/shape/record-columns.js'
import { useSession } from '../../context/session-context.js'
import { useUi } from '../../context/ui-context.js'
import { useAsyncResource } from '../../hooks/use-async-resource.js'
import { useKeymap } from '../../hooks/use-keymap.js'
import { DataTable } from '../../ui/data-table.js'
import { Picker } from '../../ui/picker.js'
import { theme } from '../../ui/theme.js'
import { RecordForm } from './record-form.js'

export interface RecordPaneProps {
  active: boolean
  height: number
  initialQuery?: string
  initialTable?: string
  width: number
}

interface FormTarget {
  sysId: string
  table: string
}

const PAGE_LIMIT = 25

/**
 * The Records pane: table picker → encoded-query bar → paged list →
 * read-only form with reference navigation. Auto-refresh is deliberately
 * OFF — a list that reorders under a selection is how you act on the wrong
 * rows; the footer shows the fetch time and r is explicit.
 */
export function RecordPane(props: RecordPaneProps): ReactElement {
  const session = useSession()
  const { glyphs } = useUi()

  const [table, setTable] = useState<string | undefined>(props.initialTable)
  const [query, setQuery] = useState(props.initialQuery ?? '')
  const [queryDraft, setQueryDraft] = useState<null | string>(null)
  const [offset, setOffset] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(!props.initialTable)
  const [stack, setStack] = useState<FormTarget[]>([])

  const page = useAsyncResource<RecordPage>()
  const count = useAsyncResource<number>()
  const tables = useAsyncResource<PickerItem[]>()
  const { run: runPage } = page
  const { run: runCount } = count
  const { run: runTables } = tables

  const refresh = useCallback(() => {
    if (!table) return
    runPage(() => session.gateway.records.fetchPage({ limit: PAGE_LIMIT, offset, query, table }))
    runCount(() => session.gateway.records.countQuery(table, query))
  }, [runPage, runCount, session, table, query, offset])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!pickerOpen) return
    runTables(async () => {
      const list = await session.gateway.records.listTables()
      return list.map((t) => ({ hint: t.label === t.name ? undefined : t.label, id: t.name, label: t.name }))
    })
  }, [pickerOpen, runTables, session])

  const pageResource = page.resource
  const rows = useMemo(
    () => (pageResource.status === 'ready' ? pageResource.data.rows : []),
    [pageResource],
  )
  const total = count.resource.status === 'ready' ? count.resource.data : undefined
  const hasMore = page.resource.status === 'ready' && page.resource.data.hasMore
  const editingQuery = queryDraft !== null
  const inForm = stack.length > 0

  const columns = useMemo(
    () => chooseRecordColumns(rows.map((r) => r.cells), table ?? ''),
    [rows, table],
  )

  const tableRows = useMemo(
    () =>
      rows.map((row) => ({
        cells: Object.fromEntries(
          Object.entries(row.cells).map(([key, cell]) => [key, cell.displayValue]),
        ),
        id: row.sysId,
        muted: row.cells.active?.value === 'false',
      })),
    [rows],
  )

  // List navigation — active only when the list is the focused surface.
  useKeymap(
    'pane',
    (event) => {
      if (event.input === 't') {
        setPickerOpen(true)
        return 'handled'
      }

      if (event.input === '/') {
        setQueryDraft(query)
        return 'handled'
      }

      if (!table) return 'pass'

      if (event.key.upArrow || event.input === 'k') {
        setCursor((c) => Math.max(0, c - 1))
        return 'handled'
      }

      if (event.key.downArrow || event.input === 'j') {
        setCursor((c) => Math.min(rows.length - 1, c + 1))
        return 'handled'
      }

      if (event.input === 'g') {
        setCursor(0)
        return 'handled'
      }

      if (event.input === 'G') {
        setCursor(Math.max(0, rows.length - 1))
        return 'handled'
      }

      if (event.input === 'n' && hasMore) {
        setOffset((o) => o + PAGE_LIMIT)
        setCursor(0)
        return 'handled'
      }

      if (event.input === 'p' && offset > 0) {
        setOffset((o) => Math.max(0, o - PAGE_LIMIT))
        setCursor(0)
        return 'handled'
      }

      if (event.input === 'x' && rows[cursor]) {
        const id = rows[cursor].sysId
        setSelection((s) => {
          const next = new Set(s)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })
        return 'handled'
      }

      if (event.input === 'X') {
        setSelection(new Set(rows.map((r) => r.sysId)))
        return 'handled'
      }

      if (event.input === '-') {
        setSelection(new Set())
        return 'handled'
      }

      if (event.input === 'r') {
        refresh()
        return 'handled'
      }

      if (event.key.return && rows[cursor]) {
        setStack([{ sysId: rows[cursor].sysId, table }])
        return 'handled'
      }

      return 'pass'
    },
    props.active && !pickerOpen && !editingQuery && !inForm,
  )

  // Query editing — an 'editor' scope that owns the keyboard while open.
  useKeymap(
    'editor',
    (event) => {
      if (event.key.escape) {
        setQueryDraft(null)
        return 'handled'
      }

      if (event.key.return) {
        setQuery(queryDraft ?? '')
        setQueryDraft(null)
        setOffset(0)
        setCursor(0)
        return 'handled'
      }

      if (event.key.backspace || event.key.delete) {
        setQueryDraft((d) => (d ?? '').slice(0, -1))
        return 'handled'
      }

      if (event.input && !event.ctrl && !event.meta) {
        setQueryDraft((d) => (d ?? '') + event.input)
        return 'handled'
      }

      return 'handled'
    },
    props.active && editingQuery,
  )

  if (pickerOpen) {
    return (
      <Picker
        height={props.height}
        items={tables.resource.status === 'ready' ? tables.resource.data : []}
        onCancel={() => {
          setPickerOpen(false)
        }}
        onSelect={(item) => {
          setTable(item.id)
          setPickerOpen(false)
          setOffset(0)
          setCursor(0)
          setSelection(new Set())
        }}
        placeholder={tables.resource.status === 'loading' ? 'loading tables…' : 'type to filter tables'}
        title="Table"
      />
    )
  }

  if (inForm) {
    const target = stack.at(-1)!
    return (
      <Box flexDirection="column">
        <Box>
          <Text color={theme.fg.accent}>
            {stack.map((t) => `${t.table}`).join(' ▸ ')}
          </Text>
          <Text dimColor>  Esc back  o open reference</Text>
        </Box>
        <RecordForm
          active={props.active}
          height={props.height - 1}
          key={`${target.table}:${target.sysId}`}
          onBack={() => {
            setStack((s) => s.slice(0, -1))
          }}
          onOpenReference={(refTable, refSysId) => {
            setStack((s) => [...s, { sysId: refSysId, table: refTable }])
          }}
          sysId={target.sysId}
          table={target.table}
        />
      </Box>
    )
  }

  const rangeFrom = rows.length === 0 ? 0 : offset + 1
  const rangeTo = offset + rows.length
  const fetchedAt =
    page.resource.status === 'ready'
      ? new Date(page.resource.data.fetchedAt).toTimeString().slice(0, 8)
      : undefined

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>table </Text>
        <Text bold color={theme.fg.accent}>{table ?? '(none — press t)'}</Text>
        <Text dimColor>  query </Text>
        {editingQuery ? (
          <>
            <Text>{queryDraft}</Text>
            <Text inverse> </Text>
            <Text dimColor>  ⏎ run  Esc cancel</Text>
          </>
        ) : (
          <Text>{query || <Text dimColor>(all records — press / to filter)</Text>}</Text>
        )}
      </Box>
      {page.resource.status === 'error' ? (
        <Box flexDirection="column" height={props.height - 2}>
          <Text color={theme.state.error}>{glyphs.cross} {page.resource.error.message}</Text>
          <Text dimColor>r retry · t change table · / edit query</Text>
        </Box>
      ) : (
        <DataTable
          columns={columns}
          cursor={Math.min(cursor, Math.max(0, tableRows.length - 1))}
          emptyState={
            <Text dimColor>
              {page.resource.status === 'loading' ? 'Loading…' : table ? 'No records match' : 'Pick a table with t'}
            </Text>
          }
          height={props.height - 3}
          rows={tableRows}
          selection={selection}
          width={props.width}
        />
      )}
      <Box>
        <Text dimColor>
          {selection.size > 0 ? `${selection.size} selected ${glyphs.separator} ` : ''}
          {rangeFrom}–{rangeTo}
          {total === undefined ? ' of ?' : ` of ${total}`}
          {hasMore ? ` ${glyphs.separator} n next` : ''}
          {offset > 0 ? ` ${glyphs.separator} p prev` : ''}
          {fetchedAt ? ` ${glyphs.separator} fetched ${fetchedAt}` : ''}
          {page.resource.status === 'loading' ? ` ${glyphs.separator} loading…` : ''}
        </Text>
      </Box>
    </Box>
  )
}
