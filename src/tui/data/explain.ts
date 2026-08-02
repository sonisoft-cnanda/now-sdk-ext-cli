/**
 * The Fluent SDK's own documentation, parsed out of `now-sdk explain`.
 *
 * ~236 topics ship inside the SDK and almost nobody knows they are there.
 * They need NO instance and NO credential, which is why the docs browser is
 * not gated on project detection — the point is having the API reference
 * beside the editor while writing Fluent, and that is true in any directory.
 *
 * Pure parsing only. Running the binary is sdk.gateway's job.
 */

export interface ExplainTopic {
  /** Searchable synonyms the SDK tags each topic with. */
  keywords: string[]
  name: string
}

/**
 * Parse `explain --list`.
 *
 * Each line is `  topic-name  (keyword, keyword, …)` under an "Available
 * topics:" header. Lines that do not match that shape are skipped rather
 * than guessed at, so a future SDK adding a section header costs nothing.
 */
export function parseExplainList(lines: string[]): ExplainTopic[] {
  const topics: ExplainTopic[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const match = /^\s+(\S+)\s+\((.+)\)\s*$/.exec(line)
    if (!match) continue
    const [, name, rawKeywords] = match
    if (seen.has(name)) continue
    seen.add(name)
    topics.push({
      keywords: rawKeywords.split(',').map((k) => k.trim()).filter(Boolean),
      name,
    })
  }

  return topics
}

/**
 * Topics as picker items, with the keywords in the HINT.
 *
 * That placement is the whole feature, not a cosmetic choice: Picker
 * filters on label, id and hint, so putting the SDK's synonyms in the hint
 * makes them searchable for free. Someone hunting a dropdown does not know
 * the class is called ChoiceSet — but the SDK already tagged
 * `choiceset-api` with "dropdown" and "picklist" for exactly that person,
 * and a name-only search would throw it away.
 */
export function toDocsItems(topics: ExplainTopic[]): { hint: string; id: string; label: string }[] {
  return topics.map((topic) => ({
    hint: topic.keywords.join(', '),
    id: topic.name,
    label: topic.name,
  }))
}
