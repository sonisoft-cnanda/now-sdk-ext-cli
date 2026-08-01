import { useEffect, useRef } from 'react'

import type { KeyEvent, KeyScopeKind } from '../keymap/scope-stack.js'

import { useUi } from '../context/ui-context.js'

/**
 * Register a key handler on the shared scope stack. The handler ref is
 * updated every render so it closes over fresh state without re-registering
 * (re-registering would change stack order within the kind).
 */
export function useKeymap(
  kind: KeyScopeKind,
  handler: (event: KeyEvent) => 'handled' | 'pass',
  enabled = true,
): void {
  const { scopes } = useUi()
  const ref = useRef(handler)
  ref.current = handler

  useEffect(() => {
    if (!enabled) return
    return scopes.register(kind, (event) => ref.current(event))
  }, [scopes, kind, enabled])
}
