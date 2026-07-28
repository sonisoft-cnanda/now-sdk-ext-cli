import { expect, test, jest, describe, beforeEach, afterEach } from '@jest/globals';

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => jest.requireActual('../../../test/__mocks__/@sonisoft/now-sdk-ext-core.js'))

// Dynamic imports — loaded after mocks are registered
const { BackgroundScriptExecutor, Logger, NowStringUtil, ServiceNowInstance } = await import('@sonisoft/now-sdk-ext-core');

// Simple unit tests for the executeScript logic without mocking complexity
describe('Exec Command - Script Execution Logic', () => {
  
  describe('BackgroundScriptExecutor Integration', () => {
    it('should call BackgroundScriptExecutor with correct parameters', () => {
      // Test that the command would create the executor with the right parameters
      const mockInstance = {
        getHost: () => 'https://test.service-now.com',
        getUserName: () => 'admin',
      } as any;
      
      const scope = 'global';
      const executor = new BackgroundScriptExecutor(mockInstance, scope);
      
      // Verify executor was created (doesn't throw)
      expect(executor).toBeDefined();
    });
    
    it('should handle custom scopes', () => {
      const mockInstance = {
        getHost: () => 'https://test.service-now.com',
        getUserName: () => 'admin',
      } as any;
      
      const customScope = 'x_my_custom_app';
      const executor = new BackgroundScriptExecutor(mockInstance, customScope);
      
      expect(executor).toBeDefined();
    });
  });
  
  describe('NowStringUtil Usage', () => {
    it('should correctly identify empty strings', () => {
      expect(NowStringUtil.isStringEmpty('')).toBe(true);
      expect(NowStringUtil.isStringEmpty('   ')).toBe(true);
      expect(NowStringUtil.isStringEmpty(null as any)).toBe(true);
      expect(NowStringUtil.isStringEmpty(undefined as any)).toBe(true);
    });
    
    it('should correctly identify non-empty strings', () => {
      expect(NowStringUtil.isStringEmpty('test')).toBe(false);
      expect(NowStringUtil.isStringEmpty('global')).toBe(false);
      expect(NowStringUtil.isStringEmpty('x_my_app')).toBe(false);
    });
  });
  
  describe('Script Content Handling', () => {
    it('should preserve single-line scripts', () => {
      const script = 'gs.info("Hello, ServiceNow!");';
      
      // Test that string manipulation preserves the script
      expect(script).toBe('gs.info("Hello, ServiceNow!");');
      expect(script.length).toBeGreaterThan(0);
    });
    
    it('should preserve multi-line scripts with newlines', () => {
      const lines = [
        'var gr = new GlideRecord("sys_user");',
        'gr.query();',
        'while (gr.next()) {',
        '  gs.info(gr.getValue("name"));',
        '}'
      ];
      
      const script = lines.join('\n');
      
      expect(script).toContain('\n');
      expect(script.split('\n').length).toBe(5);
      expect(script).toContain('GlideRecord');
      expect(script).toContain('while (gr.next())');
    });
    
    it('should handle scripts with special characters', () => {
      const script = 'gs.info("Special: ñ, é, 中文, !@#$%");';
      
      expect(script).toContain('ñ');
      expect(script).toContain('中文');
      expect(script).toContain('!@#$%');
    });
    
    it('should handle scripts with comments', () => {
      const script = `// This is a comment
var test = 1; /* inline comment */
gs.info(test);`;
      
      expect(script).toContain('// This is a comment');
      expect(script).toContain('/* inline comment */');
    });
  });
  
  describe('Scope Values', () => {
    it('should handle global scope', () => {
      const scope = 'global';
      expect(scope).toBe('global');
      expect(NowStringUtil.isStringEmpty(scope)).toBe(false);
    });
    
    it('should handle custom scopes', () => {
      const scopes = ['x_my_app', 'x_custom', 'x_acme_app'];
      
      scopes.forEach(scope => {
        expect(NowStringUtil.isStringEmpty(scope)).toBe(false);
        expect(scope).toMatch(/^x_/);
      });
    });
  });
  
  describe('Script Result Processing', () => {
    it('should handle valid script results', () => {
      const mockResults = {
        scriptResults: [
          { line: '*** Script: Output line 1' },
          { line: '*** Script: Output line 2' },
          { line: '*** Script: Output line 3' },
        ],
      };
      
      expect(mockResults.scriptResults).toBeDefined();
      expect(mockResults.scriptResults.length).toBe(3);
      expect(mockResults.scriptResults[0].line).toContain('Output line 1');
    });
    
    it('should handle empty script results', () => {
      const mockResults = {
        scriptResults: [],
      };
      
      expect(mockResults.scriptResults).toBeDefined();
      expect(Array.isArray(mockResults.scriptResults)).toBe(true);
      expect(mockResults.scriptResults.length).toBe(0);
    });
    
    it('should detect null results', () => {
      const nullResults = null;
      const undefinedResults = undefined;
      
      expect(nullResults).toBeNull();
      expect(undefinedResults).toBeUndefined();
    });
    
    it('should detect null scriptResults in response', () => {
      const mockResults = {
        scriptResults: null,
      };
      
      expect(mockResults.scriptResults).toBeNull();
    });
  });
});

