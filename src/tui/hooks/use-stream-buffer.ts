import { useEffect, useState } from 'react'

/**
 * Subscribe to a version counter at a fixed frame rate — NEVER per event.
 * The log tail can ingest hundreds of entries/sec; this hook re-renders its
 * consumer at most `fps` times/sec, and only when the version actually
 * moved (setState with the same value bails out of the render).
 *
 * The same mechanism later drives onProgress streams (clone/bulk) and ATF
 * polling: one bridge, many producers.
 */
export function useStreamVersion(source: { version: number }, fps = 10): number {
  const [version, setVersion] = useState(source.version)

  useEffect(() => {
    const interval = setInterval(() => {
      setVersion(source.version)
    }, Math.max(16, Math.round(1000 / fps)))
    return () => {
      clearInterval(interval)
    }
  }, [source, fps])

  return version
}
