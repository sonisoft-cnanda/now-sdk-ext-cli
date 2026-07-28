 

export class HealthDisplayService {
  /**
   * Format health check result for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatHealthResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    lines.push(`\nInstance Health Check`);
    lines.push("  " + "\u2500".repeat(70));
    lines.push(`  Timestamp:  ${result.timestamp || 'N/A'}`);

    // Version info
    if (result.version) {
      lines.push("");
      lines.push("  Version Information");
      lines.push("  " + "\u2500".repeat(40));
      if (result.version.version) {
        lines.push(`    Version:     ${result.version.version}`);
      }

      if (result.version.buildDate) {
        lines.push(`    Build Date:  ${result.version.buildDate}`);
      }

      if (result.version.buildTag) {
        lines.push(`    Build Tag:   ${result.version.buildTag}`);
      }
    }

    // Cluster nodes
    if (result.clusterNodes) {
      lines.push("");
      lines.push(`  Cluster Nodes (${result.clusterNodes.length})`);
      lines.push("  " + "\u2500".repeat(40));

      if (result.clusterNodes.length === 0) {
        lines.push("    No cluster nodes found.");
      } else {
        for (const node of result.clusterNodes) {
          const status = node.status || 'unknown';
          const statusIcon = status === 'online' ? '\u2714' : '\u2718';
          lines.push(`    ${statusIcon} ${node.node_id || node.sys_id}  [${status}]  ${node.sys_updated_on || ''}`);
        }
      }
    }

    // Stuck jobs
    if (result.stuckJobs !== null && result.stuckJobs !== undefined) {
      lines.push("");
      const jobCount = result.stuckJobs.length;
      const statusIcon = jobCount === 0 ? '\u2714' : '\u26A0';
      lines.push(`  ${statusIcon} Stuck Jobs: ${jobCount}`);

      if (jobCount > 0) {
        lines.push("  " + "\u2500".repeat(40));
        for (const job of result.stuckJobs) {
          lines.push(`    - ${job.name || job.sys_id}  (next_action: ${job.next_action || 'N/A'}, state: ${job.state || 'N/A'})`);
        }
      }
    }

    // Semaphores
    if (result.activeSemaphoreCount !== null && result.activeSemaphoreCount !== undefined) {
      lines.push("");
      const semCount = result.activeSemaphoreCount;
      const statusIcon = semCount < 10 ? '\u2714' : '\u26A0';
      lines.push(`  ${statusIcon} Active Semaphores: ${semCount}`);
    }

    // Operational counts
    if (result.operationalCounts) {
      const counts = result.operationalCounts;
      lines.push("");
      lines.push("  Operational Counts");
      lines.push("  " + "\u2500".repeat(40));

      if (counts.openIncidents !== null && counts.openIncidents !== undefined) {
        lines.push(`    Open Incidents:       ${counts.openIncidents}`);
      }

      if (counts.openChanges !== null && counts.openChanges !== undefined) {
        lines.push(`    Open Change Requests: ${counts.openChanges}`);
      }

      if (counts.openProblems !== null && counts.openProblems !== undefined) {
        lines.push(`    Open Problems:        ${counts.openProblems}`);
      }
    }

    // Summary
    if (result.summary) {
      lines.push("");
      lines.push("  " + "\u2500".repeat(70));
      lines.push(`  Summary: ${result.summary}`);
    }

    lines.push("  " + "\u2500".repeat(70));

    return lines;
  }
}
