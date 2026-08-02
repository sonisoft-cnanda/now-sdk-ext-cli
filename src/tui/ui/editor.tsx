import type { ReactElement } from 'react'

import { Box, Text } from 'ink'
import { useMemo } from 'react'

import type { TextBuffer } from './text-buffer.js'

import { theme } from './theme.js'
import { computeWindow } from './viewport-window.js'

export interface EditorProps {
  buffer: TextBuffer
  focused: boolean
  height: number
  /** Bumped by the owner on every mutation to force a re-render. */
  revision: number
  width: number
}

const KEYWORDS = new Set([
  'break', 'case', 'catch', 'const', 'continue', 'delete', 'do', 'else', 'false',
  'finally', 'for', 'function', 'if', 'in', 'let', 'new', 'null', 'return',
  'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void',
  'while',
])

const GLIDE = /^(Glide\w+|gs|gr|current|previous|g_form|g_user|action|workflow)$/

interface Token {
  color?: string
  text: string
}

/**
 * Tokenize ONE line. Deliberately per-line and regex-based: cost is bounded
 * by viewport height, not buffer size, so a 2,000-line script costs the
 * same as a 20-line one. Multi-line constructs (block comments spanning
 * lines, template literals) are not tracked — that needs real state and is
 * not worth it here.
 */
export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = []
  const commentAt = findLineComment(line)
  const code = commentAt === -1 ? line : line.slice(0, commentAt)
  const comment = commentAt === -1 ? '' : line.slice(commentAt)

  const pattern = /(['"`])(?:\\.|(?!\1)[^\\])*\1?|\b\d+(?:\.\d+)?\b|\b\w+\b|[^\w'"`]+/g
  for (const match of code.match(pattern) ?? []) {
    if (/^['"`]/.test(match)) {
      tokens.push({ color: theme.state.ok, text: match })
    } else if (/^\d/.test(match)) {
      tokens.push({ color: theme.state.warn, text: match })
    } else if (KEYWORDS.has(match)) {
      tokens.push({ color: theme.state.info, text: match })
    } else if (GLIDE.test(match)) {
      tokens.push({ color: theme.fg.accent, text: match })
    } else {
      tokens.push({ text: match })
    }
  }

  if (comment) tokens.push({ color: theme.fg.muted, text: comment })
  return tokens
}

/** Index of a `//` that is not inside a string literal, else -1. */
function findLineComment(line: string): number {
  let quote: null | string = null
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quote) {
      if (ch === '\\') i += 1
      else if (ch === quote) quote = null
    } else if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
    } else if (ch === '/' && line[i + 1] === '/') {
      return i
    }
  }

  return -1
}

/**
 * Thin renderer over TextBuffer: line-number gutter, windowed viewport, a
 * synthetic block cursor (ink has no real one inside a Box), and horizontal
 * scrolling for long lines.
 */
export function Editor(props: EditorProps): ReactElement {
  const { buffer } = props
  const {cursor} = buffer

  const window = computeWindow({
    cursor: cursor.line,
    height: props.height,
    length: buffer.lineCount,
    prevTop: 0,
    scrolloff: 2,
  })

  const gutterWidth = String(buffer.lineCount).length + 1
  const textWidth = Math.max(10, props.width - gutterWidth - 1)
  // Horizontal offset keeps the cursor on screen for long lines.
  const hOffset = Math.max(0, cursor.col - textWidth + 1)

  const rendered = useMemo(() => {
    const out: ReactElement[] = []
    for (let i = 0; i < window.visible; i++) {
      const lineIndex = window.top + i
      const line = buffer.lines[lineIndex] ?? ''
      const isCursorLine = lineIndex === cursor.line && props.focused
      out.push(
        <Box key={lineIndex}>
          <Box width={gutterWidth}>
            <Text color={isCursorLine ? theme.fg.accent : theme.fg.muted}>
              {String(lineIndex + 1).padStart(gutterWidth - 1)}
            </Text>
          </Box>
          <Text wrap="truncate">
            {isCursorLine
              ? renderCursorLine(line, cursor.col, hOffset, textWidth)
              : tokenizeLine(line.slice(hOffset, hOffset + textWidth)).map((t, ti) => (
                  <Text color={t.color} key={ti}>
                    {t.text}
                  </Text>
                ))}
          </Text>
        </Box>,
      )
    }

    return out
    // revision is the mutation signal — TextBuffer is mutable by design, so
    // identity does not change when it edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.revision, props.focused, window.top, window.visible, gutterWidth, textWidth, hOffset])

  return (
    <Box flexDirection="column" height={props.height}>
      {rendered}
    </Box>
  )
}

/** The cursor line, with one character inverted to stand in for a caret. */
function renderCursorLine(line: string, col: number, hOffset: number, width: number): ReactElement[] {
  const visible = line.slice(hOffset, hOffset + width)
  const at = col - hOffset
  const before = visible.slice(0, at)
  const under = visible[at] ?? ' '
  const after = visible.slice(at + 1)
  return [
    <Text key="b">{before}</Text>,
    <Text inverse key="c">{under}</Text>,
    <Text key="a">{after}</Text>,
  ]
}
