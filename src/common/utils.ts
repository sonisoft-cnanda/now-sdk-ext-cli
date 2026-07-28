export function isNilOrEmpty(value: null | string | undefined): boolean {
    return value === null || value === undefined || value === '';
  }