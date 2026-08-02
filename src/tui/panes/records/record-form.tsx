import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ApprovalSpec } from '../../data/approvals.js'
import type { FieldChoice, FieldSpec, RecordRow, TableSchema } from '../../data/types.js'

import { useApproval } from '../../context/approval-context.js'
import { useSession } from '../../context/session-context.js'
import { useUi } from '../../context/ui-context.js'
import { useAsyncResource } from '../../hooks/use-async-resource.js'
import { useKeymap } from '../../hooks/use-keymap.js'
import { Picker } from '../../ui/picker.js'
import { theme } from '../../ui/theme.js'
import { useToast } from '../../ui/toast-host.js'
import { Viewport } from '../../ui/viewport.js'

export interface RecordFormProps {
  active: boolean
  height: number
  onBack(): void
  onDirtyChange(dirty: boolean): void
  onOpenReference(table: string, sysId: string): void
  sysId: string
  table: string
}

interface FormRow {
  spec: FieldSpec
  value: { displayValue: string; value: string }
}

/**
 * The record form. Reads render dictionary truth (label, type, mandatory,
 * read-only) from the cached schema; real `sys_ui_section` layouts and
 * client-side UI-policy/ACL evaluation stay out by design — a form that
 * believes a field is editable when an ACL disagrees fails confusingly at
 * save time, so the server remains the authority.
 *
 * Edits stage LOCALLY (dirty markers) and only reach the instance through
 * the approval path on ^S, where the diff is the dialog body.
 */
