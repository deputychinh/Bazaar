import createClient, { type Client } from 'openapi-fetch';

import type { ApiClientOptions } from '@/interfaces/api-client-options.interface';

const fetchWithTimeout =
  (timeoutMs: number) =>
  (request: Request): Promise<Response> =>
    fetch(request, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]) });

/** Typed client for one generated OpenAPI `paths` type; every request gives up after `timeoutMs`. */
export const createApiClient = <Paths extends object>({
  baseUrl,
  timeoutMs,
}: ApiClientOptions): Client<Paths> =>
  createClient<Paths>({ baseUrl, fetch: fetchWithTimeout(timeoutMs) });
