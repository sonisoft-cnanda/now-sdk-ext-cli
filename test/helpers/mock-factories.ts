import { jest } from '@jest/globals'

export function createMockServiceNowInstance(overrides?: Partial<{
  host: string;
  username: string;
}>) {
  return {
    getHost: jest.fn<() => string>().mockReturnValue(overrides?.host ?? 'https://test.service-now.com'),
    getUserName: jest.fn<() => string>().mockReturnValue(overrides?.username ?? 'test-user'),
  }
}

export function createMockLogger() {
  return {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
  }
}

export function createMockCredentials(overrides?: Partial<{
  instanceUrl: string;
  password: string;
  type: string;
  username: string;
}>) {
  return {
    instanceUrl: overrides?.instanceUrl ?? 'https://test.service-now.com',
    password: overrides?.password ?? 'test-password',
    type: overrides?.type ?? 'basic',
    username: overrides?.username ?? 'test-user',
  }
}

export function createMockSyslogReader() {
  return {
    isTailing: false,
    querySyslog: jest.fn().mockResolvedValue([
      { sys_id: 'log-001', sys_created_on: '2025-01-01 12:00:00', level: 'error', message: 'Test error message', source: 'test_script' },
      { sys_id: 'log-002', sys_created_on: '2025-01-01 12:01:00', level: 'warning', message: 'Test warning message', source: 'test_script' },
    ]),
    querySyslogAppScope: jest.fn().mockResolvedValue([]),
    startTailing: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    startTailingWithChannelAjax: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    stopTailing: jest.fn(),
  }
}

export function createMockTableAPIRequest(records?: any[]) {
  const defaultRecords = records ?? [
    { sys_id: 'rec-001', number: 'INC0010001', short_description: 'Test incident', state: '1', priority: '1' },
    { sys_id: 'rec-002', number: 'INC0010002', short_description: 'Another incident', state: '2', priority: '2' },
  ];
  return {
    get: jest.fn().mockResolvedValue({
      data: { result: defaultRecords },
      bodyObject: { result: defaultRecords },
      status: 200,
      statusText: 'OK',
    }),
    post: jest.fn().mockResolvedValue({ data: { result: {} }, status: 201 }),
    put: jest.fn().mockResolvedValue({ data: { result: {} }, status: 200 }),
    patch: jest.fn().mockResolvedValue({ data: { result: {} }, status: 200 }),
  }
}

export function createMockBackgroundScriptExecutor(scriptResults?: Array<{ line: string }>) {
  return {
    executeScript: jest.fn().mockResolvedValue({
      scriptResults: scriptResults ?? [{ line: 'test output' }],
    }),
  }
}

export function createMockATFTestExecutor(overrides?: {
  executeTest?: jest.Mock;
  executeTestSuiteAndWait?: jest.Mock;
  executeTestSuiteByNameAndWait?: jest.Mock;
}) {
  return {
    executeTest: overrides?.executeTest ?? jest.fn().mockResolvedValue({
      output: 'Test passed',
      run_time: '5s',
      status: 'success',
      sys_id: 'result-id',
      test: { value: 'test-id' },
      test_name: 'Test Name',
    }),
    executeTestSuiteAndWait: overrides?.executeTestSuiteAndWait ?? jest.fn().mockResolvedValue({
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
    }),
    executeTestSuiteByNameAndWait: overrides?.executeTestSuiteByNameAndWait ?? jest.fn().mockResolvedValue({
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
    }),
  }
}

export function createMockApplicationManager() {
  return {
    installBatch: jest.fn().mockResolvedValue('Installation complete'),
  }
}

export function createMockCompanyApplications(apps?: any[]) {
  const defaultApps = apps ?? [{
    can_install_or_upgrade: true,
    dependencies: null,
    isInstalled: false,
    latest_version: '1.0.0',
    name: 'Test App',
    scope: 'x_test_app',
    short_description: 'A test application',
    sys_id: 'app-sys-id',
    vendor: 'Test Vendor',
    version: null,
    versions: [{ version: '1.0.0', publish_date_display: '2025-01-01' }],
  }]

  return {
    getCompanyApplicationByScope: jest.fn().mockImplementation((scope: string) => {
      return Promise.resolve(defaultApps.find(a => a.scope === scope) ?? null)
    }),
    getCompanyApplications: jest.fn().mockResolvedValue({
      data: defaultApps,
      dataProcessingTime: 150,
    }),
  }
}

