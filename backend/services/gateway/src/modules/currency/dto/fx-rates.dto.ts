import { DisplayCurrency, displayCurrencySchema } from '@bazaar/contracts';
import { z } from 'zod';

const rate = z.number().positive();

export const fxRatesResponseSchema = z.object({
  /** Always USD: the currency every amount is stored and charged in (ADR 0012). */
  base: displayCurrencySchema,
  rates: z.object({ [DisplayCurrency.Usd]: rate, [DisplayCurrency.Vnd]: rate }),
  fetchedAt: z.iso.datetime(),
  source: z.string(),
});
