import { expect, jest, describe, beforeEach } from '@jest/globals';

// Mock external dependencies — must be before any command imports
jest.mock('@sonisoft/now-sdk-ext-core', () => jest.requireActual('../../../test/__mocks__/@sonisoft/now-sdk-ext-core.js'))
jest.mock('@servicenow/sdk-cli/dist/auth/index.js')

// Dynamic imports — loaded after mocks are registered
const { Exec } = await import('../../../src/commands/exec/index.js');

describe('Exec Command - Script Parameterization', () => {
  let execCommand: Exec;
  
  beforeEach(() => {
    // Create exec command instance for testing applyParameters method
    execCommand = new Exec([], {} as any);
    (execCommand as any).log = jest.fn();
    (execCommand as any).error = jest.fn((msg: string) => {
      throw new Error(msg);
    });
    (execCommand as any)._logger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };
  });

  describe('Parameter Replacement', () => {
    it('should replace single parameter in script', () => {
      const script = 'let token = "{token}";\ngs.info(token);';
      const params = '{"token":"abc123"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('let token = "abc123";');
      expect(result).not.toContain('{token}');
    });
    
    it('should replace multiple parameters in script', () => {
      const script = 'let user = "{username}";\nlet env = "{environment}";\ngs.info(user + " in " + env);';
      const params = '{"username":"admin","environment":"production"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('let user = "admin";');
      expect(result).toContain('let env = "production";');
      expect(result).not.toContain('{username}');
      expect(result).not.toContain('{environment}');
    });
    
    it('should replace all occurrences of same parameter', () => {
      const script = 'gs.info("{value}");\ngs.debug("{value}");\ngs.error("{value}");';
      const params = '{"value":"test123"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      const occurrences = (result.match(/test123/g) || []).length;
      expect(occurrences).toBe(3);
      expect(result).not.toContain('{value}');
    });
    
    it('should handle parameters with special characters', () => {
      const script = 'let message = "{msg}";';
      const params = '{"msg":"Special chars: ñ, é, 中文, !@#$%"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('ñ');
      expect(result).toContain('中文');
      expect(result).toContain('!@#$%');
    });
    
    it('should handle numeric parameter values', () => {
      const script = 'let count = {count};\nlet limit = {limit};';
      const params = '{"count":42,"limit":100}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('let count = 42;');
      expect(result).toContain('let limit = 100;');
    });
    
    it('should handle boolean parameter values', () => {
      const script = 'let active = {active};\nlet enabled = {enabled};';
      const params = '{"active":true,"enabled":false}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('let active = true;');
      expect(result).toContain('let enabled = false;');
    });
    
    it('should leave unreplaced placeholders if no matching parameter', () => {
      const script = 'let token = "{token}";\nlet key = "{apiKey}";';
      const params = '{"token":"abc123"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('"abc123"');
      expect(result).toContain('{apiKey}'); // Should remain
    });
    
    it('should handle empty parameter object', () => {
      const script = 'let token = "{token}";';
      const params = '{}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toBe(script); // No changes
      expect(result).toContain('{token}');
    });
    
    it('should handle script with no placeholders', () => {
      const script = 'gs.info("Hello, ServiceNow!");';
      const params = '{"token":"abc123"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toBe(script); // No changes
    });
  });

  describe('Parameter Validation', () => {
    it('should call error handler for invalid JSON', () => {
      const script = 'let token = "{token}";';
      const invalidParams = '{invalid json}';
      
      expect(() => {
        (execCommand as any).applyParameters(script, invalidParams);
      }).toThrow(/Invalid JSON in --params/);
      
      const logger = (execCommand as any)._logger;
      expect(logger.error).toHaveBeenCalled();
    });
    
    it('should call error handler for non-object JSON (array)', () => {
      const script = 'let token = "{token}";';
      const arrayParams = '[1, 2, 3]';

      expect(() => {
        (execCommand as any).applyParameters(script, arrayParams);
      }).toThrow(/Parameters must be a valid JSON object/);
    });
    
    it('should call error handler for string primitive', () => {
      const script = 'let token = "{token}";';
      const stringParams = '"just a string"';
      
      expect(() => {
        (execCommand as any).applyParameters(script, stringParams);
      }).toThrow();
    });
    
    it('should call error handler for number primitive', () => {
      const script = 'let token = "{token}";';
      const numberParams = '123';
      
      expect(() => {
        (execCommand as any).applyParameters(script, numberParams);
      }).toThrow();
    });
    
    it('should call error handler for null', () => {
      const script = 'let token = "{token}";';
      const nullParams = 'null';
      
      expect(() => {
        (execCommand as any).applyParameters(script, nullParams);
      }).toThrow();
    });
  });

  describe('Complex Parameter Scenarios', () => {
    it('should handle parameters in SQL-like queries', () => {
      const script = `
var gr = new GlideRecord('{table}');
gr.addQuery('{field}', '{value}');
gr.query();
gs.info('Found: ' + gr.getRowCount());`;
      
      const params = '{"table":"incident","field":"priority","value":"1"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('GlideRecord(\'incident\')');
      expect(result).toContain('addQuery(\'priority\', \'1\')');
      expect(result).not.toContain('{table}');
      expect(result).not.toContain('{field}');
      expect(result).not.toContain('{value}');
    });
    
    it('should handle parameters in configuration scripts', () => {
      const script = `
var config = {
  environment: '{env}',
  apiEndpoint: '{endpoint}',
  timeout: {timeout},
  enabled: {enabled}
};
gs.info('Config: ' + JSON.stringify(config));`;
      
      const params = '{"env":"production","endpoint":"https://api.example.com","timeout":30000,"enabled":true}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('environment: \'production\'');
      expect(result).toContain('apiEndpoint: \'https://api.example.com\'');
      expect(result).toContain('timeout: 30000');
      expect(result).toContain('enabled: true');
    });
    
    it('should handle parameters in URL strings', () => {
      const script = 'var url = "https://{instance}.service-now.com/api/{endpoint}?token={token}";';
      const params = '{"instance":"dev12345","endpoint":"table/incident","token":"secret123"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('https://dev12345.service-now.com/api/table/incident?token=secret123');
    });
    
    it('should handle parameters in comments (should still replace)', () => {
      const script = '// Token: {token}\nvar token = "{token}";';
      const params = '{"token":"abc123"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('// Token: abc123');
      expect(result).toContain('var token = "abc123";');
    });
    
    it('should handle nested JSON string values', () => {
      const script = 'var data = \'{data}\';';
      const params = '{"data":"{\\"nested\\":\\"value\\"}"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      // The JSON string is inserted as-is
      expect(result).toContain('{"nested":"value"}');
    });
    
    it('should handle array-like values as strings', () => {
      const script = 'var items = "{items}";';
      const params = '{"items":"item1,item2,item3"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('var items = "item1,item2,item3";');
    });
  });

  describe('Parameter Edge Cases', () => {
    it('should handle parameter names with underscores', () => {
      const script = 'var apiKey = "{api_key}";';
      const params = '{"api_key":"secret123"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('"secret123"');
      expect(result).not.toContain('{api_key}');
    });
    
    it('should handle parameter names with numbers', () => {
      const script = 'var value1 = "{value1}";\nvar value2 = "{value2}";';
      const params = '{"value1":"first","value2":"second"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('"first"');
      expect(result).toContain('"second"');
    });
    
    it('should handle empty string parameter values', () => {
      const script = 'var token = "{token}";';
      const params = '{"token":""}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('var token = "";');
    });
    
    it('should handle parameter with value containing braces', () => {
      const script = 'var pattern = "{pattern}";';
      const params = '{"pattern":"{{value}}"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('var pattern = "{{value}}";');
    });
    
    it('should not replace partial matches', () => {
      const script = 'var token = "{token}";\nvar mytoken = "{mytoken}";';
      const params = '{"token":"abc"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('var token = "abc";');
      expect(result).toContain('{mytoken}'); // Should NOT be replaced
    });
    
    it('should handle case-sensitive parameter names', () => {
      const script = 'var Token = "{Token}";\nvar token = "{token}";';
      const params = '{"token":"lowercase"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('var token = "lowercase";');
      expect(result).toContain('{Token}'); // Different case, not replaced
    });
  });

  describe('Logging and Debug', () => {
    it('should log parameter count in debug mode', () => {
      const script = 'var a = "{a}";\nvar b = "{b}";';
      const params = '{"a":"1","b":"2"}';
      
      (execCommand as any).applyParameters(script, params);
      
      const logger = (execCommand as any)._logger;
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('2 parameter replacement'),
        expect.any(Object)
      );
    });
    
    it('should log error on invalid JSON', () => {
      const script = 'var token = "{token}";';
      const invalidParams = '{bad json}';
      
      try {
        (execCommand as any).applyParameters(script, invalidParams);
      } catch {
        const logger = (execCommand as any)._logger;
        expect(logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Error parsing parameters JSON'),
          expect.any(Error)
        );
      }
    });
  });

  describe('Real-World Use Cases', () => {
    it('should parameterize API token script', () => {
      const script = `
var request = new sn_ws.RESTMessageV2();
request.setEndpoint('{endpoint}');
request.setHttpMethod('GET');
request.setRequestHeader('Authorization', 'Bearer {token}');
var response = request.execute();
gs.info('Status: ' + response.getStatusCode());`;
      
      const params = '{"endpoint":"https://api.example.com/data","token":"secret_token_123"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('setEndpoint(\'https://api.example.com/data\')');
      expect(result).toContain('Bearer secret_token_123');
    });
    
    it('should parameterize user query script', () => {
      const script = `
var gr = new GlideRecord('sys_user');
gr.addQuery('user_name', '{username}');
gr.query();
if (gr.next()) {
  gs.info('User: ' + gr.getValue('name'));
  gs.info('Email: ' + gr.getValue('email'));
}`;
      
      const params = '{"username":"admin"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('addQuery(\'user_name\', \'admin\')');
    });
    
    it('should parameterize bulk update script', () => {
      const script = `
var gr = new GlideRecord('{table}');
gr.addQuery('{query_field}', '{query_value}');
gr.query();
while (gr.next()) {
  gr.setValue('{update_field}', '{update_value}');
  gr.update();
}
gs.info('Updated: ' + gr.getRowCount() + ' records');`;
      
      const params = '{"table":"incident","query_field":"state","query_value":"1","update_field":"priority","update_value":"2"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('GlideRecord(\'incident\')');
      expect(result).toContain('addQuery(\'state\', \'1\')');
      expect(result).toContain('setValue(\'priority\', \'2\')');
    });
    
    it('should parameterize environment-specific configuration', () => {
      const script = `
var config = {
  env: '{env}',
  debugMode: {debug},
  maxRetries: {retries},
  baseUrl: '{base_url}'
};
gs.setProperty('app.config', JSON.stringify(config));`;
      
      const params = '{"env":"production","debug":false,"retries":3,"base_url":"https://prod.example.com"}';
      
      const result = (execCommand as any).applyParameters(script, params);
      
      expect(result).toContain('env: \'production\'');
      expect(result).toContain('debugMode: false');
      expect(result).toContain('maxRetries: 3');
      expect(result).toContain('baseUrl: \'https://prod.example.com\'');
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error for malformed JSON', () => {
      const script = 'var test = "{test}";';
      const invalidParams = '{"test": invalid}';
      
      expect(() => {
        (execCommand as any).applyParameters(script, invalidParams);
      }).toThrow(/Invalid JSON in --params/);
      
      const logger = (execCommand as any)._logger;
      expect(logger.error).toHaveBeenCalled();
    });
    
    it('should reject array params with error', () => {
      const script = 'var test = "{test}";';
      const arrayParams = '["value1", "value2"]';

      expect(() => {
        (execCommand as any).applyParameters(script, arrayParams);
      }).toThrow(/Parameters must be a valid JSON object/);
    });
  });
});