export function createMockAppRepoApplication() {
  return {
    installFromAppRepo: jest.fn().mockResolvedValue({
      links: { progress: { id: 'progress-id', url: '/progress/url' } },
      percent_complete: 0,
      status: 'pending',
      status_label: 'Pending',
    }),
    installFromAppRepoAndWait: jest.fn().mockResolvedValue({
      error: '',
      percent_complete: 100,
      status_label: 'Completed',
      status_message: '',
      success: true,
    }),
  }
}

export function createMockApplication() {
  return {
    changeApplication: jest.fn().mockResolvedValue(undefined),
    uninstall: jest.fn().mockResolvedValue(undefined),
  }
}

export function createMockCodeSearch() {
  return {
    search: jest.fn().mockResolvedValue([]),
    searchRaw: jest.fn().mockResolvedValue([]),
    searchInApp: jest.fn().mockResolvedValue([]),
    searchInTable: jest.fn().mockResolvedValue([]),
    getSearchGroups: jest.fn().mockResolvedValue([]),
    getTablesForSearchGroup: jest.fn().mockResolvedValue([]),
    addTableToSearchGroup: jest.fn().mockResolvedValue({ sys_id: 'table-record-id', table: 'test_table', search_fields: 'script', search_group: 'group-id' }),
    getTableRecordsForSearchGroup: jest.fn().mockResolvedValue([]),
  }
}

export function createMockSchemaDiscovery() {
  return {
    discoverTableSchema: jest.fn().mockResolvedValue({
      table: 'incident',
      label: 'Incident',
      superClass: 'task',
      fields: [
        { name: 'number', label: 'Number', internalType: 'string', maxLength: 40, mandatory: false, readOnly: true },
        { name: 'short_description', label: 'Short description', internalType: 'string', maxLength: 160, mandatory: true, readOnly: false },
      ],
    }),
    explainField: jest.fn().mockResolvedValue({
      field: 'state',
      table: 'incident',
      label: 'State',
      type: 'integer',
      maxLength: 40,
      mandatory: false,
      readOnly: false,
      choices: [{ label: 'New', value: '1' }, { label: 'In Progress', value: '2' }],
    }),
    validateCatalogConfiguration: jest.fn().mockResolvedValue({
      valid: true,
      issues: [],
      warnings: 0,
      errors: 0,
    }),
  }
}

export function createMockScriptSync() {
  return {
    pullScript: jest.fn().mockResolvedValue({
      scriptName: 'TestScript',
      scriptType: 'sys_script_include',
      filePath: '/tmp/TestScript.sys_script_include.js',
      direction: 'pull' as const,
      success: true,
      sysId: 'script-sys-id',
      message: "Successfully pulled Script Include 'TestScript'",
      timestamp: new Date().toISOString(),
    }),
    pushScript: jest.fn().mockResolvedValue({
      scriptName: 'TestScript',
      scriptType: 'sys_script_include',
      filePath: '/tmp/TestScript.sys_script_include.js',
      direction: 'push' as const,
      success: true,
      sysId: 'script-sys-id',
      message: "Successfully pushed Script Include 'TestScript'",
      timestamp: new Date().toISOString(),
    }),
    syncAllScripts: jest.fn().mockResolvedValue({
      directory: '/tmp/scripts',
      scriptTypes: ['sys_script_include'],
      totalFiles: 1,
      synced: 1,
      failed: 0,
      scripts: [],
      timestamp: new Date().toISOString(),
    }),
  }
}

export function createMockTaskOperations() {
  return {
    addComment: jest.fn().mockResolvedValue({ sys_id: 'task-001', number: 'INC0010001' }),
    assignTask: jest.fn().mockResolvedValue({ sys_id: 'task-001', number: 'INC0010001' }),
    resolveIncident: jest.fn().mockResolvedValue({ sys_id: 'task-001', number: 'INC0010001', state: '6' }),
    closeIncident: jest.fn().mockResolvedValue({ sys_id: 'task-001', number: 'INC0010001', state: '7' }),
    approveChange: jest.fn().mockResolvedValue({ sys_id: 'chg-001', number: 'CHG0010001', approval: 'approved' }),
    findByNumber: jest.fn().mockResolvedValue({ sys_id: 'task-001', number: 'INC0010001', short_description: 'Test incident' }),
  }
}

