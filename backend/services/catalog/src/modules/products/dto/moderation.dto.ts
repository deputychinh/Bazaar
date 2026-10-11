import { z } from 'zod';

export const hideProductSchema = z.object({ reason: z.string().trim().min(3).max(500) });
export type HideProductDto = z.infer<typeof hideProductSchema>;
