// Consolidated manual mock for @sonisoft/now-sdk-ext-core
// Covers ALL classes imported across the codebase

export class SyslogReader {
  stopTailing: ReturnType<typeof jest.fn>
  startTailing: ReturnType<typeof jest.fn>
  startTailingWithChannelAjax: ReturnType<typeof jest.fn>
  querySyslog: ReturnType<typeof jest.fn>
  querySyslogAppScope: ReturnType<typeof jest.fn>
  isTailing: boolean

  constructor(_instance?: any) {
    this.stopTailing = jest.fn(() => {})
    this.startTailing = jest.fn(() => Promise.resolve())
    this.startTailingWithChannelAjax = jest.fn(() => Promise.resolve())
    this.querySyslog = jest.fn(() => Promise.resolve([
      { sys_id: 'log-001', sys_created_on: '2025-01-01 12:00:00', level: 'error', message: 'Test error message', source: 'test_script' },
      { sys_id: 'log-002', sys_created_on: '2025-01-01 12:01:00', level: 'warning', message: 'Test warning message', source: 'test_script' },
    ]))
    this.querySyslogAppScope = jest.fn(() => Promise.resolve([]))
    this.isTailing = false
  }
}

export class TableAPIRequest {
  constructor(_instance?: any) {}
  get = jest.fn(() => Promise.resolve({
    data: {
      result: [
        { sys_id: 'rec-001', number: 'INC0010001', short_description: 'Test incident', state: '1', priority: '1' },
        { sys_id: 'rec-002', number: 'INC0010002', short_description: 'Another incident', state: '2', priority: '2' },
      ]
    },
    bodyObject: {
      result: [
        { sys_id: 'rec-001', number: 'INC0010001', short_description: 'Test incident', state: '1', priority: '1' },
        { sys_id: 'rec-002', number: 'INC0010002', short_description: 'Another incident', state: '2', priority: '2' },
      ]
    },
    status: 200,
    statusText: 'OK',
  }))
  post = jest.fn(() => Promise.resolve({ data: { result: {} }, status: 201 }))
  put = jest.fn(() => Promise.resolve({ data: { result: {} }, status: 200 }))
  patch = jest.fn(() => Promise.resolve({ data: { result: {} }, status: 200 }))
}

export class ServiceNowInstance {
  private host: string
  private username: string

  constructor(settings?: any) {
    this.host = settings?.credential?.instanceUrl || 'https://test.service-now.com'
    this.username = settings?.credential?.username || 'test-user'
  }

  getHost = jest.fn().mockImplementation(() => this.host)
  getUserName = jest.fn().mockImplementation(() => this.username)
}

export class ClusterTransactionManager {
  getTransactions = jest.fn(() => Promise.resolve([]))
  killTransaction = jest.fn((sysId: string) => Promise.resolve({accepted: true, sysId}))

  constructor(_instance?: any) {}
}

export class Logger {
  debug = jest.fn()
  error = jest.fn()
  info = jest.fn()
  warn = jest.fn()
  trace = jest.fn()

  constructor(_name?: string, _level?: string) {}
}

export class BackgroundScriptExecutor {
  executeScript: ReturnType<typeof jest.fn>

  constructor(_instance?: any, _scope?: string) {
    this.executeScript = jest.fn(() => Promise.resolve({
      scriptResults: [{ line: 'test output' }]
    }))
  }
}

export class NowStringUtil {
  static isStringEmpty(str: string | null | undefined): boolean {
    return !str || str.trim().length === 0
  }
}

export class ATFTestExecutor {
  executeTest: ReturnType<typeof jest.fn>
  executeTestSuite: ReturnType<typeof jest.fn>
  executeTestSuiteAndWait: ReturnType<typeof jest.fn>
  executeTestSuiteByName: ReturnType<typeof jest.fn>
  executeTestSuiteByNameAndWait: ReturnType<typeof jest.fn>

