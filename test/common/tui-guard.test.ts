/**
 * Non-TTY guard for nex tui. Lives under test/common/ so it runs in the
 * test:unit CI job — "does nex tui refuse cleanly when piped" is exactly the
 * regression that would break people's scripts.
 *
 * Under jest, process.stdin/stdout are not TTYs, which is precisely the
 * condition the guard refuses. The guard runs in init() BEFORE credential
 * resolution, so no credential mocking is needed: reaching the keyring at
 * all would itself be the bug.
 */
import { describe, expect, it } from '@jest/globals'
import { runCommand } from '@oclif/test'

const { Tui } = await import('../../src/commands/tui.js')

describe('nex tui non-TTY guard', () => {
  it('refuses to run when stdin/stdout are not TTYs', async () => {
    const { error } = await runCommand(['tui'])
    expect(error).toBeDefined()
    expect(error?.message).toContain('interactive terminal')
  })

  it('suggests the scriptable alternatives', async () => {
    const { error } = await runCommand(['tui'])
    const suggestions = (error as undefined | { suggestions?: string[] })?.suggestions ?? []
    expect(suggestions.join(' ')).toContain('--json')
  })

  it('declares the json flag so agents can introspect', () => {
    expect(Tui.enableJsonFlag).toBe(true)
  })
})
