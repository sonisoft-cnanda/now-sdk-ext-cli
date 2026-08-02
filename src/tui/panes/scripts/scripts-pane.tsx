import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { PaneIntent } from '../../commands/palette-actions.js'
import type { ApprovalSpec } from '../../data/approvals.js'
import type { ScopeOption } from '../../data/scripts.gateway.js'
import type { PickerItem } from '../../ui/picker.js'

import { ScriptParameterService } from '../../../services/script-parameter.service.js'
import { EDITOR_CANDIDATES, resolveEditor, runForeground } from '../../boot/foreground.js'
import { useApproval } from '../../context/approval-context.js'
import { useSession } from '../../context/session-context.js'
import { useUi } from '../../context/ui-context.js'
import { useAsyncResource } from '../../hooks/use-async-resource.js'
import { useKeymap } from '../../hooks/use-keymap.js'
import { decodePaste } from '../../ui/bracketed-paste.js'
import { DocsBrowser } from '../../ui/docs-browser.js'
import { Editor } from '../../ui/editor.js'
import { Picker } from '../../ui/picker.js'
import { TextBuffer } from '../../ui/text-buffer.js'
import { theme } from '../../ui/theme.js'
import { useToast } from '../../ui/toast-host.js'
import { Viewport } from '../../ui/viewport.js'

export interface ScriptsPaneProps {
  active: boolean
  /** Suspend/resume the Ink tree for the $EDITOR handoff. */
  foregroundHost: { resume(): void; suspend(): void }
  height: number
  /** An action raised from the command palette. */
  intent?: { serial: number; value: PaneIntent }
  onShowRunLogs(startedAt: number, endedAt: number): void
  width: number
}

interface Run {
  durationMs: number
  id: number
  lines: string[]
  ok: boolean
  params: string
  scope: string
  script: string
  startedAt: number
}

const paramService = new ScriptParameterService()

/**
 * The Scripts notebook: an editable buffer on top, an append-only run
 * transcript below, and a one-key escape to a real editor.
 *
 * Chosen over a pure REPL (which cannot edit earlier lines) and over a
 * pure buffer (which loses the iterative rhythm): Enter on a past run
 * recalls its script into the buffer, so you get the REPL loop without
 * giving up editing.
 */
