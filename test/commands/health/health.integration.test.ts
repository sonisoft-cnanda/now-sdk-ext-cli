import { expect, jest, describe, it, beforeEach, afterEach } from '@jest/globals'
import { runCommand } from '@oclif/test'

// Mock external dependencies
jest.mock('@sonisoft/now-sdk-ext-core', () => {
  return {
    InstanceHealth: jest.fn().mockImplementation(() => ({
      checkHealth: jest.fn<any>().mockResolvedValue({
        timestamp: '2025-01-01T12:00:00.000Z',
        version: { version: 'Tokyo Patch 3', buildDate: '2025-01-01', buildTag: 'glide-tokyo-p3' },
        clusterNodes: [
          { sys_id: 'node-001', node_id: 'node1.service-now.com', status: 'online', sys_updated_on: '2025-01-01 12:00:00' },
        ],
        stuckJobs: [],
        activeSemaphoreCount: 3,
        operationalCounts: { openIncidents: 150, openChanges: 25, openProblems: 8 },
        summary: 'Instance is healthy. No stuck jobs detected.',
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
const { HealthCheck } = await import('../../../src/commands/health/check.js')

describe('Health Commands - Integration Tests', () => {
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

  describe('health check', () => {
    describe('command structure', () => {
      it('should have description mentioning health check', () => {
        expect(HealthCheck.description).toContain('health check')
      })

      it('should have include-version flag with default true', () => {
        expect(HealthCheck.flags['include-version']).toBeDefined()
        expect(HealthCheck.flags['include-version'].default).toBe(true)
      })

      it('should have include-cluster flag with default true', () => {
        expect(HealthCheck.flags['include-cluster']).toBeDefined()
        expect(HealthCheck.flags['include-cluster'].default).toBe(true)
      })

      it('should have include-stuck-jobs flag with default true', () => {
        expect(HealthCheck.flags['include-stuck-jobs']).toBeDefined()
        expect(HealthCheck.flags['include-stuck-jobs'].default).toBe(true)
      })

      it('should have include-semaphores flag with default true', () => {
        expect(HealthCheck.flags['include-semaphores']).toBeDefined()
        expect(HealthCheck.flags['include-semaphores'].default).toBe(true)
      })

      it('should have include-operational-counts flag with default true', () => {
        expect(HealthCheck.flags['include-operational-counts']).toBeDefined()
        expect(HealthCheck.flags['include-operational-counts'].default).toBe(true)
      })

      it('should have stuck-job-threshold flag with default 30', () => {
        expect(HealthCheck.flags['stuck-job-threshold']).toBeDefined()
        expect(HealthCheck.flags['stuck-job-threshold'].default).toBe(30)
      })

      it('should have json flag', () => {
        expect(HealthCheck.flags['json']).toBeDefined()
      })

      it('should have examples defined', () => {
        expect(HealthCheck.examples).toBeDefined()
        expect(HealthCheck.examples!.length).toBeGreaterThan(0)
      })
    })

    describe('execution', () => {
      it('should run health check without error', async () => {
        const { error } = await runCommand([
          'health:check', '--auth', 'test',
        ])

        expect(error).toBeUndefined()
      })

      it('should run health check with json flag without error', async () => {
        const { error } = await runCommand([
          'health:check', '--auth', 'test', '--json',
        ])

        expect(error).toBeUndefined()
      })

      it('should support disabling individual checks', async () => {
        const { error } = await runCommand([
          'health:check', '--auth', 'test',
          '--no-include-cluster',
          '--no-include-semaphores',
        ])

        expect(error).toBeUndefined()
      })

      it('should support custom stuck job threshold', async () => {
        const { error } = await runCommand([
          'health:check', '--auth', 'test', '--stuck-job-threshold', '60',
        ])

        expect(error).toBeUndefined()
      })
    })
  })
})
