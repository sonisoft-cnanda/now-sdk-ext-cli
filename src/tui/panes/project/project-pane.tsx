import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ApprovalSpec } from '../../data/approvals.js'
import type { ProjectInfo } from '../../data/project-detect.js'
import type { AppIdentity, BuildRecord } from '../../data/project-health.js'
import type { RecordsGateway } from '../../data/records.gateway.js'
import type { SdkCommand, SdkFlag } from '../../data/sdk-manifest.js'
import type { PickerItem } from '../../ui/picker.js'

import { useApproval } from '../../context/approval-context.js'
import { useSession } from '../../context/session-context.js'
import { useUi } from '../../context/ui-context.js'
import {
  compareAppIdentity,
  describeAppIdentity,
  describeReadiness,
  findShadowingXml,
  installReadiness,
  keysFileDirty,
} from '../../data/project-health.js'
import { buildArgv, needsForeground, SDK_COMMANDS, validateFlagValue } from '../../data/sdk-manifest.js'
import { useKeymap } from '../../hooks/use-keymap.js'
import { Picker } from '../../ui/picker.js'
import { theme } from '../../ui/theme.js'
import { useToast } from '../../ui/toast-host.js'
import { Viewport } from '../../ui/viewport.js'

export interface ProjectPaneProps {
  active: boolean
  /** Suspend/resume the Ink tree for interactive now-sdk commands. */
  foregroundHost: { resume(): void; suspend(): void }
  height: number
  width: number
}

type Stage = 'commands' | 'flags' | 'output' | 'picking'

/**
 * Does the project on disk match the app on the instance in the banner?
 *
 * One `sys_app` lookup by scopeId, once, at mount. Cheap, and the answer is
 * wanted BEFORE the install approval rather than inside it.
 */
function useAppIdentity(
  project: ProjectInfo | undefined,
  records: RecordsGateway,
): AppIdentity {
  const [identity, setIdentity] = useState<AppIdentity>({ kind: 'unknown' })

  useEffect(() => {
    const scopeId = project?.config.scopeId
    if (!project || !scopeId) return
    let live = true
    records
      .fetchPage({
        fields: ['sys_id', 'name', 'scope', 'version'],
        limit: 1,
        offset: 0,
        query: `sys_id=${scopeId}`,
        // sys_scope, NOT sys_app. sys_app holds custom apps only and is
        // empty on a fresh PDI, so a sys_app lookup can only ever answer
        // "absent". sys_scope is its parent and covers store and plugin
        // scopes too — which is what makes the mismatch case reachable:
        // a scopeId that resolves to SOME other scope here is the
        // wrong-instance signal, whatever kind of app it belongs to.
        table: 'sys_scope',
      })
      .then((page) => {
        if (!live) return
        const row = page.rows[0]
        setIdentity(compareAppIdentity(project, row && {
          name: row.cells.name?.displayValue,
          scope: row.cells.scope?.displayValue,
          version: row.cells.version?.displayValue,
        }))
      })
      .catch(() => {
        // A failed lookup is unknowable, not a warning. Never claim "not
        // installed" because the query broke — that would send someone
        // installing onto an instance that already has the app.
        if (live) setIdentity({ kind: 'unknown' })
      })
    return () => {
      live = false
    }
  }, [project, records])

  return identity
}

/**
 * The now-sdk surface.
 *
 * Running the commands is the easy part — the pane's job is ARGUMENT
 * RESOLUTION (no one should have to go and find a sys_id) and the
 * cross-command state the CLI cannot see (stale installs, keys.ts drift,
 * transform shadowing).
 */
