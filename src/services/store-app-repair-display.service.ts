import type {
  OperationProgress,
  StoreAppRepairError,
  StoreAppRepairErrorCode,
  StoreAppRepairErrorDetail,
  StoreAppRepairResult,
  StoreAppRepairStart,
  StoreAppRepairTarget,
} from '@sonisoft/now-sdk-ext-core'

/** A refused repair as nex reports it: code, detail and what to do about it. */
export interface StoreAppRepairFailure {
  code: StoreAppRepairErrorCode
  detail?: StoreAppRepairErrorDetail
  message: string
  remediation: string[]
  type: 'StoreAppRepairError'
}

const REMEDIATION: Record<StoreAppRepairErrorCode, string> = {
  app_inactive: 'Activate the application first; the platform offers Repair only for an active application.',
  app_not_found: 'Check the scope or sys_id with nex query -t sys_store_app -q scope=<scope> -f sys_id,name,version,active --auth <alias>.',
  contains_plugins: 'Repair it from its sys_store_app record in the UI (Related Links > Repair Application), which sends the plugin list.',
  invalid_app: 'Pass the installed application as its sys_store_app sys_id or its scope, e.g. x_acme_app.',
  no_demo_data: 'Leave out --demo-data: this application has no demo data.',
  not_a_store_app: 'The application was developed on this instance, so there is no repository copy to repair from. Repair applies to installed store and company applications.',
  start_failed: 'The request was sent, but the App Client did not confirm a start. Check sys_execution_tracker for a running "Install from the App Repository" before retrying, and that the user has admin (or sn_appclient.app_client_user).',
}

export function projectStoreAppRepairError(error: Pick<StoreAppRepairError, 'code' | 'detail'>): StoreAppRepairFailure {
  return {
    code: error.code,
    ...(error.detail === undefined ? {} : {detail: error.detail}),
    message: `Store application repair refused: ${error.code}.`,
    remediation: [REMEDIATION[error.code] ?? 'Read the application back with nex query -t sys_store_app before retrying.'],
    type: 'StoreAppRepairError',
  }
}

// Names and reasons come from the instance: keep them on one line.
const clean = (text: string | undefined): string => (text ?? '').replaceAll(/\p{Cc}/gu, ' ')
/** How a repair that was not confirmed ended, as the exit code nex reports. */
export type StoreAppRepairOutcome = 'not_confirmed' | 'repair_failed' | 'timed_out'

/** The tracker had not ended when the wait did: the repair may still be queued or running. */
export function repairOutcome(result: StoreAppRepairResult): StoreAppRepairOutcome {
  if (result.success) return 'not_confirmed'
  return result.percent_complete < 100 && result.status !== '3' && result.status !== '4' ? 'timed_out' : 'repair_failed'
}

const appLine = (app: StoreAppRepairTarget): string =>
  `${clean(app.name)} (${clean(app.scope)}) ${clean(app.version)}${app.customizationVersion ? `, customization ${clean(app.customizationVersion)}` : ''}`

export class StoreAppRepairDisplayService {
  failure(failure: StoreAppRepairFailure): string[] {
    const lines = [failure.message]
    if (failure.detail?.serverMessage) lines.push(`App Client: ${clean(failure.detail.serverMessage)}`)
    if (failure.detail?.status !== undefined) lines.push(`HTTP status: ${failure.detail.status}`)
    return [...lines, ...failure.remediation]
  }

  /** How to look the tracker up afterwards, on the same instance. */
  follow(trackerId: string, auth: string | undefined): string {
    const alias = auth && /^[\w.-]+$/.test(auth) ? ` --auth ${auth}` : ''
    return `Follow it: nex query -t sys_execution_tracker -q sys_id=${clean(trackerId)} -f state,message,percent_complete${alias}`
  }

  /** Why the command exits non-zero, for a result that is not repaired. */
  outcome(result: StoreAppRepairResult): string {
    const tracker = clean(result.trackerId)
    switch (repairOutcome(result)) {
      case 'not_confirmed': {
        return 'The App Client reported success, but no finished upgrade history shows the reinstall.'
      }

      case 'timed_out': {
        return `The repair was still running when the wait ended. Do not repair again until tracker ${tracker} has ended.`
      }

      default: {
        return `The repair did not succeed: ${clean(result.error ?? result.status_label)}.`
      }
    }
  }

  progress(progress: OperationProgress): string {
    return `  ${clean(progress.message)}${progress.percentComplete === undefined ? '' : ` (${progress.percentComplete}%)`}`
  }

  result(result: StoreAppRepairResult): string[] {
    const lines: string[] = []
    if (result.repaired) lines.push(`Repaired: ${appLine(result.app)}`)
    else if (result.success) lines.push(`Not confirmed as repaired: ${appLine(result.app)}`)
    else if (repairOutcome(result) === 'timed_out') lines.push(`Still running when the wait ended: ${appLine(result.app)}`)
    else lines.push(`Repair failed: ${appLine(result.app)}${result.error ? `: ${clean(result.error)}` : ''}`)
    lines.push(`Tracker ${clean(result.trackerId)}: ${clean(result.status_label) || clean(result.status)} (${result.percent_complete}%)${result.status_message ? `, ${clean(result.status_message)}` : ''}`)

    const {history} = result
    if (history) {
      const c = history.counts
      lines.push(
        `Upgrade history ${clean(history.sysId)}: ${clean(history.status) || 'unknown'}${history.finished ? `, finished ${clean(history.finished)}` : ''}`,
        `  added ${c.added}, updated ${c.updated}, deleted ${c.deleted}, unchanged ${c.unchanged}, skipped ${c.skipped}, errors ${c.skippedError}, manual merge ${c.skippedManualMerge}, apply once ${c.skippedApplyOnce}`,
      )
      if (history.skippedFiles.length > 0) {
        lines.push('Not applied:')
        for (const file of history.skippedFiles) {
          lines.push(`  ${clean(file.dispositionLabel).padEnd(20)} ${clean(file.type)}: ${clean(file.targetName)} (${clean(file.fileName)})${file.reason ? `: ${clean(file.reason)}` : ''}`)
        }

        if (history.skippedFilesTruncated) lines.push(`  … more; see sys_upgrade_history_log where upgrade_history=${history.sysId}`)
      }
    } else {
      lines.push('Upgrade history: none written for this repair')
    }

    for (const warning of result.warnings) lines.push(`! ${clean(warning)}`)
    return lines
  }

  started(started: StoreAppRepairStart): string[] {
    return [
      `Repair started: ${appLine(started.app)}`,
      `Tracker ${clean(started.trackerId)} (App Client ${started.endpoint === 'repair' ? 'app/repair' : 'app/install with isReinstall'})`,
    ]
  }
}
