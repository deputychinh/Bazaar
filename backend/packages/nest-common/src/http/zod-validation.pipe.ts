import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

import { ValidationError } from '../errors/validation.error.js';

/** Validates a request part with a zod schema: `@Body(new ZodValidationPipe(createOrderSchema))`. */
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform {
  public constructor(private readonly schema: TSchema) {}

  public transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError('Request validation failed', {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
