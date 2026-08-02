/**
 * Which scope currently owns the keyboard.
 *
 * The hint bar used to print the global bindings unconditionally, so while
 * a picker was up it advertised `1-5 pane  ^K commands  ? help  q quit` —
 * none of which did anything. Hints that lie are worse than no hints,
 * especially on the first screen a new user meets.
 */
import { useEffect, useState } from 'react'

import type { KeyScopeKind } from '../keymap/scope-stack.js'

import { useUi } from '../context/ui-context.js'

export function useTopScope(): KeyScopeKind | undefined {
  const { scopes } = useUi()
  const [kind, setKind] = useState<KeyScopeKind | undefined>(() => scopes.topKind())

  useEffect(() => {
    // Registration happens in child effects, which run before the parent's;
    // sync once on mount so the first paint is already correct.
    setKind(scopes.topKind())
    return scopes.subscribe(() => {
      setKind(scopes.topKind())
    })
  }, [scopes])

  return kind
}
