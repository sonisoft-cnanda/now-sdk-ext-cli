import { describe, expect, it } from '@jest/globals'

import { Search } from '../../../src/commands/store/search.js'
import { Validate } from '../../../src/commands/store/validate.js'
import { formatSearchResults, formatValidationResult } from '../../../src/services/store-app-display.service.js'
import type { ApplicationDetailModel, BatchValidationResult } from '@sonisoft/now-sdk-ext-core'

describe('store command contracts', () => {
  it('exposes offset paging with a zero default', () => {
    expect(Search.flags.offset).toBeDefined()
    expect(Search.flags.offset.default).toBe(0)
  })

  it('keeps the search JSON contract as a raw core array', () => {
    const apps = [{
      latest_version: '1.0.0',
      name: 'Test App',
      scope: 'x_test',
      sys_id: 'app-001',
    }] as ApplicationDetailModel[]

    expect(JSON.parse(formatSearchResults(apps, true)[0])).toEqual(apps)
  })

  it('renders search text from the raw core array', () => {
    const apps = [{
      latest_version: '1.0.0',
      name: 'Test App',
      scope: 'x_test',
      sys_id: 'app-001',
    }] as ApplicationDetailModel[]

    const output = formatSearchResults(apps, false).join('\n')
    expect(output).toContain('Test App')
    expect(output).toContain('app-001')
  })

  it('keeps validation wired to a required batch file', () => {
    expect(Validate.flags.file.required).toBe(true)
  })

  it('renders validation text from the real core shape', () => {
    const result: BatchValidationResult = {
      alreadyValid: 1,
      applications: [{
        id: 'app-001',
        installed_version: '1.0.0',
        isInstalled: true,
        isUpdateAvailable: false,
        isVersionMatch: true,
        name: 'Test App',
        needsAction: false,
        requested_version: '1.0.0',
        validationStatus: 'valid',
      }],
      errors: 0,
      isValid: true,
      needsInstallation: 0,
      needsUpgrade: 0,
      totalApplications: 1,
    }

    expect(formatValidationResult(result, false).join('\n')).toContain('Valid:              Yes')
  })
})
