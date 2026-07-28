import { describe, it, expect } from '@jest/globals'
import { AppDisplayService, AppInfo } from '../../src/services/app-display.service.js'

function createMockApp(overrides: Partial<AppInfo> = {}): AppInfo {
  return {
    can_install_or_upgrade: true,
    dependencies: null,
    isInstalled: false,
    latest_version: '2.0.0',
    name: 'Test App',
    scope: 'x_test_app',
    short_description: 'A test application',
    sys_id: 'app-001',
    vendor: 'Test Vendor',
    version: null,
    versions: [
      { version: '1.0.0', publish_date_display: '2025-01-01' },
      { version: '2.0.0', publish_date_display: '2025-06-01' },
    ],
    ...overrides,
  }
}

describe('AppDisplayService', () => {
  const service = new AppDisplayService()

  describe('filterApps', () => {
    const apps: AppInfo[] = [
      createMockApp({ name: 'Installed App', sys_id: 'a1', isInstalled: true, version: '1.0.0', can_install_or_upgrade: true }),
      createMockApp({ name: 'Installable App', sys_id: 'a2', isInstalled: false, can_install_or_upgrade: true }),
      createMockApp({ name: 'Not Available App', sys_id: 'a3', isInstalled: false, can_install_or_upgrade: false }),
    ]

    it('should return all apps when no filter is specified', () => {
      const result = service.filterApps(apps, {})
      expect(result).toHaveLength(3)
    })

    it('should filter installed apps', () => {
      const result = service.filterApps(apps, { installed: true })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Installed App')
    })

    it('should filter installable apps (not installed but can install)', () => {
      const result = service.filterApps(apps, { installable: true })
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Installable App')
    })

    it('should return empty array when no apps match installed filter', () => {
      const noInstalledApps = [
        createMockApp({ isInstalled: false }),
      ]
      const result = service.filterApps(noInstalledApps, { installed: true })
      expect(result).toHaveLength(0)
    })

    it('should return empty array when no apps match installable filter', () => {
      const allInstalledApps = [
        createMockApp({ isInstalled: true, version: '1.0.0' }),
      ]
      const result = service.filterApps(allInstalledApps, { installable: true })
      expect(result).toHaveLength(0)
    })
  })

  describe('formatAppList - JSON output', () => {
    it('should format apps as JSON', () => {
      const apps = [createMockApp()]
      const lines = service.formatAppList(apps, true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed.total).toBe(1)
      expect(parsed.applications).toHaveLength(1)
      expect(parsed.applications[0].name).toBe('Test App')
      expect(parsed.applications[0].scope).toBe('x_test_app')
      expect(parsed.applications[0].sys_id).toBe('app-001')
    })

    it('should include processing time in JSON output', () => {
      const apps = [createMockApp()]
      const lines = service.formatAppList(apps, true, 150)
      const parsed = JSON.parse(lines[0])
      expect(parsed.processingTime).toBe(150)
    })

    it('should include available_versions count in JSON', () => {
      const apps = [createMockApp()]
      const lines = service.formatAppList(apps, true)
      const parsed = JSON.parse(lines[0])
      expect(parsed.applications[0].available_versions).toBe(2)
    })

    it('should handle empty app list as JSON', () => {
      const lines = service.formatAppList([], true)
      const parsed = JSON.parse(lines[0])
      expect(parsed.total).toBe(0)
      expect(parsed.applications).toHaveLength(0)
    })
  })

  describe('formatAppList - text output', () => {
    it('should show app count', () => {
      const apps = [createMockApp(), createMockApp({ name: 'App 2', sys_id: 'a2' })]
      const lines = service.formatAppList(apps, false)
      const output = lines.join('\n')
      expect(output).toContain('Found 2 application(s)')
    })

    it('should show processing time when provided', () => {
      const apps = [createMockApp()]
      const lines = service.formatAppList(apps, false, 200)
      const output = lines.join('\n')
      expect(output).toContain('200ms')
    })

    it('should show no-apps message when list is empty', () => {
      const lines = service.formatAppList([], false)
      const output = lines.join('\n')
      expect(output).toContain('No applications found')
    })

    it('should display app details', () => {
      const apps = [createMockApp({
        name: 'My Application',
        scope: 'x_my_app',
        sys_id: 'sys123',
        vendor: 'Acme Corp',
        latest_version: '3.0.0',
        isInstalled: false,
        can_install_or_upgrade: true,
        short_description: 'Does something useful',
      })]
      const lines = service.formatAppList(apps, false)
      const output = lines.join('\n')

      expect(output).toContain('My Application')
      expect(output).toContain('x_my_app')
      expect(output).toContain('sys123')
      expect(output).toContain('Acme Corp')
      expect(output).toContain('3.0.0')
      expect(output).toContain('Does something useful')
    })

    it('should show installed status with version', () => {
      const apps = [createMockApp({ isInstalled: true, version: '1.5.0' })]
      const lines = service.formatAppList(apps, false)
      const output = lines.join('\n')
      expect(output).toContain('Yes (v1.5.0)')
    })

    it('should show not-installed status', () => {
      const apps = [createMockApp({ isInstalled: false })]
      const lines = service.formatAppList(apps, false)
      const output = lines.join('\n')
      expect(output).toContain('Installed:       No')
    })

    it('should show dependencies when present', () => {
      const apps = [createMockApp({ dependencies: 'x_other_app >= 1.0.0' })]
      const lines = service.formatAppList(apps, false)
      const output = lines.join('\n')
      expect(output).toContain('x_other_app >= 1.0.0')
    })

    it('should show recent versions', () => {
      const apps = [createMockApp({
        versions: [
          { version: '1.0.0', publish_date_display: '2025-01-01' },
          { version: '1.5.0', publish_date_display: '2025-03-01' },
          { version: '2.0.0', publish_date_display: '2025-06-01' },
        ],
      })]
      const lines = service.formatAppList(apps, false)
      const output = lines.join('\n')
      expect(output).toContain('Recent Versions:')
      expect(output).toContain('v2.0.0')
    })

    it('should show summary counts', () => {
      const apps = [
        createMockApp({ isInstalled: true, version: '1.0.0', can_install_or_upgrade: true }),
        createMockApp({ isInstalled: false, can_install_or_upgrade: true, sys_id: 'a2' }),
        createMockApp({ isInstalled: false, can_install_or_upgrade: false, sys_id: 'a3' }),
      ]
      const lines = service.formatAppList(apps, false)
      const output = lines.join('\n')
      expect(output).toContain('Installed:   1')
      expect(output).toContain('Installable: 1')
      expect(output).toContain('Other:       1')
    })
  })

  describe('formatInstallResult', () => {
    it('should format successful installation', () => {
      const lines = service.formatInstallResult(
        'My App', 'x_my_app', '2.0.0', true, 'Installed'
      )
      const output = lines.join('\n')

      expect(output).toContain('✓ Installation completed successfully!')
      expect(output).toContain('My App')
      expect(output).toContain('x_my_app')
      expect(output).toContain('2.0.0')
      expect(output).toContain('Installed')
    })

    it('should format failed installation', () => {
      const lines = service.formatInstallResult(
        'My App', 'x_my_app', '2.0.0', false, 'Failed', 'Dependency not met'
      )
      const output = lines.join('\n')

      expect(output).toContain('✗ Installation failed')
      expect(output).toContain('Dependency not met')
    })

    it('should show status label as error when no error message provided', () => {
      const lines = service.formatInstallResult(
        'My App', 'x_my_app', '2.0.0', false, 'Installation Error'
      )
      const output = lines.join('\n')

      expect(output).toContain('Installation Error')
    })
  })
})
