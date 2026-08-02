/**
 * Tiny per-alias preference store: ~/.config/nex-tui/prefs.json.
 * Currently holds saved log filter rules (as the CLI's `-f` rule strings,
 * so anything saved here copies straight out as a `nex log -f "…"` line).
 * Never stores credentials, never stores instance data — preferences only.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface AliasPrefs {
  logRules?: string[]
}

interface PrefsFile {
  [alias: string]: AliasPrefs
}

function prefsDir(): string {
  return process.env.NEX_TUI_CONFIG_DIR ?? join(homedir(), '.config', 'nex-tui')
}

function prefsPath(): string {
  return join(prefsDir(), 'prefs.json')
}

export function loadPrefs(alias: string): AliasPrefs {
  try {
    const parsed = JSON.parse(readFileSync(prefsPath(), 'utf8')) as PrefsFile
    return parsed[alias] ?? {}
  } catch {
    return {}
  }
}

export function savePrefs(alias: string, prefs: AliasPrefs): void {
  let all: PrefsFile = {}
  try {
    all = JSON.parse(readFileSync(prefsPath(), 'utf8')) as PrefsFile
  } catch {
    // first write
  }

  all[alias] = { ...all[alias], ...prefs }
  try {
    mkdirSync(prefsDir(), { recursive: true })
    writeFileSync(prefsPath(), JSON.stringify(all, null, 2) + '\n', { mode: 0o600 })
  } catch {
    // Preferences are a convenience — failing to persist them must never
    // break the session.
  }
}
