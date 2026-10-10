import type { z } from 'zod';

import { ConfigValidationError } from '../errors/config-validation.error.js';

/** Reads and validates environment variables once, at start-up (plan §6A.2 Config). */
export class AppConfigLoader {
  public static load<TSchema extends z.ZodType>(
    schema: TSchema,
    env: Record<string, string | undefined> = process.env,
  ): z.output<TSchema> {
    const result = schema.safeParse(env);
    if (!result.success) {
      throw new ConfigValidationError(
        result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      );
    }
    return result.data;
  }
}
