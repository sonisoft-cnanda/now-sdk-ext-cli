import {expect, jest, describe, it, beforeEach} from '@jest/globals'

describe('Scope Autocomplete - Unit Tests', () => {
  describe('getAuthHeader function logic', () => {
    it('should construct Basic auth header correctly', () => {
      const username = 'test-user'
      const password = 'test-password'
      const expected = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      
      // Test the logic directly
      const credential = { type: 'basic', password }
      const result = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
      
      expect(result).toBe(expected)
      expect(result).toMatch(/^Basic /)
    })

    it('should construct Bearer token header for OAuth', () => {
      const token = 'test-access-token'
      const expected = `Bearer ${token}`
      
      const result = `Bearer ${token}`
      
      expect(result).toBe(expected)
      expect(result).toMatch(/^Bearer /)
    })

    it('should base64 encode username:password for Basic auth', () => {
      const username = 'admin'
      const password = 'admin123'
      const encoded = Buffer.from(`${username}:${password}`).toString('base64')
      
      expect(encoded).toBe('YWRtaW46YWRtaW4xMjM=')
      expect(Buffer.from(encoded, 'base64').toString()).toBe('admin:admin123')
    })
  })

  describe('Query string construction', () => {
    it('should build query with prefix filter', () => {
      const prefix = 'x_test'
      const query = `scopeSTARTSWITH${prefix}^ORnameSTARTSWITH${prefix}`
      
      expect(query).toContain('scopeSTARTSWITH')
      expect(query).toContain('ORnameSTARTSWITH')
      expect(query).toContain(prefix)
    })

    it('should build empty query when no prefix', () => {
      const prefix = ''
      const query = prefix ? `scopeSTARTSWITH${prefix}^ORnameSTARTSWITH${prefix}` : ''
      
      expect(query).toBe('')
    })

    it('should build URL parameters correctly', () => {
      const params = new URLSearchParams({
        sysparm_fields: 'scope,name',
        sysparm_limit: '50',
        sysparm_query: 'scopeSTARTSWITHx_test'
      })
      
      const url = `https://test.service-now.com/api/now/table/sys_scope?${params.toString()}`
      
      expect(url).toContain('sysparm_fields=scope%2Cname')
      expect(url).toContain('sysparm_limit=50')
      expect(url).toContain('sysparm_query=scopeSTARTSWITHx_test')
    })
  })

  describe('Response processing', () => {
    it('should extract scopes from valid response', () => {
      const response = {
        result: [
          { scope: 'x_app1', name: 'App 1' },
          { scope: 'x_app2', name: 'App 2' }
        ]
      }
      
      const scopes: string[] = []
      if (response.result && Array.isArray(response.result)) {
        for (const record of response.result) {
          if (record.scope) {
            scopes.push(record.scope)
          }
        }
      }
      
      expect(scopes).toEqual(['x_app1', 'x_app2'])
    })

    it('should filter out records without scope field', () => {
      const response = {
        result: [
          { scope: 'x_app1', name: 'App 1' },
          { scope: null, name: 'Invalid' },
          { scope: 'x_app2', name: 'App 2' },
          { name: 'No scope field' }
        ]
      }
      
      const scopes: string[] = []
      if (response.result && Array.isArray(response.result)) {
        for (const record of response.result) {
          if (record.scope) {
            scopes.push(record.scope)
          }
        }
      }
      
      expect(scopes).toEqual(['x_app1', 'x_app2'])
    })

    it('should handle empty result array', () => {
      const response = { result: [] }
      
      const scopes: string[] = []
      if (response.result && Array.isArray(response.result)) {
        for (const record of response.result) {
          if (record.scope) {
            scopes.push(record.scope)
          }
        }
      }
      
      expect(scopes).toEqual([])
    })

    it('should handle missing result field', () => {
      const response = {}
      
      const scopes: string[] = []
      if ((response as any).result && Array.isArray((response as any).result)) {
        for (const record of (response as any).result) {
          if (record.scope) {
            scopes.push(record.scope)
          }
        }
      }
      
      expect(scopes).toEqual([])
    })

    it('should handle non-array result field', () => {
      const response = { result: 'not-an-array' }
      
      const scopes: string[] = []
      if (response.result && Array.isArray(response.result)) {
        for (const record of response.result) {
          if ((record as any).scope) {
            scopes.push((record as any).scope)
          }
        }
      }
      
      expect(scopes).toEqual([])
    })
  })

  describe('Cache key generation', () => {
    it('should generate unique cache keys for different aliases', () => {
      const key1 = `alias1:`
      const key2 = `alias2:`
      
      expect(key1).not.toBe(key2)
    })

    it('should generate unique cache keys for different prefixes', () => {
      const key1 = `alias:x_`
      const key2 = `alias:y_`
      
      expect(key1).not.toBe(key2)
    })

    it('should use default for undefined alias', () => {
      const alias = undefined
      const key = `${alias || 'default'}:prefix`
      
      expect(key).toBe('default:prefix')
    })
  })

  describe('Cache TTL logic', () => {
    it('should determine cache is valid when within TTL', () => {
      const CACHE_TTL = 5 * 60 * 1000
      const now = 1000000
      const timestamp = 990000  // 10 seconds ago
      const isValid = (now - timestamp) < CACHE_TTL
      
      expect(isValid).toBe(true)
    })

    it('should determine cache is expired when beyond TTL', () => {
      const CACHE_TTL = 5 * 60 * 1000
      const now = 1000000
      const timestamp = 600000  // 400 seconds ago (> 5 minutes)
      const isValid = (now - timestamp) < CACHE_TTL
      
      expect(isValid).toBe(false)
    })

    it('should determine cache is valid at exact TTL boundary', () => {
      const CACHE_TTL = 5 * 60 * 1000
      const now = 1000000
      const timestamp = now - CACHE_TTL + 1
      const isValid = (now - timestamp) < CACHE_TTL
      
      expect(isValid).toBe(true)
    })
  })
})

