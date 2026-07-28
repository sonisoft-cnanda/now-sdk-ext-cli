import { describe, it, expect } from '@jest/globals'
import { AggregateDisplayService } from '../../src/services/aggregate-display.service.js'

describe('AggregateDisplayService', () => {
  const service = new AggregateDisplayService()

  describe('formatCountResult', () => {
    describe('JSON output', () => {
      it('should return count as JSON string', () => {
        const lines = service.formatCountResult(42, 'incident', 'active=true', true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.table).toBe('incident')
        expect(parsed.query).toBe('active=true')
        expect(parsed.count).toBe(42)
      })

      it('should handle no query as empty string in JSON', () => {
        const lines = service.formatCountResult(100, 'incident', undefined, true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.query).toBe('')
        expect(parsed.count).toBe(100)
      })

      it('should handle zero count', () => {
        const lines = service.formatCountResult(0, 'incident', undefined, true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.count).toBe(0)
      })
    })

    describe('text output', () => {
      it('should display table name and count', () => {
        const lines = service.formatCountResult(42, 'incident', undefined, false)
        const output = lines.join('\n')

        expect(output).toContain('incident')
        expect(output).toContain('42')
      })

      it('should display query when provided', () => {
        const lines = service.formatCountResult(42, 'incident', 'active=true', false)
        const output = lines.join('\n')

        expect(output).toContain('active=true')
      })

      it('should not display query clause when undefined', () => {
        const lines = service.formatCountResult(42, 'incident', undefined, false)
        const output = lines.join('\n')

        expect(output).not.toContain('query:')
      })
    })
  })

  describe('formatAggregateResult', () => {
    const mockStats = {
      count: '42',
      'avg.reassignment_count': '2.5',
      'min.reassignment_count': '0',
      'max.reassignment_count': '10',
    }

    describe('JSON output', () => {
      it('should return stats as JSON string', () => {
        const lines = service.formatAggregateResult(mockStats, 'incident', true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.table).toBe('incident')
        expect(parsed.stats.count).toBe('42')
        expect(parsed.stats['avg.reassignment_count']).toBe('2.5')
      })

      it('should handle stats with only count', () => {
        const lines = service.formatAggregateResult({ count: '10' }, 'incident', true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.stats.count).toBe('10')
      })
    })

    describe('text output', () => {
      it('should display table name', () => {
        const lines = service.formatAggregateResult(mockStats, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('incident')
      })

      it('should display count', () => {
        const lines = service.formatAggregateResult(mockStats, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('Count:  42')
      })

      it('should display aggregate metrics', () => {
        const lines = service.formatAggregateResult(mockStats, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('avg.reassignment_count')
        expect(output).toContain('2.5')
        expect(output).toContain('min.reassignment_count')
        expect(output).toContain('0')
        expect(output).toContain('max.reassignment_count')
        expect(output).toContain('10')
      })

      it('should display metric header row', () => {
        const lines = service.formatAggregateResult(mockStats, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('Metric')
        expect(output).toContain('Value')
      })

      it('should handle stats without count', () => {
        const statsNoCount = { 'avg.priority': '2.3' }
        const lines = service.formatAggregateResult(statsNoCount, 'incident', false)
        const output = lines.join('\n')

        expect(output).not.toContain('Count:')
        expect(output).toContain('avg.priority')
      })
    })
  })

  describe('formatGroupedResult', () => {
    const mockGroups = [
      {
        groupby_fields: [{ field: 'priority', value: '1', display_value: 'Critical' }],
        stats: { count: '15' },
      },
      {
        groupby_fields: [{ field: 'priority', value: '2', display_value: 'High' }],
        stats: { count: '27' },
      },
    ]

    describe('JSON output', () => {
      it('should return groups as JSON string', () => {
        const lines = service.formatGroupedResult(mockGroups, 'incident', true)
        expect(lines).toHaveLength(1)

        const parsed = JSON.parse(lines[0])
        expect(parsed.table).toBe('incident')
        expect(parsed.groupCount).toBe(2)
        expect(parsed.groups).toHaveLength(2)
      })

      it('should include group data in JSON', () => {
        const lines = service.formatGroupedResult(mockGroups, 'incident', true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.groups[0].groupby_fields[0].field).toBe('priority')
        expect(parsed.groups[0].groupby_fields[0].display_value).toBe('Critical')
        expect(parsed.groups[0].stats.count).toBe('15')
      })

      it('should handle empty groups as JSON', () => {
        const lines = service.formatGroupedResult([], 'incident', true)
        const parsed = JSON.parse(lines[0])

        expect(parsed.groupCount).toBe(0)
        expect(parsed.groups).toHaveLength(0)
      })
    })

    describe('text output', () => {
      it('should display table name and group count', () => {
        const lines = service.formatGroupedResult(mockGroups, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('incident')
        expect(output).toContain('2 groups')
      })

      it('should display group labels with display values', () => {
        const lines = service.formatGroupedResult(mockGroups, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('priority=Critical')
        expect(output).toContain('priority=High')
      })

      it('should display counts per group', () => {
        const lines = service.formatGroupedResult(mockGroups, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('Count:  15')
        expect(output).toContain('Count:  27')
      })

      it('should show no results message when empty', () => {
        const lines = service.formatGroupedResult([], 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('No grouped results')
      })

      it('should handle single group pluralization', () => {
        const singleGroup = [mockGroups[0]]
        const lines = service.formatGroupedResult(singleGroup, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('1 group)')
        expect(output).not.toContain('1 groups')
      })

      it('should display multiple group-by fields', () => {
        const multiGroupBy = [{
          groupby_fields: [
            { field: 'priority', value: '1', display_value: 'Critical' },
            { field: 'state', value: '2', display_value: 'In Progress' },
          ],
          stats: { count: '5' },
        }]
        const lines = service.formatGroupedResult(multiGroupBy, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('priority=Critical, state=In Progress')
      })

      it('should fall back to value when no display_value', () => {
        const noDisplayValue = [{
          groupby_fields: [{ field: 'priority', value: '1' }],
          stats: { count: '5' },
        }]
        const lines = service.formatGroupedResult(noDisplayValue, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('priority=1')
      })

      it('should display stat keys beyond count', () => {
        const withStats = [{
          groupby_fields: [{ field: 'priority', value: '1', display_value: 'Critical' }],
          stats: { count: '5', 'avg.reassignment_count': '3.2' },
        }]
        const lines = service.formatGroupedResult(withStats, 'incident', false)
        const output = lines.join('\n')

        expect(output).toContain('avg.reassignment_count')
        expect(output).toContain('3.2')
      })
    })
  })
})
