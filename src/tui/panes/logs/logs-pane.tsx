import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { writeFileSync } from 'node:fs'
import { useCallback, useEffect, useState } from 'react'

import type { FilterRule } from '../../../services/log-filter.service.js'
import type { LogEntry } from '../../../services/shape/log-entry.js'
import type { PaneIntent } from '../../commands/palette-actions.js'
import type { LogReference } from './log-references.js'

import { LogFilterService } from '../../../services/log-filter.service.js'
import { useSession } from '../../context/session-context.js'
import { useUi } from '../../context/ui-context.js'
import { loadPrefs, savePrefs } from '../../data/prefs.js'
import { useKeymap } from '../../hooks/use-keymap.js'
import { useStreamVersion } from '../../hooks/use-stream-buffer.js'
import { Picker } from '../../ui/picker.js'
import { theme } from '../../ui/theme.js'
import { Viewport } from '../../ui/viewport.js'
import { detectReferences } from './log-references.js'

export interface LogsPaneProps {
  active: boolean
  height: number
  /** An action raised from the command palette. */
  intent?: { serial: number; value: PaneIntent }
  onOpenRecord(table: string, sysId: string): void
  onResolveNumber(table: string, number: string): void
  width: number
}

const SEVERITY_COLOR: Record<string, string | undefined> = {
  error: theme.state.error,
  plain: undefined,
  success: theme.state.ok,
  system: theme.state.info,
  warn: theme.state.warn,
}

const filterService = new LogFilterService()

/**
 * The live syslog tail. Ingest and filtering live in LogsGateway (outside
 * React); this pane renders the filtered view at ≤10fps and owns follow/
 * pause, find, the rules editor, reference jumps and write-to-file.
 *
 * The tail keeps running when you switch panes — buffering continues while
 * you browse records, which is the point of a workspace.
 */
