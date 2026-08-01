/**
 * One glyph vocabulary for the whole TUI. The CLI currently mixes three
 * spellings of check/cross (U+2714/U+2718 in flow/bulk/health/xml,
 * U+2713/U+2717 in script-sync, and literals elsewhere) — the TUI
 * standardises on U+2714/U+2718, the existing plurality and the visually
 * heavier pair at terminal font sizes.
 *
 * ASCII mode (--ascii, TERM=dumb, non-UTF-8 locale) swaps the whole set;
 * it is independent of NO_COLOR. Colour is never the sole carrier of any
 * state — every glyph below pairs with a label somewhere in the UI.
 */

export interface GlyphSet {
  active: string
  collapsed: string
  cross: string
  cursor: string
  degraded: string
  ellipsis: string
  emptyValue: string
  expanded: string
  following: string
  highPriority: string
  inactive: string
  paused: string
  progressEmpty: string
  progressFull: string
  reference: string
  running: string
  scrollThumb: string
  scrollTrack: string
  separator: string
  tick: string
  waiting: string
  warn: string
}

export const UNICODE_GLYPHS: GlyphSet = {
  active: '●',
  collapsed: '▸',
  cross: '✘',
  cursor: '▸',
  degraded: '◐',
  ellipsis: '…',
  emptyValue: '—',
  expanded: '▾',
  following: '⏺',
  highPriority: '▲',
  inactive: '○',
  paused: '⏸',
  progressEmpty: '▯',
  progressFull: '▮',
  reference: '⇱',
  running: '▶',
  scrollThumb: '█',
  scrollTrack: '│',
  separator: '·',
  tick: '✔',
  waiting: '⏳',
  warn: '⚠',
}

export const ASCII_GLYPHS: GlyphSet = {
  active: '(*)',
  collapsed: '>',
  cross: '[XX]',
  cursor: '>',
  degraded: '(~)',
  ellipsis: '...',
  emptyValue: '-',
  expanded: 'v',
  following: '[o]',
  highPriority: '^',
  inactive: '( )',
  paused: '[||]',
  progressEmpty: '.',
  progressFull: '#',
  reference: '@',
  running: '[>]',
  scrollThumb: '#',
  scrollTrack: '|',
  separator: '-',
  tick: '[OK]',
  waiting: '[~]',
  warn: '[!]',
}

export function selectGlyphs(options: { ascii?: boolean } = {}): GlyphSet {
  if (options.ascii) return ASCII_GLYPHS
  if (process.env.TERM === 'dumb') return ASCII_GLYPHS
  const locale = process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || ''
  if (locale && !/utf-?8/i.test(locale)) return ASCII_GLYPHS
  return UNICODE_GLYPHS
}
