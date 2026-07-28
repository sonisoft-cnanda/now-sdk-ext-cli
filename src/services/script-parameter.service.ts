export interface ParameterLogger {
  debug(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export class ScriptParameterService {
  private logger?: ParameterLogger;

  constructor(logger?: ParameterLogger) {
    this.logger = logger;
  }

  /**
   * Apply parameter replacements to a script string.
   * Replaces {paramName} placeholders with values from the JSON params string.
   *
   * @throws Error if paramsJson is not valid JSON or not an object
   */
  applyParameters(script: string, paramsJson: string): string {
    let params: Record<string, unknown>;

    try {
      params = JSON.parse(paramsJson);
    } catch (error) {
      this.logger?.error("Error parsing parameters JSON", error as Error);
      throw new Error(`Invalid JSON in --params: ${(error as Error).message}`);
    }

    if (typeof params !== 'object' || params === null || Array.isArray(params)) {
      throw new Error('Parameters must be a valid JSON object');
    }

    let processedScript = script;

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{${key}}`;
      const replacement = String(value);
      processedScript = processedScript.split(placeholder).join(replacement);
    }

    this.logger?.debug(`Applied ${Object.keys(params).length} parameter replacement(s)`, params);

    return processedScript;
  }
}