  constructor(_instance?: any) {
    this.executeTest = jest.fn(() => Promise.resolve({
      output: 'Test passed',
      run_time: '5s',
      status: 'success',
      sys_id: 'result-id',
      test: { value: 'test-id' },
      test_name: 'Test Name',
    }))
    this.executeTestSuite = jest.fn(() => Promise.resolve({
      error: '',
      links: { progress: { id: 'progress-id', url: '/progress' } },
      percent_complete: 0,
      status: 'pending',
      status_detail: '',
      status_label: 'Pending',
      status_message: '',
    }))
    this.executeTestSuiteAndWait = jest.fn(() => Promise.resolve({
      duration: '30s',
      end_time: '2025-01-01 12:00:30',
      failed_tests: 0,
      output: '',
      passed_tests: 5,
      skipped_tests: 0,
      start_time: '2025-01-01 12:00:00',
      status: 'success',
      sys_id: 'suite-result-id',
      test_suite: { value: 'Suite Name' },
      total_tests: 5,
    }))
    this.executeTestSuiteByName = jest.fn(() => Promise.resolve({}))
    this.executeTestSuiteByNameAndWait = jest.fn(() => Promise.resolve({
      duration: '30s',
      end_time: '2025-01-01 12:00:30',
      failed_tests: 0,
      output: '',
      passed_tests: 5,
      skipped_tests: 0,
      start_time: '2025-01-01 12:00:00',
      status: 'success',
      sys_id: 'suite-result-id',
      test_suite: { value: 'Suite Name' },
      total_tests: 5,
    }))
  }
}

export class ApplicationManager {
  constructor(_instance?: any) {}
  installBatch = jest.fn(() => Promise.resolve('Installation complete'))
}

export class Application {
  constructor(_instance?: any, _scope?: string, _applicationId?: string) {}
  changeApplication = jest.fn(() => Promise.resolve())
  uninstall = jest.fn(() => Promise.resolve())
}

export class CompanyApplications {
  constructor(_instance?: any) {}
  getCompanyApplications = jest.fn(() => Promise.resolve({
    data: [],
    dataProcessingTime: 150,
  }))
  getCompanyApplicationByScope = jest.fn(() => Promise.resolve(null))
}

export class AppRepoApplication {
  constructor(_instance?: any) {}
  installFromAppRepo = jest.fn(() => Promise.resolve({
    links: { progress: { id: 'progress-id', url: '/progress' } },
    percent_complete: 0,
    status: 'pending',
    status_label: 'Pending',
  }))
  installFromAppRepoAndWait = jest.fn(() => Promise.resolve({
    error: '',
    percent_complete: 100,
    status_label: 'Completed',
    status_message: '',
    success: true,
  }))
}

// --- New classes added for core 2.4.0 ---

export class CodeSearch {
  constructor(_instance?: any) {}
  search = jest.fn(() => Promise.resolve([]))
  searchRaw = jest.fn(() => Promise.resolve([]))
  searchInApp = jest.fn(() => Promise.resolve([]))
  searchInTable = jest.fn(() => Promise.resolve([]))
  getSearchGroups = jest.fn(() => Promise.resolve([]))
  getTablesForSearchGroup = jest.fn(() => Promise.resolve([]))
  addTableToSearchGroup = jest.fn(() => Promise.resolve({ sys_id: 'table-record-id', table: 'test_table', search_fields: 'script', search_group: 'group-id' }))
  getTableRecordsForSearchGroup = jest.fn(() => Promise.resolve([]))
  static flattenResults = jest.fn(() => [])
  static formatResultsAsText = jest.fn(() => 'No results found.')
}

