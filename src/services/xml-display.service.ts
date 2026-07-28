 

export class XmlDisplayService {
  /**
   * Format export result for display.
   */
  formatExportResult(result: any, outputFile: string | undefined, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      const jsonData: any = {
        sysId: result.sysId,
        table: result.table,
      }

      if (result.unloadDate) {
        jsonData.unloadDate = result.unloadDate
      }

      if (outputFile) {
        jsonData.outputFile = outputFile
      }

      jsonData.xml = result.xml
      return [JSON.stringify(jsonData, null, 2)]
    }

    const lines: string[] = []

    lines.push(`\nXML Export`)
    lines.push("  " + "\u2500".repeat(50))
    lines.push(`  Table:        ${result.table}`)
    lines.push(`  Sys ID:       ${result.sysId}`)

    if (result.unloadDate) {
      lines.push(`  Unload Date:  ${result.unloadDate}`)
    }

    if (outputFile) {
      lines.push(`  Written to:   ${outputFile}`)
    }

    lines.push("  " + "\u2500".repeat(50))

    return lines
  }

  /**
   * Format import result for display.
   */
  formatImportResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)]
    }

    const lines: string[] = []

    lines.push(`\nXML Import`)
    lines.push("  " + "\u2500".repeat(50))
    lines.push(`  Target Table:  ${result.targetTable}`)

    const statusIcon = result.success ? '\u2714' : '\u2718'
    const statusText = result.success ? 'Success' : 'Failed'
    lines.push(`  Status:        ${statusIcon} ${statusText}`)

    if (result.responseBody) {
      lines.push(`  Response:      ${result.responseBody}`)
    }

    lines.push("  " + "\u2500".repeat(50))

    return lines
  }
}
