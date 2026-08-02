import { describe, expect, it } from '@jest/globals'

import {
  buildArgv,
  findCommand,
  riskFor,
  SCOPE_NAME_MAX,
  SDK_COMMANDS,
  validateFlagValue,
} from '../../../src/tui/data/sdk-manifest.js'

describe('risk classification', () => {
  it('marks instance-reaching commands', () => {
    expect(riskFor('install')).toBe('instance')
  })

  it('marks local-only commands', () => {
    expect(riskFor('build')).toBe('local')
    expect(riskFor('explain')).toBe('local')
  })

  it('defaults an UNKNOWN command to instance — the safe side when the manifest is stale', () => {
    expect(riskFor('some-future-command')).toBe('instance')
  })
})

describe('pickers are declared for every identifier flag', () => {
  it('init --from resolves through the scoped-app picker', () => {
    expect(findCommand('init')!.flags.find((f) => f.name === 'from')!.picker).toBe('app-scope')
  })

  it('init --template offers the real 7 template values', () => {
    const template = findCommand('init')!.flags.find((f) => f.name === 'template')!
    expect(template.picker).toBe('enum')
    expect(template.choices).toHaveLength(7)
    expect(template.choices).toContain('typescript.react')
  })

  it('transform --table is multi-select, --from is a directory', () => {
    const transform = findCommand('transform')!
    expect(transform.flags.find((f) => f.name === 'table')!.picker).toBe('table-multi')
    expect(transform.flags.find((f) => f.name === 'from')!.picker).toBe('directory')
  })

  it('dependencies --add takes a table and --scope a scope', () => {
    const deps = findCommand('dependencies')!
    expect(deps.flags.find((f) => f.name === 'add')!.picker).toBe('table')
    expect(deps.flags.find((f) => f.name === 'scope')!.picker).toBe('scope-name')
  })

  it('every --auth flag uses the alias picker', () => {
    for (const command of SDK_COMMANDS) {
      const auth = command.flags.find((f) => f.name === 'auth')
      if (auth) expect(auth.picker).toBe('auth-alias')
    }
  })

  it('build and install know which npm script may wrap them', () => {
    expect(findCommand('build')!.npmScript).toBe('build')
    expect(findCommand('install')!.npmScript).toBe('deploy')
  })
})

describe('validateFlagValue — catch it before spawning, not after it fails', () => {
  const scopeName = findCommand('init')!.flags.find((f) => f.name === 'scopeName')!

  it('accepts valid scope names', () => {
    expect(validateFlagValue(scopeName, 'x_acme_app')).toBeUndefined()
    expect(validateFlagValue(scopeName, 'global')).toBeUndefined()
    expect(validateFlagValue(scopeName, 'sn_thing')).toBeUndefined()
  })

  it('rejects a missing vendor prefix', () => {
    expect(validateFlagValue(scopeName, 'acme_app')).toBeDefined()
  })

  it('rejects names over the documented 18-character cap, and says the length', () => {
    const tooLong = 'x_' + 'a'.repeat(SCOPE_NAME_MAX)
    expect(validateFlagValue(scopeName, tooLong)).toMatch(/maximum is 18/)
  })

  it('rejects a value outside an enum', () => {
    const template = findCommand('init')!.flags.find((f) => f.name === 'template')!
    expect(validateFlagValue(template, 'typescript.svelte')).toMatch(/must be one of/)
    expect(validateFlagValue(template, 'base')).toBeUndefined()
  })

  it('does not complain about an empty value — that is "unset", not "invalid"', () => {
    expect(validateFlagValue(scopeName, '')).toBeUndefined()
  })
})

describe('buildArgv', () => {
  const init = findCommand('init')!
  const build = findCommand('build')!

  it('emits flags as --name value', () => {
    expect(buildArgv(init, { from: 'abc123', template: 'base' })).toEqual([
      'init', '--from', 'abc123', '--template', 'base',
    ])
  })

  it('emits booleans as bare flags, and only when true', () => {
    expect(buildArgv(build, { frozenKeys: 'true' })).toEqual(['build', '--frozenKeys'])
    expect(buildArgv(build, { frozenKeys: '' })).toEqual(['build'])
  })

  it('emits positionals without a flag name', () => {
    expect(buildArgv(build, { source: '/tmp/app' })).toEqual(['build', '/tmp/app'])
  })

  it('skips unset flags entirely', () => {
    expect(buildArgv(init, {})).toEqual(['init'])
  })

  it('preserves manifest flag order regardless of value insertion order', () => {
    const argv = buildArgv(init, { appName: 'Acme', from: 'abc' })
    expect(argv.indexOf('--from')).toBeLessThan(argv.indexOf('--appName'))
  })
})
