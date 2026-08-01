import { useStdout } from 'ink'
import { useEffect, useState } from 'react'

export interface TerminalSize {
  columns: number
  rows: number
}

/**
 * Live terminal size. Every layout decision in the TUI reads this — no
 * component may contain a hardcoded width; that is the concrete lesson
 * from the padEnd(30) display services.
 */
export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout()
  const [size, setSize] = useState<TerminalSize>({
    columns: stdout?.columns ?? 80,
    rows: stdout?.rows ?? 24,
  })

  useEffect(() => {
    if (!stdout) return
    const onResize = () => {
      setSize({ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 })
    }

    stdout.on('resize', onResize)
    return () => {
      stdout.off('resize', onResize)
    }
  }, [stdout])

  return size
}
