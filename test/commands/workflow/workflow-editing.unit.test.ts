import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { captureOutput } from '@oclif/test'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Mocks are prefixed with `mock` so ts-jest's hoisting allows the factory below to close over them.
const mockWm: Record<string, jest.Mock<any>> = {
  addActivity: jest.fn<any>(),
  addCondition: jest.fn<any>(),
  addTransition: jest.fn<any>(),
  checkout: jest.fn<any>(),
  discardCheckout: jest.fn<any>(),
  exportWorkflow: jest.fn<any>(),
  findWorkflows: jest.fn<any>(),
  getActivityDefinition: jest.fn<any>(),
  getActivityUsage: jest.fn<any>(),
  getDraftVersion: jest.fn<any>(),
  getWorkflowDefinition: jest.fn<any>(),
  listActivityDefinitions: jest.fn<any>(),
  newWorkflow: jest.fn<any>(),
  publish: jest.fn<any>(),
  publishWorkflow: jest.fn<any>(),
  removeActivity: jest.fn<any>(),
  removeCondition: jest.fn<any>(),
  removeTransition: jest.fn<any>(),
  resolveWorkflow: jest.fn<any>(),
  updateActivity: jest.fn<any>(),
  updateCondition: jest.fn<any>(),
  validateWorkflow: jest.fn<any>(),
}

// unstable_mockModule, not jest.mock: this suite is ESM, and jest.mock does not intercept ESM imports.
jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  resolveSessionCredentials: async (alias: string) => (await import('@servicenow/sdk-cli/dist/auth/index.js')).getCredentials(alias),
  WorkflowManager: jest.fn().mockImplementation(() => mockWm),
  Logger: jest.fn().mockImplementation(() => ({ debug: jest.fn(), error: jest.fn(), info: jest.fn(), trace: jest.fn(), warn: jest.fn() })),
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
  NowStringUtil: { isStringEmpty: (str: string | null | undefined): boolean => !str || str.trim().length === 0 },
  ServiceNowInstance: jest.fn().mockImplementation(() => ({
    getHost: jest.fn().mockReturnValue('https://test.service-now.com'),
    getUserName: jest.fn().mockReturnValue('test-user'),
  })),
}))

jest.unstable_mockModule('@servicenow/sdk-cli/dist/auth/index.js', () => ({
  getCredentials: jest.fn<any>().mockResolvedValue({
    instanceUrl: 'https://test.service-now.com', password: 'test-password', type: 'basic', username: 'test-user',
  }),
}))

const { Publish } = await import('../../../src/commands/workflow/publish.js')
const { Checkout } = await import('../../../src/commands/workflow/checkout.js')
const { Show } = await import('../../../src/commands/workflow/show.js')
const { Definitions } = await import('../../../src/commands/workflow/definitions.js')
const { List } = await import('../../../src/commands/workflow/list.js')
const { New } = await import('../../../src/commands/workflow/new.js')
const { Discard } = await import('../../../src/commands/workflow/discard.js')
const { Validate } = await import('../../../src/commands/workflow/validate.js')
const { Export } = await import('../../../src/commands/workflow/export.js')
const { ActivityAdd } = await import('../../../src/commands/workflow/activity/add.js')
const { ActivityUpdate } = await import('../../../src/commands/workflow/activity/update.js')
const { ActivityRemove } = await import('../../../src/commands/workflow/activity/remove.js')
const { TransitionAdd } = await import('../../../src/commands/workflow/transition/add.js')
const { TransitionRemove } = await import('../../../src/commands/workflow/transition/remove.js')
const { ConditionAdd } = await import('../../../src/commands/workflow/condition/add.js')
const { ConditionUpdate } = await import('../../../src/commands/workflow/condition/update.js')
const { ConditionRemove } = await import('../../../src/commands/workflow/condition/remove.js')

const ROOT = process.cwd()
const AUTH = ['--auth', 'test']