export class SchemaDiscovery {
  constructor(_instance?: any) {}
  discoverTableSchema = jest.fn(() => Promise.resolve({
    table: 'incident',
    label: 'Incident',
    superClass: 'task',
    fields: [
      { name: 'number', label: 'Number', internalType: 'string', maxLength: 40, mandatory: false, readOnly: true },
      { name: 'short_description', label: 'Short description', internalType: 'string', maxLength: 160, mandatory: true, readOnly: false },
    ],
  }))
  explainField = jest.fn(() => Promise.resolve({
    field: 'state',
    table: 'incident',
    label: 'State',
    type: 'integer',
    maxLength: 40,
    mandatory: false,
    readOnly: false,
    choices: [{ label: 'New', value: '1' }, { label: 'In Progress', value: '2' }],
  }))
  validateCatalogConfiguration = jest.fn(() => Promise.resolve({
    valid: true,
    issues: [],
    warnings: 0,
    errors: 0,
  }))
}

export class ScriptSync {
  constructor(_instance?: any) {}
  pullScript = jest.fn(() => Promise.resolve({
    scriptName: 'TestScript',
    scriptType: 'sys_script_include',
    filePath: '/tmp/TestScript.sys_script_include.js',
    direction: 'pull' as const,
    success: true,
    sysId: 'script-sys-id',
    message: 'Successfully pulled Script Include \'TestScript\'',
    timestamp: new Date().toISOString(),
  }))
  pushScript = jest.fn(() => Promise.resolve({
    scriptName: 'TestScript',
    scriptType: 'sys_script_include',
    filePath: '/tmp/TestScript.sys_script_include.js',
    direction: 'push' as const,
    success: true,
    sysId: 'script-sys-id',
    message: 'Successfully pushed Script Include \'TestScript\'',
    timestamp: new Date().toISOString(),
  }))
  syncAllScripts = jest.fn(() => Promise.resolve({
    directory: '/tmp/scripts',
    scriptTypes: ['sys_script_include'],
    totalFiles: 1,
    synced: 1,
    failed: 0,
    scripts: [],
    timestamp: new Date().toISOString(),
  }))
  static parseFileName = jest.fn((fileName: string) => ({ isValid: true, scriptName: 'Test', scriptType: 'sys_script_include' }))
  static generateFileName = jest.fn((name: string, type: string) => `${name}.${type}.js`)
}

export const SCRIPT_TYPES: Record<string, any> = {
  sys_script_include: { table: 'sys_script_include', label: 'Script Include', nameField: 'name', scriptField: 'script', extension: '.js' },
  sys_script: { table: 'sys_script', label: 'Business Rule', nameField: 'name', scriptField: 'script', extension: '.js' },
  sys_ui_script: { table: 'sys_ui_script', label: 'UI Script', nameField: 'name', scriptField: 'script', extension: '.js' },
  sys_ui_action: { table: 'sys_ui_action', label: 'UI Action', nameField: 'name', scriptField: 'script', extension: '.js' },
  sys_script_client: { table: 'sys_script_client', label: 'Client Script', nameField: 'name', scriptField: 'script', extension: '.js' },
}

export class TaskOperations {
  constructor(_instance?: any) {}
  addComment = jest.fn(() => Promise.resolve({ sys_id: 'task-001', number: 'INC0010001' }))
  assignTask = jest.fn(() => Promise.resolve({ sys_id: 'task-001', number: 'INC0010001' }))
  resolveIncident = jest.fn(() => Promise.resolve({ sys_id: 'task-001', number: 'INC0010001', state: '6' }))
  closeIncident = jest.fn(() => Promise.resolve({ sys_id: 'task-001', number: 'INC0010001', state: '7' }))
  approveChange = jest.fn(() => Promise.resolve({ sys_id: 'chg-001', number: 'CHG0010001', approval: 'approved' }))
  findByNumber = jest.fn(() => Promise.resolve({ sys_id: 'task-001', number: 'INC0010001', short_description: 'Test incident' }))
}

