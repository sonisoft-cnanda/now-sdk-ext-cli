import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { captureOutput } from '@oclif/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const mockExecuteScript = jest.fn<any>()

/** The shape core's ScriptScopeError arrives in; the CLI recognises it by `code`. */
function scriptScopeError(reason: string, scope: string, message: string) {
  return Object.assign(new Error(message), {
    code: 'NEX_SCRIPT_SCOPE_UNAVAILABLE',
    name: 'ScriptScopeError',
    reason,
    remediation: 'Run the script in "global" and call the application\'s API fully qualified.',
    scope,
  })
}

// unstable_mockModule, not jest.mock: this suite is ESM, and jest.mock does not
// intercept ESM imports — the command would talk to the real core instead.
jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  resolveSessionCredentials: async (alias: string) => (await import('@servicenow/sdk-cli/dist/auth/index.js')).getCredentials(alias),
  BackgroundScriptExecutor: jest.fn().mockImplementation(() => ({
    executeScript: mockExecuteScript,
  })),
  Logger: jest.fn().mockImplementation(() => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    trace: jest.fn(),
  })),
  // Everything AuthenticatedCommand.init() and common/policy.ts reach for.
  ALLOW_ENV: 'NEX_POLICY_ALLOW',
  DENY_ENV: 'NEX_POLICY_DENY',
  allowFromEnvironment: jest.fn<any>().mockReturnValue(undefined),
  configureLogging: jest.fn(),
  redactValue: jest.fn((value: unknown) => value),
  denyFromEnvironment: jest.fn<any>().mockReturnValue(undefined),
  denyLayer: jest.fn<any>().mockReturnValue({ name: 'test-deny' }),
  flushLogs: jest.fn<any>().mockResolvedValue(undefined),
  grantLayer: jest.fn<any>().mockReturnValue({ name: 'test-grant' }),
  installPolicy: jest.fn(),
  isPolicyRefusal: jest.fn<any>().mockReturnValue(false),
  setRemediationWriter: jest.fn(),
  NowStringUtil: {
    isStringEmpty(str: string | null | undefined): boolean {
      return !str || str.trim().length === 0
    },
  },
  ServiceNowInstance: jest.fn().mockImplementation(() => ({
    getHost: jest.fn().mockReturnValue('https://test.service-now.com'),
    getUserName: jest.fn().mockReturnValue('test-user'),
  })),
}))

jest.unstable_mockModule('@servicenow/sdk-cli/dist/auth/index.js', () => ({
  getCredentials: jest.fn<any>().mockResolvedValue({
    instanceUrl: 'https://test.service-now.com',
    password: 'test-password',
    type: 'basic',
    username: 'test-user',
  }),
}))

// Loaded after the mocks are registered. Run as a class, not via runCommand(), which
// would load the built command from dist/ and escape these mocks.
const { Exec } = await import('../../../src/commands/exec/index.js')
const ROOT = process.cwd()

function exitCodeOf(error: unknown): number | undefined {
  const err = error as undefined | { exitCode?: number; oclif?: { exit?: number } }
  return err?.oclif?.exit ?? err?.exitCode
}

describe('exec - unusable scope', () => {
  let scriptFile: string
  let consoleSpy: ReturnType<typeof jest.spyOn>

  beforeEach(() => {
    jest.clearAllMocks()
    scriptFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nex-exec-scope-')), 'script.js')
    fs.writeFileSync(scriptFile, 'gs.info("hello");')
    consoleSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      process.stdout.write(args.map((a) => String(a)).join(' ') + '\n')
    })
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    fs.rmSync(path.dirname(scriptFile), { force: true, recursive: true })
    // oclif sets process.exitCode on error; a leftover value would fail the jest run.
    process.exitCode = undefined
  })

  it('should exit non-zero with the core message and runnable suggestions for a store app', async () => {
    const message =
      "Scope 'x_acme_cat_util' (Catalog Utilities) is an installed store/repository application (sys_store_app). " +
      'Scripts - Background can only run in "global" or in an application developed on this instance (sys_app).'
    mockExecuteScript.mockRejectedValue(scriptScopeError('NOT_A_DEVELOPED_APP', 'x_acme_cat_util', message))

    const { error } = await captureOutput(async () =>
      Exec.run(['x_acme_cat_util', scriptFile, '--auth', 'qa', '--cred-store'], ROOT))

    expect(error).toBeDefined()
    expect(exitCodeOf(error)).toBe(2)
    expect(error!.message).toBe(message)
    // Not the generic wrapper text the user used to get.
    expect(error!.message).not.toContain('Error executing script')

    const suggestions = (error as unknown as { suggestions?: string[] }).suggestions ?? []
    expect(suggestions.join('\n')).toContain('nex exec global <file> --auth qa --cred-store')
    expect(suggestions.join('\n')).toContain("nex query -t sys_app -f scope,name -q 'scopeLIKEacme' --auth qa --cred-store")
  })

  it('should point a scope that does not exist at the list of runnable scopes', async () => {
    mockExecuteScript.mockRejectedValue(scriptScopeError(
      'SCOPE_NOT_FOUND', 'x_typo_app', "No application with scope 'x_typo_app' exists on this instance."))

    const { error } = await captureOutput(async () => Exec.run(['x_typo_app', scriptFile, '--auth', 'qa'], ROOT))

    expect(exitCodeOf(error)).toBe(2)
    expect(error!.message).toContain("No application with scope 'x_typo_app'")
    const suggestions = (error as unknown as { suggestions?: string[] }).suggestions ?? []
    expect(suggestions[0]).toContain('nex query -t sys_app')
  })

  it('should leave other failures on the generic path', async () => {
    mockExecuteScript.mockRejectedValue(new Error('Error executing script: Status 500'))

    const { error } = await captureOutput(async () => Exec.run(['global', scriptFile, '--auth', 'qa'], ROOT))

    expect(exitCodeOf(error)).toBeGreaterThan(0)
    expect(error!.message).toContain('Status 500')
    expect((error as unknown as { suggestions?: string[] }).suggestions).toBeUndefined()
  })
})
