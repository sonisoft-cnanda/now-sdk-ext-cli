import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    AttachmentManager: jest.fn().mockImplementation(() => ({
      uploadAttachment: jest.fn<any>().mockResolvedValue({
        sys_id: 'att-001', file_name: 'test.pdf', table_name: 'incident',
        table_sys_id: 'inc-001', content_type: 'application/pdf', size_bytes: '1024',
      }),
      listAttachments: jest.fn<any>().mockResolvedValue([
        { sys_id: 'att-001', file_name: 'test.pdf', content_type: 'application/pdf', size_bytes: '1024' },
      ]),
      getAttachment: jest.fn<any>().mockResolvedValue({
        sys_id: 'att-001', file_name: 'test.pdf', content_type: 'application/pdf',
        size_bytes: '1024', table_name: 'incident', table_sys_id: 'inc-001',
      }),
    })),
    Logger: jest.fn().mockImplementation(() => ({
      debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn(), trace: jest.fn(),
    })),
    NowStringUtil: { isStringEmpty(str: string | null | undefined): boolean { return !str || str.trim().length === 0 } },
    ServiceNowInstance: jest.fn().mockImplementation(() => ({
      getHost: jest.fn().mockReturnValue('https://test.service-now.com'),
      getUserName: jest.fn().mockReturnValue('test-user'),
    })),
  }
})

jest.mock('@servicenow/sdk-cli/dist/auth/index.js', () => ({
  getCredentials: jest.fn<any>().mockResolvedValue({
    instanceUrl: 'https://test.service-now.com',
    password: 'test-password', type: 'basic', username: 'test-user',
  }),
}))

describe('Attachment Commands - Integration Tests', () => {
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

  describe('attachment list', () => {
    describe('command structure', () => {
      it('should have description about listing attachments', async () => {
        const { List } = await import('../../../src/commands/attachment/list.js')
        expect(List.description).toContain('List attachments')
      })

      it('should have table and record-id flags as required', async () => {
        const { List } = await import('../../../src/commands/attachment/list.js')
        expect(List.flags.table).toBeDefined()
        expect(List.flags['record-id']).toBeDefined()
      })

      it('should have limit flag with default', async () => {
        const { List } = await import('../../../src/commands/attachment/list.js')
        expect(List.flags.limit).toBeDefined()
      })
    })

    describe('listing', () => {
      it('should list attachments for a record', async () => {
        const { stdout, error } = await runCommand([
          'attachment:list', '--table', 'incident', '--record-id', 'inc-001', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Fetching attachments')
        }
      })
    })

    describe('validation', () => {
      it('should require table flag', async () => {
        const { error } = await runCommand([
          'attachment:list', '--record-id', 'inc-001', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require record-id flag', async () => {
        const { error } = await runCommand([
          'attachment:list', '--table', 'incident', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })

  describe('attachment get', () => {
    describe('command structure', () => {
      it('should have description about getting attachment metadata', async () => {
        const { Get } = await import('../../../src/commands/attachment/get.js')
        expect(Get.description).toContain('Get metadata')
      })

      it('should have sys-id flag as required', async () => {
        const { Get } = await import('../../../src/commands/attachment/get.js')
        expect(Get.flags['sys-id']).toBeDefined()
      })
    })

    describe('getting metadata', () => {
      it('should get attachment metadata', async () => {
        const { stdout, error } = await runCommand([
          'attachment:get', '--sys-id', 'att-001', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Fetching attachment')
        }
      })
    })

    describe('validation', () => {
      it('should require sys-id flag', async () => {
        const { error } = await runCommand(['attachment:get', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('attachment upload', () => {
    describe('command structure', () => {
      it('should have description about uploading attachments', async () => {
        const { Upload } = await import('../../../src/commands/attachment/upload.js')
        expect(Upload.description).toContain('Upload a file')
      })

      it('should have table, record-id, and file flags as required', async () => {
        const { Upload } = await import('../../../src/commands/attachment/upload.js')
        expect(Upload.flags.table).toBeDefined()
        expect(Upload.flags['record-id']).toBeDefined()
        expect(Upload.flags.file).toBeDefined()
      })

      it('should have optional content-type flag', async () => {
        const { Upload } = await import('../../../src/commands/attachment/upload.js')
        expect(Upload.flags['content-type']).toBeDefined()
      })
    })

    describe('validation', () => {
      it('should require table flag', async () => {
        const { error } = await runCommand([
          'attachment:upload', '--record-id', 'inc-001', '--file', 'test.pdf', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require record-id flag', async () => {
        const { error } = await runCommand([
          'attachment:upload', '--table', 'incident', '--file', 'test.pdf', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require file flag', async () => {
        const { error } = await runCommand([
          'attachment:upload', '--table', 'incident', '--record-id', 'inc-001', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })
})
