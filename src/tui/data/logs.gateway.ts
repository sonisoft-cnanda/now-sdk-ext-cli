/**
 * The live syslog stream. Ingest happens OUTSIDE React: onLog callbacks
 * (hundreds/sec on a busy instance) write into a bounded ring and bump a
 * version counter; React subscribes to the counter at 10Hz via
 * use-stream-buffer and renders only the visible window. A setState per
 * log would be a render per log at ink's frame budget — the app would lock.
 *
 * Filtering happens ON INGEST, reusing LogFilterService.matchesFilters
 * verbatim (the CLI's 13-operator syntax). Raw entries stay in the ring;
 * the filtered view is a second bounded buffer rebuilt on rule changes,
 * so editing rules never refetches.
 */
import { SyslogReader } from '@sonisoft/now-sdk-ext-core'

import type { FilterRule } from '../../services/log-filter.service.js'
import type { LogEntry } from '../../services/shape/log-entry.js'

import { LogFilterService } from '../../services/log-filter.service.js'
import { toLogEntry } from '../../services/shape/log-entry.js'
import { RingBuffer } from './ring-buffer.js'

export type TailStatus = 'connected' | 'connecting' | 'stopped'

export class LogsGateway {
  /** Bumped on every mutation the UI must observe. */
  version = 0
private readonly filterService = new LogFilterService()
  private raw: RingBuffer<LogEntry>
  private reader: null | SyslogReader = null
  private rules: FilterRule[] = []
  private status: TailStatus = 'stopped'
  private view: RingBuffer<LogEntry>

  constructor(
    private readonly instance: unknown,
    readonly capacity = 5000,
  ) {
    this.raw = new RingBuffer<LogEntry>(capacity)
    this.view = new RingBuffer<LogEntry>(capacity)
  }

  getRules(): FilterRule[] {
    return this.rules
  }

  getStatus(): TailStatus {
    return this.status
  }

  /** Entries hidden by the active rules, as a fraction of retained raw. */
  hiddenRatio(): number {
    if (this.raw.length === 0 || this.rules.length === 0) return 0
    return 1 - this.view.length / this.raw.length
  }

  isTailing(): boolean {
    return this.status !== 'stopped'
  }

  rawDropped(): number {
    return this.raw.dropped
  }

  /** Re-derive the filtered view from the raw ring (rule edits). */
  setRules(rules: FilterRule[]): void {
    this.rules = rules
    const next = new RingBuffer<LogEntry>(this.capacity)
    for (const entry of this.raw.toArray()) {
      if (this.matches(entry)) next.push(entry)
    }

    this.view = next
    this.version += 1
  }

  /** Snapshot of the filtered view (write-to-file). */
  snapshot(): LogEntry[] {
    return this.view.toArray()
  }

  /**
   * Start the ChannelAjax tail. The core promise settles only when tailing
   * stops — it is deliberately not awaited; errors surface through status.
   * stopTail is registered with the process-level cleanup registry by the
   * caller (a useEffect teardown alone is skipped by uncaught exceptions,
   * and a live poll would pin the process open).
   */
  startTail(intervalMs = 1000): void {
    if (this.reader) return
    this.status = 'connecting'
    this.version += 1

    const reader = new SyslogReader(this.instance as never)
    this.reader = reader
    reader
      .startTailingWithChannelAjax({
        append: false,
        interval: intervalMs,
        onLog: (raw: Record<string, unknown>) => {
          if (this.status === 'connecting') this.status = 'connected'
          const entry = toLogEntry(raw)
          this.raw.push(entry)
          if (this.matches(entry)) this.view.push(entry)
          this.version += 1
        },
      })
      .then(() => {
        // Verified against core's implementation: this promise resolves
        // when SETUP completes (initial fetch + interval scheduled), NOT
        // when tailing stops — polling continues via the interval. A
        // resolved promise with no entry yet just means a quiet instance.
        if (this.reader === reader && this.status === 'connecting') {
          this.status = 'connected'
          this.version += 1
        }
      })
      .catch(() => {
        // Setup died (auth, network, unsupported instance). Status is the
        // signal; the pane renders it. Never throw into the void.
        if (this.reader === reader) {
          this.reader = null
          this.status = 'stopped'
          this.version += 1
        }
      })
  }

  stopTail(): void {
    if (!this.reader) return
    try {
      this.reader.stopTailing()
    } catch {
      // best-effort — disposal must never block the exit path
    }

    this.reader = null
    this.status = 'stopped'
    this.version += 1
  }

  /** The filtered view, renderable directly by Viewport. */
  viewSource(): { at(i: number): LogEntry; length: number } {
    return this.view
  }

  private matches(entry: LogEntry): boolean {
    if (this.rules.length === 0) return true
    // matchesFilters consumes the raw record shape; LogEntry fields keep
    // the same names the CLI filters on (level, message, source).
    return this.filterService.matchesFilters(
      { level: entry.level, message: entry.message, source: entry.source, sys_created_by: entry.createdBy },
      this.rules,
    )
  }
}
