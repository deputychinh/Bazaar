/** Thrown at start-up when environment variables are missing or invalid. */
export class ConfigValidationError extends Error {
  public constructor(public readonly issues: string[]) {
    super(`Invalid configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'ConfigValidationError';
  }
}
