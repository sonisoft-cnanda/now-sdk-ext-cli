import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useState } from 'react'

import { useKeymap } from '../../hooks/use-keymap.js'
import { theme } from '../../ui/theme.js'
import { AtfTab } from './atf-tab.js'
import { FlowsTab } from './flows-tab.js'
import { UpdateSetsTab } from './update-sets-tab.js'

export type OpsTab = 'atf' | 'flows' | 'update-sets'

export interface OpsPaneProps {
  active: boolean
  height: number
  onOpenRecord(table: string, sysId: string): void
  width: number
}

const TABS: Array<{ id: OpsTab; label: string }> = [
  { id: 'flows', label: 'Flows' },
  { id: 'atf', label: 'ATF' },
  { id: 'update-sets', label: 'Update Sets' },
]

/**
 * Ops: the delivery side of ServiceNow work. Three sub-tabs cycled by
 * pressing `4` again (the pane's own digit) — no extra keys needed, per
 * the keymap design.
 */
export function OpsPane(props: OpsPaneProps): ReactElement {
  const [tab, setTab] = useState<OpsTab>('flows')

  useKeymap(
    'pane',
    (event) => {
      if (event.input === '4') {
        const index = TABS.findIndex((t) => t.id === tab)
        setTab(TABS[(index + 1) % TABS.length].id)
        return 'handled'
      }

      return 'pass'
    },
    props.active,
  )

  const bodyHeight = Math.max(2, props.height - 1)

  return (
    <Box flexDirection="column">
      <Box>
        {TABS.map((t) => (
          <Text bold={t.id === tab} color={t.id === tab ? theme.fg.accent : theme.fg.muted} key={t.id}>
            {t.label}
            {'   '}
          </Text>
        ))}
        <Text dimColor>(4 cycles)</Text>
      </Box>
      {tab === 'flows' ? (
        <FlowsTab active={props.active} height={bodyHeight} onOpenRecord={props.onOpenRecord} width={props.width} />
      ) : null}
      {tab === 'atf' ? (
        <AtfTab active={props.active} height={bodyHeight} onOpenRecord={props.onOpenRecord} width={props.width} />
      ) : null}
      {tab === 'update-sets' ? (
        <UpdateSetsTab active={props.active} height={bodyHeight} onOpenRecord={props.onOpenRecord} width={props.width} />
      ) : null}
    </Box>
  )
}
