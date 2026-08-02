/**
 * Bracketed-paste decoding.
 *
 * Without this a 200-line paste arrives as 200 keystrokes and the editor is
 * unusable — the single most important input detail in the Scripts pane.
 * The terminal wraps pasted text in ESC[200~ … ESC[201~ (mode enabled in
 * boot/terminal.ts), and ink hands the whole chunk through as `input`.
 *
 * Pure string handling so it unit-tests without a terminal.
 */

const PASTE_START = '[200~'
const PASTE_END = '[201~'

export interface DecodedInput {
  /** Text the terminal marked as pasted — insert verbatim, one undo step. */
  pasted: string
  /** Everything outside paste markers — interpret as keystrokes. */
  typed: string
}

/** True when a chunk contains any paste marker at all. */
export function hasPasteMarkers(input: string): boolean {
  return input.includes(PASTE_START) || input.includes(PASTE_END)
}

/**
 * Split a chunk into pasted and typed halves. Tolerates markers arriving
 * split across chunks (an unterminated start means "the rest is paste") and
 * a stray end marker with no start.
 */
export function decodePaste(input: string): DecodedInput {
  if (!hasPasteMarkers(input)) return { pasted: '', typed: input }

  let pasted = ''
  let typed = ''
  let rest = input

  while (rest.length > 0) {
    const start = rest.indexOf(PASTE_START)
    if (start === -1) {
      // No further start marker; a dangling end marker is dropped.
      typed += rest.replaceAll(PASTE_END, '')
      break
    }

    typed += rest.slice(0, start).replaceAll(PASTE_END, '')
    rest = rest.slice(start + PASTE_START.length)

    const end = rest.indexOf(PASTE_END)
    if (end === -1) {
      // Unterminated: the terminal is still sending. Treat the remainder
      // as pasted rather than as keystrokes — the safer failure, since
      // interpreting a paste as commands is how you delete a record.
      pasted += rest
      break
    }

    pasted += rest.slice(0, end)
    rest = rest.slice(end + PASTE_END.length)
  }

  return { pasted, typed }
}
