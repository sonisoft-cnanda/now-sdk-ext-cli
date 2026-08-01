import type { ReactElement, ReactNode } from 'react'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import type { AmbientState } from '../data/ambient.gateway.js'
import type { ApprovalSpec, ApprovalToken } from '../data/approvals.js'
import type { ApprovalChoice } from '../ui/approval-dialog.js'

import { ApprovalDialog } from '../ui/approval-dialog.js'
import { useSession } from './session-context.js'

interface PendingRequest {
  ambient?: AmbientState
  resolve(token: ApprovalToken | null): void
  spec: ApprovalSpec
}

/**
 * `request(spec)` resolves to a token when approved, or null when refused.
 * Callers read linearly:
 *
 *   const token = await approve(spec)
 *   if (!token) return
 *   await gateway.records.updateRecord(spec, token, {...})
 */
export type RequestApproval = (spec: ApprovalSpec) => Promise<ApprovalToken | null>

const ApprovalContext = createContext<null | RequestApproval>(null)

export function useApproval(): RequestApproval {
  const request = useContext(ApprovalContext)
  if (!request) throw new Error('useApproval outside ApprovalProvider')
  return request
}

export interface ApprovalProviderProps {
  children: ReactNode
}

/**
 * Owns the approval dialog. Rendering is EXCLUSIVE — while a request is
 * pending the dialog replaces the pane body (ink has no z-index), which is
 * also what guarantees the user cannot act on anything else mid-decision.
 */
export function ApprovalProvider(props: ApprovalProviderProps): ReactElement {
  const session = useSession()
  const [pending, setPending] = useState<null | PendingRequest>(null)

  const request = useCallback<RequestApproval>(
    async (spec) => {
      const { approvals } = session.gateway

      // Read-only and unapprovable paths fail fast and identically to the
      // gateway's own guard — the UI never shows a dialog it cannot honour.
      if (session.readOnly) return null

      if (!approvals.needsPrompt(spec)) {
        return approvals.mint(spec)
      }

      // The ambient snapshot shown in the dialog is fetched at decision
      // time, not reused from the banner's 60s cache — scope and update set
      // decide where the write lands and must be current.
      const ambient = await session.gateway.ambient
        .getAmbient()
        .catch((): undefined => undefined)

      return new Promise<ApprovalToken | null>((resolve) => {
        setPending({ ambient, resolve, spec })
      })
    },
    [session],
  )

  const handleChoice = useCallback(
    (choice: ApprovalChoice) => {
      if (!pending) return
      const { approvals } = session.gateway
      if (choice === 'no') {
        pending.resolve(null)
      } else {
        if (choice === 'remember') approvals.remember(pending.spec.actionKind)
        pending.resolve(approvals.mint(pending.spec))
      }

      setPending(null)
    },
    [pending, session],
  )

  const value = useMemo(() => request, [request])

  return (
    <ApprovalContext.Provider value={value}>
      {pending ? (
        <ApprovalDialog
          ambient={pending.ambient}
          onChoice={handleChoice}
          requireChallenge={session.gateway.approvals.classify(pending.spec) === 'always'}
          spec={pending.spec}
          supportsRemember={session.gateway.approvals.supportsRemember(pending.spec)}
        />
      ) : (
        props.children
      )}
    </ApprovalContext.Provider>
  )
}
