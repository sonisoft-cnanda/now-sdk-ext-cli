import { expect, describe, it, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { runCommand } from '@oclif/test'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * These run against the REAL credential store, pointed at a temp file, rather
 * than a mocked one.
 *
 * Not a stylistic choice: the auth commands reach sn-credstore through a dynamic
 * `import()` (the package is not published yet, so a static import would break
 * command discovery for every command). Under jest's ESM mode that import
 * resolves through Node, not the module registry, so `jest.mock` silently does
 * not apply — the command quietly reads the developer's real credentials and the
 * assertions end up describing whatever happens to be on the machine.
 *
 * Driving the real store through SN_CRED_STORE_PATH also exercises the wiring
 * these tests exist to cover, which a mock would have stubbed out.
 *
 * The file backend is used deliberately: systemd-creds needs a running systemd,
 * which CI containers do not have.
 */

const OAUTH_EXPIRES_AT = 1_785_338_450 // seconds — the SDK's unit, not ms

let dir: string
let blobPath: string
let savedEnv: Record<string, string | undefined>

function seedStore(): void {
  writeFileSync(
    blobPath,
    JSON.stringify({
      dev206299: {
        alias: 'dev206299',
        creds: {
          access_token: 'not-a-real-access-token',
          expires_at: OAUTH_EXPIRES_AT,
          instanceUrl: 'https://dev206299.service-now.com',
          refresh_token: 'not-a-real-refresh-token',
          type: 'oauth',
        },
        isDefault: true,
      },
      sandbox: {
        alias: 'sandbox',
        creds: {
          instanceUrl: 'https://sandbox.service-now.com',
          password: 'not-a-real-password',
          type: 'basic',
          username: 'svc',
        },
        isDefault: false,
      },
    }),
    { mode: 0o600 },
  )
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'nex-auth-test-'))
  blobPath = join(dir, 'credentials.json')
})

afterAll(() => {
  rmSync(dir, { force: true, recursive: true })
})

