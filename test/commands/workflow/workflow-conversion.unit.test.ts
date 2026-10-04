import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { captureOutput } from '@oclif/test'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Mocks are prefixed with `mock` so ts-jest's hoisting allows the factory below to close over them.
const mockWm = { exportWorkflow: jest.fn<any>() }
const mockViews = {
  analyzeWorkflow: jest.fn<any>(),
  generateFluentFlow: jest.fn<any>(),
  planFlowConversion: jest.fn<any>(),
  renderFlowPlan: jest.fn<any>(),
  renderWorkflowAnalysis: jest.fn<any>(),
  renderWorkflowMermaid: jest.fn<any>(),
  renderWorkflowNodes: jest.fn<any>(),
  renderWorkflowOutline: jest.fn<any>(),
}
const mockGetCredentials = jest.fn<any>()

// unstable_mockModule, not jest.mock: this suite is ESM, and jest.mock does not intercept ESM imports.
jest.unstable_mockModule('@sonisoft/now-sdk-ext-core', () => ({
  ...mockViews,
  resolveSessionCredentials: async (alias: string) => mockGetCredentials(alias),
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
  ServiceNowInstance: jest.fn().mockImplementation(() => ({ getHost: jest.fn().mockReturnValue('https://test.service-now.com') })),
}))

const { Outline } = await import('../../../src/commands/workflow/outline.js')
const { Convert } = await import('../../../src/commands/workflow/convert.js')

const ROOT = process.cwd()
const EXPORT = { activities: [{ name: 'Begin' }], format: 'now-sdk-ext/legacy-workflow@1', transitions: [], workflow: { name: 'Laptop' } }
const PLAN = { coverage: { direct: 1, manual: 0, partial: 0 }, identifier: 'laptop' }
const FILES = [{ content: 'export const laptop = Flow()\n', path: 'src/fluent/flows/laptop.now.ts' }]

async function run(command: { run: (argv: string[], root: string) => Promise<unknown> }, argv: string[]) {
  return captureOutput(async () => command.run(argv, ROOT))
}

function exportFile(content: unknown = EXPORT): string {
  const file = join(mkdtempSync(join(tmpdir(), 'wfconvert-')), 'laptop.json')
  writeFileSync(file, JSON.stringify(content))
  return file
}

describe('workflow outline / convert - Unit Tests', () => {
  let consoleSpy: ReturnType<typeof jest.spyOn>

  beforeEach(() => {
    for (const mock of [...Object.values(mockViews), mockWm.exportWorkflow, mockGetCredentials]) mock.mockReset()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      process.stdout.write(args.map(String).join(' ') + '\n')
    })
    mockGetCredentials.mockResolvedValue({ instanceUrl: 'https://test.service-now.com', password: 'p', type: 'basic', username: 'u' })
    mockWm.exportWorkflow.mockResolvedValue(EXPORT)
    mockViews.renderWorkflowOutline.mockReturnValue('1. Begin')
    mockViews.renderWorkflowAnalysis.mockReturnValue('PATHS 1')
    mockViews.analyzeWorkflow.mockReturnValue({ pathCount: 1 })
    mockViews.planFlowConversion.mockReturnValue(PLAN)
    mockViews.renderFlowPlan.mockReturnValue('# Flow Designer plan')
    mockViews.generateFluentFlow.mockReturnValue(FILES)
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    process.exitCode = undefined
  })

  describe('workflow outline', () => {
    it('reads a saved export without credentials', async () => {
      const { error, stdout } = await run(Outline, ['--file', exportFile(), '--flow-hints', '--all-values'])
      expect(error).toBeUndefined()
      expect(mockGetCredentials).not.toHaveBeenCalled()
      expect(mockWm.exportWorkflow).not.toHaveBeenCalled()
      expect(mockViews.renderWorkflowOutline).toHaveBeenCalledWith(EXPORT, { allValues: true, flowHints: true, fullScripts: undefined })
      expect(stdout).toContain('1. Begin')
    })

    it('exports the workflow from the instance', async () => {
      const { error } = await run(Outline, ['Laptop', '--version', 'published', '--analysis', '--auth', 'dev'])
      expect(error).toBeUndefined()
      expect(mockGetCredentials).toHaveBeenCalledWith('dev')
      expect(mockWm.exportWorkflow).toHaveBeenCalledWith('Laptop', { version: 'published' })
      expect(mockViews.renderWorkflowAnalysis).toHaveBeenCalledWith(EXPORT)
    })

    it('returns the analysis as data with --json', async () => {
      const { stdout } = await run(Outline, ['--file', exportFile(), '--analysis', '--json'])
      expect(JSON.parse(stdout)).toEqual({ pathCount: 1 })
    })

    it('refuses view options on views that ignore them', async () => {
      expect((await run(Outline, ['--file', exportFile(), '--analysis', '--flow-hints'])).error?.message)
        .toContain('--flow-hints, --all-values and --full-scripts apply to the outline and --nodes.')
    })

    it('refuses files that are not exports, both inputs at once, and no input', async () => {
      expect((await run(Outline, ['--file', exportFile({ result: [] })])).error?.message).toContain('is not a `nex workflow export` document')
      expect((await run(Outline, ['Laptop', '--file', exportFile()])).error?.message).toContain('either a workflow or --file')
      expect((await run(Outline, [])).error?.message).toContain('Specify the workflow, or --file')
      expect(mockGetCredentials).not.toHaveBeenCalled()
    })
  })

  describe('workflow convert', () => {
    it('prints the plan', async () => {
      const { error, stdout } = await run(Convert, ['--file', exportFile()])
      expect(error).toBeUndefined()
      expect(mockViews.planFlowConversion).toHaveBeenCalledWith(EXPORT)
      expect(mockViews.generateFluentFlow).toHaveBeenCalledWith(PLAN, { directory: 'src/fluent/flows' })
      expect(stdout).toContain('# Flow Designer plan')
    })

    it('saves the plan and writes the skeleton into an app, refusing to overwrite without --force', async () => {
      const app = mkdtempSync(join(tmpdir(), 'wfapp-'))
      const planFile = join(app, 'plan.json')
      const { error, stdout } = await run(Convert, ['--file', exportFile(), '--plan', planFile, '--fluent', app])
      expect(error).toBeUndefined()
      expect(JSON.parse(readFileSync(planFile, 'utf8'))).toEqual(PLAN)
      expect(readFileSync(join(app, 'src/fluent/flows/laptop.now.ts'), 'utf8')).toBe(FILES[0].content)
      expect(stdout).toContain('Build it with `now-sdk build` in the app.')

      const again = await run(Convert, ['--file', exportFile(), '--fluent', app])
      expect(again.error?.message).toContain('already exists. Pass --force to overwrite it.')
      expect((await run(Convert, ['--file', exportFile(), '--fluent', app, '--force'])).error).toBeUndefined()
    })

    it('refuses to write the plan over the export it reads', async () => {
      const file = exportFile()
      expect((await run(Convert, ['--file', file, '--plan', file])).error?.message).toContain('--plan would overwrite the export given with --file.')
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(EXPORT)
    })

    it('exports from the instance and returns plan and files with --json', async () => {
      const { stdout } = await run(Convert, ['Laptop', '--json', '--directory', 'src/fluent/converted', '--auth', 'dev'])
      expect(mockWm.exportWorkflow).toHaveBeenCalledWith('Laptop', { version: 'current' })
      expect(mockViews.generateFluentFlow).toHaveBeenCalledWith(PLAN, { directory: 'src/fluent/converted' })
      expect(JSON.parse(stdout)).toEqual({ files: FILES, plan: PLAN })
    })
  })
})
