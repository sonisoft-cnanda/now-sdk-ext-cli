import { describe, it, expect } from '@jest/globals'
import { HealthDisplayService } from '../../src/services/health-display.service.js'

describe('HealthDisplayService', () => {
  const service = new HealthDisplayService()

  const fullResult = {
    timestamp: '2025-01-01T12:00:00.000Z',
    version: { version: 'Tokyo Patch 3', buildDate: '2025-01-01', buildTag: 'glide-tokyo-p3' },
    clusterNodes: [
      { sys_id: 'node-001', node_id: 'node1.service-now.com', status: 'online', sys_updated_on: '2025-01-01 12:00:00' },
      { sys_id: 'node-002', node_id: 'node2.service-now.com', status: 'offline', sys_updated_on: '2025-01-01 11:00:00' },
    ],
    stuckJobs: [],
    activeSemaphoreCount: 3,
    operationalCounts: { openIncidents: 150, openChanges: 25, openProblems: 8 },
    summary: 'Instance is healthy. No stuck jobs detected.',
  }

  describe('JSON output', () => {
    it('should return full result as JSON string', () => {
      const lines = service.formatHealthResult(fullResult, true)
      expect(lines).toHaveLength(1)

      const parsed = JSON.parse(lines[0])
      expect(parsed.timestamp).toBe('2025-01-01T12:00:00.000Z')
      expect(parsed.version.version).toBe('Tokyo Patch 3')
      expect(parsed.clusterNodes).toHaveLength(2)
      expect(parsed.stuckJobs).toHaveLength(0)
      expect(parsed.activeSemaphoreCount).toBe(3)
      expect(parsed.operationalCounts.openIncidents).toBe(150)
      expect(parsed.summary).toContain('healthy')
    })

    it('should handle partial result as JSON', () => {
      const partial = { timestamp: '2025-01-01T12:00:00.000Z', version: { version: 'Tokyo' } }
      const lines = service.formatHealthResult(partial, true)
      const parsed = JSON.parse(lines[0])

      expect(parsed.version.version).toBe('Tokyo')
      expect(parsed.clusterNodes).toBeUndefined()
    })
  })

  describe('text output', () => {
    it('should display health check header and timestamp', () => {
      const lines = service.formatHealthResult(fullResult, false)
      const output = lines.join('\n')

      expect(output).toContain('Instance Health Check')
      expect(output).toContain('2025-01-01T12:00:00.000Z')
    })

    it('should display N/A when timestamp is missing', () => {
      const noTimestamp = { ...fullResult, timestamp: undefined }
      const lines = service.formatHealthResult(noTimestamp, false)
      const output = lines.join('\n')

      expect(output).toContain('N/A')
    })

    describe('version information', () => {
      it('should display version, build date, and build tag', () => {
        const lines = service.formatHealthResult(fullResult, false)
        const output = lines.join('\n')

        expect(output).toContain('Version Information')
        expect(output).toContain('Tokyo Patch 3')
        expect(output).toContain('2025-01-01')
        expect(output).toContain('glide-tokyo-p3')
      })

      it('should omit version section when no version data', () => {
        const noVersion = { ...fullResult, version: undefined }
        const lines = service.formatHealthResult(noVersion, false)
        const output = lines.join('\n')

        expect(output).not.toContain('Version Information')
      })

      it('should handle partial version data', () => {
        const partialVersion = { ...fullResult, version: { version: 'Tokyo' } }
        const lines = service.formatHealthResult(partialVersion, false)
        const output = lines.join('\n')

        expect(output).toContain('Tokyo')
        expect(output).not.toContain('Build Date')
        expect(output).not.toContain('Build Tag')
      })
    })

    describe('cluster nodes', () => {
      it('should display cluster node count and statuses', () => {
        const lines = service.formatHealthResult(fullResult, false)
        const output = lines.join('\n')

        expect(output).toContain('Cluster Nodes (2)')
        expect(output).toContain('node1.service-now.com')
        expect(output).toContain('[online]')
        expect(output).toContain('node2.service-now.com')
        expect(output).toContain('[offline]')
      })

      it('should show check mark for online nodes and x for offline', () => {
        const lines = service.formatHealthResult(fullResult, false)
        const output = lines.join('\n')

        expect(output).toContain('\u2714')
        expect(output).toContain('\u2718')
      })

      it('should display message when no cluster nodes', () => {
        const noNodes = { ...fullResult, clusterNodes: [] }
        const lines = service.formatHealthResult(noNodes, false)
        const output = lines.join('\n')

        expect(output).toContain('Cluster Nodes (0)')
        expect(output).toContain('No cluster nodes found')
      })

      it('should omit cluster section when clusterNodes is undefined', () => {
        const noClusters = { ...fullResult, clusterNodes: undefined }
        const lines = service.formatHealthResult(noClusters, false)
        const output = lines.join('\n')

        expect(output).not.toContain('Cluster Nodes')
      })
    })

    describe('stuck jobs', () => {
      it('should show check mark when no stuck jobs', () => {
        const lines = service.formatHealthResult(fullResult, false)
        const output = lines.join('\n')

        expect(output).toContain('\u2714')
        expect(output).toContain('Stuck Jobs: 0')
      })

      it('should show warning icon when stuck jobs exist', () => {
        const withStuckJobs = {
          ...fullResult,
          stuckJobs: [
            { sys_id: 'job-001', name: 'StuckJob1', next_action: '2024-12-01 10:00:00', state: 'running' },
          ],
        }
        const lines = service.formatHealthResult(withStuckJobs, false)
        const output = lines.join('\n')

        expect(output).toContain('\u26A0')
        expect(output).toContain('Stuck Jobs: 1')
        expect(output).toContain('StuckJob1')
        expect(output).toContain('next_action: 2024-12-01 10:00:00')
        expect(output).toContain('state: running')
      })

      it('should omit stuck jobs section when null', () => {
        const noStuckJobs = { ...fullResult, stuckJobs: null }
        const lines = service.formatHealthResult(noStuckJobs, false)
        const output = lines.join('\n')

        expect(output).not.toContain('Stuck Jobs')
      })
    })

    describe('semaphores', () => {
      it('should show check mark for low semaphore count', () => {
        const lines = service.formatHealthResult(fullResult, false)
        const output = lines.join('\n')

        expect(output).toContain('Active Semaphores: 3')
      })

      it('should show warning icon for high semaphore count', () => {
        const highSemaphores = { ...fullResult, activeSemaphoreCount: 15 }
        const lines = service.formatHealthResult(highSemaphores, false)
        const output = lines.join('\n')

        expect(output).toContain('\u26A0')
        expect(output).toContain('Active Semaphores: 15')
      })

      it('should omit semaphore section when null', () => {
        const noSemaphores = { ...fullResult, activeSemaphoreCount: null }
        const lines = service.formatHealthResult(noSemaphores, false)
        const output = lines.join('\n')

        expect(output).not.toContain('Active Semaphores')
      })
    })

    describe('operational counts', () => {
      it('should display all operational counts', () => {
        const lines = service.formatHealthResult(fullResult, false)
        const output = lines.join('\n')

        expect(output).toContain('Operational Counts')
        expect(output).toContain('Open Incidents:')
        expect(output).toContain('150')
        expect(output).toContain('Open Change Requests:')
        expect(output).toContain('25')
        expect(output).toContain('Open Problems:')
        expect(output).toContain('8')
      })

      it('should omit operational counts section when undefined', () => {
        const noCounts = { ...fullResult, operationalCounts: undefined }
        const lines = service.formatHealthResult(noCounts, false)
        const output = lines.join('\n')

        expect(output).not.toContain('Operational Counts')
      })

      it('should handle partial operational counts', () => {
        const partialCounts = { ...fullResult, operationalCounts: { openIncidents: 10, openChanges: null, openProblems: undefined } }
        const lines = service.formatHealthResult(partialCounts, false)
        const output = lines.join('\n')

        expect(output).toContain('Open Incidents:')
        expect(output).toContain('10')
        expect(output).not.toContain('Open Change Requests:')
        expect(output).not.toContain('Open Problems:')
      })
    })

    describe('summary', () => {
      it('should display summary', () => {
        const lines = service.formatHealthResult(fullResult, false)
        const output = lines.join('\n')

        expect(output).toContain('Summary: Instance is healthy. No stuck jobs detected.')
      })

      it('should omit summary when not present', () => {
        const noSummary = { ...fullResult, summary: undefined }
        const lines = service.formatHealthResult(noSummary, false)
        const output = lines.join('\n')

        expect(output).not.toContain('Summary:')
      })
    })
  })
})
