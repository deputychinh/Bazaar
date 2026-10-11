import { z } from 'zod';

import type { CategoryResponse } from '../../../interfaces/category-response.interface.js';

export const categoryResponseSchema: z.ZodType<CategoryResponse> = z
  .lazy(() =>
    z.object({
      id: z.string(),
      slug: z.string(),
      name: z.object({ en: z.string(), vi: z.string().optional() }),
      children: z.array(categoryResponseSchema),
    }),
  )
  .meta({ id: 'CategoryResponse' });
