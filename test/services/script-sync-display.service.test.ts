import { describe, it, expect } from '@jest/globals'
import { ScriptSyncDisplayService } from '../../src/services/script-sync-display.service.js'

describe('ScriptSyncDisplayService', () => {
  const service = new ScriptSyncDisplayService()

  describe('formatSyncResult', () => {
    const pullResult = {
      scriptName: 'TestScript',
      scriptType: 'sys_script_include',
      filePath: '/tmp/TestScript.sys_script_include.js',
      direction: 'pull',
      success: true,
      sysId: 'script-sys-id',
      message: "Successfully pulled Script Include 'TestScript'",
      timestamp: '2025-01-01T00:00:00.000Z',
    }

    const pushResult = {
      scriptName: 'TestScript',
      scriptType: 'sys_script_include',
      filePath: '/tmp/TestScript.sys_script_include.js',
      direction: 'push',
      success: true,
      sysId: 'script-sys-id',
      message: "Successfully pushed Script Include 'TestScript'",
      timestamp: '2025-01-01T00:00:00.000Z',
    }

    describe('JSON output', () => {
      it('should return JSON string for pull result', () => {
        const lines = service.formatSyncResult(pullResult, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.scriptName).toBe('TestScript')
        expect(parsed.direction).toBe('pull')
        expect(parsed.success).toBe(true)
        expect(parsed.sysId).toBe('script-sys-id')
      })

      it('should return JSON string for push result', () => {
        const lines = service.formatSyncResult(pushResult, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.direction).toBe('push')
        expect(parsed.message).toContain('pushed')
      })
    })

    describe('text output', () => {
      it('should show pull direction indicator', () => {
        const lines = service.formatSyncResult(pullResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Pull')
        expect(output).toContain('TestScript')
      })

      it('should show push direction indicator', () => {
        const lines = service.formatSyncResult(pushResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Push')
        expect(output).toContain('TestScript')
      })

      it('should show success icon for successful result', () => {
        const lines = service.formatSyncResult(pullResult, false)
        const output = lines.join('\n')
        expect(output).toContain('\u2713')
      })

      it('should show failure icon for failed result', () => {
        const failedResult = { ...pullResult, success: false }
        const lines = service.formatSyncResult(failedResult, false)
        const output = lines.join('\n')
        expect(output).toContain('\u2717')
      })

      it('should display script type', () => {
        const lines = service.formatSyncResult(pullResult, false)
        const output = lines.join('\n')
        expect(output).toContain('sys_script_include')
      })

      it('should display file path', () => {
        const lines = service.formatSyncResult(pullResult, false)
        const output = lines.join('\n')
        expect(output).toContain('/tmp/TestScript.sys_script_include.js')
      })

      it('should display sys_id', () => {
        const lines = service.formatSyncResult(pullResult, false)
        const output = lines.join('\n')
        expect(output).toContain('script-sys-id')
      })

      it('should display message', () => {
        const lines = service.formatSyncResult(pullResult, false)
        const output = lines.join('\n')
        expect(output).toContain("Successfully pulled Script Include 'TestScript'")
      })

      it('should display timestamp', () => {
        const lines = service.formatSyncResult(pullResult, false)
        const output = lines.join('\n')
        expect(output).toContain('2025-01-01T00:00:00.000Z')
      })
    })
  })

  describe('formatSyncAllResult', () => {
    const syncAllResult = {
      directory: '/tmp/scripts',
      scriptTypes: ['sys_script_include'],
      totalFiles: 3,
      synced: 3,
      failed: 0,
      scripts: [],
      timestamp: '2025-01-01T00:00:00.000Z',
    }

    describe('JSON output', () => {
      it('should return JSON string for sync-all result', () => {
        const lines = service.formatSyncAllResult(syncAllResult, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.directory).toBe('/tmp/scripts')
        expect(parsed.totalFiles).toBe(3)
        expect(parsed.synced).toBe(3)
        expect(parsed.failed).toBe(0)
      })
    })

    describe('text output', () => {
      it('should show directory', () => {
        const lines = service.formatSyncAllResult(syncAllResult, false)
        const output = lines.join('\n')
        expect(output).toContain('/tmp/scripts')
      })

      it('should show script types', () => {
        const lines = service.formatSyncAllResult(syncAllResult, false)
        const output = lines.join('\n')
        expect(output).toContain('sys_script_include')
      })

      it('should show total files count', () => {
        const lines = service.formatSyncAllResult(syncAllResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Total Files:  3')
      })

      it('should show synced count', () => {
        const lines = service.formatSyncAllResult(syncAllResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Synced:       3')
      })

      it('should show failed count', () => {
        const lines = service.formatSyncAllResult(syncAllResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Failed:       0')
      })

      it('should show timestamp', () => {
        const lines = service.formatSyncAllResult(syncAllResult, false)
        const output = lines.join('\n')
        expect(output).toContain('2025-01-01T00:00:00.000Z')
      })

      it('should show success rate percentage', () => {
        const lines = service.formatSyncAllResult(syncAllResult, false)
        const output = lines.join('\n')
        expect(output).toContain('3/3 synced (100%)')
      })

      it('should show partial success rate', () => {
        const partialResult = { ...syncAllResult, totalFiles: 4, synced: 3, failed: 1 }
        const lines = service.formatSyncAllResult(partialResult, false)
        const output = lines.join('\n')
        expect(output).toContain('3/4 synced (75%)')
      })

      it('should handle zero total files', () => {
        const emptyResult = { ...syncAllResult, totalFiles: 0, synced: 0, failed: 0 }
        const lines = service.formatSyncAllResult(emptyResult, false)
        const output = lines.join('\n')
        expect(output).toContain('0/0 synced (0%)')
      })

      it('should list individual scripts when present', () => {
        const resultWithScripts = {
          ...syncAllResult,
          scripts: [
            { scriptName: 'Script1', success: true },
            { scriptName: 'Script2', success: false },
          ],
        }
        const lines = service.formatSyncAllResult(resultWithScripts, false)
        const output = lines.join('\n')
        expect(output).toContain('Script1')
        expect(output).toContain('Script2')
        expect(output).toContain('\u2713')
        expect(output).toContain('\u2717')
      })

      it('should not list scripts section when scripts array is empty', () => {
        const lines = service.formatSyncAllResult(syncAllResult, false)
        const output = lines.join('\n')
        expect(output).not.toContain('Scripts:')
      })
    })
  })
})