export class UpdateSetManager {
  constructor(_instance?: any) {}
  setCurrentUpdateSet = jest.fn(() => Promise.resolve())
  getCurrentUpdateSet = jest.fn(() => Promise.resolve({ sys_id: 'us-001', name: 'Default', state: 'in progress' }))
  listUpdateSets = jest.fn(() => Promise.resolve([
    { sys_id: 'us-001', name: 'Default', state: 'in progress' },
  ]))
  createUpdateSet = jest.fn(() => Promise.resolve({ sys_id: 'us-002', name: 'New Update Set', state: 'in progress' }))
  moveRecordsToUpdateSet = jest.fn(() => Promise.resolve({ moved: 2, failed: 0, records: [], errors: [] }))
  cloneUpdateSet = jest.fn(() => Promise.resolve({
    newUpdateSetId: 'us-003',
    newUpdateSetName: 'Cloned Set',
    sourceUpdateSetId: 'us-001',
    sourceUpdateSetName: 'Default',
    recordsCloned: 5,
    totalSourceRecords: 5,
  }))
  inspectUpdateSet = jest.fn(() => Promise.resolve({
    updateSet: { sys_id: 'us-001', name: 'Default', state: 'in progress' },
    totalRecords: 3,
    components: [{ type: 'Business Rule', count: 2, items: ['rule1', 'rule2'] }],
  }))
}

export class WorkflowManager {
  constructor(_instance?: any) {}
  createWorkflow = jest.fn(() => Promise.resolve({ workflowSysId: 'wf-001', name: 'Test Workflow' }))
  createWorkflowVersion = jest.fn(() => Promise.resolve({ versionSysId: 'wfv-001', name: 'Test Workflow' }))
  createActivity = jest.fn(() => Promise.resolve({ activitySysId: 'act-001', name: 'Activity 1' }))
  createTransition = jest.fn(() => Promise.resolve({ transitionSysId: 'tr-001' }))
  createCondition = jest.fn(() => Promise.resolve({ conditionSysId: 'cond-001', name: 'Condition 1' }))
  publishWorkflow = jest.fn(() => Promise.resolve())
  createCompleteWorkflow = jest.fn(() => Promise.resolve({
    workflowSysId: 'wf-001',
    versionSysId: 'wfv-001',
    activitySysIds: { '0': 'act-001', '1': 'act-002' },
    transitionSysIds: ['tr-001'],
    published: false,
  }))
}

export class AttachmentManager {
  constructor(_instance?: any) {}
  uploadAttachment = jest.fn(() => Promise.resolve({
    sys_id: 'att-001',
    file_name: 'test.pdf',
    table_name: 'incident',
    table_sys_id: 'inc-001',
    content_type: 'application/pdf',
    size_bytes: '1024',
  }))
  listAttachments = jest.fn(() => Promise.resolve([
    { sys_id: 'att-001', file_name: 'test.pdf', content_type: 'application/pdf', size_bytes: '1024' },
  ]))
  getAttachment = jest.fn(() => Promise.resolve({
    sys_id: 'att-001',
    file_name: 'test.pdf',
    content_type: 'application/pdf',
    size_bytes: '1024',
    table_name: 'incident',
    table_sys_id: 'inc-001',
  }))
}

export class ScopeManager {
  constructor(_instance?: any) {}
  setCurrentApplication = jest.fn(() => Promise.resolve({
    success: true,
    application: 'Test App',
    scope: 'x_test_app',
    sysId: 'app-001',
    verified: true,
    warnings: [],
  }))
  getCurrentApplication = jest.fn(() => Promise.resolve({
    sys_id: 'global',
    name: 'Global',
    scope: 'global',
  }))
  listApplications = jest.fn(() => Promise.resolve([
    { sys_id: 'global', name: 'Global', scope: 'global' },
    { sys_id: 'app-001', name: 'Test App', scope: 'x_test_app' },
  ]))
  getApplication = jest.fn(() => Promise.resolve({
    sys_id: 'app-001',
    name: 'Test App',
    scope: 'x_test_app',
  }))
}

export class BatchOperations {
  constructor(_instance?: any) {}
  batchCreate = jest.fn(() => Promise.resolve({
    success: true,
    createdCount: 2,
    sysIds: { item1: 'sys-001', item2: 'sys-002' },
    errors: [],
    executionTimeMs: 1500,
  }))
  batchUpdate = jest.fn(() => Promise.resolve({
    success: true,
    updatedCount: 2,
    errors: [],
    executionTimeMs: 1200,
  }))
}

