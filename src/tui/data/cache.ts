/**
 * TTL + LRU cache with in-flight de-duplication, modelled on the scopeCache
 * in src/common/scope-autocomplete.ts (Map + timestamp + TTL) but bounded.
 *
 * Core has no caching of its own, and a TUI that re-renders freely would
 * otherwise hammer the instance — schema and table lists are near-static,
 * so they live here. Records are deliberately NEVER cached (a stale record
 * view in a write-capable tool is a hazard); the record store in React
 * state owns those.
 */

export interface TtlCacheOptions {
  /** Maximum entries before least-recently-used eviction. */
  maxEntries?: number
  /** Time-to-live in ms. Omit for session-lifetime entries. */
  ttlMs?: number
}

interface Entry<V> {
  expiresAt: number | undefined
  value: V
}

export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>()
  private readonly inflight = new Map<string, Promise<V>>()
  private readonly maxEntries: number
  private readonly ttlMs: number | undefined

  constructor(options: TtlCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 256
    this.ttlMs = options.ttlMs
  }

  clear(): void {
    this.entries.clear()
    this.inflight.clear()
  }

  delete(key: string): void {
    this.entries.delete(key)
    this.inflight.delete(key)
  }

  get(key: string): undefined | V {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
      this.entries.delete(key)
      return undefined
    }

    // LRU freshness: re-insert so Map iteration order tracks recency.
    this.entries.delete(key)
    this.entries.set(key, entry)
    return entry.value
  }

  /**
   * Read-through load with in-flight de-duplication: two panes asking for
   * the same schema at the same moment share one HTTP request. A failed
   * load is NOT cached — the next call retries.
   */
  async getOrLoad(key: string, loader: () => Promise<V>): Promise<V> {
    const hit = this.get(key)
    if (hit !== undefined) return hit

    const pending = this.inflight.get(key)
    if (pending) return pending

    const promise = (async () => {
      try {
        const value = await loader()
        this.set(key, value)
        return value
      } finally {
        this.inflight.delete(key)
      }
    })()
    this.inflight.set(key, promise)
    return promise
  }

  set(key: string, value: V): void {
    if (this.entries.has(key)) this.entries.delete(key)
    this.entries.set(key, {
      expiresAt: this.ttlMs === undefined ? undefined : Date.now() + this.ttlMs,
      value,
    })
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value as string
      this.entries.delete(oldest)
    }
  }
}