export function ScriptsPane(props: ScriptsPaneProps): ReactElement {
  const session = useSession()
  const { glyphs } = useUi()
  const approve = useApproval()
  const toast = useToast()

  const bufferRef = useRef(TextBuffer.from(''))
  const [revision, setRevision] = useState(0)
  const [focus, setFocus] = useState<'editor' | 'transcript'>('editor')
  const [scope, setScope] = useState('global')
  const [params, setParams] = useState('')
  const [paramDraft, setParamDraft] = useState<null | string>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [transcriptCursor, setTranscriptCursor] = useState(0)
  const [running, setRunning] = useState(false)
  const [scopePickerOpen, setScopePickerOpen] = useState(false)
  const [editorPickerOpen, setEditorPickerOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)

  const intentSerial = props.intent?.serial
  const intentValue = props.intent?.value

  const scopes = useAsyncResource<ScopeOption[]>()
  const { run: loadScopes } = scopes

  useEffect(() => {
    if (intentSerial === undefined || !intentValue) return
    if (intentValue.kind === 'open-docs') setDocsOpen(true)
    if (intentValue.kind === 'pick-scope') {
      setScopePickerOpen(true)
      loadScopes(() => session.gateway.scripts.listScopes())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentSerial])

  const touch = useCallback(() => {
    setRevision((r) => r + 1)
  }, [])

  const openInEditor = useCallback(
    (command: string, args: string[]) => {
      const dir = mkdtempSync(join(tmpdir(), 'nex-tui-'))
      const file = join(dir, 'scratch.js')
      writeFileSync(file, bufferRef.current.toString())
      const result = runForeground(props.foregroundHost, { args: [...args, file], command })
      if (result.error) {
        toast('error', `${command}: ${result.error.message}`)
        return
      }

      try {
        const edited = readFileSync(file, 'utf8')
        const {line} = bufferRef.current.cursor
        bufferRef.current = TextBuffer.from(edited)
        bufferRef.current.moveTo(line, 0)
        touch()
        toast('success', `loaded ${edited.split('\n').length} lines from ${command}`)
      } catch (error) {
        toast('error', `could not read back the file: ${(error as Error).message}`)
      }
    },
    [props.foregroundHost, toast, touch],
  )

  const popOut = useCallback(() => {
    const configured = resolveEditor()
    if (configured) {
      openInEditor(configured.command, configured.args)
      return
    }

    setEditorPickerOpen(true)
  }, [openInEditor])

  const execute = useCallback(async () => {
    const script = bufferRef.current.toString()
    if (script.trim().length === 0) {
      toast('info', 'nothing to run')
      return
    }

    let finalScript = script
    if (params.trim().length > 0) {
      try {
        finalScript = paramService.applyParameters(script, params)
      } catch (error) {
        toast('error', `params: ${(error as Error).message}`)
        return
      }
    }

    const lineCount = finalScript.split('\n').length
    const spec: ApprovalSpec = {
      actionKind: 'script.execute',
      danger: 'Server-side script runs with your full rights on this instance.',
      detail: [
        { after: scope, label: 'scope' },
        { after: `${lineCount} line${lineCount === 1 ? '' : 's'}`, label: 'script' },
        ...(params.trim() ? [{ after: params, label: 'params' }] : []),
      ],
      provenance: 'the buffer as shown, after parameter substitution',
      target: { count: 1, identifier: `${lineCount} lines`, instance: session.host },
      title: `execute background script in ${scope}`,
    }

    const token = await approve(spec)
    if (!token) {
      toast('info', session.readOnly ? 'session is read-only' : 'cancelled')
      return
    }

    const startedAt = Date.now()
    setRunning(true)
    try {
      const result = await session.gateway.scripts.execute(spec, token, { scope, script: finalScript })
      const endedAt = Date.now()
      setRuns((current) => [
        ...current,
        {
          durationMs: endedAt - startedAt,
          id: startedAt,
          lines: result.lines,
          ok: true,
          params,
          scope,
          script,
          startedAt,
        },
      ])
      setTranscriptCursor(runs.length)
      toast('success', `ran in ${((endedAt - startedAt) / 1000).toFixed(1)}s`)
    } catch (error) {
      const endedAt = Date.now()
      const err = error as { message?: string; remediation?: string }
      setRuns((current) => [
        ...current,
        {
          durationMs: endedAt - startedAt,
          id: startedAt,
          lines: [err.remediation ?? err.message ?? 'execution failed'],
          ok: false,
          params,
          scope,
          script,
          startedAt,
        },
      ])
      toast('error', err.remediation ?? err.message ?? 'execution failed')
    } finally {
      setRunning(false)
    }
  }, [approve, params, runs.length, scope, session, toast])

  // Editor keys — the buffer owns the keyboard while focused.
  useKeymap(
    'editor',
    (event) => {
      const buffer = bufferRef.current

      if (event.chord === 'e') {
        execute().catch((): undefined => undefined)
        return 'handled'
      }

      if (event.chord === 'z') {
        buffer.undo()
        touch()
        return 'handled'
      }

      if (event.chord === 'y') {
        buffer.redo()
        touch()
        return 'handled'
      }

      if (event.chord === 'a') {
        buffer.lineStart()
        touch()
        return 'handled'
      }

      if (event.key.escape || event.key.tab) {
        setFocus('transcript')
        return 'handled'
      }

      if (event.key.upArrow) { buffer.moveBy(-1, 0); touch(); return 'handled' }
      if (event.key.downArrow) { buffer.moveBy(1, 0); touch(); return 'handled' }
      if (event.key.leftArrow) { buffer.moveBy(0, -1); touch(); return 'handled' }
      if (event.key.rightArrow) { buffer.moveBy(0, 1); touch(); return 'handled' }
      if (event.key.return) { buffer.newline(); touch(); return 'handled' }
      if (event.key.backspace) { buffer.backspace(); touch(); return 'handled' }
      if (event.key.delete) { buffer.delete(); touch(); return 'handled' }

      if (event.input && !event.ctrl && !event.meta) {
        // Bracketed paste: the pasted half goes in verbatim as ONE undo
        // step; the typed half is interpreted character by character so
        // auto-close still works while typing.
        const { pasted, typed } = decodePaste(event.input)
        if (pasted) buffer.insert(pasted)
        for (const ch of typed) {
          if (ch === '\n' || ch === '\r') buffer.newline()
          else if (ch >= ' ') buffer.insertWithAutoClose(ch)
        }

        touch()
        return 'handled'
      }

      return 'handled'
    },
    props.active && focus === 'editor' && !scopePickerOpen && !editorPickerOpen && !docsOpen && paramDraft === null,
  )

  // Transcript / pane-level keys.
  useKeymap(
    'pane',
    (event) => {
      if (event.key.tab || event.key.escape) {
        setFocus('editor')
        return 'handled'
      }

      if (event.input === 's') {
        setScopePickerOpen(true)
        loadScopes(() => session.gateway.scripts.listScopes())
        return 'handled'
      }

      if (event.input === 'p') {
        setParamDraft(params)
        return 'handled'
      }

      if (event.input === 'E') {
        popOut()
        return 'handled'
      }

      // The Fluent reference, beside the buffer. Offline: no instance, no
      // credential — the SDK ships these ~236 topics locally.
      if (event.input === 'd') {
        setDocsOpen(true)
        return 'handled'
      }

      if (event.chord === 'e') {
        execute().catch((): undefined => undefined)
        return 'handled'
      }

      if (event.key.upArrow || event.input === 'k') {
        setTranscriptCursor((c) => Math.max(0, c - 1))
        return 'handled'
      }

      if (event.key.downArrow || event.input === 'j') {
        setTranscriptCursor((c) => Math.min(runs.length - 1, c + 1))
        return 'handled'
      }

      if (event.key.return && runs[transcriptCursor]) {
        // The REPL affordance: recall a past script into the buffer.
        bufferRef.current = TextBuffer.from(runs[transcriptCursor].script)
        setScope(runs[transcriptCursor].scope)
        setParams(runs[transcriptCursor].params)
        touch()
        setFocus('editor')
        toast('info', `recalled run #${transcriptCursor + 1}`)
        return 'handled'
      }

      if (event.chord === 'l' && runs[transcriptCursor]) {
        const run = runs[transcriptCursor]
        props.onShowRunLogs(run.startedAt, run.startedAt + run.durationMs)
        return 'handled'
      }

      return 'pass'
    },
    props.active && focus === 'transcript' && !scopePickerOpen && !editorPickerOpen && !docsOpen && paramDraft === null,
  )

  // Params editor.
  useKeymap(
    'modal',
    (event) => {
      if (event.key.escape) { setParamDraft(null); return 'handled' }
      if (event.key.return) { setParams(paramDraft ?? ''); setParamDraft(null); return 'handled' }
      if (event.key.backspace || event.key.delete) {
        setParamDraft((d) => (d ?? '').slice(0, -1))
        return 'handled'
      }

      if (event.input && !event.ctrl && !event.meta) {
        const [first, ...rest] = event.input.split(/[\n\r]/)
        // eslint-disable-next-line no-control-regex
        const clean = first.replaceAll(/[\u0000-\u001F\u007F]/g, '')
        if (rest.length > 0) { setParams((paramDraft ?? '') + clean); setParamDraft(null) }
        else setParamDraft((d) => (d ?? '') + clean)
        return 'handled'
      }

      return 'handled'
    },
    props.active && paramDraft !== null,
  )

  const transcriptRows = useMemo(() => {
    const rows: Array<{ kind: 'header' | 'line'; run: Run; text: string }> = []
    for (const run of runs) {
      rows.push({ kind: 'header', run, text: '' })
      for (const line of run.lines) rows.push({ kind: 'line', run, text: line })
    }

    return rows
  }, [runs])

  if (scopePickerOpen) {
    const items: PickerItem[] =
      scopes.resource.status === 'ready'
        ? scopes.resource.data.map((s) => ({ hint: s.name, id: s.scope, label: s.scope }))
        : []
    return (
      <Picker
        height={props.height}
        items={items}
        onCancel={() => { setScopePickerOpen(false) }}
        onSelect={(item) => {
          setScope(item.id)
          setScopePickerOpen(false)
          toast('info', `scope ${item.id}`)
        }}
        placeholder={scopes.resource.status === 'loading' ? 'loading scopes…' : 'type to filter scopes'}
        title="Run script in scope"
      />
    )
  }

  if (docsOpen) {
    return (
      <DocsBrowser
        height={props.height}
        onClose={() => { setDocsOpen(false) }}
        sdk={session.gateway.sdk}
        width={props.width}
      />
    )
  }

  if (editorPickerOpen) {
    return (
      <Picker
        height={props.height}
        items={EDITOR_CANDIDATES.map((c) => ({ id: c.command, label: c.label }))}
        onCancel={() => { setEditorPickerOpen(false) }}
        onSelect={(item) => {
          setEditorPickerOpen(false)
          const candidate = EDITOR_CANDIDATES.find((c) => c.command === item.id)!
          openInEditor(candidate.command, candidate.args)
        }}
        placeholder="$VISUAL and $EDITOR are unset — pick one (set $EDITOR to skip this)"
        title="Open in editor"
      />
    )
  }

  const editorHeight = Math.max(4, Math.floor((props.height - 3) * 0.55))
  const transcriptHeight = Math.max(2, props.height - 3 - editorHeight)

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>scope </Text>
        <Text bold color={theme.fg.accent}>{scope}</Text>
        <Text dimColor>  params </Text>
        {paramDraft === null ? (
          <Text>{params || <Text dimColor>none</Text>}</Text>
        ) : (
          <>
            <Text>{paramDraft}</Text>
            <Text inverse> </Text>
            <Text dimColor>  ⏎ set  Esc cancel</Text>
          </>
        )}
        <Text dimColor>
          {'  '}
          {running ? `${glyphs.running} running…` : `${runs.length} run${runs.length === 1 ? '' : 's'}`}
        </Text>
      </Box>

      <Box borderBottom borderLeft={false} borderRight={false} borderStyle="single" borderTop={false} flexDirection="column">
        <Editor
          buffer={bufferRef.current}
          focused={focus === 'editor'}
          height={editorHeight}
          revision={revision}
          width={props.width}
        />
      </Box>

      <Viewport
        cursor={Math.min(transcriptCursor, Math.max(0, transcriptRows.length - 1))}
        emptyState={<Text dimColor>No runs yet — ^E executes the buffer</Text>}
        height={transcriptHeight}
        renderItem={(row: { kind: 'header' | 'line'; run: Run; text: string }, _i, selected) =>
          row.kind === 'header' ? (
            <Text bold={selected} inverse={selected && focus === 'transcript'}>
              <Text color={row.run.ok ? theme.state.ok : theme.state.error}>
                {row.run.ok ? glyphs.tick : glyphs.cross}
              </Text>
              {' '}
              <Text dimColor>
                {new Date(row.run.startedAt).toTimeString().slice(0, 8)} {row.run.scope}{' '}
                {(row.run.durationMs / 1000).toFixed(1)}s
              </Text>
            </Text>
          ) : (
            <Text wrap="truncate">   {row.text}</Text>
          )
        }
        source={{ at: (i) => transcriptRows[i], length: transcriptRows.length }}
      />

      <Text dimColor>
        {focus === 'editor'
          ? '^E run  ^Z/^Y undo  Tab transcript  (typing edits the buffer)'
          : `⏎ recall  ^E run  s scope  p params  E editor  d docs  ^L logs  Tab editor`}
      </Text>
    </Box>
  )
}
