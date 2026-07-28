import { describe, it, expect } from '@jest/globals'
import { ScriptParameterService } from '../../src/services/script-parameter.service.js'

describe('ScriptParameterService', () => {
  const service = new ScriptParameterService()

  describe('applyParameters', () => {
    it('should replace single parameter in script', () => {
      const result = service.applyParameters(
        'var username = "{username}";',
        '{"username":"admin"}'
      )
      expect(result).toBe('var username = "admin";')
      expect(result).not.toContain('{username}')
    })

    it('should replace multiple parameters', () => {
      const result = service.applyParameters(
        'var user = "{user}"; var env = "{env}";',
        '{"user":"admin","env":"dev"}'
      )
      expect(result).toContain('admin')
      expect(result).toContain('dev')
      expect(result).not.toContain('{user}')
      expect(result).not.toContain('{env}')
    })

    it('should replace all occurrences of same parameter', () => {
      const result = service.applyParameters('{token} {token} {token}', '{"token":"abc123"}')
      expect(result).toBe('abc123 abc123 abc123')
    })

    it('should handle numeric parameter values', () => {
      const result = service.applyParameters('var priority = {priority};', '{"priority":1}')
      expect(result).toBe('var priority = 1;')
    })

    it('should handle boolean parameter values', () => {
      const result = service.applyParameters('var active = {active};', '{"active":true}')
      expect(result).toBe('var active = true;')
    })

    it('should handle special characters in values', () => {
      const result = service.applyParameters(
        'var path = "{path}";',
        '{"path":"C:\\\\Users\\\\test"}'
      )
      expect(result).toContain('C:\\Users\\test')
    })

    it('should not replace placeholders without matching parameter', () => {
      const result = service.applyParameters(
        '{user} {notProvided} {token}',
        '{"user":"admin","token":"abc"}'
      )
      expect(result).toContain('admin')
      expect(result).toContain('abc')
      expect(result).toContain('{notProvided}')
    })

    it('should handle empty parameter object', () => {
      const result = service.applyParameters('var x = "{value}";', '{}')
      expect(result).toBe('var x = "{value}";')
    })

    it('should handle script with no placeholders', () => {
      const result = service.applyParameters('var x = 1;', '{"key":"value"}')
      expect(result).toBe('var x = 1;')
    })

    it('should throw for invalid JSON', () => {
      expect(() => service.applyParameters('var x = 1;', '{invalid json'))
        .toThrow('Invalid JSON in --params')
    })

    it('should throw for array JSON (not an object)', () => {
      expect(() => service.applyParameters('var x = 1;', '["not","an","object"]'))
        .toThrow('Parameters must be a valid JSON object')
    })

    it('should throw for string primitive JSON', () => {
      expect(() => service.applyParameters('var x = 1;', '"just a string"'))
        .toThrow('Parameters must be a valid JSON object')
    })

    it('should throw for number primitive JSON', () => {
      expect(() => service.applyParameters('var x = 1;', '42'))
        .toThrow('Parameters must be a valid JSON object')
    })

    it('should throw for null JSON', () => {
      expect(() => service.applyParameters('var x = 1;', 'null'))
        .toThrow('Parameters must be a valid JSON object')
    })
  })

  describe('complex scenarios', () => {
    it('should handle parameters in SQL-like queries', () => {
      const script = "var gr = new GlideRecord('{table}');\ngr.addQuery('name', '{name}');"
      const result = service.applyParameters(script, '{"table":"incident","name":"Test Incident"}')
      expect(result).toContain("'incident'")
      expect(result).toContain("'Test Incident'")
    })

    it('should handle parameters in URL strings', () => {
      const script = 'var url = "https://{host}/api/{version}/endpoint";'
      const result = service.applyParameters(script, '{"host":"instance.service-now.com","version":"v2"}')
      expect(result).toContain('instance.service-now.com')
      expect(result).toContain('v2')
    })

    it('should handle nested JSON string values', () => {
      const script = 'var config = "{config}";'
      const result = service.applyParameters(script, '{"config":"{\\"key\\":\\"value\\"}"}')
      expect(result).toContain('{"key":"value"}')
    })

    it('should handle parameter names with underscores', () => {
      const result = service.applyParameters('var x = "{my_param}";', '{"my_param":"value"}')
      expect(result).toBe('var x = "value";')
    })

    it('should handle empty string parameter values', () => {
      const result = service.applyParameters('var x = "{value}";', '{"value":""}')
      expect(result).toBe('var x = "";')
    })

    it('should handle parameter with value containing braces', () => {
      const result = service.applyParameters('var x = "{value}";', '{"value":"{nested}"}')
      expect(result).toBe('var x = "{nested}";')
    })

    it('should be case-sensitive with parameter names', () => {
      const result = service.applyParameters('{Name} {name}', '{"Name":"Upper","name":"lower"}')
      expect(result).toBe('Upper lower')
    })
  })
})
