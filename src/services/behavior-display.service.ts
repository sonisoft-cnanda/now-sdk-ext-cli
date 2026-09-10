import { BehaviorDetailsResult, BehaviorItem, TableBehaviorResult } from '@sonisoft/now-sdk-ext-core'

/** Human and JSON rendering of the shared core behavior response. */
export class BehaviorDisplayService {
  format(result: BehaviorDetailsResult | TableBehaviorResult, json: boolean): string[] {
    if (json) return [JSON.stringify(result)]
    const lines = ['Configuration visible to this account; conditions are not evaluated.']
    const show = (item: BehaviorItem): void => {
      lines.push(`${item.name} [${item.reference.kind}] ${item.reference.sourceTable}:${item.reference.sysId}`)
      if (item.inherited) lines.push(`  Inherited from ${item.table}`)
      lines.push(`  ${JSON.stringify(item.configuration)}`)
      if (item.related?.length) lines.push(`  Related: ${JSON.stringify(item.related)}`)
      if (item.scripts) lines.push(`  Scripts: ${JSON.stringify(item.scripts)}`)
      if (item.definition) lines.push(`  Definition (${item.definitionSource}): ${JSON.stringify(item.definition)}`)
      if (item.dependencies?.length) lines.push(`  Dependencies: ${JSON.stringify(item.dependencies)}`)
      for (const warning of item.warnings) lines.push(`  ${warning.code}: ${warning.message}`)
    }

    if ('categories' in result) {
      lines.push(`Table: ${result.table}; ancestors: ${result.ancestors.join(', ') || '(none)'}`)
      for (const section of result.categories) {
        lines.push(`${section.category}: ${section.items.length} (${section.status})`)
        for (const item of section.items) show(item)
        for (const warning of section.warnings) lines.push(`  ${warning.code}: ${warning.message}`)
        if (section.nextCursor) lines.push(`  Continue: --category ${section.category} --cursor ${section.nextCursor}`)
      }
    } else {
      for (const item of result.items) show(item)
      if (result.remainingReferences.length > 0) lines.push(`Remaining references: ${JSON.stringify(result.remainingReferences)}`)
    }

    if (result.dependencies.length > 0) lines.push('Expanded dependencies:')
    for (const item of result.dependencies) show(item)
    for (const warning of result.warnings) lines.push(`${warning.code}: ${warning.message}`)
    return lines
  }
}
