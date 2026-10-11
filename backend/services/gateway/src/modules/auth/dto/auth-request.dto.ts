import { Locale, localeSchema, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@bazaar/contracts';
import { z } from 'zod';

// Normalise first (people paste emails with spaces or capitals), then validate.
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const password = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);
const token = z.string().min(20).max(200);

export const registerSchema = z.object({
  email,
  password,
  preferredLocale: localeSchema.default(Locale.En),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const emailOnlySchema = z.object({ email });
export type EmailOnlyDto = z.infer<typeof emailOnlySchema>;

export const verifyEmailSchema = z.object({ token });
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;

export const resetPasswordSchema = z.object({ token, password });
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
