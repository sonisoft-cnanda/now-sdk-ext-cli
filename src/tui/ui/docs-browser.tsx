/**
 * The Fluent SDK reference, one keystroke from the editor.
 *
 * The hardest part of writing Fluent is not the CLI, it is remembering the
 * API surface across ~42 artifact classes. `now-sdk explain` already ships
 * that documentation and needs neither an instance nor a credential — so
 * this overlay works in any directory, with or without a project.
 */
import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useCallback, useEffect, useState } from 'react'

import type { ExplainTopic } from '../data/explain.js'
import type { SdkGateway } from '../data/sdk.gateway.js'

import { parseExplainList, toDocsItems } from '../data/explain.js'
import { useKeymap } from '../hooks/use-keymap.js'
import { Picker } from './picker.js'
import { theme } from './theme.js'
import { Viewport } from './viewport.js'

export interface DocsBrowserProps {
  height: number
  onClose(): void
  sdk: SdkGateway
  width: number
}

export function DocsBrowser(props: DocsBrowserProps): ReactElement {
  const [topics, setTopics] = useState<ExplainTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [topic, setTopic] = useState<string | undefined>()
  const [body, setBody] = useState<string[]>([])
  const [cursor, setCursor] = useState(0)
  const { sdk } = props

  useEffect(() => {
    let live = true
    sdk
      .run({ argv: ['explain', '--list'], cwd: process.cwd() })
      .then((run) => {
        if (!live) return
        setTopics(parseExplainList(run.lines))
        setLoading(false)
      })
      .catch((error_: Error) => {
        if (!live) return
        setError(error_.message)
        setLoading(false)
      })
    return () => {
      live = false
    }
  }, [sdk])

  const open = useCallback(
    (name: string) => {
      setTopic(name)
      setBody([])
      setCursor(0)
      // --format raw gives markdown rather than the boxed, width-guessing
      // pretty output, which would wrap wrongly inside our own viewport.
      sdk
        .run({ argv: ['explain', name, '--format', 'raw'], cwd: process.cwd() })
        .then((run) => {
          setBody(run.lines.length > 0 ? run.lines : ['(no content)'])
        })
        .catch((error_: Error) => {
          setBody([`could not load ${name}: ${error_.message}`])
        })
    },
    [sdk],
  )

  // Reading keys, live only while a topic is open — the picker owns the
  // keyboard the rest of the time.
  useKeymap(
    'modal',
    (event) => {
      if (event.key.escape || event.input === 'q') {
        // Esc steps OUT one level: topic → list → closed.
        if (topic) {
          setTopic(undefined)
          return 'handled'
        }

        props.onClose()
        return 'handled'
      }

      if (event.key.upArrow || event.input === 'k') {
        setCursor((c) => Math.max(0, c - 1))
        return 'handled'
      }

      if (event.key.downArrow || event.input === 'j') {
        setCursor((c) => Math.min(Math.max(0, body.length - 1), c + 1))
        return 'handled'
      }

      if (event.key.pageDown || (event.chord === 'f')) {
        setCursor((c) => Math.min(Math.max(0, body.length - 1), c + props.height))
        return 'handled'
      }

      if (event.key.pageUp || (event.chord === 'b')) {
        setCursor((c) => Math.max(0, c - props.height))
        return 'handled'
      }

      if (event.input === 'g') {
        setCursor(0)
        return 'handled'
      }

      if (event.input === 'G') {
        setCursor(Math.max(0, body.length - 1))
        return 'handled'
      }

      // A topic on screen owns every key, so stray input cannot leak into
      // the pane underneath.
      return 'handled'
    },
    Boolean(topic),
  )

  if (error) {
    return (
      <Box borderStyle="round" flexDirection="column" paddingX={1}>
        <Text bold>Fluent docs</Text>
        <Text color={theme.state.error}>could not run now-sdk explain: {error}</Text>
        <Text dimColor>Esc close</Text>
      </Box>
    )
  }

  if (topic) {
    return (
      <Box borderStyle="round" flexDirection="column" paddingX={1}>
        <Text>
          <Text bold color={theme.fg.accent}>{topic}</Text>
          <Text dimColor>  ({body.length} lines)</Text>
        </Text>
        <Viewport
          cursor={cursor}
          emptyState={<Text dimColor>loading…</Text>}
          height={Math.max(2, props.height - 3)}
          renderItem={(line: string) => <Text wrap="truncate">{line}</Text>}
          source={{ at: (i) => body[i], length: body.length }}
        />
        <Text dimColor>↑↓ scroll  ^F/^B page  g/G top/bottom  Esc back</Text>
      </Box>
    )
  }

  return (
    <Picker
      emptyMessage={loading ? undefined : 'now-sdk explain listed no topics'}
      height={props.height}
      items={toDocsItems(topics)}
      onCancel={props.onClose}
      onSelect={(item) => {
        open(item.id)
      }}
      placeholder={loading ? 'loading topics…' : 'search the Fluent API — try "dropdown" or "business rule"'}
      title="Fluent docs (now-sdk explain)"
    />
  )
}
