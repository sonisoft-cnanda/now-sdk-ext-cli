import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useEffect, useMemo, useState } from 'react'

import type { FieldSpec, RecordRow, TableSchema } from '../../data/types.js'

import { useSession } from '../../context/session-context.js'
import { useUi } from '../../context/ui-context.js'
import { useAsyncResource } from '../../hooks/use-async-resource.js'
import { useKeymap } from '../../hooks/use-keymap.js'
import { theme } from '../../ui/theme.js'
import { Viewport } from '../../ui/viewport.js'

export interface RecordFormProps {
  active: boolean
  height: number
  onBack(): void
  onOpenReference(table: string, sysId: string): void
  sysId: string
  table: string
}

interface FormRow {
  spec: FieldSpec
  value: { displayValue: string; value: string }
}

/**
 * Read-only record form: dictionary truth (label, type, mandatory,
 * read-only) from the cached schema, values with display labels. Section
 * grouping is the simple heuristic from the plan — system fields last —
 * because evaluating UI policies/ACLs client-side is a correctness trap;
 * the server stays the authority.
 */
export function RecordForm(props: RecordFormProps): ReactElement {
  const session = useSession()
  const { glyphs } = useUi()
  const [cursor, setCursor] = useState(0)

  const record = useAsyncResource<undefined | { row: RecordRow | undefined; schema: TableSchema }>()
  const { run } = record

  useEffect(() => {
    run(async () => {
      const [row, schema] = await Promise.all([
        session.gateway.records.fetchRecord(props.table, props.sysId),
        session.gateway.records.getSchema(props.table),
      ])
      return { row, schema }
    })
  }, [run, session, props.table, props.sysId])

  const rows: FormRow[] = useMemo(() => {
    if (record.resource.status !== 'ready' || !record.resource.data?.row) return []
    const { row, schema } = record.resource.data
    const bySpec = new Map(schema.fields.map((f) => [f.name, f]))
    const names = Object.keys(row.cells)
    const isSystem = (n: string) => n.startsWith('sys_')
    names.sort((a, b) => Number(isSystem(a)) - Number(isSystem(b)) || a.localeCompare(b))
    return names.map((name) => ({
      spec: bySpec.get(name) ?? {
        controlKind: 'text' as const,
        label: name,
        mandatory: false,
        name,
        readOnly: true,
        type: '',
      },
      value: row.cells[name],
    }))
  }, [record.resource])

  useKeymap(
    'pane',
    (event) => {
      if (event.key.escape) {
        props.onBack()
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

      if (event.input === 'g') {
        setCursor(0)
        return 'handled'
      }

      if (event.input === 'G') {
        setCursor(Math.max(0, rows.length - 1))
        return 'handled'
      }

      if (event.input === 'o') {
        const row = rows[Math.min(cursor, rows.length - 1)]
        if (row && row.spec.controlKind === 'reference' && row.spec.reference && row.value.value) {
          props.onOpenReference(row.spec.reference, row.value.value)
        }

        return 'handled'
      }

      return 'pass'
    },
    props.active,
  )

  if (record.resource.status === 'loading' || record.resource.status === 'idle') {
    return <Text dimColor>Loading {props.table} {props.sysId}…</Text>
  }

  if (record.resource.status === 'error') {
    return <Text color={theme.state.error}>{glyphs.cross} {record.resource.error.message}</Text>
  }

  if (!record.resource.data?.row) {
    return <Text color={theme.state.warn}>{glyphs.warn} No record {props.sysId} in {props.table}</Text>
  }

  const labelWidth = 24

  return (
    <Box flexDirection="column">
      <Viewport
        cursor={Math.min(cursor, Math.max(0, rows.length - 1))}
        height={props.height}
        renderItem={(row: FormRow, _index, selected) => {
          const isRef = row.spec.controlKind === 'reference' && Boolean(row.value.value)
          return (
            <Box>
              <Text inverse={selected}>{selected ? glyphs.cursor : ' '} </Text>
              <Box width={labelWidth}>
                <Text color={row.spec.readOnly ? theme.edit.readonly : undefined}>
                  {row.spec.label.slice(0, labelWidth - 2)}
                  {row.spec.mandatory ? <Text color={theme.edit.mandatory}>*</Text> : null}
                </Text>
              </Box>
              <Text
                color={row.value.displayValue ? undefined : theme.fg.muted}
                dimColor={row.spec.readOnly}
              >
                {row.value.displayValue || glyphs.emptyValue}
              </Text>
              {isRef ? <Text color={theme.fg.accent}> {glyphs.reference}</Text> : null}
            </Box>
          )
        }}
        source={{ at: (i) => rows[i], length: rows.length }}
      />
    </Box>
  )
}
