 

export class UpdateSetDisplayService {
  /**
   * Format a clone result for display.
   */
  formatCloneResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({
        newUpdateSetId: result.newUpdateSetId,
        newUpdateSetName: result.newUpdateSetName,
        recordsCloned: result.recordsCloned,
        sourceUpdateSetId: result.sourceUpdateSetId,
        sourceUpdateSetName: result.sourceUpdateSetName,
        totalSourceRecords: result.totalSourceRecords,
      }, null, 2)]
    }

    const lines: string[] = []

    lines.push('Clone Result:')
    lines.push(`  Source:          ${result.sourceUpdateSetName} (${result.sourceUpdateSetId})`)
    lines.push(`  New Update Set:  ${result.newUpdateSetName} (${result.newUpdateSetId})`)
    lines.push(`  Records Cloned:  ${result.recordsCloned} / ${result.totalSourceRecords}`)

    return lines
  }

  /**
   * Format a create result for display.
   */
  formatCreateResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({
        name: result.name,
        state: result.state,
        sys_id: result.sys_id,
      }, null, 2)]
    }

    const lines: string[] = []

    lines.push('Update set created successfully!')
    lines.push(`  Name:    ${result.name}`)
    lines.push(`  Sys ID:  ${result.sys_id}`)
    lines.push(`  State:   ${result.state}`)

    return lines
  }

  /**
   * Format the current update set for display.
   */
  formatCurrentUpdateSet(set: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({
        currentUpdateSet: {
          name: set.name,
          state: set.state,
          sys_id: set.sys_id,
        },
      }, null, 2)]
    }

    const lines: string[] = []

    lines.push('Current Update Set:')
    lines.push(`  Name:    ${set.name}`)
    lines.push(`  Sys ID:  ${set.sys_id}`)
    lines.push(`  State:   ${set.state}`)

    return lines
  }

  /**
   * Format an inspection result with components for display.
   */
  formatInspection(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({
        components: result.components,
        totalRecords: result.totalRecords,
        updateSet: result.updateSet,
      }, null, 2)]
    }

    const lines: string[] = []

    lines.push(`Update Set: ${result.updateSet.name}`)
    lines.push(`  Sys ID:  ${result.updateSet.sys_id}`)
    lines.push(`  State:   ${result.updateSet.state}`)
    lines.push(`  Total Records: ${result.totalRecords}`)

    if (result.components && result.components.length > 0) {
      lines.push('')
      lines.push('Components:')
      lines.push('─'.repeat(60))

      for (const component of result.components) {
        lines.push(`  ${component.type} (${component.count})`)

        if (component.items && component.items.length > 0) {
          for (const item of component.items) {
            lines.push(`    - ${item}`)
          }
        }
      }

      lines.push('─'.repeat(60))
    }

    return lines
  }

  /**
   * Format a move records result for display.
   */
  formatMoveResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({
        errors: result.errors,
        failed: result.failed,
        moved: result.moved,
        records: result.records,
      }, null, 2)]
    }

    const lines: string[] = []

    lines.push('Move Records Result:')
    lines.push(`  Moved:   ${result.moved}`)
    lines.push(`  Failed:  ${result.failed}`)

    if (result.errors && result.errors.length > 0) {
      lines.push('')
      lines.push('Errors:')
      for (const err of result.errors) {
        lines.push(`  - ${err}`)
      }
    }

    return lines
  }

  /**
   * Format a list of update sets for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatUpdateSetList(sets: any[], jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({
        total: sets.length,
        updateSets: sets.map(set => ({
          name: set.name,
          state: set.state,
          sys_id: set.sys_id,
        })),
      }, null, 2)]
    }

    const lines: string[] = []

    lines.push(`Found ${sets.length} update set(s)`)

    if (sets.length === 0) {
      lines.push('No update sets found matching the specified criteria.')
      return lines
    }

    lines.push('─'.repeat(80))

    for (const [index, set] of sets.entries()) {
      lines.push(`${index + 1}. ${set.name}`)
      lines.push(`   Sys ID:  ${set.sys_id}`)
      lines.push(`   State:   ${set.state}`)
      lines.push('─'.repeat(80))
    }

    lines.push(`\nTotal: ${sets.length} update set(s)`)

    return lines
  }
}
