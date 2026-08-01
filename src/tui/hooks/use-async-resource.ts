import { useCallback, useEffect, useRef, useState } from 'react'

import { RequestSequencer } from '../data/request-token.js'

export type AsyncResource<T> =
  | { data: T; status: 'ready' }
  | { error: Error; status: 'error' }
  | { status: 'idle' }
  | { status: 'loading' }

/**
 * Load-with-stale-drop. Each run() supersedes the previous one; a superseded
 * response is discarded on arrival (see data/request-token.ts — this is
 * correctness, not cancellation; the HTTP request still completes).
 * Unmount invalidates everything outstanding.
 */
export function useAsyncResource<T>(): {
  reset: () => void
  resource: AsyncResource<T>
  run: (loader: () => Promise<T>) => void
} {
  const sequencer = useRef(new RequestSequencer())
  const [resource, setResource] = useState<AsyncResource<T>>({ status: 'idle' })

  useEffect(() => {
    const seq = sequencer.current
    return () => {
      seq.invalidate()
    }
  }, [])

  const run = useCallback((loader: () => Promise<T>) => {
    const token = sequencer.current.next()
    setResource({ status: 'loading' })
    loader().then(
      (data) => {
        if (sequencer.current.isCurrent(token)) setResource({ data, status: 'ready' })
      },
      (error: unknown) => {
        if (sequencer.current.isCurrent(token)) {
          setResource({ error: error instanceof Error ? error : new Error(String(error)), status: 'error' })
        }
      },
    )
  }, [])

  const reset = useCallback(() => {
    sequencer.current.invalidate()
    setResource({ status: 'idle' })
  }, [])

  return { reset, resource, run }
}
