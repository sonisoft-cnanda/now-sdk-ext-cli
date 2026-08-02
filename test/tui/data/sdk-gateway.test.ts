import { describe, expect, it } from '@jest/globals'

import { childEnv, resolveSdkBinary } from '../../../src/tui/data/sdk.gateway.js'
import { parseAuthAliases } from '../../../src/tui/panes/project/project-pane.js'

describe('resolveSdkBinary', () => {
  it('finds the bundled SDK — it is a direct dependency of this CLI', () => {
    const binary = resolveSdkBinary()
    expect(binary).toBeDefined()
    expect(binary!.origin).toBe('bundled')
    expect(binary!.version).toMatch(/^\d+\.\d+\.\d+/)
    // Resolved deterministically through require.resolve, not via PATH.
    expect(binary!.args[0]).toContain('@servicenow/sdk')
  })
})

describe('childEnv — the --cred-store propagation trap', () => {
  it('re-installs the credential-store shim in the child when it is active here', () => {
    // bin/credstore-boot.js patches the keyring in THIS process only. A
    // spawned now-sdk inherits none of it and silently falls back to the OS
    // keyring — which in a headless session reports "no credentials".
    const env = childEnv({ NOW_SDK_KEYCHAIN_PATCHED: '1' })
    expect(env.NODE_OPTIONS).toContain('@sonisoft/sn-credstore/register')
  })

  it('appends to existing NODE_OPTIONS rather than clobbering them', () => {
    const env = childEnv({ NODE_OPTIONS: '--max-old-space-size=4096', NOW_SDK_KEYCHAIN_PATCHED: '1' })
    expect(env.NODE_OPTIONS).toContain('--max-old-space-size=4096')
    expect(env.NODE_OPTIONS).toContain('sn-credstore/register')
  })

  it('does nothing when the shim is not active — the OS keyring is the default', () => {
    expect(childEnv({}).NODE_OPTIONS).toBeUndefined()
  })

  it('carries SN_CRED_STORE_* through to the child', () => {
    const env = childEnv({ SN_CRED_STORE: 'file', SN_CRED_STORE_PATH: '/tmp/creds.json' })
    expect(env.SN_CRED_STORE).toBe('file')
    expect(env.SN_CRED_STORE_PATH).toBe('/tmp/creds.json')
  })
})

describe('parseAuthAliases', () => {
  it('pulls aliases out of the auth --list table', () => {
    const lines = [
      'Alias        Instance',
      '─────────────────────',
      'dev206299    https://dev206299.service-now.com',
      'prod-acme    https://acme.service-now.com',
    ]
    expect(parseAuthAliases(lines)).toEqual(['dev206299', 'prod-acme'])
  })

  it('ignores the header row and rules', () => {
    expect(parseAuthAliases(['Alias   Instance', '-------'])).toEqual([])
  })

  it('de-duplicates', () => {
    const lines = ['a https://x', 'a https://x']
    expect(parseAuthAliases(lines)).toEqual(['a'])
  })

  it('returns nothing for empty output rather than throwing', () => {
    expect(parseAuthAliases([])).toEqual([])
  })
})

describe('--auth is only appended where the command accepts it', () => {
  it('omits --auth for local-only commands, which reject unknown options', async () => {
    const { ApprovalRegistry } = await import('../../../src/tui/data/approvals.js')
    const { SdkGateway } = await import('../../../src/tui/data/sdk.gateway.js')
    const gw = new SdkGateway(new ApprovalRegistry({ alias: 'dev', env: 'dev' }), 'dev')
    gw.binary = { args: ['/sdk/bin.js'], command: process.execPath, origin: 'bundled' }

    expect(gw.previewOf({ argv: ['explain'], cwd: '/tmp' })).toBe('now-sdk explain')
    expect(gw.previewOf({ argv: ['install'], auth: true, cwd: '/tmp' })).toBe('now-sdk install --auth dev')
  })

  it('prefers the npm script when one is given, and never adds --auth to it', async () => {
    const { ApprovalRegistry } = await import('../../../src/tui/data/approvals.js')
    const { SdkGateway } = await import('../../../src/tui/data/sdk.gateway.js')
    const gw = new SdkGateway(new ApprovalRegistry({ alias: 'dev', env: 'dev' }), 'dev')
    gw.binary = { args: ['/sdk/bin.js'], command: process.execPath, origin: 'bundled' }
    expect(gw.previewOf({ argv: ['build'], auth: true, cwd: '/tmp', npmScript: 'build' })).toBe('npm run build')
  })
})