export function LogsPane(props: LogsPaneProps): ReactElement {
  const session = useSession()
  const { glyphs } = useUi()
  const {logs} = session.gateway

  const [follow, setFollow] = useState(true)
  const [cursor, setCursor] = useState(0)
  const [pausedAt, setPausedAt] = useState(0)
  const [findTerm, setFindTerm] = useState('')
  const [findDraft, setFindDraft] = useState<null | string>(null)
  const [ruleStrings, setRuleStrings] = useState<string[]>(() => loadPrefs(session.alias).logRules ?? [])
  const [rulesOpen, setRulesOpen] = useState(false)
  const [ruleDraft, setRuleDraft] = useState('')
  const [ruleCursor, setRuleCursor] = useState(0)
  const [ruleError, setRuleError] = useState<null | string>(null)
  const [refPicker, setRefPicker] = useState<LogReference[] | null>(null)
  const [notice, setNotice] = useState<null | string>(null)

  useStreamVersion(logs, 10)

  // Start the tail on first mount of the pane; it survives pane switches
  // and is stopped by the gateway's disposer on exit.
  useEffect(() => {
    if (!logs.isTailing()) logs.startTail()
  }, [logs])

  // Apply persisted/edited rules to the ingest filter.
  const applyRules = useCallback(
    (strings: string[]) => {
      const rules: FilterRule[] = []
      for (const s of strings) {
        try {
          rules.push(filterService.parseFilter(s))
        } catch {
          // invalid persisted rule — ignore it rather than break the tail
        }
      }

      logs.setRules(rules)
    },
    [logs],
  )

  useEffect(() => {
    applyRules(ruleStrings)
  }, [applyRules, ruleStrings])

  const view = logs.viewSource()
  const {length} = view
  const effectiveCursor = follow ? Math.max(0, length - 1) : Math.min(cursor, Math.max(0, length - 1))
  const newBelow = follow ? 0 : Math.max(0, length - pausedAt)

  const pause = useCallback(() => {
    setFollow((f) => {
      if (f) setPausedAt(length)
      return false
    })
  }, [length])

  useEffect(() => {
    if (props.intent?.serial === undefined) return
    if (props.intent.value.kind === 'toggle-follow') {
      if (follow) pause()
      else setFollow(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.intent?.serial])

  const jumpRef = useCallback(
    (ref: LogReference) => {
      setRefPicker(null)
      switch (ref.kind) {
        case 'record-number': {
          props.onResolveNumber(ref.table, ref.number)
          break
        }

        case 'source-filter': {
          setRuleStrings((rules) => [...rules, `source EQUALS ${ref.source}`])
          break
        }

        case 'sys-id': {
          props.onOpenRecord(ref.table, ref.sysId)
          break
        }
      }
    },
    [props],
  )

  // Stream navigation.
  useKeymap(
    'pane',
    (event) => {
      if (event.input === ' ') {
        if (follow) pause()
        else setFollow(true)
        return 'handled'
      }

      if (event.key.upArrow || event.input === 'k') {
        pause()
        setCursor(Math.max(0, effectiveCursor - 1))
        return 'handled'
      }

      if (event.key.downArrow || event.input === 'j') {
        setCursor(Math.min(length - 1, effectiveCursor + 1))
        return 'handled'
      }

      if (event.key.pageUp) {
        pause()
        setCursor(Math.max(0, effectiveCursor - (props.height - 6)))
        return 'handled'
      }

      if (event.key.pageDown) {
        setCursor(Math.min(length - 1, effectiveCursor + (props.height - 6)))
        return 'handled'
      }

      if (event.input === 'g') {
        pause()
        setCursor(0)
        return 'handled'
      }

      if (event.input === 'G') {
        setFollow(true)
        return 'handled'
      }

      if (event.input === '/') {
        setFindDraft(findTerm)
        return 'handled'
      }

      if ((event.input === 'n' || event.input === 'N') && findTerm) {
        const dir = event.input === 'n' ? 1 : -1
        const needle = findTerm.toLowerCase()
        for (let step = 1; step <= length; step++) {
          const i = (effectiveCursor + dir * step + length * step) % length
          if (view.at(i).message.toLowerCase().includes(needle)) {
            pause()
            setCursor(i)
            break
          }
        }

        return 'handled'
      }

      if (event.input === 'f') {
        setRulesOpen(true)
        return 'handled'
      }

      if (event.input === 'w') {
        const entries = logs.snapshot()
        const file = `nex-logs-${session.alias}-${Date.now()}.txt`
        try {
          writeFileSync(
            file,
            entries.map((e) => `${e.createdOn}  ${e.levelLabel}  ${e.source}  ${e.message}`).join('\n') + '\n',
          )
          setNotice(`wrote ${entries.length} lines to ${file}`)
        } catch (error) {
          setNotice(`write failed: ${(error as Error).message}`)
        }

        return 'handled'
      }

      if (event.input === 'o' && length > 0) {
        const refs = detectReferences(view.at(effectiveCursor))
        if (refs.length === 1) jumpRef(refs[0])
        else if (refs.length > 1) setRefPicker(refs)
        return 'handled'
      }

      return 'pass'
    },
    props.active && !rulesOpen && findDraft === null && refPicker === null,
  )

  // Find input (editor scope).
  useKeymap(
    'editor',
    (event) => {
      if (event.key.escape) {
        setFindDraft(null)
        return 'handled'
      }

      if (event.key.return) {
        setFindTerm(findDraft ?? '')
        setFindDraft(null)
        return 'handled'
      }

      if (event.key.backspace || event.key.delete) {
        setFindDraft((d) => (d ?? '').slice(0, -1))
        return 'handled'
      }

      if (event.input && !event.ctrl && !event.meta) {
        const [first] = event.input.split(/[\n\r]/)
        // eslint-disable-next-line no-control-regex
        setFindDraft((d) => (d ?? '') + first.replaceAll(/[\u0000-\u001F\u007F]/g, ''))
        if (first !== event.input) {
          setFindTerm((findDraft ?? '') + first)
          setFindDraft(null)
        }

        return 'handled'
      }

      return 'handled'
    },
    props.active && findDraft !== null,
  )

  // Rules editor (modal scope): type to draft, Enter adds, d deletes, Esc applies+closes.
  useKeymap(
    'modal',
    (event) => {
      if (event.key.escape) {
        setRulesOpen(false)
        setRuleError(null)
        savePrefs(session.alias, { logRules: ruleStrings })
        return 'handled'
      }

      if (event.key.return && ruleDraft.trim()) {
        try {
          filterService.parseFilter(ruleDraft.trim())
          setRuleStrings((rules) => [...rules, ruleDraft.trim()])
          setRuleDraft('')
          setRuleError(null)
        } catch (error) {
          setRuleError((error as Error).message)
        }

        return 'handled'
      }

      if (event.key.upArrow) {
        setRuleCursor((c) => Math.max(0, c - 1))
        return 'handled'
      }

      if (event.key.downArrow) {
        setRuleCursor((c) => Math.min(ruleStrings.length - 1, c + 1))
        return 'handled'
      }

      if (event.input === 'd' && ruleDraft === '' && ruleStrings.length > 0) {
        setRuleStrings((rules) => rules.filter((_, i) => i !== ruleCursor))
        setRuleCursor((c) => Math.max(0, c - 1))
        return 'handled'
      }

      if (event.key.backspace || event.key.delete) {
        setRuleDraft((d) => d.slice(0, -1))
        return 'handled'
      }

      if (event.input && !event.ctrl && !event.meta) {
        const [first] = event.input.split(/[\n\r]/)
        // eslint-disable-next-line no-control-regex
        setRuleDraft((d) => d + first.replaceAll(/[\u0000-\u001F\u007F]/g, ''))
        return 'handled'
      }

      return 'handled'
    },
    props.active && rulesOpen,
  )

  if (refPicker) {
    return (
      <Picker
        height={props.height}
        items={refPicker.map((ref, i) => ({ id: String(i), label: ref.label }))}
        onCancel={() => {
          setRefPicker(null)
        }}
        onSelect={(item) => {
          jumpRef(refPicker[Number(item.id)])
        }}
        title="References in this line"
      />
    )
  }

  if (rulesOpen) {
    return (
      <Box borderStyle="round" flexDirection="column" paddingX={1}>
        <Text bold>Filter rules</Text>
        <Text dimColor>syntax: field OPERATOR value — e.g. message CONTAINS_CI x_acme · copies out as nex log -f</Text>
        {ruleStrings.length === 0 ? (
          <Text dimColor>(no rules — everything shows)</Text>
        ) : (
          ruleStrings.map((rule, i) => (
            <Text inverse={i === ruleCursor} key={`${rule}-${i}`}>
              {i === ruleCursor ? glyphs.cursor : ' '} {rule}
            </Text>
          ))
        )}
        <Box>
          <Text color={theme.fg.accent}>❯ </Text>
          <Text>{ruleDraft}</Text>
          <Text inverse> </Text>
        </Box>
        {ruleError ? <Text color={theme.state.error}>{ruleError}</Text> : null}
        <Text dimColor>⏎ add  d delete selected  Esc apply + close</Text>
      </Box>
    )
  }

  const streamHeight = Math.max(1, props.height - 3)
  const dropped = logs.rawDropped()
  const hiddenPct = Math.round(logs.hiddenRatio() * 100)
  const status = logs.getStatus()
  const needle = findTerm.toLowerCase()

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>rules </Text>
        <Text>{ruleStrings.length === 0 ? <Text dimColor>none</Text> : ruleStrings.join(`  ${glyphs.separator}  `)}</Text>
        {findDraft === null ? (
          findTerm ? (
            <Text dimColor>
              {'  '}find <Text color={theme.fg.accent}>{findTerm}</Text> (n/N)
            </Text>
          ) : null
        ) : (
          <Text>
            {'  '}find <Text>{findDraft}</Text>
            <Text inverse> </Text>
          </Text>
        )}
      </Box>
      {dropped > 0 ? (
        <Text dimColor>
          {'─'.repeat(4)} {dropped.toLocaleString()} oldest lines dropped (buffer full) {'─'.repeat(4)}
        </Text>
      ) : null}
      <Viewport
        cursor={effectiveCursor}
        emptyState={
          <Text dimColor>
            {status === 'stopped' ? 'Tail stopped — no entries retained' : 'Waiting for log traffic…'}
          </Text>
        }
        follow={follow}
        height={streamHeight - (dropped > 0 ? 1 : 0)}
        renderItem={(entry: LogEntry, _index, selected) => {
          const time = entry.createdOn.slice(11) || entry.createdOn
          const matches = needle.length > 0 && entry.message.toLowerCase().includes(needle)
          // The reference glyph renders BEFORE the message — long messages
          // truncate at the right edge and would swallow a trailing glyph.
          const hasRefs = detectReferences(entry).length > 1
          return (
            <Text inverse={selected} wrap="truncate">
              <Text dimColor>{time}</Text>
              {' '}
              <Text bold={entry.severity === 'error'} color={SEVERITY_COLOR[entry.severity]}>
                {entry.levelLabel}
              </Text>
              {' '}
              <Text color={theme.fg.muted}>{(entry.source || '(none)').slice(0, 24).padEnd(24)}</Text>
              <Text color={theme.fg.accent}>{hasRefs ? glyphs.reference : ' '}</Text>
              {' '}
              <Text color={matches ? theme.fg.accent : undefined} underline={matches}>
                {entry.message}
              </Text>
            </Text>
          )
        }}
        scrolloff={2}
        source={view}
      />
      <Text dimColor>
        {follow ? `${glyphs.following} FOLLOW` : `${glyphs.paused} PAUSED${newBelow > 0 ? ` ${glyphs.separator} +${newBelow} new below (G to resume)` : ''}`}
        {` ${glyphs.separator} ${length.toLocaleString()}/${logs.capacity.toLocaleString()}`}
        {ruleStrings.length > 0 ? ` ${glyphs.separator} ${ruleStrings.length} rule${ruleStrings.length === 1 ? '' : 's'} hiding ~${hiddenPct}%` : ''}
        {` ${glyphs.separator} tail ${status}`}
        {notice ? ` ${glyphs.separator} ${notice}` : ''}
      </Text>
    </Box>
  )
}
