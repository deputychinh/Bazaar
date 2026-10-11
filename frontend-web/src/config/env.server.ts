import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  API_BASE_URL: z.url().default('http://127.0.0.1:4000'),
  /** Public origin of this site, for canonical and hreflang URLs. */
  SITE_URL: z.url().default('http://localhost:3100'),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

export const parseServerEnv = (env: Record<string, string | undefined>): ServerEnv => {
  const result = serverEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid server environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
};

export const serverEnv = parseServerEnv(process.env);
