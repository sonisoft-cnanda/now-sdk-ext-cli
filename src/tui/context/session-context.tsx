import type { ReactElement, ReactNode } from 'react'

import { createContext, useContext } from 'react'

import type { TuiSession } from '../boot/session.js'

/**
 * The frozen session. Stable identity for the lifetime of the app — every
 * mutable value lives in the store, never here (a context whose value
 * changes re-renders every consumer).
 */
const SessionContext = createContext<null | TuiSession>(null)

export interface SessionProviderProps {
  children: ReactNode
  session: TuiSession
}

export function SessionProvider(props: SessionProviderProps): ReactElement {
  return <SessionContext.Provider value={props.session}>{props.children}</SessionContext.Provider>
}

export function useSession(): TuiSession {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession outside SessionProvider')
  return session
}
