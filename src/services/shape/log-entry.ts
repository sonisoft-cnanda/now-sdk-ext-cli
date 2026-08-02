/**
 * Log-line shaping — the severity DECISION extracted from
 * log-formatter.service.ts:formatLog, where it was entangled with chalk
 * calls. The formatter keeps the painting (severity → chalk); the TUI maps
 * the same severity → theme token. One definition, two painters.
 */

export type MessageSeverity = 'error' | 'plain' | 'success' | 'system' | 'warn'

/**
 * The exact keyword lists the CLI highlights, byte-for-byte from the
 * formatter (the mixed-case duplicates are historical — the regex is
 * case-insensitive anyway — but output compatibility wins).
 */
export const SEVERITY_KEYWORDS: Record<Exclude<MessageSeverity, 'plain' | 'system'>, string[]> = {
  error: ['error', 'exception', 'failed', 'failure', 'ERROR', 'Exception', 'Failed', 'Failure'],
  success: ['success', 'completed', 'finished', 'done', 'Success', 'Completed', 'Finished', 'Done'],
  warn: ['warn', 'warning', 'deprecated', 'Warning', 'WARN', 'Deprecated'],
}

/**
 * The formatter's historical branch order, extracted verbatim: error beats
 * warn beats success beats system; anything else is plain.
 */
export function classifySeverity(message: string): MessageSeverity {
  const lower = message.toLowerCase()
  if (lower.includes('error') || lower.includes('exception') || lower.includes('failed') || lower.includes('failure')) {
    return 'error'
  }

  if (lower.includes('warn') || lower.includes('warning') || lower.includes('deprecated')) {
    return 'warn'
  }

  if (lower.includes('success') || lower.includes('completed') || lower.includes('finished') || lower.includes('done')) {
    return 'success'
  }

  if (lower.includes('system') || lower.includes('user') || lower.includes('transaction') || lower.includes('request')) {
    return 'system'
  }

  return 'plain'
}

/** Normalized log entry for the TUI stream. */
export interface LogEntry {
  createdBy?: string
  createdOn: string
  level: string
  /** Fixed-width label: ERR / WRN / INF / DBG / L?? */
  levelLabel: string
  message: string
  sequence?: string
  severity: MessageSeverity
  source: string
  sysId: string
}

/** Syslog level (string or numeric) → fixed-width label. */
export function levelLabel(level: string): string {
  switch (level.toLowerCase()) {
    case '-1':
    case '0':
    case 'error': {
      return 'ERR'
    }

    case '1':
    case 'warn':
    case 'warning': {
      return 'WRN'
    }

    case '2':
    case 'info': {
      return 'INF'
    }

    case '3':
    case 'debug': {
      return 'DBG'
    }

    default: {
      return (level || '?').toUpperCase().slice(0, 3).padEnd(3)
    }
  }
}

/** Normalize a raw syslog/tail record. Tolerates missing fields. */
export function toLogEntry(raw: Record<string, unknown>): LogEntry {
  const message = String(raw.message ?? '')
  const level = String(raw.level ?? '')
  const entry: LogEntry = {
    createdOn: String(raw.sys_created_on ?? ''),
    level,
    levelLabel: levelLabel(level),
    message,
    severity: classifySeverity(message),
    source: String(raw.source ?? ''),
    sysId: String(raw.sys_id ?? ''),
  }
  if (raw.sys_created_by) entry.createdBy = String(raw.sys_created_by)
  if (raw.sequence !== undefined && raw.sequence !== null && raw.sequence !== '') {
    entry.sequence = String(raw.sequence)
  }

  return entry
}