export function RecordForm(props: RecordFormProps): ReactElement {
  const session = useSession()
  const { glyphs } = useUi()
  const approve = useApproval()
  const toast = useToast()
  const [cursor, setCursor] = useState(0)
  const [staged, setStaged] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<null | string>(null)
  const [draft, setDraft] = useState('')
  const [choicePicker, setChoicePicker] = useState<FieldChoice[] | null>(null)
  const [saving, setSaving] = useState(false)

  const record = useAsyncResource<undefined | { row: RecordRow | undefined; schema: TableSchema }>()
  const { run } = record

  const load = useCallback(() => {
    run(async () => {
      const [row, schema] = await Promise.all([
        session.gateway.records.fetchRecord(props.table, props.sysId),
        session.gateway.records.getSchema(props.table),
      ])
      return { row, schema }
    })
  }, [run, session, props.table, props.sysId])

  useEffect(() => {
    load()
  }, [load])

  const dirtyCount = Object.keys(staged).length
  const { onDirtyChange } = props
  useEffect(() => {
    onDirtyChange(dirtyCount > 0)
  }, [dirtyCount, onDirtyChange])

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

  const current = rows[Math.min(cursor, Math.max(0, rows.length - 1))]

  const beginEdit = useCallback(
    async (row: FormRow) => {
      if (row.spec.readOnly) {
        toast('info', `${row.spec.label} is read-only in the dictionary`)
        return
      }

      if (row.spec.controlKind === 'choice') {
        const choices = await session.gateway.records
          .getChoices(props.table, row.spec.name)
          .catch(() => [] as FieldChoice[])
        if (choices.length > 0) {
          setChoicePicker(choices)
          setEditing(row.spec.name)
          return
        }
      }

      setEditing(row.spec.name)
      setDraft(staged[row.spec.name] ?? row.value.value)
    },
    [props.table, session, staged, toast],
  )

  const save = useCallback(async () => {
    if (dirtyCount === 0 || saving) return
    const bySpec = new Map(rows.map((r) => [r.spec.name, r]))
    const spec: ApprovalSpec = {
      actionKind: 'record.update',
      detail: Object.entries(staged).map(([name, after]) => ({
        after,
        before: bySpec.get(name)?.value.value ?? '',
        label: bySpec.get(name)?.spec.label ?? name,
      })),
      target: {
        count: 1,
        identifier:
          bySpec.get('number')?.value.displayValue || props.sysId.slice(0, 12) + glyphs.ellipsis,
        instance: session.host,
        table: props.table,
      },
      title: `update ${dirtyCount} field${dirtyCount === 1 ? '' : 's'}`,
    }

    const token = await approve(spec)
    if (!token) {
      toast('info', session.readOnly ? 'session is read-only — edit discarded' : 'cancelled')
      return
    }

    setSaving(true)
    try {
      await session.gateway.records.updateRecord(spec, token, {
        patch: staged,
        sysId: props.sysId,
        table: props.table,
      })
      setStaged({})
      toast('success', `saved ${dirtyCount} field${dirtyCount === 1 ? '' : 's'}`)
      load()
    } catch (error) {
      const err = error as { message?: string; remediation?: string }
      toast('error', err.remediation ?? err.message ?? 'save failed')
    } finally {
      setSaving(false)
    }
  }, [approve, dirtyCount, glyphs, load, props.sysId, props.table, rows, saving, session, staged, toast])

  useKeymap(
    'pane',
    (event) => {
      if (event.key.escape) {
        if (dirtyCount > 0) {
          toast('info', `${dirtyCount} unsaved change${dirtyCount === 1 ? '' : 's'} — ^S saves, u discards`)
          return 'handled'
        }

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

      if (event.input === 'e' && current) {
        beginEdit(current).catch((): undefined => undefined)
        return 'handled'
      }

      if (event.chord === 's') {
        save().catch((): undefined => undefined)
        return 'handled'
      }

      if (event.input === 'u' && dirtyCount > 0) {
        setStaged({})
        toast('info', 'discarded staged changes')
        return 'handled'
      }

      if (event.input === 'o' && current) {
        if (current.spec.controlKind === 'reference' && current.spec.reference && current.value.value) {
          props.onOpenReference(current.spec.reference, current.value.value)
        }

        return 'handled'
      }

      return 'pass'
    },
    props.active && editing === null,
  )

  const stageDraft = useCallback(
    (value: string) => {
      if (!editing) return
      const original = rows.find((r) => r.spec.name === editing)?.value.value ?? ''
      setStaged((s) => {
        const next = { ...s }
        // Typing a value back to its original un-stages it — the diff shown
        // at approval must never contain a no-op change.
        if (value === original) delete next[editing]
        else next[editing] = value
        return next
      })
      setEditing(null)
    },
    [editing, rows],
  )

  // Field editor (text-ish controls).
  useKeymap(
    'editor',
    (event) => {
      if (event.key.escape) {
        setEditing(null)
        return 'handled'
      }

      if (event.key.return) {
        stageDraft(draft)
        return 'handled'
      }

      if (event.key.backspace || event.key.delete) {
        setDraft((d) => d.slice(0, -1))
        return 'handled'
      }

      if (event.input && !event.ctrl && !event.meta) {
        // Ink batches stdin, so a newline can arrive INSIDE a chunk rather
        // than as key.return — same contract as the query bar: text before
        // the first newline is typed, the newline commits, and control
        // characters never enter the value.
        const [first, ...rest] = event.input.split(/[\n\r]/)
        // eslint-disable-next-line no-control-regex
        const clean = first.replaceAll(/[\u0000-\u001F\u007F]/g, '')
        if (rest.length > 0) stageDraft(draft + clean)
        else setDraft((d) => d + clean)
        return 'handled'
      }

      return 'handled'
    },
    props.active && editing !== null && choicePicker === null,
  )

  if (choicePicker && editing) {
    return (
      <Picker
        height={props.height}
        items={choicePicker.map((c) => ({ hint: c.value, id: c.value, label: c.label }))}
        onCancel={() => {
          setChoicePicker(null)
          setEditing(null)
        }}
        onSelect={(item) => {
          const original = rows.find((r) => r.spec.name === editing)?.value.value ?? ''
          setStaged((s) => {
            const next = { ...s }
            if (item.id === original) delete next[editing]
            else next[editing] = item.id
            return next
          })
          setChoicePicker(null)
          setEditing(null)
        }}
        title={`${editing} — choose a value`}
      />
    )
  }

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
        height={props.height - 1}
        renderItem={(row: FormRow, _index, selected) => {
          const isRef = row.spec.controlKind === 'reference' && Boolean(row.value.value)
          const stagedValue = staged[row.spec.name]
          const isDirty = stagedValue !== undefined
          const isEditing = editing === row.spec.name
          return (
            <Box>
              <Text inverse={selected}>{selected ? glyphs.cursor : ' '} </Text>
              <Box width={labelWidth}>
                <Text color={row.spec.readOnly ? theme.edit.readonly : undefined}>
                  {row.spec.label.slice(0, labelWidth - 3)}
                  {row.spec.mandatory ? <Text color={theme.edit.mandatory}>*</Text> : null}
                </Text>
              </Box>
              {isEditing ? (
                <Text>
                  <Text>{draft}</Text>
                  <Text inverse> </Text>
                </Text>
              ) : (
                <Text
                  color={isDirty ? theme.edit.dirty : row.value.displayValue ? undefined : theme.fg.muted}
                  dimColor={row.spec.readOnly && !isDirty}
                >
                  {isDirty ? `${stagedValue} (was ${row.value.displayValue || glyphs.emptyValue})` : row.value.displayValue || glyphs.emptyValue}
                </Text>
              )}
              {isRef && !isEditing ? <Text color={theme.fg.accent}> {glyphs.reference}</Text> : null}
            </Box>
          )
        }}
        source={{ at: (i) => rows[i], length: rows.length }}
      />
      <Text dimColor>
        {editing
          ? '⏎ stage  Esc cancel'
          : `e edit  ^S save  u discard  o open ref  Esc back${dirtyCount > 0 ? `  ${glyphs.separator} ${dirtyCount} unsaved` : ''}${saving ? '  saving…' : ''}`}
      </Text>
    </Box>
  )
}
