import { describe, it, expect } from '@jest/globals'
import { ScopeDisplayService } from '../../src/services/scope-display.service.js'

describe('ScopeDisplayService', () => {
  const service = new ScopeDisplayService()

  describe('formatCurrentApp', () => {
    const mockApp = {
      sys_id: 'global',
      name: 'Global',
      scope: 'global',
    }

    describe('JSON output', () => {
      it('should return app as JSON string', () => {
        const lines = service.formatCurrentApp(mockApp, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.sys_id).toBe('global')
        expect(parsed.name).toBe('Global')
        expect(parsed.scope).toBe('global')
      })

      it('should handle app with extra fields in JSON', () => {
        const extendedApp = { ...mockApp, version: '1.0.0' }
        const lines = service.formatCurrentApp(extendedApp, true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.version).toBe('1.0.0')
      })
    })

    describe('text output', () => {
      it('should display app name', () => {
        const lines = service.formatCurrentApp(mockApp, false)
        const output = lines.join('\n')
        expect(output).toContain('Global')
      })

      it('should display app scope', () => {
        const lines = service.formatCurrentApp(mockApp, false)
        const output = lines.join('\n')
        expect(output).toContain('global')
      })

      it('should display app sys_id', () => {
        const lines = service.formatCurrentApp(mockApp, false)
        const output = lines.join('\n')
        expect(output).toContain('global')
      })

      it('should display header', () => {
        const lines = service.formatCurrentApp(mockApp, false)
        const output = lines.join('\n')
        expect(output).toContain('Current Application Scope')
      })
    })
  })

  describe('formatAppList', () => {
    const mockApps = [
      { sys_id: 'global', name: 'Global', scope: 'global' },
      { sys_id: 'app-001', name: 'Test App', scope: 'x_test_app' },
    ]

    describe('JSON output', () => {
      it('should return apps as JSON with total', () => {
        const lines = service.formatAppList(mockApps, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.total).toBe(2)
        expect(parsed.applications).toHaveLength(2)
        expect(parsed.applications[0].name).toBe('Global')
        expect(parsed.applications[1].name).toBe('Test App')
      })

      it('should handle empty list as JSON', () => {
        const lines = service.formatAppList([], true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.total).toBe(0)
        expect(parsed.applications).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should show app count', () => {
        const lines = service.formatAppList(mockApps, false)
        const output = lines.join('\n')
        expect(output).toContain('Found 2 application(s)')
      })

      it('should display all app names', () => {
        const lines = service.formatAppList(mockApps, false)
        const output = lines.join('\n')
        expect(output).toContain('Global')
        expect(output).toContain('Test App')
      })

      it('should display scope and sys_id', () => {
        const lines = service.formatAppList(mockApps, false)
        const output = lines.join('\n')
        expect(output).toContain('x_test_app')
        expect(output).toContain('app-001')
      })

      it('should show no-apps message when list is empty', () => {
        const lines = service.formatAppList([], false)
        const output = lines.join('\n')
        expect(output).toContain('No applications found')
      })

      it('should show total count at bottom', () => {
        const lines = service.formatAppList(mockApps, false)
        const output = lines.join('\n')
        expect(output).toContain('Total: 2 application(s)')
      })
    })
  })

  describe('formatSetResult', () => {
    const mockResult = {
      success: true,
      application: 'Test App',
      scope: 'x_test_app',
      sysId: 'app-001',
      verified: true,
      warnings: [],
    }

    describe('JSON output', () => {
      it('should return result as JSON string', () => {
        const lines = service.formatSetResult(mockResult, true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.success).toBe(true)
        expect(parsed.application).toBe('Test App')
        expect(parsed.scope).toBe('x_test_app')
        expect(parsed.sysId).toBe('app-001')
        expect(parsed.verified).toBe(true)
      })

      it('should include warnings in JSON when present', () => {
        const resultWithWarnings = { ...mockResult, warnings: ['Deprecation notice'] }
        const lines = service.formatSetResult(resultWithWarnings, true)
        const parsed = JSON.parse(lines[0])
        expect(parsed.warnings).toHaveLength(1)
        expect(parsed.warnings[0]).toBe('Deprecation notice')
      })
    })

    describe('text output', () => {
      it('should display success message', () => {
        const lines = service.formatSetResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Application Scope Updated')
        expect(output).toContain('Scope change completed successfully')
      })

      it('should display application details', () => {
        const lines = service.formatSetResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Test App')
        expect(output).toContain('x_test_app')
        expect(output).toContain('app-001')
        expect(output).toContain('true')
      })

      it('should display warnings when present', () => {
        const resultWithWarnings = { ...mockResult, warnings: ['Plugin required'] }
        const lines = service.formatSetResult(resultWithWarnings, false)
        const output = lines.join('\n')
        expect(output).toContain('Warnings')
        expect(output).toContain('Plugin required')
      })

      it('should not display warnings section when empty', () => {
        const lines = service.formatSetResult(mockResult, false)
        const output = lines.join('\n')
        expect(output).not.toContain('Warnings')
      })

      it('should display failure message when not successful', () => {
        const failResult = { success: false, error: 'Application not found' }
        const lines = service.formatSetResult(failResult, false)
        const output = lines.join('\n')
        expect(output).toContain('Failed to set application scope')
        expect(output).toContain('Application not found')
      })
    })
  })
})