const DEFINITION = {
  activities: [
    { conditions: [{ name: 'Always', sysId: 'c-begin' }], name: 'Begin', sysId: 'a-begin' },
    { conditions: [{ name: 'Approved', sysId: 'c-yes' }, { name: 'Rejected', sysId: 'c-no' }], name: 'Approve', sysId: 'a-appr' },
    { conditions: [], name: 'End', sysId: 'a-end' },
  ],
  transitions: [
    { condition: 'c-begin', from: 'a-begin', sysId: 't-begin', to: 'a-appr' },
    { condition: 'c-yes', from: 'a-appr', sysId: 't-yes', to: 'a-end' },
    { condition: 'c-no', from: 'a-appr', sysId: 't-no', to: 'a-end' },
  ],
}

async function run(command: { run: (argv: string[], root: string) => Promise<unknown> }, argv: string[]) {
  return captureOutput(async () => command.run([...argv, ...AUTH], ROOT))
}

describe('workflow editing commands - Unit Tests', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>

  beforeEach(() => {
    for (const mock of Object.values(mockWm)) mock.mockReset()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      process.stdout.write(args.map(String).join(' ') + '\n')
    })
    mockWm.getDraftVersion.mockResolvedValue('draft-1')
    mockWm.getWorkflowDefinition.mockResolvedValue(DEFINITION)
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    process.exitCode = undefined
  })

  describe('workflow publish', () => {
    it('validates and publishes the user\'s draft of a workflow', async () => {
      mockWm.publish.mockResolvedValue({ fullSequences: [], versionSysId: 'draft-1', warnings: [] })
      const { error, stdout } = await run(Publish, ['--workflow', 'Laptop', '--allow-warnings'])
      expect(error).toBeUndefined()
      expect(mockWm.getDraftVersion).toHaveBeenCalledWith('Laptop')
      expect(mockWm.publish).toHaveBeenCalledWith('draft-1', { allowWarnings: true })
      expect(stdout).toContain('Workflow Published')
    })

    it('prints only JSON with --json', async () => {
      mockWm.publish.mockResolvedValue({ fullSequences: [], versionSysId: 'draft-1', warnings: [] })
      const { stdout } = await run(Publish, ['--workflow', 'Laptop', '--json'])
      expect(() => JSON.parse(stdout)).not.toThrow()
      expect(stdout).not.toContain('Publishing workflow version')
    })

    it('publishes a version id without needing --start-activity', async () => {
      mockWm.publish.mockResolvedValue({ fullSequences: [], versionSysId: 'v-9', warnings: [] })
      await run(Publish, ['--version-id', 'v-9'])
      expect(mockWm.publish).toHaveBeenCalledWith('v-9', { allowWarnings: false })
      expect(mockWm.getDraftVersion).not.toHaveBeenCalled()
    })

    it('keeps the original start-activity behaviour', async () => {
      await run(Publish, ['--version-id', 'v-9', '--start-activity', 'a-1'])
      expect(mockWm.publishWorkflow).toHaveBeenCalledWith({ startActivitySysId: 'a-1', versionSysId: 'v-9' })
      expect(mockWm.publish).not.toHaveBeenCalled()
    })

    it('requires --version-id with --start-activity', async () => {
      const { error } = await run(Publish, ['--start-activity', 'a-1'])
      expect(error).toBeDefined()
      expect(mockWm.publishWorkflow).not.toHaveBeenCalled()
    })
  })

  describe('workflow checkout / discard / new', () => {
    it('checks out, forwarding --force', async () => {
      mockWm.checkout.mockResolvedValue({ alreadyCheckedOut: false, versionSysId: 'draft-1', workflowSysId: 'wf-1' })
      const { stdout } = await run(Checkout, ['Laptop', '--force'])
      expect(mockWm.checkout).toHaveBeenCalledWith('Laptop', { force: true })
      expect(stdout).toContain('Draft Version:    draft-1')
    })

    it('discards the user\'s draft', async () => {
      await run(Discard, ['Laptop'])
      expect(mockWm.discardCheckout).toHaveBeenCalledWith('draft-1')
    })

    it('creates a workflow', async () => {
      mockWm.newWorkflow.mockResolvedValue({ beginActivitySysId: 'b', beginConditionSysId: 'c', endActivitySysId: 'e', transitionSysId: 't', versionSysId: 'v', workflowSysId: 'w' })
      await run(New, ['--name', 'Laptop', '--table', 'sc_req_item'])
      expect(mockWm.newWorkflow).toHaveBeenCalledWith({ condition: undefined, conditionType: undefined, description: undefined, name: 'Laptop', table: 'sc_req_item' })
    })
  })

  describe('reading', () => {
    it('shows the user\'s draft when they have one', async () => {
      mockWm.resolveWorkflow.mockResolvedValue({ checkedOutVersion: { byCurrentUser: true, sysId: 'draft-1' }, publishedVersionSysId: 'pub-1' })
      mockWm.getWorkflowDefinition.mockResolvedValue({ ...DEFINITION, name: 'Laptop', stages: [], table: 'sc_req_item', versionSysId: 'draft-1' })
      const { stdout } = await run(Show, ['Laptop', '--no-vars'])
      expect(mockWm.getWorkflowDefinition).toHaveBeenCalledWith('draft-1', { includeVariables: false })
      expect(stdout).toContain('Approve -[Rejected]-> End')
    })

    it('lists or describes activity types', async () => {
      mockWm.listActivityDefinitions.mockResolvedValue([])
      await run(Definitions, ['--core-only', '--category', 'Timers'])
      expect(mockWm.listActivityDefinitions).toHaveBeenCalledWith({ category: 'Timers', includeDesigner: false, name: undefined })
      mockWm.getActivityDefinition.mockResolvedValue({
        attributes: '', category: 'Timers', defaultConditions: [], description: 'Pauses the workflow.\nUse it for delays.',
        name: 'Timer', script: 'var TimerActivityHandler = Class.create();', sysClassName: 'wf_activity_definition', sysId: 'd',
        variables: [{ choices: [{ label: 'Script', value: 'script' }], defaultValue: '', element: 'timer_type', hint: 'How the wait is decided', internalType: 'string', label: 'Timer based on', mandatory: false, model: 'm', order: 1, sysId: '1' }],
      })
      const { stdout } = await run(Definitions, ['Timer', '--script'])
      expect(mockWm.getActivityDefinition).toHaveBeenCalledWith('Timer', { includeScript: true })
      expect(stdout).toContain('Use it for delays.')
      expect(stdout).toContain('hint: How the wait is decided')
      expect(stdout).toContain('choices: script (Script)')
      expect(stdout).toContain('var TimerActivityHandler')
    })

    it('shows Activity Designer inputs and outputs', async () => {
      mockWm.getActivityDefinition.mockResolvedValue({
        attributes: '', category: '', defaultConditions: [{ condition: 'activityOutput.result == "success"', name: 'Success' }, { condition: '', name: 'Failure' }],
        description: '', inputs: [{ mandatory: true, name: 'UserName', type: 'STRING' }], name: 'Add User', outputs: [{ mandatory: false, name: 'result', type: 'STRING' }],
        sysClassName: 'wf_element_activity', sysId: 'd', variables: [],
      })
      const { stdout } = await run(Definitions, ['Add User'])
      expect(stdout).toContain('Inputs (set through --input JSON):')
      expect(stdout).toContain('UserName')
      expect(stdout).toContain('Failure (otherwise)')
    })

    it('shows how the instance uses a type', async () => {
      mockWm.getActivityUsage.mockResolvedValue({
        definitionName: 'Approval - User', definitionSysId: 'd', publishedActivities: 264, sampled: 50,
        fields: [
          { examples: [{ count: 11, isDefault: false, value: '${requested_for.manager}' }], name: 'users', setCount: 13 },
          { examples: [{ count: 50, isDefault: true, value: 'any' }], name: 'wait_for', setCount: 50 },
          { examples: [], name: 'groups', setCount: 0 },
        ],
      })
      const { stdout } = await run(Definitions, ['Approval - User', '--usage', '--sample', '50'])
      expect(mockWm.getActivityUsage).toHaveBeenCalledWith('Approval - User', { sampleSize: 50 })
      expect(stdout).toContain('264 activities in published workflows; 50 sampled.')
      expect(stdout).toContain('11× ${requested_for.manager}')
      expect(stdout).toContain('50× any  (default)')
      expect(stdout).toContain('never set: groups')
    })

    it('needs a type for --usage, and runs --script and --usage one at a time', async () => {
      const { error } = await run(Definitions, ['--usage'])
      expect(error?.message).toContain('need an activity type')
      expect((await run(Definitions, ['If', '--usage', '--script'])).error?.message).toContain('separate views')
    })

    it('lists workflows and validates', async () => {
      mockWm.findWorkflows.mockResolvedValue([])
      await run(List, ['--name', 'Lap'])
      expect(mockWm.findWorkflows).toHaveBeenCalledWith({ limit: 50, name: 'Lap', query: undefined, table: undefined })
      mockWm.validateWorkflow.mockResolvedValue({ items: [], summary: 'Valid', valid: true, versionSysId: 'v-1' })
      await run(Validate, ['--version', 'v-1'])
      expect(mockWm.validateWorkflow).toHaveBeenCalledWith('v-1')
    })
  })

  describe('workflow activity', () => {
    it('inserts onto the line leaving an activity, resolving names and parsing variables', async () => {
      mockWm.addActivity.mockResolvedValue({ activitySysId: 'a-new', conditions: [{ name: 'Always' }], name: 'Wait', transitionSysIds: ['t-yes', 't-new'] })
      const { error, stdout } = await run(ActivityAdd, [
        '-w', 'Laptop', '--type', 'Timer', '--name', 'Wait', '--insert-after', 'approve', '--after-exit', 'Approved',
        '--var', 'timer_type=script', '--var', 'script=answer = 5;',
      ])
      expect(error).toBeUndefined()
      expect(mockWm.addActivity).toHaveBeenCalledWith('draft-1', expect.objectContaining({
        definition: 'Timer', insertOn: 't-yes', name: 'Wait', variables: { script: 'answer = 5;', timer_type: 'script' },
      }))
      expect(stdout).toContain("Activity 'Wait' added.")
    })

    it('refuses an ambiguous --insert-after', async () => {
      const { error } = await run(ActivityAdd, ['-w', 'Laptop', '--type', 'Timer', '--name', 'Wait', '--insert-after', 'Approve'])
      expect(error?.message).toContain('2 lines leave')
      expect(mockWm.addActivity).not.toHaveBeenCalled()
    })

    it('wires from and to named activities', async () => {
      mockWm.addActivity.mockResolvedValue({ activitySysId: 'a-new', conditions: [], name: 'Log', transitionSysIds: [] })
      await run(ActivityAdd, ['-w', 'Laptop', '--type', 'Log Message', '--name', 'Log', '--from', 'Approve', '--from-exit', 'Rejected', '--to', 'End'])
      expect(mockWm.addActivity).toHaveBeenCalledWith('draft-1', expect.objectContaining({
        connectFrom: { activity: 'a-appr', condition: 'Rejected' }, connectTo: 'a-end',
      }))
    })

    it('updates and removes by name', async () => {
      await run(ActivityUpdate, ['-w', 'Laptop', '--activity', 'Approve', '--rename', 'Approval', '--x', '300'])
      expect(mockWm.updateActivity).toHaveBeenCalledWith('a-appr', expect.objectContaining({ name: 'Approval', x: 300 }))
      await run(ActivityRemove, ['-w', 'Laptop', '--activity', 'Approve', '--reconnect'])
      expect(mockWm.removeActivity).toHaveBeenCalledWith('a-appr', { reconnect: true })
    })
  })

  describe('workflow transition', () => {
    it('adds a transition by exit name', async () => {
      mockWm.addTransition.mockResolvedValue('t-new')
      await run(TransitionAdd, ['-w', 'Laptop', '--from', 'Approve', '--exit', 'Rejected', '--to', 'Begin'])
      expect(mockWm.addTransition).toHaveBeenCalledWith({ condition: 'Rejected', from: 'a-appr', to: 'a-begin' })
    })

    it('removes a transition found by its ends and exit, and refuses ambiguity', async () => {
      await run(TransitionRemove, ['-w', 'Laptop', '--from', 'Approve', '--to', 'End', '--exit', 'rejected'])
      expect(mockWm.removeTransition).toHaveBeenCalledWith('t-no')
      const { error } = await run(TransitionRemove, ['-w', 'Laptop', '--from', 'Approve', '--to', 'End'])
      expect(error?.message).toContain('2 transitions join')
    })
  })

  describe('workflow condition', () => {
    it('adds an exit to a named activity', async () => {
      mockWm.addCondition.mockResolvedValue('c-new')
      await run(ConditionAdd, ['-w', 'Laptop', '--activity', 'Approve', '--name', 'Later', '--condition', "activity.result == 'later'", '--order', '5'])
      expect(mockWm.addCondition).toHaveBeenCalledWith({
        activity: 'a-appr', condition: "activity.result == 'later'", elseFlag: undefined, error: undefined, name: 'Later', order: 5,
      })
    })

    it('updates and removes an exit found by name', async () => {
      await run(ConditionUpdate, ['-w', 'Laptop', '--activity', 'Approve', '--exit', 'rejected', '--rename', 'Declined'])
      expect(mockWm.updateCondition).toHaveBeenCalledWith('c-no', { condition: undefined, name: 'Declined', order: undefined })
      await run(ConditionRemove, ['-w', 'Laptop', '--activity', 'Approve', '--exit', 'Approved'])
      expect(mockWm.removeCondition).toHaveBeenCalledWith('c-yes')
      const { error } = await run(ConditionRemove, ['-w', 'Laptop', '--activity', 'Approve', '--exit', 'Maybe'])
      expect(error?.message).toContain("no exit 'Maybe'. Exits: Approved, Rejected")
    })
  })

  describe('workflow export', () => {
    const exported = {
      activities: [{ name: 'Begin' }], format: 'now-sdk-ext/legacy-workflow@1', transitions: [],
      version: { sysId: 'v-1' }, workflow: { name: 'Laptop' },
    }

    it('prints the export as one JSON document', async () => {
      mockWm.exportWorkflow.mockResolvedValue(exported)
      const { stdout } = await run(Export, ['Laptop', '--version', 'published'])
      expect(mockWm.exportWorkflow).toHaveBeenCalledWith('Laptop', { version: 'published' })
      expect(JSON.parse(stdout)).toEqual(exported)
    })

    it('says what it wrote as JSON with --json -o', async () => {
      mockWm.exportWorkflow.mockResolvedValue(exported)
      const file = join(mkdtempSync(join(tmpdir(), 'wfexport-')), 'laptop.json')
      const { stdout } = await run(Export, ['Laptop', '-o', file, '--json'])
      expect(JSON.parse(stdout)).toEqual({ activities: 1, file, transitions: 0, versionSysId: 'v-1', workflow: 'Laptop' })
    })

    it('writes the export to a file and says so', async () => {
      mockWm.exportWorkflow.mockResolvedValue(exported)
      const file = join(mkdtempSync(join(tmpdir(), 'wfexport-')), 'laptop.json')
      const { stdout } = await run(Export, ['Laptop', '-o', file])
      expect(mockWm.exportWorkflow).toHaveBeenCalledWith('Laptop', { version: 'current' })
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(exported)
      expect(stdout).toContain("Exported 'Laptop' version v-1 (1 activities, 0 transitions)")
    })
  })
})
