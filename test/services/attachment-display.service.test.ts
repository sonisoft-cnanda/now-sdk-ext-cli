import { describe, it, expect } from '@jest/globals'
import { AttachmentDisplayService } from '../../src/services/attachment-display.service.js'

describe('AttachmentDisplayService', () => {
  const service = new AttachmentDisplayService()

  describe('formatUploadResult', () => {
    const mockResult = {
      sys_id: 'att-001',
      file_name: 'test.pdf',
      table_name: 'incident',
      table_sys_id: 'inc-001',
      content_type: 'application/pdf',
      size_bytes: '1024',
    }

    describe('JSON output', () => {
      it('should return result as JSON string', () => {
        const lines = service.formatUploadResult(mockResult, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.sys_id).toBe('att-001')
        expect(parsed.file_name).toBe('test.pdf')
        expect(parsed.table_name).toBe('incident')
        expect(parsed.table_sys_id).toBe('inc-001')
        expect(parsed.content_type).toBe('application/pdf')
        expect(parsed.size_bytes).toBe('1024')
      })
    })

    describe('text output', () => {
      it('should display upload success header', () => {
        const lines = service.formatUploadResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Attachment Uploaded')
      })

      it('should display file details', () => {
        const lines = service.formatUploadResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('test.pdf')
        expect(output).toContain('att-001')
        expect(output).toContain('incident')
        expect(output).toContain('inc-001')
        expect(output).toContain('application/pdf')
        expect(output).toContain('1024')
      })

      it('should display success message', () => {
        const lines = service.formatUploadResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Upload completed successfully')
      })
    })
  })

  describe('formatAttachmentList', () => {
    const mockAttachments = [
      { sys_id: 'att-001', file_name: 'test.pdf', content_type: 'application/pdf', size_bytes: '1024' },
      { sys_id: 'att-002', file_name: 'image.png', content_type: 'image/png', size_bytes: '2048' },
    ]

    describe('JSON output', () => {
      it('should return attachments as JSON with total', () => {
        const lines = service.formatAttachmentList(mockAttachments, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.total).toBe(2)
        expect(parsed.attachments).toHaveLength(2)
        expect(parsed.attachments[0].file_name).toBe('test.pdf')
        expect(parsed.attachments[1].file_name).toBe('image.png')
      })

      it('should handle empty list as JSON', () => {
        const lines = service.formatAttachmentList([], true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.total).toBe(0)
        expect(parsed.attachments).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should show attachment count', () => {
        const lines = service.formatAttachmentList(mockAttachments, false)
        const output = lines.join('\n')
        expect(output).toContain('Found 2 attachment(s)')
      })

      it('should display all attachment names', () => {
        const lines = service.formatAttachmentList(mockAttachments, false)
        const output = lines.join('\n')
        expect(output).toContain('test.pdf')
        expect(output).toContain('image.png')
      })

      it('should display attachment details', () => {
        const lines = service.formatAttachmentList(mockAttachments, false)
        const output = lines.join('\n')
        expect(output).toContain('att-001')
        expect(output).toContain('application/pdf')
        expect(output).toContain('1024')
      })

      it('should show no-attachments message when list is empty', () => {
        const lines = service.formatAttachmentList([], false)
        const output = lines.join('\n')
        expect(output).toContain('No attachments found')
      })

      it('should show total count at bottom', () => {
        const lines = service.formatAttachmentList(mockAttachments, false)
        const output = lines.join('\n')
        expect(output).toContain('Total: 2 attachment(s)')
      })
    })
  })

  describe('formatAttachmentDetail', () => {
    const mockAttachment = {
      sys_id: 'att-001',
      file_name: 'test.pdf',
      content_type: 'application/pdf',
      size_bytes: '1024',
      table_name: 'incident',
      table_sys_id: 'inc-001',
    }

    describe('JSON output', () => {
      it('should return attachment as JSON string', () => {
        const lines = service.formatAttachmentDetail(mockAttachment, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.sys_id).toBe('att-001')
        expect(parsed.file_name).toBe('test.pdf')
        expect(parsed.content_type).toBe('application/pdf')
        expect(parsed.size_bytes).toBe('1024')
        expect(parsed.table_name).toBe('incident')
        expect(parsed.table_sys_id).toBe('inc-001')
      })
    })

    describe('text output', () => {
      it('should display header', () => {
        const lines = service.formatAttachmentDetail(mockAttachment, false)
        const output = lines.join('\n')
        expect(output).toContain('Attachment Details')
      })

      it('should display all fields', () => {
        const lines = service.formatAttachmentDetail(mockAttachment, false)
        const output = lines.join('\n')
        expect(output).toContain('att-001')
        expect(output).toContain('test.pdf')
        expect(output).toContain('application/pdf')
        expect(output).toContain('1024')
        expect(output).toContain('incident')
        expect(output).toContain('inc-001')
      })

      it('should handle attachment with missing optional fields', () => {
        const partial = { sys_id: 'att-002', file_name: 'doc.txt' }
        const lines = service.formatAttachmentDetail(partial, false)
        const output = lines.join('\n')
        expect(output).toContain('att-002')
        expect(output).toContain('doc.txt')
        expect(output).not.toContain('Table:')
      })
    })
  })
})