export function createMockUpdateSetManager() {
  return {
    setCurrentUpdateSet: jest.fn().mockResolvedValue(undefined),
    getCurrentUpdateSet: jest.fn().mockResolvedValue({ sys_id: 'us-001', name: 'Default', state: 'in progress' }),
    listUpdateSets: jest.fn().mockResolvedValue([
      { sys_id: 'us-001', name: 'Default', state: 'in progress' },
    ]),
    createUpdateSet: jest.fn().mockResolvedValue({ sys_id: 'us-002', name: 'New Update Set', state: 'in progress' }),
    moveRecordsToUpdateSet: jest.fn().mockResolvedValue({ moved: 2, failed: 0, records: [], errors: [] }),
    cloneUpdateSet: jest.fn().mockResolvedValue({
      newUpdateSetId: 'us-003',
      newUpdateSetName: 'Cloned Set',
      sourceUpdateSetId: 'us-001',
      sourceUpdateSetName: 'Default',
      recordsCloned: 5,
      totalSourceRecords: 5,
    }),
    inspectUpdateSet: jest.fn().mockResolvedValue({
      updateSet: { sys_id: 'us-001', name: 'Default', state: 'in progress' },
      totalRecords: 3,
      components: [{ type: 'Business Rule', count: 2, items: ['rule1', 'rule2'] }],
    }),
  }
}

export function createMockWorkflowManager() {
  return {
    createWorkflow: jest.fn().mockResolvedValue({ workflowSysId: 'wf-001', name: 'Test Workflow' }),
    createWorkflowVersion: jest.fn().mockResolvedValue({ versionSysId: 'wfv-001', name: 'Test Workflow' }),
    createActivity: jest.fn().mockResolvedValue({ activitySysId: 'act-001', name: 'Activity 1' }),
    createTransition: jest.fn().mockResolvedValue({ transitionSysId: 'tr-001' }),
    createCondition: jest.fn().mockResolvedValue({ conditionSysId: 'cond-001', name: 'Condition 1' }),
    publishWorkflow: jest.fn().mockResolvedValue(undefined),
    createCompleteWorkflow: jest.fn().mockResolvedValue({
      workflowSysId: 'wf-001',
      versionSysId: 'wfv-001',
      activitySysIds: { '0': 'act-001', '1': 'act-002' },
      transitionSysIds: ['tr-001'],
      published: false,
    }),
  }
}

export function createMockAttachmentManager() {
  return {
    uploadAttachment: jest.fn().mockResolvedValue({
      sys_id: 'att-001',
      file_name: 'test.pdf',
      table_name: 'incident',
      table_sys_id: 'inc-001',
      content_type: 'application/pdf',
      size_bytes: '1024',
    }),
    listAttachments: jest.fn().mockResolvedValue([
      { sys_id: 'att-001', file_name: 'test.pdf', content_type: 'application/pdf', size_bytes: '1024' },
    ]),
    getAttachment: jest.fn().mockResolvedValue({
      sys_id: 'att-001',
      file_name: 'test.pdf',
      content_type: 'application/pdf',
      size_bytes: '1024',
      table_name: 'incident',
      table_sys_id: 'inc-001',
    }),
  }
}

export function createMockScopeManager() {
  return {
    setCurrentApplication: jest.fn().mockResolvedValue({
      success: true,
      application: 'Test App',
      scope: 'x_test_app',
      sysId: 'app-001',
      verified: true,
      warnings: [],
    }),
    getCurrentApplication: jest.fn().mockResolvedValue({
      sys_id: 'global',
      name: 'Global',
      scope: 'global',
    }),
    listApplications: jest.fn().mockResolvedValue([
      { sys_id: 'global', name: 'Global', scope: 'global' },
      { sys_id: 'app-001', name: 'Test App', scope: 'x_test_app' },
    ]),
    getApplication: jest.fn().mockResolvedValue({
      sys_id: 'app-001',
      name: 'Test App',
      scope: 'x_test_app',
    }),
  }
}

export function createMockAggregateQuery() {
  return {
    count: jest.fn().mockResolvedValue(42),
    aggregate: jest.fn().mockResolvedValue({
      stats: {
        count: '42',
        'avg.reassignment_count': '2.5',
        'min.reassignment_count': '0',
        'max.reassignment_count': '10',
      },
    }),
    groupBy: jest.fn().mockResolvedValue({
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
    }),
  }
}

