import type { ReactElement, ReactNode } from 'react'

import { Box, Text } from 'ink'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { useUi } from '../context/ui-context.js'
import { theme } from './theme.js'

export type ToastKind = 'error' | 'info' | 'success'

interface Toast {
  id: number
  kind: ToastKind
  text: string
}

export type ShowToast = (kind: ToastKind, text: string) => void

const ToastContext = createContext<null | ShowToast>(null)

export function useToast(): ShowToast {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast outside ToastProvider')
  return show
}

const TOAST_MS = 4000
const MAX_TOASTS = 3

const colorFor = (kind: ToastKind) =>
  kind === 'success' ? theme.state.ok : kind === 'error' ? theme.state.error : theme.fg.muted

/**
 * Transient feedback. This is the only place a background operation's
 * failure surfaces if the user has navigated away, so errors linger longer
 * and are never silently dropped.
 */
export function ToastProvider(props: { children: ReactNode }): ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([])
  const { glyphs } = useUi()

  const show = useCallback<ShowToast>((kind, text) => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), kind, text }].slice(-MAX_TOASTS))
  }, [])

  useEffect(() => {
    if (toasts.length === 0) return
    const timer = setTimeout(() => {
      setToasts((current) => current.slice(1))
    }, TOAST_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [toasts])

  const value = useMemo(() => show, [show])
  // Glyphs come from context (ASCII mode swaps the whole set), so this one
  // stays in scope; the colour map does not depend on context.
  const glyphFor = (kind: ToastKind) =>
    kind === 'success' ? glyphs.tick : kind === 'error' ? glyphs.cross : glyphs.separator

  return (
    <ToastContext.Provider value={value}>
      {props.children}
      {toasts.length > 0 ? (
        <Box flexDirection="column">
          {toasts.map((toast) => (
            <Text color={colorFor(toast.kind)} key={toast.id} wrap="truncate">
              {glyphFor(toast.kind)} {toast.text}
            </Text>
          ))}
        </Box>
      ) : null}
    </ToastContext.Provider>
  )
}
