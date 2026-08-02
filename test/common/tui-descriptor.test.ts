/**
 * Regression net for the ServiceNowInstance settings fix: init() must
 * populate top-level host/username from the credential, or getHost()/
 * getUserName() are undefined for every command (the exec REPL banner,
 * nex log's header, scope autocomplete and the TUI banner all consume
 * them). Verified end-to-end through `nex tui --json`.
 */
import { describe, expect, it, jest } from '@jest/globals'
import { runCommand } from '@oclif/test'

jest.unstable_mockModule('@servicenow/sdk-cli/dist/auth/index.js', () => ({
  getCredentials: jest.fn<any>().mockResolvedValue({
    instanceUrl: 'https://unit.service-now.com',
    password: 'unit-password',
    type: 'basic',
    username: 'unit-user',
  }),
}))

// Prime the command module before runCommand — oclif's first in-test
// resolution intermittently reports "command not found" without this
// (same pattern as tui-guard.test.ts and the command integration tests).
await import('../../src/commands/tui.js')

interface Descriptor {
  alias: string
  host: null | string
  panes: string[]
  readOnly: boolean
  user: null | string
}

describe('nex tui --json descriptor', () => {
  it('carries host and user resolved from the credential', async () => {
    const { error, result } = await runCommand<Descriptor>(['tui', '--json'])
    expect(error).toBeUndefined()
    expect(result?.host).toBe('https://unit.service-now.com')
    expect(result?.user).toBe('unit-user')
    expect(result?.alias).toBe('fluent-default')
    expect(result?.panes).toContain('records')
  })

  it('reflects --read-only and a chosen alias', async () => {
    const { result } = await runCommand<Descriptor>(['tui', '--json', '--read-only', '--auth', 'dev'])
    expect(result?.readOnly).toBe(true)
    expect(result?.alias).toBe('dev')
  })
})