export function createMockInstanceHealth() {
  return {
    checkHealth: jest.fn().mockResolvedValue({
      timestamp: '2025-01-01T12:00:00.000Z',
      version: { version: 'Tokyo Patch 3', buildDate: '2025-01-01', buildTag: 'glide-tokyo-p3' },
      clusterNodes: [
        { sys_id: 'node-001', node_id: 'node1.service-now.com', status: 'online', sys_updated_on: '2025-01-01 12:00:00' },
      ],
      stuckJobs: [],
      activeSemaphoreCount: 3,
      operationalCounts: { openIncidents: 150, openChanges: 25, openProblems: 8 },
      summary: 'Instance is healthy. No stuck jobs detected.',
    }),
  }
}

export function createMockFlowManager() {
  return {
    executeFlow: jest.fn().mockResolvedValue({
      success: true,
      flowObjectName: 'global.test_flow',
      flowObjectType: 'flow',
      contextId: 'ctx-001',
      executionDate: '2025-01-01 12:00:00',
      outputs: { result: 'done' },
      debugOutput: '',
      errorMessage: undefined,
    }),
    executeSubflow: jest.fn().mockResolvedValue({
      success: true,
      flowObjectName: 'global.test_subflow',
      flowObjectType: 'subflow',
      contextId: 'ctx-002',
      executionDate: '2025-01-01 12:00:00',
      outputs: {},
    }),
    executeAction: jest.fn().mockResolvedValue({
      success: true,
      flowObjectName: 'global.test_action',
      flowObjectType: 'action',
      contextId: 'ctx-003',
      executionDate: '2025-01-01 12:00:00',
      outputs: {},
    }),
    getFlowContextStatus: jest.fn().mockResolvedValue({
      success: true,
      contextId: 'ctx-001',
      found: true,
      state: 'COMPLETE',
      name: 'Test Flow',
      started: '2025-01-01 12:00:00',
      ended: '2025-01-01 12:00:05',
    }),
    getFlowOutputs: jest.fn().mockResolvedValue({
      success: true,
      contextId: 'ctx-001',
      outputs: { result: 'done' },
    }),
    getFlowError: jest.fn().mockResolvedValue({
      success: true,
      contextId: 'ctx-001',
      flowErrorMessage: undefined,
    }),
    cancelFlow: jest.fn().mockResolvedValue({
      success: true,
      contextId: 'ctx-001',
    }),
    sendFlowMessage: jest.fn().mockResolvedValue({
      success: true,
      contextId: 'ctx-001',
    }),
  }
}

export function createMockQueryBatchOperations() {
  return {
    queryUpdate: jest.fn().mockResolvedValue({
      dryRun: true,
      matchCount: 5,
      updatedCount: 0,
      success: true,
      errors: [],
      executionTimeMs: 250,
    }),
    queryDelete: jest.fn().mockResolvedValue({
      dryRun: true,
      matchCount: 3,
      deletedCount: 0,
      success: true,
      errors: [],
      executionTimeMs: 180,
    }),
  }
}

export function createMockXMLRecordManager() {
  return {
    exportRecord: jest.fn().mockResolvedValue({
      xml: '<?xml version="1.0" encoding="UTF-8"?><record_update table="sys_script_include"><sys_script_include action="INSERT_OR_UPDATE"><name>TestScript</name><sys_id>abc123</sys_id></sys_script_include></record_update>',
      table: 'sys_script_include',
      sysId: 'abc123',
      unloadDate: '2025-01-15 10:30:00',
    }),
    importRecords: jest.fn().mockResolvedValue({
      success: true,
      targetTable: 'sys_script_include',
      responseBody: 'Import completed successfully',
    }),
  }
}

export function createMockBatchOperations() {
  return {
    batchCreate: jest.fn().mockResolvedValue({
      success: true,
      createdCount: 2,
      sysIds: { item1: 'sys-001', item2: 'sys-002' },
      errors: [],
      executionTimeMs: 1500,
    }),
    batchUpdate: jest.fn().mockResolvedValue({
      success: true,
      updatedCount: 2,
      errors: [],
      executionTimeMs: 1200,
    }),
  }
}
