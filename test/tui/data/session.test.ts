import { describe, expect, it, jest } from '@jest/globals'

// ESM: jest.mock does not hoist under --experimental-vm-modules;
// unstable_mockModule + dynamic import is the working pattern.
jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  AggregateQuery: jest.fn(),
  BackgroundScriptExecutor: jest.fn(),
  SchemaDiscovery: jest.fn(),
  ScopeManager: jest.fn(),
  SyslogReader: jest.fn(),
  TableAPIRequest: jest.fn(),
  TaskOperations: jest.fn(),
  UpdateSetManager: jest.fn(),
}))

const { classifyEnvironment, createSession } = await import('../../../src/tui/boot/session.js')

describe('classifyEnvironment', () => {
  it('honours an explicit NEX_TUI_ENV_<ALIAS> override first', () => {
    const env = { NEX_TUI_ENV_MY_PROD: 'dev' }
    expect(classifyEnvironment('my-prod', 'https://acme.service-now.com', env)).toBe('dev')
  })

  it('classifies prod hostnames', () => {
    expect(classifyEnvironment('x', 'https://acmeprod.service-now.com', {})).toBe('unknown')
    expect(classifyEnvironment('x', 'https://acme-prod.service-now.com', {})).toBe('prod')
    expect(classifyEnvironment('x', 'https://prd.acme.com', {})).toBe('prod')
  })

  it('classifies dev and test hostnames', () => {
    expect(classifyEnvironment('x', 'https://dev12345.service-now.com', {})).toBe('dev')
    expect(classifyEnvironment('x', 'https://acme-uat.service-now.com', {})).toBe('test')
    expect(classifyEnvironment('x', 'https://acme-test.service-now.com', {})).toBe('test')
    expect(classifyEnvironment('x', 'https://acme-sandbox.service-now.com', {})).toBe('test')
  })

  it('defaults to unknown — treated as prod by every safety decision', () => {
    expect(classifyEnvironment('x', 'https://acme.service-now.com', {})).toBe('unknown')
  })

  it('tolerates a bare hostname (no URL scheme)', () => {
    expect(classifyEnvironment('x', 'dev99.service-now.com', {})).toBe('dev')
  })
})

describe('createSession', () => {
  const instance = {
    getHost: () => 'https://dev12345.service-now.com',
    getUserName: () => 'admin',
  }

  it('resolves identity once and freezes the session', () => {
    const session = createSession({ alias: 'dev', instance, readOnly: false })
    expect(session.host).toBe('https://dev12345.service-now.com')
    expect(session.user).toBe('admin')
    expect(session.env).toBe('dev')
    expect(Object.isFrozen(session)).toBe(true)
  })

  it('carries readOnly through', () => {
    const session = createSession({ alias: 'dev', instance, readOnly: true })
    expect(session.readOnly).toBe(true)
  })
})
