/**
 * Stale-response dropping — NOT cancellation.
 *
 * Core exposes no AbortSignal anywhere; an in-flight HTTP request always
 * completes and always costs the instance a transaction. What this gives
 * the UI is correctness, not economy: when a newer request supersedes an
 * older one, the older response is dropped on arrival instead of clobbering
 * fresher state. The economy fix is debouncing at the input edge (250ms on
 * the query bar), and ultimately AbortSignal support in now-sdk-ext-core.
 */
export class RequestSequencer {
  private current = 0

  /** Invalidate everything outstanding (e.g. on unmount). */
  invalidate(): void {
    this.current += 1
  }

  /** True while `token` is still the most recent issue. */
  isCurrent(token: number): boolean {
    return token === this.current
  }

  /** Issue a new token, superseding all previous ones. */
  next(): number {
    this.current += 1
    return this.current
  }
}
