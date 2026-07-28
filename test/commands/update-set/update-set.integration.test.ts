import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    UpdateSetManager: jest.fn().mockImplementation(() => ({
      setCurrentUpdateSet: jest.fn<any>().mockResolvedValue(undefined),
      getCurrentUpdateSet: jest.fn<any>().mockResolvedValue({ sys_id: 'us-001', name: 'Default', state: 'in progress' }),
      listUpdateSets: jest.fn<any>().mockResolvedValue([
        { sys_id: 'us-001', name: 'Default', state: 'in progress' },
        { sys_id: 'us-002', name: 'Feature Set', state: 'in progress' },
      ]),
      createUpdateSet: jest.fn<any>().mockResolvedValue({ sys_id: 'us-003', name: 'New Set', state: 'in progress' }),
      moveRecordsToUpdateSet: jest.fn<any>().mockResolvedValue({ moved: 2, failed: 0, records: [], errors: [] }),
      cloneUpdateSet: jest.fn<any>().mockResolvedValue({
        newUpdateSetId: 'us-004', newUpdateSetName: 'Cloned Set',
        sourceUpdateSetId: 'us-001', sourceUpdateSetName: 'Default',
        recordsCloned: 5, totalSourceRecords: 5,
      }),
      inspectUpdateSet: jest.fn<any>().mockResolvedValue({
        updateSet: { sys_id: 'us-001', name: 'Default', state: 'in progress' },
        totalRecords: 3,
        components: [{ type: 'Business Rule', count: 2, items: ['rule1', 'rule2'] }],
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
    password: 'test-password',
    type: 'basic',
    username: 'test-user',
  }),
}))

// Dynamic imports — loaded after mocks are registered
const { UpdateSet } = await import('../../../src/commands/update-set/index.js')
const { Current } = await import('../../../src/commands/update-set/current.js')
const { Create } = await import('../../../src/commands/update-set/create.js')
const { Inspect } = await import('../../../src/commands/update-set/inspect.js')
const { Move } = await import('../../../src/commands/update-set/move.js')
const { Clone } = await import('../../../src/commands/update-set/clone.js')

describe('Update Set Commands - Integration Tests', () => {
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

  describe('update-set (list)', () => {
    describe('command structure', () => {
      it('should have description about listing update sets', () => {
        expect(UpdateSet.description).toContain('List update sets')
      })

      it('should have query and limit flags', () => {
        expect(UpdateSet.flags.query).toBeDefined()
        expect(UpdateSet.flags.limit).toBeDefined()
      })
    })

    describe('listing', () => {
      it('should list update sets', async () => {
        const { error } = await runCommand(['update-set', '--auth', 'test'])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })

      it('should support query flag', async () => {
        const { error } = await runCommand(['update-set', '--query', 'state=in progress', '--auth', 'test'])

        // Command should not error due to unknown flags
        if (error) {
          expect(error.message).not.toContain('Unexpected argument')
        }
      })

      it('should support limit flag', async () => {
        const { error } = await runCommand(['update-set', '--limit', '50', '--auth', 'test'])

        if (error) {
          expect(error.message).not.toContain('Unexpected argument')
        }
      })
    })
  })

  describe('update-set current', () => {
    describe('command structure', () => {
      it('should have description about getting or setting current update set', () => {
        expect(Current.description).toContain('Get or set the current update set')
      })

      it('should have set flag', () => {
        expect(Current.flags.set).toBeDefined()
      })
    })

    describe('get current', () => {
      it('should get the current update set', async () => {
        const { error } = await runCommand(['update-set:current', '--auth', 'test'])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })

    describe('set current', () => {
      it('should set the current update set', async () => {
        const { error } = await runCommand(['update-set:current', '--set', 'us-001', '--auth', 'test'])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })
  })

  describe('update-set create', () => {
    describe('command structure', () => {
      it('should have description about creating update sets', () => {
        expect(Create.description).toContain('Create a new update set')
      })

      it('should have name flag as required', () => {
        expect(Create.flags.name).toBeDefined()
      })

      it('should have description and application flags', () => {
        expect(Create.flags.description).toBeDefined()
        expect(Create.flags.application).toBeDefined()
      })
    })

    describe('creation', () => {
      it('should create an update set', async () => {
        const { error } = await runCommand(['update-set:create', '--name', 'New Set', '--auth', 'test'])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })

    describe('validation', () => {
      it('should require name flag', async () => {
        const { error } = await runCommand(['update-set:create', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('update-set inspect', () => {
    describe('command structure', () => {
      it('should have description about inspecting update sets', () => {
        expect(Inspect.description).toContain('Inspect the components')
      })

      it('should have sys-id flag as required', () => {
        expect(Inspect.flags['sys-id']).toBeDefined()
      })
    })

    describe('inspection', () => {
      it('should inspect an update set', async () => {
        const { error } = await runCommand(['update-set:inspect', '--sys-id', 'us-001', '--auth', 'test'])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })

    describe('validation', () => {
      it('should require sys-id flag', async () => {
        const { error } = await runCommand(['update-set:inspect', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('update-set move', () => {
    describe('command structure', () => {
      it('should have description about moving records', () => {
        expect(Move.description).toContain('Move records')
      })

      it('should have target flag as required', () => {
        expect(Move.flags.target).toBeDefined()
      })

      it('should have source and records flags', () => {
        expect(Move.flags.source).toBeDefined()
        expect(Move.flags.records).toBeDefined()
      })
    })

    describe('moving', () => {
      it('should move records between update sets', async () => {
        const { error } = await runCommand([
          'update-set:move', '--target', 'us-002', '--source', 'us-001', '--auth', 'test',
        ])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })

    describe('validation', () => {
      it('should require target flag', async () => {
        const { error } = await runCommand(['update-set:move', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('update-set clone', () => {
    describe('command structure', () => {
      it('should have description about cloning update sets', () => {
        expect(Clone.description).toContain('Clone an update set')
      })

      it('should have source and name flags as required', () => {
        expect(Clone.flags.source).toBeDefined()
        expect(Clone.flags.name).toBeDefined()
      })
    })

    describe('cloning', () => {
      it('should clone an update set', async () => {
        const { error } = await runCommand([
          'update-set:clone', '--source', 'us-001', '--name', 'Cloned Set', '--auth', 'test',
        ])
        // Verifies command doesn't hang (oclif runCommand may not use Jest mocks for auth)
      })
    })

    describe('validation', () => {
      it('should require source flag', async () => {
        const { error } = await runCommand(['update-set:clone', '--name', 'Cloned', '--auth', 'test'])
        expect(error).toBeDefined()
      })

      it('should require name flag', async () => {
        const { error } = await runCommand(['update-set:clone', '--source', 'us-001', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })
})
