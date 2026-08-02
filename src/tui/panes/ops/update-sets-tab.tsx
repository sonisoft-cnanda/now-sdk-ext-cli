import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useCallback, useEffect, useState } from 'react'

import type { ApprovalSpec } from '../../data/approvals.js'
import type { UpdateSetComponent, UpdateSetSummary } from '../../data/automation.gateway.js'

import { useApproval } from '../../context/approval-context.js'
import { useSession } from '../../context/session-context.js'
import { useUi } from '../../context/ui-context.js'
import { useAsyncResource } from '../../hooks/use-async-resource.js'
import { useKeymap } from '../../hooks/use-keymap.js'
import { theme } from '../../ui/theme.js'
import { useToast } from '../../ui/toast-host.js'
import { Viewport } from '../../ui/viewport.js'

export interface UpdateSetsTabProps {
  active: boolean
  height: number
  onOpenRecord(table: string, sysId: string): void
  width: number
}

/**
 * Current update set, the list, and what is inside one.
 *
 * Switching the current set is a write:context approval whose body must
 * say that everything the user does afterwards lands there — that is the
 * whole reason this surface exists.
 */
export function UpdateSetsTab(props: UpdateSetsTabProps): ReactElement {
  const session = useSession()
  const { glyphs } = useUi()
  const approve = useApproval()
  const toast = useToast()

  const [cursor, setCursor] = useState(0)
  const [inspecting, setInspecting] = useState<null | UpdateSetSummary>(null)
  const [componentCursor, setComponentCursor] = useState(0)

  const current = useAsyncResource<undefined | UpdateSetSummary>()
  const list = useAsyncResource<UpdateSetSummary[]>()
  const contents = useAsyncResource<{ components: UpdateSetComponent[]; total: number }>()
  const { run: runCurrent } = current
  const { run: runList } = list
  const { run: runContents } = contents

  const load = useCallback(() => {
    runCurrent(() => session.gateway.automation.getCurrentUpdateSet())
    runList(() => session.gateway.automation.listUpdateSets())
  }, [runCurrent, runList, session])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!inspecting) return
    runContents(() => session.gateway.automation.inspectUpdateSet(inspecting.sysId))
  }, [inspecting, runContents, session])

  const rows = list.resource.status === 'ready' ? list.resource.data : []
  const currentSet = current.resource.status === 'ready' ? current.resource.data : undefined
  const components = contents.resource.status === 'ready' ? contents.resource.data.components : []

  const switchTo = useCallback(async () => {
    const target = rows[cursor]
    if (!target) return
    if (target.sysId === currentSet?.sysId) {
      toast('info', 'already the current update set')
      return
    }

    const spec: ApprovalSpec = {
      actionKind: 'updateset.set',
      danger: 'Every change you make for the rest of this session will be captured in this update set.',
      detail: [{ after: target.name, before: currentSet?.name ?? '(none)', label: 'current update set' }],
      provenance: 'selected from the update set list',
      target: { count: 1, identifier: target.name, instance: session.host, table: 'sys_update_set' },
      title: `switch current update set to ${target.name}`,
    }
    const token = await approve(spec)
    if (!token) return
    try {
      await session.gateway.automation.setCurrentUpdateSet(spec, token, target.sysId)
      // The banner reads ambient state from its own cache; drop it so the
      // change shows immediately rather than up to 60s later.
      session.gateway.ambient.invalidate()
      toast('success', `now capturing into ${target.name}`)
      load()
    } catch (error) {
      toast('error', (error as Error).message)
    }
  }, [approve, cursor, currentSet, load, rows, session, toast])

  useKeymap(
    'pane',
    (event) => {
      if (inspecting) {
        if (event.key.escape) {
          setInspecting(null)
          return 'handled'
        }

        if (event.key.upArrow || event.input === 'k') {
          setComponentCursor((c) => Math.max(0, c - 1))
          return 'handled'
        }

        if (event.key.downArrow || event.input === 'j') {
          setComponentCursor((c) => Math.min(components.length - 1, c + 1))
          return 'handled'
        }

        return 'pass'
      }

      if (event.key.upArrow || event.input === 'k') {
        setCursor((c) => Math.max(0, c - 1))
        return 'handled'
      }

      if (event.key.downArrow || event.input === 'j') {
        setCursor((c) => Math.min(rows.length - 1, c + 1))
        return 'handled'
      }

      if (event.key.return && rows[cursor]) {
        setInspecting(rows[cursor])
        setComponentCursor(0)
        return 'handled'
      }

      if (event.input === 'S' && rows[cursor]) {
        switchTo().catch((): undefined => undefined)
        return 'handled'
      }

      if (event.input === 'o' && rows[cursor]) {
        props.onOpenRecord('sys_update_set', rows[cursor].sysId)
        return 'handled'
      }

      if (event.input === 'r') {
        load()
        return 'handled'
      }

      return 'pass'
    },
    props.active,
  )

  const listHeight = Math.max(1, props.height - 2)

  if (inspecting) {
    return (
      <Box flexDirection="column">
        <Box>
          <Text bold color={theme.fg.accent}>{inspecting.name}</Text>
          <Text dimColor>
            {'  '}
            {contents.resource.status === 'ready' ? `${contents.resource.data.total} records` : 'loading…'}
            {'   Esc back'}
          </Text>
        </Box>
        <Viewport
          cursor={Math.min(componentCursor, Math.max(0, components.length - 1))}
          emptyState={
            <Text dimColor>
              {contents.resource.status === 'ready' ? 'Empty update set' : 'Loading contents…'}
            </Text>
          }
          height={listHeight}
          renderItem={(c: UpdateSetComponent, _i, selected) => (
            <Box flexDirection="column">
              <Text inverse={selected} wrap="truncate">
                {selected ? glyphs.cursor : ' '} <Text bold>{String(c.count).padStart(4)}</Text>  {c.type}
              </Text>
              {selected && c.items.length > 0 ? (
                <Text dimColor wrap="truncate">      {c.items.slice(0, 6).join(', ')}</Text>
              ) : null}
            </Box>
          )}
          source={{ at: (i) => components[i], length: components.length }}
        />
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>current </Text>
        <Text bold color={currentSet?.isDefault ? theme.state.warn : theme.fg.accent}>
          {currentSet?.name ?? '…'}
        </Text>
        {currentSet?.isDefault ? (
          <Text color={theme.state.warn}>
            {' '}{glyphs.warn} changes are going into Default
          </Text>
        ) : null}
      </Box>
      <Viewport
        cursor={Math.min(cursor, Math.max(0, rows.length - 1))}
        emptyState={
          <Text dimColor>{list.resource.status === 'ready' ? 'No update sets' : 'Loading…'}</Text>
        }
        height={listHeight}
        renderItem={(row: UpdateSetSummary, _i, selected) => {
          const isCurrent = row.sysId === currentSet?.sysId
          return (
            <Text inverse={selected} wrap="truncate">
              {selected ? glyphs.cursor : ' '}
              <Text color={isCurrent ? theme.state.ok : undefined}>{isCurrent ? glyphs.active : ' '}</Text>
              {' '}
              <Text color={row.isDefault ? theme.state.warn : undefined}>{row.name.slice(0, 44).padEnd(44)}</Text>
              <Text dimColor>{row.state}</Text>
            </Text>
          )
        }}
        source={{ at: (i) => rows[i], length: rows.length }}
      />
      <Text dimColor>⏎ contents  S switch current  o open record  r refresh</Text>
    </Box>
  )
}
