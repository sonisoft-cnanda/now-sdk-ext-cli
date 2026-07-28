 

export class AttachmentDisplayService {
  /**
   * Format attachment detail for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatAttachmentDetail(attachment: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(attachment, null, 2)];
    }

    const lines: string[] = [];

    lines.push('\n=== Attachment Details ===');
    lines.push("─".repeat(60));

    if (attachment.sys_id) {
      lines.push(`  Sys ID:        ${attachment.sys_id}`);
    }

    if (attachment.file_name) {
      lines.push(`  File Name:     ${attachment.file_name}`);
    }

    if (attachment.content_type) {
      lines.push(`  Content Type:  ${attachment.content_type}`);
    }

    if (attachment.size_bytes) {
      lines.push(`  Size (bytes):  ${attachment.size_bytes}`);
    }

    if (attachment.table_name) {
      lines.push(`  Table:         ${attachment.table_name}`);
    }

    if (attachment.table_sys_id) {
      lines.push(`  Record ID:     ${attachment.table_sys_id}`);
    }

    lines.push("─".repeat(60));

    return lines;
  }

  /**
   * Format attachment list for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatAttachmentList(attachments: any[], jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify({ attachments, total: attachments.length }, null, 2)];
    }

    const lines: string[] = [];

    lines.push(`\nFound ${attachments.length} attachment(s)`);
    lines.push("─".repeat(60));

    if (attachments.length === 0) {
      lines.push('No attachments found.');
      return lines;
    }

    for (const [index, att] of attachments.entries()) {
      lines.push(`${index + 1}. ${att.file_name}`);
      lines.push(`   Sys ID:        ${att.sys_id}`);
      lines.push(`   Content Type:  ${att.content_type}`);
      lines.push(`   Size (bytes):  ${att.size_bytes}`);
      lines.push("─".repeat(60));
    }

    lines.push(`\nTotal: ${attachments.length} attachment(s)`);

    return lines;
  }

  /**
   * Format upload result for display.
   * Returns lines for console output, or JSON string if jsonOutput is true.
   */
  formatUploadResult(result: any, jsonOutput: boolean): string[] {
    if (jsonOutput) {
      return [JSON.stringify(result, null, 2)];
    }

    const lines: string[] = [];

    lines.push('\n=== Attachment Uploaded ===');
    lines.push("─".repeat(60));

    if (result.sys_id) {
      lines.push(`  Sys ID:        ${result.sys_id}`);
    }

    if (result.file_name) {
      lines.push(`  File Name:     ${result.file_name}`);
    }

    if (result.table_name) {
      lines.push(`  Table:         ${result.table_name}`);
    }

    if (result.table_sys_id) {
      lines.push(`  Record ID:     ${result.table_sys_id}`);
    }

    if (result.content_type) {
      lines.push(`  Content Type:  ${result.content_type}`);
    }

    if (result.size_bytes) {
      lines.push(`  Size (bytes):  ${result.size_bytes}`);
    }

    lines.push("─".repeat(60));
    lines.push('Upload completed successfully.');

    return lines;
  }
}
