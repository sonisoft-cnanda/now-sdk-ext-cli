import type { ReactElement, ReactNode } from 'react'

import { createContext, useContext, useMemo } from 'react'

import type { GlyphSet } from '../ui/glyphs.js'

import { ScopeStack } from '../keymap/scope-stack.js'
import { selectGlyphs } from '../ui/glyphs.js'

/**
 * Stable UI plumbing: the key-dispatch stack and the glyph set. Both are
 * identity-stable for the app lifetime; pane state lives in the store.
 */
export interface UiPlumbing {
  glyphs: GlyphSet
  scopes: ScopeStack
}

const UiContext = createContext<null | UiPlumbing>(null)

export interface UiProviderProps {
  ascii?: boolean
  children: ReactNode
}

export function UiProvider(props: UiProviderProps): ReactElement {
  const value = useMemo<UiPlumbing>(
    () => ({ glyphs: selectGlyphs({ ascii: props.ascii }), scopes: new ScopeStack() }),
    [props.ascii],
  )
  return <UiContext.Provider value={value}>{props.children}</UiContext.Provider>
}

export function useUi(): UiPlumbing {
  const ui = useContext(UiContext)
  if (!ui) throw new Error('useUi outside UiProvider')
  return ui
}
