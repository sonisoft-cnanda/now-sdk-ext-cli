/**
 * Fixed-capacity ring buffer, drop-oldest. Fixed capacity is what bounds
 * the log pane's memory — there is no virtual scroll to save you. Drops
 * are COUNTED, never silent; the pane renders a visible marker.
 *
 * Implements the Viewport source shape ({length, at}) so the stream renders
 * without copying.
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[]
  private droppedCount = 0
  private size = 0
  private start = 0

  constructor(readonly capacity: number) {
    if (capacity < 1) throw new Error('RingBuffer capacity must be >= 1')
    this.buffer = Array.from({ length: capacity })
  }

  /** Total entries dropped since creation (or last clear). */
  get dropped(): number {
    return this.droppedCount
  }

  get length(): number {
    return this.size
  }

  /** Total entries ever pushed (retained + dropped). */
  get total(): number {
    return this.size + this.droppedCount
  }

  /** Index 0 = oldest retained entry. */
  at(index: number): T {
    if (index < 0 || index >= this.size) {
      throw new RangeError(`RingBuffer index ${index} out of range [0, ${this.size})`)
    }

    return this.buffer[(this.start + index) % this.capacity] as T
  }

  clear(): void {
    this.buffer = Array.from({ length: this.capacity })
    this.droppedCount = 0
    this.size = 0
    this.start = 0
  }

  push(item: T): void {
    if (this.size === this.capacity) {
      this.buffer[this.start] = item
      this.start = (this.start + 1) % this.capacity
      this.droppedCount += 1
    } else {
      this.buffer[(this.start + this.size) % this.capacity] = item
      this.size += 1
    }
  }

  /** Snapshot of retained entries, oldest first (for write-to-file). */
  toArray(): T[] {
    const out: T[] = []
    for (let i = 0; i < this.size; i++) out.push(this.at(i))
    return out
  }
}
