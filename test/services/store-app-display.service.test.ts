import { describe, expect, it } from '@jest/globals'
import type { ApplicationDetailModel, BatchValidationResult } from '@sonisoft/now-sdk-ext-core'

import { formatInstallResult, formatSearchResults, formatValidationResult } from '../../src/services/store-app-display.service.js'

function app(overrides: Partial<ApplicationDetailModel> & { update_available?: string } = {}): ApplicationDetailModel {
  return {
    indicators: [],
    latest_version: '1.3.0',
    name: 'Test App',
    scope: 'x_test',
    short_description: 'A captured store application',
    sys_id: 'app-001',
    vendor: 'ServiceNow',
    version: '',
    ...overrides,
  } as ApplicationDetailModel
}

function validation(overrides: Partial<BatchValidationResult> = {}): BatchValidationResult {
  return {
    alreadyValid: 1,
    applications: [{
      id: 'app-001',
      installed_version: '1.3.0',
      isInstalled: true,
      isUpdateAvailable: false,
      isVersionMatch: true,
      name: 'Test App',
      needsAction: false,
      requested_version: '1.3.0',
      validationStatus: 'valid',
    }],
    errors: 0,
    isValid: true,
    needsInstallation: 0,
    needsUpgrade: 0,
    totalApplications: 1,
    ...overrides,
  }
}

describe('store-app-display.service', () => {
  describe('formatSearchResults', () => {
    it('preserves the raw array for JSON output', () => {
      const apps: ApplicationDetailModel[] = [app()]
      expect(JSON.parse(formatSearchResults(apps, true)[0])).toEqual(apps)
    })

    it('renders every application from the core array', () => {
      const output = formatSearchResults([
        app(),
        app({ name: 'Second App', scope: 'x_second', sys_id: 'app-002' }),
      ], false).join('\n')

      expect(output).toContain('Showing 2 application(s)')
      expect(output).toContain('Test App')
      expect(output).toContain('x_test')
      expect(output).toContain('app-001')
      expect(output).toContain('Second App')
      expect(output).toContain('x_second')
      expect(output).toContain('app-002')
    })

    it('renders the latest catalog version when no version is installed', () => {
      const output = formatSearchResults([app({ latest_version: '1.3.0', version: null as unknown as string })], false).join('\n')
      expect(output).toContain('Version:     1.3.0')
    })

    it('renders the installed-to-latest version delta for updates', () => {
      const output = formatSearchResults([app({
        latest_version: '29.2.6',
        update_available: '1',
        version: '29.2.1',
      })], false).join('\n')
      expect(output).toContain('29.2.1 → 29.2.6')
    })

    it('renders messages from string-encoded indicators', () => {
      const indicators = JSON.stringify([{ message: 'Unavailable for Instance' }]) as unknown as string[]
      const output = formatSearchResults([app({ indicators })], false).join('\n')
      expect(output).toContain('Indicator:   Unavailable for Instance')
    })

    it('keeps rendering when indicators are malformed', () => {
      const indicators = 'not-json' as unknown as string[]
      const output = formatSearchResults([app({ indicators })], false).join('\n')
      expect(output).toContain('Test App')
      expect(output).not.toContain('Indicator:')
    })

    it('distinguishes an empty match from a failed request', () => {
      const output = formatSearchResults([], false).join('\n')
      expect(output).toContain('No applications matched the search criteria')
      expect(output).not.toContain('No results returned')
    })

    it('notes when the requested page may be truncated', () => {
      const output = formatSearchResults([app()], false, 1).join('\n')
      expect(output).toContain('--limit or --offset')
    })
  })

  describe('formatInstallResult', () => {
    it('returns JSON output', () => {
      const result = { percent_complete: 100, success: true }
      expect(JSON.parse(formatInstallResult(result, true)[0])).toEqual(result)
    })

    it('renders final operation details', () => {
      const output = formatInstallResult({
        error: 'Dependency not met',
        percent_complete: 50,
        status_label: 'Failed',
        success: false,
      }, false).join('\n')
      expect(output).toContain('Success:         false')
      expect(output).toContain('Error:           Dependency not met')
    })

    it('renders a progress link', () => {
      const output = formatInstallResult({ links: { progress: { id: 'prog-001', url: '/progress' } } }, false).join('\n')
      expect(output).toContain('Progress ID:     prog-001')
      expect(output).toContain('Progress URL:    /progress')
    })

    it('handles a missing result', () => {
      expect(formatInstallResult(null, false).join('\n')).toContain('No result returned')
    })
  })

  describe('formatValidationResult', () => {
    it('preserves the core result for JSON output', () => {
      const result = validation()
      expect(JSON.parse(formatValidationResult(result, true)[0])).toEqual(result)
    })

    it('renders a valid result from isValid and its real counts', () => {
      const output = formatValidationResult(validation(), false).join('\n')
      expect(output).toContain('Valid:              Yes')
      expect(output).toContain('Already valid:      1')
      expect(output).toContain('Validation passed successfully')
    })

    it('renders application statuses and errors', () => {
      const result = validation({
        alreadyValid: 0,
        applications: [{
          error: 'Application was not found',
          id: 'missing-app',
          isInstalled: false,
          isUpdateAvailable: false,
          isVersionMatch: false,
          name: 'Missing App',
          needsAction: true,
          requested_version: '2.0.0',
          validationStatus: 'error',
        }],
        errors: 1,
        isValid: false,
      })
      const output = formatValidationResult(result, false).join('\n')
      expect(output).toContain('Missing App (error)')
      expect(output).toContain('Error: Application was not found')
      expect(output).toContain('Validation failed')
    })
  })
})