beforeEach(() => {
  savedEnv = {
    NOW_SDK_KEYCHAIN_PATCHED: process.env.NOW_SDK_KEYCHAIN_PATCHED,
    SN_CRED_STORE: process.env.SN_CRED_STORE,
    SN_CRED_STORE_PATH: process.env.SN_CRED_STORE_PATH,
  }
  process.env.SN_CRED_STORE = 'file'
  process.env.SN_CRED_STORE_PATH = blobPath
  seedStore()
})

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('auth commands', () => {
  describe('auth list', () => {
    it('lists stored aliases and marks the default', async () => {
      const { stdout } = await runCommand(['auth', 'list'])

      expect(stdout).toContain('dev206299')
      expect(stdout).toContain('sandbox')
      expect(stdout).toContain('* dev206299')
    })

    it('never prints a secret', async () => {
      const { stdout } = await runCommand(['auth', 'list'])

      expect(stdout).not.toContain('not-a-real-password')
      expect(stdout).not.toContain('not-a-real-access-token')
      expect(stdout).not.toContain('not-a-real-refresh-token')
    })

    it('renders oauth expiry as a date, not a raw epoch', async () => {
      // expires_at is UNIX SECONDS. Treating it as milliseconds renders 1970 and
      // reports every live token as expired.
      const { stdout } = await runCommand(['auth', 'list'])

      expect(stdout).toContain('2026-')
      expect(stdout).not.toContain(String(OAUTH_EXPIRES_AT))
    })

    it('reports an empty store without pretending it is an error', async () => {
      writeFileSync(blobPath, '{}', { mode: 0o600 })
      const { error, stdout } = await runCommand(['auth', 'list'])

      expect(error).toBeUndefined()
      expect(stdout).toContain('No credentials stored')
    })

    it('returns structured data for --json, with no secrets in it', async () => {
      const { result } = await runCommand(['auth', 'list', '--json'])
      const summary = result as { aliases: unknown[]; store: string }

      expect(summary.store).toBe('file')
      expect(summary.aliases).toHaveLength(2)
      // --json output is exactly what gets piped into a log file.
      expect(JSON.stringify(summary)).not.toContain('not-a-real')
    })
  })

  describe('auth use', () => {
    it('sets the default alias', async () => {
      await runCommand(['auth', 'use', 'sandbox'])
      const { result } = await runCommand(['auth', 'list', '--json'])

      const { aliases } = result as { aliases: Array<{ alias: string; isDefault: boolean }> }
      expect(aliases.find((a) => a.alias === 'sandbox')?.isDefault).toBe(true)
      // Exactly one default — two would make the SDK's choice arbitrary.
      expect(aliases.filter((a) => a.isDefault)).toHaveLength(1)
    })

    it('fails when the alias does not exist', async () => {
      const { error } = await runCommand(['auth', 'use', 'nope'])

      expect(error?.message).toContain('nope')
    })
  })

  describe('auth delete', () => {
    it('removes one alias and leaves the rest', async () => {
      await runCommand(['auth', 'delete', 'sandbox'])
      const { result } = await runCommand(['auth', 'list', '--json'])

      const { aliases } = result as { aliases: Array<{ alias: string }> }
      expect(aliases.map((a) => a.alias)).toEqual(['dev206299'])
    })

    it('promotes a survivor when the default is deleted', async () => {
      // Otherwise the SDK is left with a store in which nothing is default, and
      // every command without --auth fails.
      await runCommand(['auth', 'delete', 'dev206299'])
      const { result } = await runCommand(['auth', 'list', '--json'])

      const { aliases } = result as { aliases: Array<{ alias: string; isDefault: boolean }> }
      expect(aliases).toHaveLength(1)
      expect(aliases[0].isDefault).toBe(true)
    })

    it('requires an alias or --all rather than silently removing everything', async () => {
      const { error } = await runCommand(['auth', 'delete'])
      expect(error?.message).toContain('--all')

      const { result } = await runCommand(['auth', 'list', '--json'])
      expect((result as { aliases: unknown[] }).aliases).toHaveLength(2)
    })

    it('removes everything with --all', async () => {
      await runCommand(['auth', 'delete', '--all'])
      const { result } = await runCommand(['auth', 'list', '--json'])

      expect((result as { aliases: unknown[] }).aliases).toHaveLength(0)
    })

    it('fails on an unknown alias instead of reporting success', async () => {
      const { error } = await runCommand(['auth', 'delete', 'nope'])

      expect(error?.message).toContain('nope')
    })
  })

  describe('auth doctor', () => {
    it('reports the shim as active when it is', async () => {
      process.env.NOW_SDK_KEYCHAIN_PATCHED = '1'
      const { result } = await runCommand(['auth', 'doctor', '--json'])

      expect(result).toMatchObject({ shimActive: true })
    })

    it('reports the shim as inactive when it is not', async () => {
      // This is the diagnosis that matters: with the shim off, the SDK is on the
      // keyring path that non-interactive sessions cannot unlock.
      delete process.env.NOW_SDK_KEYCHAIN_PATCHED
      const { result } = await runCommand(['auth', 'doctor', '--json'])

      expect(result).toMatchObject({ shimActive: false })
    })

    it('still reports when the store cannot be read', async () => {
      // The whole point of doctor: it has to run in exactly the situation that
      // breaks everything else.
      chmodSync(blobPath, 0o000)
      try {
        const { error, result } = await runCommand(['auth', 'doctor', '--json'])

        expect(error).toBeUndefined()
        expect(result).toHaveProperty('readError')
        // Backend probing must still happen — that is the diagnostic.
        expect((result as { backends: unknown[] }).backends.length).toBeGreaterThan(0)
      } finally {
        chmodSync(blobPath, 0o600)
      }
    })
  })
})