export function ProjectPane(props: ProjectPaneProps): ReactElement {
  const session = useSession()
  const { glyphs } = useUi()
  const approve = useApproval()
  const toast = useToast()

  const {project} = session.gateway
  const {sdk} = session.gateway

  const [stage, setStage] = useState<Stage>('commands')
  const [commandCursor, setCommandCursor] = useState(0)
  const [flagCursor, setFlagCursor] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [pickerFlag, setPickerFlag] = useState<null | SdkFlag>(null)
  const [pickerItems, setPickerItems] = useState<PickerItem[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [output, setOutput] = useState<string[]>([])
  const [outputCursor, setOutputCursor] = useState(0)
  const [running, setRunning] = useState(false)
  const [lastBuild, setLastBuild] = useState<BuildRecord | undefined>()
  const [health, setHealth] = useState<string[]>([])
  /** Free-text entry for flags with no picker (an instance URL, an alias). */
  const [textFlag, setTextFlag] = useState<null | SdkFlag>(null)
  const [textDraft, setTextDraft] = useState('')
  const identity = useAppIdentity(project, session.gateway.records)
  const identityNote = useMemo(
    () => (project ? describeAppIdentity(identity, project, session.host) : undefined),
    [identity, project, session.host],
  )

  const command: SdkCommand | undefined = SDK_COMMANDS[commandCursor]

  const readiness = useMemo(
    () => (project ? installReadiness(project, lastBuild) : undefined),
    [project, lastBuild],
  )

  /** Load the right list for whichever flag is being resolved. */
  const openPicker = useCallback(
    async (flag: SdkFlag) => {
      setPickerFlag(flag)
      setStage('picking')
      setPickerItems([])
      setPickerLoading(true)
      try {
        let items: PickerItem[] = []
        switch (flag.picker) {
          case 'app-scope': {
            // THE headline affordance: bootstrap from an existing scoped
            // app without going to hunt its sys_id.
            const page = await session.gateway.records.fetchPage({
              fields: ['sys_id', 'name', 'scope', 'version'],
              limit: 500,
              offset: 0,
              query: 'ORDERBYname',
              table: 'sys_app',
            })
            items = page.rows.map((r) => ({
              hint: `${r.cells.scope?.displayValue ?? ''}  ${r.cells.version?.displayValue ?? ''}`.trim(),
              id: r.sysId,
              label: r.cells.name?.displayValue ?? r.sysId,
            }))
            break
          }

          case 'auth-alias': {
            const run = await sdk.run({ argv: ['auth', '--list'], cwd: project?.root ?? process.cwd() })
            items = parseAuthAliases(run.lines).map((a) => ({ id: a, label: a }))
            break
          }

          case 'directory': {
            items = listDirectories(project?.root ?? process.cwd())
            break
          }

          case 'enum': {
            items = (flag.choices ?? []).map((c) => ({ id: c, label: c }))
            break
          }

          case 'scope-name': {
            const scopes = await session.gateway.scripts.listScopes()
            items = scopes.map((s) => ({ hint: s.name, id: s.scope, label: s.scope }))
            break
          }

          case 'table':
          case 'table-multi': {
            const tables = await session.gateway.records.listTables()
            items = tables.map((t) => ({ hint: t.label === t.name ? undefined : t.label, id: t.name, label: t.name }))
            break
          }

          default: {
            items = []
          }
        }

        setPickerItems(items)
      } catch (error) {
        toast('error', `could not load choices: ${(error as Error).message}`)
        setStage('flags')
        setPickerFlag(null)
      } finally {
        setPickerLoading(false)
      }
    },
    [project, sdk, session, toast],
  )

  const runCommand = useCallback(async () => {
    if (!command || running) return
    const cwd = project?.root ?? process.cwd()

    // Prefer the project's npm script — the SDK guide warns that a complete
    // app may wire extra build steps into them, so running the raw command
    // silently skips those.
    const npmScript =
      command.npmScript && project?.hasScript[command.npmScript] ? command.npmScript : undefined

    const argv = buildArgv(command, values)
    // --auth is only accepted by commands that declare it; passing it to
    // `explain` or `clean` makes yargs reject the whole invocation.
    const auth = command.flags.some((f) => f.name === 'auth')
    const options = { argv, auth, cwd, npmScript }
    const preview = sdk.previewOf(options)

    // Anything that prompts gets the whole terminal. Ink and
    // @inquirer/prompts cannot share stdin — leave Ink mounted and the
    // prompt never advances while the app looks hung.
    if (needsForeground(command, values)) {
      const result = sdk.foreground(props.foregroundHost, options)
      if (result.error) {
        toast('error', `${command.name}: ${result.error.message}`)
        return
      }

      // Its output went to the real screen, not to us — say what happened
      // rather than showing an empty output pane.
      setStage('output')
      setOutput([`$ ${preview}`, `(ran in the foreground — exited ${result.code})`])
      toast(result.code === 0 ? 'success' : 'error', `${command.name} exited ${result.code}`)
      return
    }

    if (command.risk === 'instance') {
      const detail = [{ after: preview, label: 'command' }]
      // Both dangers, severest first: which app you are about to touch on
      // which instance matters more than whether the build is current.
      const dangers = [identityNote, readiness && describeReadiness(readiness)].filter(Boolean)
      const staleNote = dangers.length > 0 ? dangers.join(' · ') : undefined
      const spec: ApprovalSpec = {
        actionKind: 'app.install',
        detail,
        provenance: npmScript ? `via the project's "${npmScript}" npm script` : 'now-sdk directly',
        target: { count: 1, identifier: project?.config.scope ?? '(no project)', instance: session.host },
        title: `now-sdk ${command.name} — reaches the instance`,
        ...(staleNote ? { danger: staleNote } : {}),
      }
      const token = await approve(spec)
      if (!token) {
        toast('info', session.readOnly ? 'session is read-only' : 'cancelled')
        return
      }

      setStage('output')
      setOutput([`$ ${preview}`])
      setRunning(true)
      const run = await sdk.run({ ...options, onLine(l) { setOutput((o) => [...o, l]) } }, { spec, token })
      setRunning(false)
      toast(run.ok ? 'success' : 'error', `${command.name} exited ${run.code}`)
      return
    }

    setStage('output')
    setOutput([`$ ${preview}`])
    setRunning(true)
    const run = await sdk.run({ ...options, onLine(l) { setOutput((o) => [...o, l]) } })
    setRunning(false)

    if (command.name === 'build') {
      setLastBuild({ finishedAt: Date.now(), ok: run.ok })
      if (run.ok && project) {
        // keys.ts must be committed: when it is not, "updates become
        // inserts", duplicating records on every other machine.
        const dirty = keysFileDirty(project.root)
        if (dirty) {
          setHealth((h) => [...h, 'keys.ts is MODIFIED but uncommitted — commit it, or teammates and CI will generate different sys_ids'])
        }
      }
    }

    if (command.name === 'transform' && run.ok && project) {
      const shadowing = findShadowingXml(project)
      if (shadowing.length > 0) {
        setHealth((h) => [
          ...h,
          `${shadowing.length} XML file(s) under metadata/ now shadow generated Fluent source and will win at build time: ${shadowing.slice(0, 3).join(', ')}${shadowing.length > 3 ? '…' : ''}`,
        ])
      }
    }

    toast(run.ok ? 'success' : 'error', `${command.name} exited ${run.code}`)
  }, [approve, command, identityNote, project, props.foregroundHost, readiness, running, sdk, session, toast, values])

  useKeymap(
    'pane',
    (event) => {
      if (stage === 'commands') {
        if (event.key.upArrow || event.input === 'k') {
          setCommandCursor((c) => Math.max(0, c - 1))
          return 'handled'
        }

        if (event.key.downArrow || event.input === 'j') {
          setCommandCursor((c) => Math.min(SDK_COMMANDS.length - 1, c + 1))
          return 'handled'
        }

        if (event.key.return) {
          setStage('flags')
          setFlagCursor(0)
          setValues({})
          return 'handled'
        }

        return 'pass'
      }

      if (stage === 'flags' && command) {
        if (event.key.escape) {
          setStage('commands')
          return 'handled'
        }

        if (event.key.upArrow || event.input === 'k') {
          setFlagCursor((c) => Math.max(0, c - 1))
          return 'handled'
        }

        if (event.key.downArrow || event.input === 'j') {
          setFlagCursor((c) => Math.min(command.flags.length - 1, c + 1))
          return 'handled'
        }

        if (event.key.return) {
          const flag = command.flags[flagCursor]
          if (!flag) return 'handled'
          if (flag.type === 'boolean') {
            setValues((v) => ({ ...v, [flag.name]: v[flag.name] === 'true' ? '' : 'true' }))
          } else if (flag.picker === 'none') {
            // No list to choose from — an instance URL or a new alias is
            // genuinely free text. Still validated on commit.
            setTextFlag(flag)
            setTextDraft(values[flag.name] ?? '')
          } else {
            openPicker(flag).catch((): undefined => undefined)
          }

          return 'handled'
        }

        if (event.chord === 'e') {
          runCommand().catch((): undefined => undefined)
          return 'handled'
        }

        return 'pass'
      }

      if (stage === 'output') {
        if (event.key.escape) {
          setStage('flags')
          return 'handled'
        }

        if (event.key.upArrow || event.input === 'k') {
          setOutputCursor((c) => Math.max(0, c - 1))
          return 'handled'
        }

        if (event.key.downArrow || event.input === 'j') {
          setOutputCursor((c) => Math.min(output.length - 1, c + 1))
          return 'handled'
        }

        return 'pass'
      }

      return 'pass'
    },
    props.active && stage !== 'picking' && textFlag === null,
  )

  // Free-text flag entry. Validates on commit, so an unusable value is
  // refused here rather than by yargs after the spawn.
  useKeymap(
    'modal',
    (event) => {
      if (event.key.escape) {
        setTextFlag(null)
        return 'handled'
      }

      if (event.key.return) {
        const invalid = validateFlagValue(textFlag!, textDraft)
        if (invalid) {
          toast('error', `${textFlag!.name}: ${invalid}`)
          return 'handled'
        }

        setValues((v) => ({ ...v, [textFlag!.name]: textDraft }))
        setTextFlag(null)
        return 'handled'
      }

      if (event.key.backspace || event.key.delete) {
        setTextDraft((d) => d.slice(0, -1))
        return 'handled'
      }

      if (event.input && !event.ctrl && !event.meta) {
        // Strip control characters and split on newline so a paste commits
        // rather than smuggling escapes into the argv we build.
        const [first] = event.input.split(/[\n\r]/)
        // eslint-disable-next-line no-control-regex
        setTextDraft((d) => d + first.replaceAll(/[\u0000-\u001F\u007F]/g, ''))
        return 'handled'
      }

      return 'handled'
    },
    props.active && textFlag !== null,
  )

  if (!project) {
    return (
      <Box flexDirection="column">
        <Text dimColor>
          No Fluent project here — `nex tui` shows this pane when it finds a now.config.json
          at or above the working directory.
        </Text>
      </Box>
    )
  }

  if (stage === 'picking' && pickerFlag) {
    return (
      <Picker
        emptyMessage={emptyMessageFor(pickerFlag, session.host)}
        height={props.height}
        items={pickerItems}
        onCancel={() => {
          setStage('flags')
          setPickerFlag(null)
        }}
        onSelect={(item) => {
          const invalid = validateFlagValue(pickerFlag, item.id)
          if (invalid) {
            toast('error', `${pickerFlag.name}: ${invalid}`)
            return
          }

          setValues((v) => ({
            ...v,
            // table-multi accumulates into a comma-separated list, which is
            // exactly what --table expects.
            [pickerFlag.name]:
              pickerFlag.picker === 'table-multi' && v[pickerFlag.name]
                ? `${v[pickerFlag.name]},${item.id}`
                : item.id,
          }))
          setStage('flags')
          setPickerFlag(null)
        }}
        placeholder={pickerLoading ? 'loading…' : `choose a value for --${pickerFlag.name}`}
        title={`--${pickerFlag.name}`}
      />
    )
  }

  const bodyHeight = Math.max(2, props.height - 4)

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>project </Text>
        <Text bold color={theme.fg.accent}>{project.config.scope}</Text>
        {project.config.version ? <Text dimColor> {project.config.version}</Text> : null}
        <Text dimColor>  sdk </Text>
        <Text>{sdk.binary?.version ?? '?'}</Text>
        <Text dimColor> ({sdk.binary?.origin ?? 'missing'})</Text>
      </Box>

      {identityNote ? (
        <Text color={identity.kind === 'mismatch' ? theme.state.error : theme.state.warn} wrap="truncate">
          {glyphs.warn} {identityNote}
        </Text>
      ) : null}
      {readiness && readiness.kind !== 'ok' ? (
        <Text color={theme.state.warn} wrap="truncate">
          {glyphs.warn} {describeReadiness(readiness)}
        </Text>
      ) : null}
      {health.map((h) => (
        <Text color={theme.state.warn} key={h} wrap="truncate">
          {glyphs.warn} {h}
        </Text>
      ))}

      {stage === 'commands' ? (
        <>
          <Viewport
            cursor={commandCursor}
            height={bodyHeight}
            renderItem={(c: SdkCommand, _i, selected) => (
              <Text inverse={selected} wrap="truncate">
                {selected ? glyphs.cursor : ' '}
                <Text bold>{c.name.padEnd(14)}</Text>
                <Text color={c.risk === 'instance' ? theme.state.warn : theme.fg.muted}>
                  {c.risk === 'instance' ? 'instance' : c.risk === 'local-write' ? 'writes files' : 'local'}
                </Text>
                <Text dimColor>  {c.summary}</Text>
              </Text>
            )}
            source={{ at: (i) => SDK_COMMANDS[i], length: SDK_COMMANDS.length }}
          />
          <Text dimColor>⏎ configure  ·  risk shown per command</Text>
        </>
      ) : null}

      {stage === 'flags' && command ? (
        <>
          <Text dimColor wrap="truncate">
            $ {sdk.previewOf({
              argv: buildArgv(command, values),
              cwd: project.root,
              npmScript: command.npmScript && project.hasScript[command.npmScript] ? command.npmScript : undefined,
            })}
          </Text>
          <Viewport
            cursor={flagCursor}
            height={bodyHeight - 1}
            renderItem={(flag: SdkFlag, _i, selected) => {
              const value = values[flag.name]
              return (
                <Text inverse={selected} wrap="truncate">
                  {selected ? glyphs.cursor : ' '}
                  <Text bold>{`--${flag.name}`.padEnd(20)}</Text>
                  <Text color={value ? theme.state.ok : theme.fg.muted}>
                    {(value || (flag.picker === 'none' ? '(text)' : `(${flag.picker})`)).slice(0, 28).padEnd(28)}
                  </Text>
                  <Text dimColor>{flag.description}</Text>
                </Text>
              )
            }}
            source={{ at: (i) => command.flags[i], length: command.flags.length }}
          />
          {textFlag ? (
            <Box>
              <Text color={theme.fg.accent}>--{textFlag.name} </Text>
              <Text>{textDraft}</Text>
              <Text inverse> </Text>
              <Text dimColor>  ⏎ set  Esc cancel</Text>
            </Box>
          ) : (
            <Text dimColor>
              ⏎ resolve value  ^E run  Esc back
              {running ? `  ${glyphs.running} running…` : ''}
            </Text>
          )}
        </>
      ) : null}

      {stage === 'output' ? (
        <>
          <Viewport
            cursor={Math.min(outputCursor, Math.max(0, output.length - 1))}
            emptyState={<Text dimColor>no output</Text>}
            height={bodyHeight}
            renderItem={(line: string) => <Text wrap="truncate">{line}</Text>}
            source={{ at: (i) => output[i], length: output.length }}
          />
          <Text dimColor>{running ? `${glyphs.running} running…` : 'Esc back'}</Text>
        </>
      ) : null}
    </Box>
  )
}

