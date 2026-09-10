import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { Command } from '@oclif/core'
import { captureOutput } from '@oclif/test'
import type { BehaviorDetailOptions, BehaviorDetailsResult, BehaviorReference, ServiceNowInstance, TableBehaviorOptions, TableBehaviorResult } from '@sonisoft/now-sdk-ext-core'

const discover = jest.fn<(table: string, options: TableBehaviorOptions) => Promise<TableBehaviorResult>>()
const details = jest.fn<(refs: BehaviorReference[], options: BehaviorDetailOptions) => Promise<BehaviorDetailsResult>>()
const empty: TableBehaviorResult = { table: 'incident', ancestors: [], categories: [], dependencies: [], requestedDetails: [], warnings: [], visibility: 'accessible_configuration' }
jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  BEHAVIOR_CATEGORIES: ['business_rules', 'ui_actions', 'client_scripts', 'ui_policies', 'data_policies', 'workflows', 'flows', 'state_models'],
  TableBehaviorDiscovery: jest.fn().mockImplementation(() => ({ discoverTableBehavior: discover, getBehaviorDetails: details })),
}))
jest.unstable_mockModule('../../../src/common/authenticated-command.js', () => ({
  AuthenticatedCommand: class extends Command {
    instance = {} as ServiceNowInstance
    async run(): Promise<void> {}
  },
}))
const { Behavior } = await import('../../../src/commands/behavior/index.js')
const { BehaviorDetails } = await import('../../../src/commands/behavior/details.js')
beforeEach(() => {
  jest.clearAllMocks()
  discover.mockResolvedValue(empty)
  details.mockResolvedValue({ items: [], dependencies: [], warnings: [], remainingReferences: [], requestedDetails: [], visibility: 'accessible_configuration' })
})

describe('behavior commands', () => {
  it('maps filters/details and writes exactly one JSON document', async () => {
    const { stdout, error } = await captureOutput(async () => Behavior.run(['--table', 'incident', '--category', 'business_rules', '--details', 'scripts', '--details', 'dependencies', '--dependency-depth', '1', '--no-include-inherited', '--include-inactive', '--json'], process.cwd()))
    expect(error).toBeUndefined()
    expect(JSON.parse(stdout)).toEqual(empty)
    expect(discover).toHaveBeenCalledWith('incident', expect.objectContaining({ categories: ['business_rules'], details: ['scripts', 'dependencies'], dependencyDepth: 1, includeInherited: false, includeInactive: true }))
  })
  it('retrieves known references without discovery', async () => {
    const { stdout, error } = await captureOutput(async () => BehaviorDetails.run(['--reference', `flows:sys_hub_flow:${'a'.repeat(32)}`, '--reference', `business_rules:sys_script:${'b'.repeat(32)}`, '--details', 'definitions', '--json'], process.cwd()))
    expect(error).toBeUndefined()
    expect(JSON.parse(stdout).remainingReferences).toEqual([])
    expect(details).toHaveBeenCalledWith([{ kind: 'flows', sourceTable: 'sys_hub_flow', sysId: 'a'.repeat(32) }, { kind: 'business_rules', sourceTable: 'sys_script', sysId: 'b'.repeat(32) }], expect.objectContaining({ details: ['definitions'] }))
    expect(discover).not.toHaveBeenCalled()
  })
  it('requires one category for cursor continuation', async () => {
    const { error } = await captureOutput(async () => Behavior.run(['--table', 'incident', '--cursor', 'cursor'], process.cwd()))
    expect(error).toBeDefined()
    expect(discover).not.toHaveBeenCalled()
  })
  it('rejects invalid categories through the parser', async () => {
    const { error } = await captureOutput(async () => Behavior.run(['--table', 'incident', '--category', 'invalid'], process.cwd()))
    expect(error).toBeDefined()
    expect(discover).not.toHaveBeenCalled()
  })
})