export class AggregateQuery {
  constructor(_instance?: any) {}
  count = jest.fn(() => Promise.resolve(42))
  aggregate = jest.fn(() => Promise.resolve({
    stats: {
      count: '42',
      'avg.reassignment_count': '2.5',
      'min.reassignment_count': '0',
      'max.reassignment_count': '10',
    },
  }))
  groupBy = jest.fn(() => Promise.resolve({
    groups: [
      {
        groupby_fields: [{ field: 'priority', value: '1', display_value: 'Critical' }],
        stats: { count: '15' },
      },
      {
        groupby_fields: [{ field: 'priority', value: '2', display_value: 'High' }],
        stats: { count: '27' },
      },
    ],
  }))
}

export class FlowManager {
  constructor(_instance?: any, _scope?: string) {}
  executeFlow = jest.fn(() => Promise.resolve({
    success: true,
    flowObjectName: 'global.test_flow',
    flowObjectType: 'flow' as const,
    contextId: 'ctx-001',
    executionDate: '2025-01-01 12:00:00',
    outputs: { result: 'done' },
    debugOutput: '',
    errorMessage: undefined,
  }))
  executeSubflow = jest.fn(() => Promise.resolve({
    success: true,
    flowObjectName: 'global.test_subflow',
    flowObjectType: 'subflow' as const,
    contextId: 'ctx-002',
    executionDate: '2025-01-01 12:00:00',
    outputs: {},
    debugOutput: '',
    errorMessage: undefined,
  }))
  executeAction = jest.fn(() => Promise.resolve({
    success: true,
    flowObjectName: 'global.test_action',
    flowObjectType: 'action' as const,
    contextId: 'ctx-003',
    executionDate: '2025-01-01 12:00:00',
    outputs: {},
    debugOutput: '',
    errorMessage: undefined,
  }))
  getFlowContextStatus = jest.fn(() => Promise.resolve({
    success: true,
    contextId: 'ctx-001',
    found: true,
    state: 'COMPLETE',
    name: 'Test Flow',
    started: '2025-01-01 12:00:00',
    ended: '2025-01-01 12:00:05',
  }))
  getFlowOutputs = jest.fn(() => Promise.resolve({
    success: true,
    contextId: 'ctx-001',
    outputs: { result: 'done' },
  }))
  getFlowError = jest.fn(() => Promise.resolve({
    success: true,
    contextId: 'ctx-001',
    flowErrorMessage: undefined,
  }))
  cancelFlow = jest.fn(() => Promise.resolve({
    success: true,
    contextId: 'ctx-001',
  }))
  sendFlowMessage = jest.fn(() => Promise.resolve({
    success: true,
    contextId: 'ctx-001',
  }))
  testFlow = jest.fn(() => Promise.resolve({
    success: true,
    contextId: 'ctx-test-001',
    flowId: '887dda5583237210fdb8f7b6feaad32c',
    state: 'COMPLETE',
    outputs: { result: 'test_done' },
    errorMessage: undefined,
  }))
  copyFlow = jest.fn(() => Promise.resolve({
    success: true,
    newFlowSysId: 'new-flow-001',
  }))
  getFlowContextDetails = jest.fn(() => Promise.resolve({
    success: true,
    contextId: 'ctx-001',
    flowContext: {
      name: 'Test Flow',
      state: 'COMPLETE',
      runTime: '1234',
      isTestRun: true,
      executedAs: 'admin',
      flowInitiatedBy: 'admin',
      executionSource: {
        callingSource: 'TEST_BUTTON',
        executionSourceTable: 'change_request',
        executionSourceRecordDisplay: 'CHG0010042',
      },
    },
    flowReport: {
      actionOperationsReports: {
        'act001': {
          actionName: 'act001',
          stepLabel: 'Create Incident',
          actionTypeName: 'Create Record',
          operationsCore: { error: '', state: 'COMPLETE', order: '1', runTime: '120' },
          operationsInput: { data: { table_name: { value: 'incident', displayValue: 'Incident' } } },
          operationsOutput: { data: { sys_id: { value: 'inc001', displayValue: 'INC0001234' } } },
        },
      },
      subflowOperationsReports: {},
      operationsOutput: { data: {} },
    },
  }))
  getFlowLogs = jest.fn(() => Promise.resolve({
    success: true,
    contextId: 'ctx-001',
    entries: [
      { sysId: 'log-001', level: '2', message: 'Record created', action: 'action.create_record', createdOn: '2025-01-01 12:00:00' },
      { sysId: 'log-002', level: '-1', message: 'Failed to send email', action: 'action.send_notification', createdOn: '2025-01-01 12:00:01' },
    ],
  }))
}