/** Aliases out of `now-sdk auth --list` output. */
/**
 * Why a picker came back with nothing.
 *
 * `sys_app` holds CUSTOM applications only — a fresh PDI has none at all,
 * so "No matches" under an empty filter reads as a broken search when the
 * instance simply has nothing to bootstrap from. Say so, and point at the
 * other form the SDK documents: `init --from <path_to_repo>`.
 */
export function emptyMessageFor(flag: SdkFlag, host: string): string | undefined {
  switch (flag.picker) {
    case 'app-scope': {
      return `no custom applications on ${host} — init --from also accepts a path to a repo with XML metadata`
    }

    case 'auth-alias': {
      return 'now-sdk has no configured auth aliases — add one with `now-sdk auth --add`'
    }

    default: {
      return undefined
    }
  }
}

export function parseAuthAliases(lines: string[]): string[] {
  const aliases: string[] = []
  for (const line of lines) {
    // Output is a table; take the first token of any row that looks like a
    // credential row rather than a header or a box-drawing rule.
    const match = /^[\s│|]*([\w.-]+)\s+(https?:\/\/|\w+\s)/.exec(line)
    if (match && !/^(alias|name)$/i.test(match[1])) aliases.push(match[1])
  }

  return [...new Set(aliases)]
}

/** Immediate subdirectories, for the directory pickers. */
function listDirectories(root: string): PickerItem[] {
  const items: PickerItem[] = [{ hint: 'project root', id: root, label: '.' }]
  try {
    for (const entry of readdirSync(root)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const full = join(root, entry)
      if (existsSync(full) && statSync(full).isDirectory()) items.push({ id: full, label: entry })
    }
  } catch {
    // unreadable root — the '.' entry is still useful
  }

  return items
}
