export type FilterOperator =
  | 'CONTAINS' | 'CONTAINS_CI'
  | 'ENDS_WITH' | 'ENDS_WITH_CI'
  | 'EQUALS' | 'EQUALS_CI'
  | 'NOT_CONTAINS' | 'NOT_CONTAINS_CI'
  | 'NOT_EQUALS' | 'NOT_EQUALS_CI'
  | 'REGEX'
  | 'STARTS_WITH' | 'STARTS_WITH_CI';

export interface FilterRule {
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface FilterLogger {
  debug(...args: unknown[]): void;
  error(...args: unknown[]): void;
  warn(...args: unknown[]): void;
}

const VALID_OPERATORS: FilterOperator[] = [
  'CONTAINS', 'CONTAINS_CI',
  'ENDS_WITH', 'ENDS_WITH_CI',
  'EQUALS', 'EQUALS_CI',
  'NOT_CONTAINS', 'NOT_CONTAINS_CI',
  'NOT_EQUALS', 'NOT_EQUALS_CI',
  'REGEX',
  'STARTS_WITH', 'STARTS_WITH_CI'
];

export class LogFilterService {
  private logger?: FilterLogger;

  constructor(logger?: FilterLogger) {
    this.logger = logger;
  }

  /**
   * Check if a log record matches a single filter rule.
   */
  matchesFilter(log: Record<string, unknown>, rule: FilterRule): boolean {
    const fieldValue = log[rule.field];
    const strValue = String(fieldValue ?? '');

    switch (rule.operator) {
      case 'CONTAINS': {
        return strValue.includes(rule.value);
      }

      case 'CONTAINS_CI': {
        return strValue.toLowerCase().includes(rule.value.toLowerCase());
      }

      case 'ENDS_WITH': {
        return strValue.endsWith(rule.value);
      }

      case 'ENDS_WITH_CI': {
        return strValue.toLowerCase().endsWith(rule.value.toLowerCase());
      }

      case 'EQUALS': {
        return strValue === rule.value;
      }

      case 'EQUALS_CI': {
        return strValue.toLowerCase() === rule.value.toLowerCase();
      }

      case 'NOT_CONTAINS': {
        return !strValue.includes(rule.value);
      }

      case 'NOT_CONTAINS_CI': {
        return !strValue.toLowerCase().includes(rule.value.toLowerCase());
      }

      case 'NOT_EQUALS': {
        return strValue !== rule.value;
      }

      case 'NOT_EQUALS_CI': {
        return strValue.toLowerCase() !== rule.value.toLowerCase();
      }

      case 'REGEX': {
        try {
          const regex = new RegExp(rule.value);
          return regex.test(strValue);
        } catch (error) {
          this.logger?.error(`Invalid regex pattern: ${rule.value}`, error as Error);
          return false;
        }
      }

      case 'STARTS_WITH': {
        return strValue.startsWith(rule.value);
      }

      case 'STARTS_WITH_CI': {
        return strValue.toLowerCase().startsWith(rule.value.toLowerCase());
      }

      default: {
        this.logger?.warn(`Unknown filter operator: ${rule.operator}`);
        return true;
      }
    }
  }

  /**
   * Check if a log record matches all filter rules (AND logic).
   */
  matchesFilters(log: Record<string, unknown>, rules: FilterRule[]): boolean {
    if (rules.length === 0) {
      return true;
    }

    return rules.every(rule => this.matchesFilter(log, rule));
  }

  /**
   * Parse a filter string into a FilterRule object.
   * Supports formats:
   *   - "field OPERATOR value"
   *   - "OPERATOR value" (defaults to message field)
   */
  parseFilter(filterStr: string): FilterRule {
    // Sort operators by length (longest first) to match most specific operator first
    const sortedOperators = [...VALID_OPERATORS].sort((a, b) => b.length - a.length);

    let foundOperator: FilterOperator | null = null;
    let operatorIndex = -1;

    for (const op of sortedOperators) {
      const index = filterStr.indexOf(op);
      if (index !== -1) {
        foundOperator = op;
        operatorIndex = index;
        break;
      }
    }

    if (!foundOperator) {
      throw new Error(
        `Invalid filter format: "${filterStr}". ` +
        `Must include one of the following operators: ${VALID_OPERATORS.join(', ')}`
      );
    }

    const beforeOperator = filterStr.slice(0, operatorIndex).trim();
    const afterOperator = filterStr.slice(operatorIndex + foundOperator.length).trim();

    const field = beforeOperator || 'message';
    const value = afterOperator;

    if (!value) {
      throw new Error(
        `Invalid filter format: "${filterStr}". ` +
        `Value after operator "${foundOperator}" cannot be empty.`
      );
    }

    return { field, operator: foundOperator, value };
  }
}
