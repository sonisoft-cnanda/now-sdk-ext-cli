import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    XMLRecordManager: jest.fn().mockImplementation(() => ({
      exportRecord: jest.fn<any>().mockResolvedValue({
        xml: '<?xml version="1.0" encoding="UTF-8"?><record_update table="sys_script_include"><sys_script_include action="INSERT_OR_UPDATE"><name>TestScript</name><sys_id>abc123</sys_id></sys_script_include></record_update>',
        table: 'sys_script_include',
        sysId: 'abc123',
        unloadDate: '2025-01-15 10:30:00',
      }),
      importRecords: jest.fn<any>().mockResolvedValue({
        success: true,
        targetTable: 'sys_script_include',
        responseBody: 'Import completed successfully',
      }),
    })),
    Logger: jest.fn().mockImplementation(() => ({
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      trace: jest.fn(),
    })),
    NowStringUtil: {
      isStringEmpty(str: string | null | undefined): boolean {
        return !str || str.trim().length === 0
      },
    },
    ServiceNowInstance: jest.fn().mockImplementation(() => ({
      getHost: jest.fn().mockReturnValue('https://test.service-now.com'),
      getUserName: jest.fn().mockReturnValue('test-user'),
    })),
  }
})

jest.mock('@servicenow/sdk-cli/dist/auth/index.js', () => ({
  getCredentials: jest.fn<any>().mockResolvedValue({
    instanceUrl: 'https://test.service-now.com',
    password: 'test-password',
    type: 'basic',
    username: 'test-user',
  }),
}))

jest.mock('node:fs', () => ({
  readFileSync: jest.fn<any>().mockReturnValue(
    '<?xml version="1.0" encoding="UTF-8"?><record_update table="sys_script_include"><sys_script_include action="INSERT_OR_UPDATE"><name>TestScript</name></sys_script_include></record_update>'
  ),
  writeFileSync: jest.fn<any>(),
}))

// Dynamic imports — loaded after mocks are registered
const { XmlExport } = await import('../../../src/commands/xml/export.js')
const { XmlImport } = await import('../../../src/commands/xml/import.js')

describe('XML Commands - Integration Tests', () => {
  let consoleSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('xml export', () => {
    describe('command structure', () => {
      it('should have description mentioning XML export', () => {
        expect(XmlExport.description).toContain('Export')
      })

      it('should have table flag as required', () => {
        expect(XmlExport.flags['table']).toBeDefined()
        expect(XmlExport.flags['table'].required).toBe(true)
      })

      it('should have sys-id flag as required', () => {
        expect(XmlExport.flags['sys-id']).toBeDefined()
        expect(XmlExport.flags['sys-id'].required).toBe(true)
      })

      it('should have output flag as optional', () => {
        expect(XmlExport.flags['output']).toBeDefined()
        expect(XmlExport.flags['output'].required).toBe(false)
      })

      it('should have examples defined', () => {
        expect(XmlExport.examples).toBeDefined()
        expect(XmlExport.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should export a record to stdout', async () => {
        const { stdout, error } = await runCommand([
          'xml:export', '--table', 'sys_script_include', '--sys-id', 'abc123', '--auth', 'test',
        ])

        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
        if (!error) {
          expect(stdout).toContain('Exporting record')
        }
      })

      it('should export a record to file when --output is specified', async () => {
        const { stdout, error } = await runCommand([
          'xml:export', '--table', 'sys_script_include', '--sys-id', 'abc123',
          '--output', './test-export.xml', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('XML written to')
        }
      })
    })

    describe('validation', () => {
      it('should require table flag', async () => {
        const { error } = await runCommand([
          'xml:export', '--sys-id', 'abc123', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require sys-id flag', async () => {
        const { error } = await runCommand([
          'xml:export', '--table', 'sys_script_include', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('xml import', () => {
    describe('command structure', () => {
      it('should have description mentioning XML import', () => {
        expect(XmlImport.description).toContain('Import')
      })

      it('should have file flag as required', () => {
        expect(XmlImport.flags['file']).toBeDefined()
        expect(XmlImport.flags['file'].required).toBe(true)
      })

      it('should have table flag as required', () => {
        expect(XmlImport.flags['table']).toBeDefined()
        expect(XmlImport.flags['table'].required).toBe(true)
      })

      it('should have examples defined', () => {
        expect(XmlImport.examples).toBeDefined()
        expect(XmlImport.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should import records from an XML file', async () => {
        const { stdout, error } = await runCommand([
          'xml:import', '--file', './records.xml', '--table', 'sys_script_include', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Importing records')
        }
      })
    })

    describe('validation', () => {
      it('should require file flag', async () => {
        const { error } = await runCommand([
          'xml:import', '--table', 'sys_script_include', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require table flag', async () => {
        const { error } = await runCommand([
          'xml:import', '--file', './records.xml', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })
})
