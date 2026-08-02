/**
 * Fuzzy subsequence scoring for the command palette.
 *
 * ~40 lines and no dependency. The behaviour that matters is not "does it
 * match" — a subsequence test is trivial — it is the RANKING, because a
 * palette that finds the right entry and puts it fourth is a palette people
 * stop using.
 */

export interface Scored<T> {
  item: T
  positions: number[]
  score: number
}

/**
 * Score `needle` against `haystack`. Higher is better; undefined means no
 * match at all.
 *
 * The weights encode how people actually type into a palette:
 * - consecutive runs beat scattered hits, so "updset" ranks
 *   "update set" over "up*d*ate *set*tings"
 * - a hit at a word boundary is worth much more than one mid-word, so "us"
 *   finds "Update Set" rather than the "us" inside "status"
 * - matching at position 0 is worth more still
 * - shorter haystacks win ties, so an exact short label outranks a long one
 *   that happens to contain it
 */
export function score(needle: string, haystack: string): Scored<undefined> | undefined {
  const n = needle.toLowerCase()
  const h = haystack.toLowerCase()
  if (n.length === 0) return { item: undefined, positions: [], score: 1 }
  if (n.length > h.length) return undefined

  const positions: number[] = []
  let total = 0
  let hi = 0
  let previousHit = -2

  for (const char of n) {
    let found = -1
    for (let i = hi; i < h.length; i++) {
      if (h[i] === char) {
        found = i
        break
      }
    }

    if (found === -1) return undefined

    let points = 1
    if (found === previousHit + 1) points += 8 // consecutive run
    if (found === 0) points += 12 // start of the string
    else if (isBoundary(h[found - 1])) points += 6 // start of a word

    total += points
    positions.push(found)
    previousHit = found
    hi = found + 1
  }

  // Tie-break toward shorter labels: "Logs" should beat "Open logs for run".
  return { item: undefined, positions, score: total - h.length * 0.05 }
}

function isBoundary(char: string): boolean {
  return char === ' ' || char === '-' || char === '_' || char === '.' || char === ':' || char === '/'
}

/**
 * Rank items by their best-scoring searchable text.
 *
 * Each item may expose several strings (label, group, keywords); the best
 * one wins, so a palette entry is findable by its group as well as its
 * name without a group match outranking a name match of equal quality.
 */
export function rank<T>(needle: string, items: T[], textsOf: (item: T) => string[]): Scored<T>[] {
  const out: Scored<T>[] = []

  for (const item of items) {
    let best: Scored<undefined> | undefined
    let bestIndex = 0
    const texts = textsOf(item)
    for (const [i, text] of texts.entries()) {
      const result = score(needle, text)
      if (result && (!best || result.score > best.score)) {
        best = result
        bestIndex = i
      }
    }

    // Later texts are secondary (group, keywords): discount them so a name
    // hit always wins a tie against a group hit.
    if (best) out.push({ item, positions: bestIndex === 0 ? best.positions : [], score: best.score - bestIndex * 3 })
  }

  return out.sort((a, b) => b.score - a.score)
}
