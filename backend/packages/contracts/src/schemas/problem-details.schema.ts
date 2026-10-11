import { z } from 'zod';

import type { ProblemDetails } from '../interfaces/problem-details.interface.js';

import { errorCodeSchema } from './enum.schema.js';

/** Body of every error response; frontends translate `code`, never `message` (ADR 0012). */
export const problemDetailsSchema = z
  .object({
    code: errorCodeSchema,
    message: z.string(),
    status: z.number().int(),
    details: z.record(z.string(), z.unknown()).optional(),
    traceId: z.string().optional(),
  })
  .meta({ id: 'ProblemDetails' }) satisfies z.ZodType<ProblemDetails>;
