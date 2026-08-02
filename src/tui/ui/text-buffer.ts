/**
 * A multi-line text buffer. 100% pure and non-React — no ink import, no
 * state hooks — which makes it the most testable unit in the TUI and lets
 * the editor component stay a thin renderer.
 *
 * Deliberately small: cursor motion, word motion, insert/delete, undo/redo,
 * bracket auto-close. NOT an editor — no multi-cursor, no find/replace, no
 * folding, no LSP. Anything real is one keystroke away via $EDITOR, which
 * is why building those here would be wasted effort.
 */

export interface Cursor {
  col: number
  line: number
}

interface Snapshot {
  cursor: Cursor
  lines: string[]
}

const UNDO_DEPTH = 100
const TAB_WIDTH = 2
const CLOSERS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' }
/** Characters that may be "stepped over" when already under the cursor. */
const CLOSER_CHARS = new Set(['"', "'", ')', ']', '`', '}'])

export class TextBuffer {
  private _cursor: Cursor = { col: 0, line: 0 }
  private _lines: string[] = ['']
  private redoStack: Snapshot[] = []
  private undoStack: Snapshot[] = []

  static from(text: string): TextBuffer {
    const buffer = new TextBuffer()
    buffer._lines = text.length === 0 ? [''] : text.split('\n')
    buffer._cursor = { col: 0, line: 0 }
    return buffer
  }

  get cursor(): Cursor {
    return { ...this._cursor }
  }

  get lineCount(): number {
    return this._lines.length
  }

  get lines(): readonly string[] {
    return this._lines
  }

  backspace(): void {
    const { col, line } = this._cursor
    if (col === 0 && line === 0) return
    this.pushUndo()
    if (col > 0) {
      const text = this._lines[line]
      this._lines[line] = text.slice(0, col - 1) + text.slice(col)
      this._cursor = { col: col - 1, line }
    } else {
      // Join with the previous line; the cursor lands at the seam.
      const previous = this._lines[line - 1]
      this._cursor = { col: previous.length, line: line - 1 }
      this._lines[line - 1] = previous + this._lines[line]
      this._lines.splice(line, 1)
    }
  }

  delete(): void {
    const { col, line } = this._cursor
    const text = this._lines[line]
    if (col < text.length) {
      this.pushUndo()
      this._lines[line] = text.slice(0, col) + text.slice(col + 1)
    } else if (line < this._lines.length - 1) {
      this.pushUndo()
      this._lines[line] = text + this._lines[line + 1]
      this._lines.splice(line + 1, 1)
    }
  }

  /**
   * Insert text at the cursor. Handles embedded newlines, so a bracketed
   * paste is ONE undo step and one buffer mutation rather than N.
   */
  insert(text: string): void {
    if (text.length === 0) return
    this.pushUndo()
    // Tabs become spaces: a literal tab in a ServiceNow script is a
    // formatting landmine and the gutter maths assumes fixed-width cells.
    const normalized = text.replaceAll('\t', ' '.repeat(TAB_WIDTH)).replaceAll('\r\n', '\n').replaceAll('\r', '\n')
    const parts = normalized.split('\n')
    const { col, line } = this._cursor
    const current = this._lines[line]
    const head = current.slice(0, col)
    const tail = current.slice(col)

    if (parts.length === 1) {
      this._lines[line] = head + parts[0] + tail
      this._cursor = { col: col + parts[0].length, line }
      return
    }

    const inserted = [head + parts[0], ...parts.slice(1, -1), parts.at(-1)! + tail]
    this._lines.splice(line, 1, ...inserted)
    this._cursor = { col: parts.at(-1)!.length, line: line + parts.length - 1 }
  }

  /** Insert a character, auto-closing brackets and quotes. */
  insertWithAutoClose(ch: string): void {
    const next = this._lines[this._cursor.line][this._cursor.col]

    // Typing the closer that is already sitting under the cursor steps
    // over it instead of doubling it. Without this, typing a balanced
    // `gs.info(x)` yields `gs.info(x))` — every auto-inserted closer gets
    // a hand-typed twin. Applies to closing brackets AND quotes (for
    // quotes the same character serves both roles).
    if (next && next === ch && CLOSER_CHARS.has(ch)) {
      this.moveBy(0, 1)
      return
    }

    const closer = CLOSERS[ch]
    if (!closer) {
      this.insert(ch)
      return
    }

    this.insert(ch + closer)
    this.moveBy(0, -1)
  }

  lineEnd(): void {
    this._cursor = { col: this._lines[this._cursor.line].length, line: this._cursor.line }
  }

  lineStart(): void {
    this._cursor = { col: 0, line: this._cursor.line }
  }

  /** Move the cursor by a delta, clamping into the buffer. */
  moveBy(deltaLine: number, deltaCol: number): void {
    let { col, line } = this._cursor
    line = Math.min(Math.max(0, line + deltaLine), this._lines.length - 1)
    col += deltaCol

    if (col < 0) {
      // Moving left off the start wraps to the end of the previous line.
      if (line > 0 && deltaCol < 0 && deltaLine === 0) {
        line -= 1
        col = this._lines[line].length
      } else {
        col = 0
      }
    } else if (col > this._lines[line].length) {
      if (deltaCol > 0 && deltaLine === 0 && line < this._lines.length - 1) {
        line += 1
        col = 0
      } else {
        col = this._lines[line].length
      }
    }

    this._cursor = { col, line }
  }

  moveTo(line: number, col: number): void {
    const clampedLine = Math.min(Math.max(0, line), this._lines.length - 1)
    this._cursor = {
      col: Math.min(Math.max(0, col), this._lines[clampedLine].length),
      line: clampedLine,
    }
  }

  newline(): void {
    this.insert('\n')
  }

  redo(): void {
    const snapshot = this.redoStack.pop()
    if (!snapshot) return
    this.undoStack.push({ cursor: { ...this._cursor }, lines: [...this._lines] })
    this._lines = snapshot.lines
    this._cursor = snapshot.cursor
  }

  toString(): string {
    return this._lines.join('\n')
  }

  undo(): void {
    const snapshot = this.undoStack.pop()
    if (!snapshot) return
    this.redoStack.push({ cursor: { ...this._cursor }, lines: [...this._lines] })
    this._lines = snapshot.lines
    this._cursor = snapshot.cursor
  }

  wordLeft(): void {
    const { col, line } = this._cursor
    if (col === 0) {
      if (line > 0) this._cursor = { col: this._lines[line - 1].length, line: line - 1 }
      return
    }

    const text = this._lines[line]
    let i = col - 1
    while (i > 0 && /\s/.test(text[i])) i -= 1
    while (i > 0 && !/\s/.test(text[i - 1])) i -= 1
    this._cursor = { col: i, line }
  }

  wordRight(): void {
    const { col, line } = this._cursor
    const text = this._lines[line]
    if (col >= text.length) {
      if (line < this._lines.length - 1) this._cursor = { col: 0, line: line + 1 }
      return
    }

    let i = col
    while (i < text.length && !/\s/.test(text[i])) i += 1
    while (i < text.length && /\s/.test(text[i])) i += 1
    this._cursor = { col: i, line }
  }

  private pushUndo(): void {
    this.undoStack.push({ cursor: { ...this._cursor }, lines: [...this._lines] })
    if (this.undoStack.length > UNDO_DEPTH) this.undoStack.shift()
    // Any new edit invalidates the redo branch.
    this.redoStack = []
  }
}