export class XMLRecordManager {
  constructor(_instance?: any) {}
  exportRecord = jest.fn(() => Promise.resolve({
    xml: '<?xml version="1.0" encoding="UTF-8"?><record_update table="sys_script_include"><sys_script_include action="INSERT_OR_UPDATE"><name>TestScript</name><sys_id>abc123</sys_id></sys_script_include></record_update>',
    table: 'sys_script_include',
    sysId: 'abc123',
    unloadDate: '2025-01-15 10:30:00',
  }))
  importRecords = jest.fn(() => Promise.resolve({
    success: true,
    targetTable: 'sys_script_include',
    responseBody: 'Import completed successfully',
  }))
}

export class QueryBatchOperations {
  constructor(_instance?: any) {}
  queryUpdate = jest.fn(() => Promise.resolve({
    dryRun: true,
    matchCount: 5,
    updatedCount: 0,
    success: true,
    errors: [],
    executionTimeMs: 250,
  }))
  queryDelete = jest.fn(() => Promise.resolve({
    dryRun: true,
    matchCount: 3,
    deletedCount: 0,
    success: true,
    errors: [],
    executionTimeMs: 180,
  }))
}

export class InstanceHealth {
  constructor(_instance?: any, _aggregateQuery?: any) {}
  checkHealth = jest.fn(() => Promise.resolve({
    timestamp: '2025-01-01T12:00:00.000Z',
    version: { version: 'Tokyo Patch 3', buildDate: '2025-01-01', buildTag: 'glide-tokyo-p3' },
    clusterNodes: [
      { sys_id: 'node-001', node_id: 'node1.service-now.com', status: 'online', sys_updated_on: '2025-01-01 12:00:00' },
    ],
    stuckJobs: [],
    activeSemaphoreCount: 3,
    operationalCounts: { openIncidents: 150, openChanges: 25, openProblems: 8 },
    summary: 'Instance is healthy. No stuck jobs detected.',
  }))
}

export enum APP_TAB_CONTEXT {
  AVAILABLE_FOR_YOU = "available_for_you",
  INSTALLED = "installed",
  UPDATES = "updates"
}

// Type exports
export interface ServiceNowSettingsInstance {
  alias?: string
  credential: any
}

export interface ReferenceLink {
  display_value?: string
  link?: string
  value: string
}

export interface TestResult {
  output: string
  run_time: string
  status: string
  sys_id: string
  test: ReferenceLink
  test_name: string
}

// Re-export types that may be imported
export interface CompanyApplication {
  can_install_or_upgrade: boolean
  dependencies: string | null
  isInstalled: boolean
  latest_version: string
  name: string
  scope: string
  short_description: string
  sys_id: string
  vendor: string
  version: string | null
  versions: Array<{ version: string; publish_date_display: string }>
}

export interface CompanyApplicationsResponse {
  data: CompanyApplication[]
  dataProcessingTime: number
}

export interface AppRepoInstallRequest {
  scope: string
  sys_id: string
  version: string
}

export interface AppRepoOperationResult {
  error: string
  percent_complete: number
  status_label: string
  status_message: string
  success: boolean
}
