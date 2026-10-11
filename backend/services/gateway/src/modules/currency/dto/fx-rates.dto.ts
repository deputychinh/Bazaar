import { DisplayCurrency } from '@bazaar/contracts';
import { z } from 'zod';

export const fxRatesResponseSchema = z.object({
  base: z.literal(DisplayCurrency.Usd),
  rates: z.record(z.enum(DisplayCurrency), z.number().positive()),
  fetchedAt: z.iso.datetime(),
  source: z.string(),
});
