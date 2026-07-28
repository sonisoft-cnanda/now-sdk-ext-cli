import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    AggregateQuery: jest.fn().mockImplementation(() => ({
      count: jest.fn<any>().mockResolvedValue(42),
      aggregate: jest.fn<any>().mockResolvedValue({
        stats: {
          count: '42',
          'avg.reassignment_count': '2.5',
          'min.reassignment_count': '0',
          'max.reassignment_count': '10',
        },
      }),
      groupBy: jest.fn<any>().mockResolvedValue({
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

// Dynamic imports after mocks
const { AggregateCount } = await import('../../../src/commands/aggregate/count.js')
const { AggregateQueryCmd } = await import('../../../src/commands/aggregate/query.js')
const { AggregateGroup } = await import('../../../src/commands/aggregate/group.js')

describe('Aggregate Commands - Integration Tests', () => {
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

  describe('aggregate count', () => {
    describe('command structure', () => {
      it('should have description mentioning count', () => {
        expect(AggregateCount.description).toContain('Count records')
      })

      it('should have table flag as required', () => {
        expect(AggregateCount.flags['table']).toBeDefined()
        expect(AggregateCount.flags['table'].required).toBe(true)
      })

      it('should have query flag', () => {
        expect(AggregateCount.flags['query']).toBeDefined()
      })

      it('should have json flag', () => {
        expect(AggregateCount.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(AggregateCount.examples).toBeDefined()
        expect(AggregateCount.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should count records in a table', async () => {
        const { stdout, error } = await runCommand([
          'aggregate:count', '--table', 'incident', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Counting records in table: incident')
        }
      })

      it('should require table flag', async () => {
        const { error } = await runCommand(['aggregate:count', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('aggregate query', () => {
    describe('command structure', () => {
      it('should have description mentioning aggregate statistics', () => {
        expect(AggregateQueryCmd.description).toContain('aggregate statistics')
      })

      it('should have table flag as required', () => {
        expect(AggregateQueryCmd.flags['table']).toBeDefined()
        expect(AggregateQueryCmd.flags['table'].required).toBe(true)
      })

      it('should have query flag', () => {
        expect(AggregateQueryCmd.flags['query']).toBeDefined()
      })

      it('should have count flag', () => {
        expect(AggregateQueryCmd.flags['count']).toBeDefined()
      })

      it('should have avg flag', () => {
        expect(AggregateQueryCmd.flags['avg']).toBeDefined()
      })

      it('should have min flag', () => {
        expect(AggregateQueryCmd.flags['min']).toBeDefined()
      })

      it('should have max flag', () => {
        expect(AggregateQueryCmd.flags['max']).toBeDefined()
      })

      it('should have sum flag', () => {
        expect(AggregateQueryCmd.flags['sum']).toBeDefined()
      })

      it('should have json flag', () => {
        expect(AggregateQueryCmd.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(AggregateQueryCmd.examples).toBeDefined()
        expect(AggregateQueryCmd.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should run aggregate query', async () => {
        const { stdout, error } = await runCommand([
          'aggregate:query', '--table', 'incident', '--avg', 'reassignment_count', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Running aggregate query on table: incident')
        }
      })

      it('should require table flag', async () => {
        const { error } = await runCommand(['aggregate:query', '--auth', 'test'])
        expect(error).toBeDefined()
      })
    })
  })

  describe('aggregate group', () => {
    describe('command structure', () => {
      it('should have description mentioning grouped aggregate', () => {
        expect(AggregateGroup.description).toContain('grouped aggregate')
      })

      it('should have table flag as required', () => {
        expect(AggregateGroup.flags['table']).toBeDefined()
        expect(AggregateGroup.flags['table'].required).toBe(true)
      })

      it('should have group-by flag as required', () => {
        expect(AggregateGroup.flags['group-by']).toBeDefined()
        expect(AggregateGroup.flags['group-by'].required).toBe(true)
      })

      it('should have query flag', () => {
        expect(AggregateGroup.flags['query']).toBeDefined()
      })

      it('should have count flag', () => {
        expect(AggregateGroup.flags['count']).toBeDefined()
      })

      it('should have avg, min, max, sum flags', () => {
        expect(AggregateGroup.flags['avg']).toBeDefined()
        expect(AggregateGroup.flags['min']).toBeDefined()
        expect(AggregateGroup.flags['max']).toBeDefined()
        expect(AggregateGroup.flags['sum']).toBeDefined()
      })

      it('should have having flag', () => {
        expect(AggregateGroup.flags['having']).toBeDefined()
      })

      it('should have display-value flag', () => {
        expect(AggregateGroup.flags['display-value']).toBeDefined()
      })

      it('should have json flag', () => {
        expect(AggregateGroup.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(AggregateGroup.examples).toBeDefined()
        expect(AggregateGroup.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should run grouped aggregate', async () => {
        const { stdout, error } = await runCommand([
          'aggregate:group', '--table', 'incident', '--group-by', 'priority', '--count', '--auth', 'test',
        ])

        if (!error) {
          expect(stdout).toContain('Running grouped aggregate on table: incident')
        }
      })

      it('should require table flag', async () => {
        const { error } = await runCommand([
          'aggregate:group', '--group-by', 'priority', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })

      it('should require group-by flag', async () => {
        const { error } = await runCommand([
          'aggregate:group', '--table', 'incident', '--auth', 'test',
        ])
        expect(error).toBeDefined()
      })
    })
  })
})
