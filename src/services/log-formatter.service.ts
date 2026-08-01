import chalk from 'chalk';

import type { FilterRule } from './log-filter.service.js';

import { classifySeverity, SEVERITY_KEYWORDS } from './shape/log-entry.js';

export interface LogFormatterOptions {
  noColor: boolean;
}

export interface HeaderConfig {
  filterRules: FilterRule[];
  host: string;
  interval: number;
  output?: string;
}

export class LogFormatterService {
  private noColor: boolean;

  constructor(options: LogFormatterOptions) {
    this.noColor = options.noColor;
  }

  /**
   * Format the header display for log tailing.
   * Returns an array of lines to output.
   */
  formatHeader(config: HeaderConfig): string[] {
    const { filterRules, host, interval, output } = config;
    const lines: string[] = [];
    const width = 80;

    if (this.noColor) {
      const line = '═'.repeat(width);
      lines.push(`\n${line}`);
      lines.push(`  ServiceNow Log Tail (ChannelAjax)`.padEnd(width - 2) + '  ');
      lines.push(line);
      lines.push(`\n  Instance:       ${host}`);
      lines.push(`  Method:         ChannelAjax logtail`);
      lines.push(`  Poll Interval:  ${interval}ms`);

      if (output) {
        lines.push(`  Output File:    ${output}`);
      }

      if (filterRules.length > 0) {
        lines.push(`  Filters:        ${filterRules.length} active`);
        for (const rule of filterRules) {
          lines.push(`    - ${rule.field} ${rule.operator} "${rule.value}"`);
        }
      }

      lines.push(`\n${line}`);
      lines.push('  Tailing logs... (Press Ctrl+C to stop)');
      lines.push(`${line}\n`);
    } else {
      const line = chalk.cyan('═'.repeat(width));
      lines.push(`\n${line}`);
      lines.push(chalk.bold.white(`  🚀 ServiceNow Log Tail ${chalk.cyan('(ChannelAjax)')}`));
      lines.push(line);
      lines.push(`\n  ${chalk.gray('Instance:')}       ${chalk.green(host)}`);
      lines.push(`  ${chalk.gray('Method:')}         ${chalk.yellow('ChannelAjax logtail')}`);
      lines.push(`  ${chalk.gray('Poll Interval:')}  ${chalk.cyan(`${interval}ms`)}`);

      if (output) {
        lines.push(`  ${chalk.gray('Output File:')}    ${chalk.blue(output)}`);
      }

      if (filterRules.length > 0) {
        lines.push(`  ${chalk.gray('Filters:')}        ${chalk.magenta(`${filterRules.length} active`)}`);
        for (const rule of filterRules) {
          lines.push(`    ${chalk.gray('•')} ${chalk.cyan(rule.field)} ${chalk.yellow(rule.operator)} ${chalk.green(`"${rule.value}"`)}`);
        }
      }

      lines.push(`\n${line}`);
      lines.push(chalk.yellow('  📡 Tailing logs... ') + chalk.gray('(Press Ctrl+C to stop)'));
      lines.push(`${line}\n`);
    }

    return lines;
  }

  /**
   * Format a single log entry for display.
   * Returns an array of lines to output.
   */
  formatLog(log: Record<string, unknown>, count: number): string[] {
    const lines: string[] = [];
    const date = new Date(log.sys_created_on as string);
    const timestamp = date.toLocaleString();
    const message = log.message as string;

    if (this.noColor) {
      const divider = '─'.repeat(80);
      lines.push(divider);
      lines.push(`⏰ ${timestamp}`);

      if (log.sequence) {
        lines.push(`🔢 Sequence: ${log.sequence as string}`);
      }

      lines.push(`💬 ${message}`);
      lines.push(`#${count}\n`);
    } else {
      lines.push(chalk.gray('─'.repeat(80)));

      lines.push(
        chalk.gray('⏰ ') +
        chalk.dim(timestamp) +
        chalk.gray(' │ ') +
        (log.sequence ? chalk.cyan(`#${log.sequence as string}`) : chalk.gray('#N/A')) +
        chalk.gray(' │ ') +
        chalk.dim(`log ${count}`)
      );

      let formattedMessage = message;

      // The severity decision lives in shape/log-entry (shared with the
      // TUI); the chalk painting stays here. Byte-compatible with the
      // historical inline branch chain.
      const severity = classifySeverity(message);
      switch (severity) {
        case 'error': {
          formattedMessage = this.highlightKeywords(message, SEVERITY_KEYWORDS.error, chalk.bold.red);
          break;
        }

        case 'success': {
          formattedMessage = this.highlightKeywords(message, SEVERITY_KEYWORDS.success, chalk.bold.green);
          break;
        }

        case 'system': {
          formattedMessage = chalk.blue(message);
          break;
        }

        case 'warn': {
          formattedMessage = this.highlightKeywords(message, SEVERITY_KEYWORDS.warn, chalk.bold.yellow);
          break;
        }

        default: {
          break;
        }
      }

      lines.push(chalk.white('💬 ') + formattedMessage);
      lines.push('');
    }

    return lines;
  }

  /**
   * Highlight keywords in text using the provided formatter function.
   * Uses word-boundary matching to avoid partial matches.
   */
  highlightKeywords(text: string, keywords: string[], formatter: (text: string) => string): string {
    let result = text;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      result = result.replace(regex, (match) => formatter(match));
    }

    return result;
  }
}
