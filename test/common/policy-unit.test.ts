import {expect, describe, it, afterEach} from '@jest/globals'
import {checkRequirement, installPolicy, resetPolicyForTests} from '@sonisoft/now-sdk-ext-core'

import {AuthenticatedCommand} from '../../src/common/authenticated-command.js'
import {buildLayers, deniedByFlags} from '../../src/common/policy.js'

/**
 * The permission ladder as the CLI assembles it.
 *
 * Changes are permitted by default; flags and the environment take permission AWAY.
 * The order of the ladder is the behaviour, so most of these are ordering assertions.
 */

const noWarn = () => undefined

afterEach(() => resetPolicyForTests())

describe('deny flags', () => {
  it('denies nothing when no flag is passed', () => {
    expect(deniedByFlags({})).toEqual([])
  })

  it.each([
    [{'deny-write': true}, ['write']],
    [{'deny-execute': true}, ['execute']],
    [{'deny-execute': true, 'deny-write': true}, ['write', 'execute']],
  ])('maps %o', (flags, expected) => {
    expect(deniedByFlags(flags).sort()).toEqual([...expected].sort())
  })

  it('treats --read-only as both', () => {
    expect(deniedByFlags({'read-only': true}).sort()).toEqual(['execute', 'write'])
  })

  it('does not double-count when --read-only is combined with a specific deny', () => {
    expect(deniedByFlags({'deny-write': true, 'read-only': true}).sort()).toEqual(['execute', 'write'])
  })
})

describe('default posture', () => {
  it('permits changes when nothing denies', () => {
    installPolicy(buildLayers({}, noWarn))
    expect(checkRequirement({target: 'instance', verbs: ['write']}).allowed).toBe(true)
    expect(checkRequirement({target: 'instance', verbs: ['execute']}).allowed).toBe(true)
  })

  it('names the default layer, so `policy status` can explain itself', () => {
    installPolicy(buildLayers({}, noWarn))
    expect(checkRequirement({target: 'instance', verbs: ['write']}).decidingLayer).toMatch(/default/)
  })

  it('keeps the permissive default LAST, so anything above can revoke', () => {
    // If the default layer ever moved up the ladder it would grant before the deny
    // layers were consulted, and every flag would silently stop working.
    const layers = buildLayers({'read-only': true}, noWarn)
    expect(layers.at(-1)?.name).toMatch(/default/)
  })
})

describe('flags revoke', () => {
  it('refuses write under --deny-write', () => {
    installPolicy(buildLayers({'deny-write': true}, noWarn))
    expect(checkRequirement({target: 'instance', verbs: ['write']}).allowed).toBe(false)
    expect(checkRequirement({target: 'instance', verbs: ['execute']}).allowed).toBe(true)
  })

  it('refuses everything under --read-only', () => {
    installPolicy(buildLayers({'read-only': true}, noWarn))
    expect(checkRequirement({target: 'instance', verbs: ['write']}).allowed).toBe(false)
    expect(checkRequirement({target: 'instance', verbs: ['execute']}).allowed).toBe(false)
  })

  it('never gates reads', () => {
    installPolicy(buildLayers({'read-only': true}, noWarn))
    expect(checkRequirement({target: 'instance', verbs: []}).allowed).toBe(true)
  })
})

describe('flag surface', () => {
  it('declares the deny flags in GLOBAL', () => {
    for (const name of ['deny-write', 'deny-execute', 'read-only']) {
      const flag = (AuthenticatedCommand.baseFlags as Record<string, {helpGroup?: string}>)[name]
      expect(flag).toBeDefined()
      expect(flag.helpGroup).toBe('GLOBAL')
    }
  })

  it('declares NO --allow-* flags while the default is permissive', () => {
    // They would grant nothing they did not already have, and could not override
    // NEX_POLICY_DENY either — so they would ship as no-ops. They arrive in the same
    // change that flips the default.
    const names = Object.keys(AuthenticatedCommand.baseFlags)
    expect(names.filter((n) => n.startsWith('allow-'))).toEqual([])
  })

  it('uses kebab-case only, matching how oclif keys parsed flags', () => {
    const names = Object.keys(AuthenticatedCommand.baseFlags)
    expect(names).toEqual(expect.arrayContaining(['deny-write', 'deny-execute', 'read-only']))
    for (const camel of ['denyWrite', 'denyExecute', 'readOnly']) expect(names).not.toContain(camel)
  })
})
