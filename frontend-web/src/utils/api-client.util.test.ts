// @vitest-environment node
import type { paths } from '@/api/catalog.schema';

import { createApiClient } from './api-client.util';

const BASE_URL = 'http://gateway.test';
const CATEGORY = { id: 'c1', slug: 'lamps', name: { en: 'Lamps' }, children: [] };

const waitForAbort = (_request: Request, init?: RequestInit): Promise<Response> =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(init.signal?.reason as Error);
    });
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createApiClient', () => {
  it('sends typed requests to the base URL and parses the JSON body', async () => {
    const fetchMock = vi.fn<(request: Request) => Promise<Response>>(() =>
      Promise.resolve(Response.json([CATEGORY])),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient<paths>({ baseUrl: BASE_URL, timeoutMs: 1_000 });

    const { data, error } = await client.GET('/api/v1/categories');

    expect(error).toBeUndefined();
    expect(data).toEqual([CATEGORY]);
    expect(fetchMock.mock.calls[0]?.[0].url).toBe(`${BASE_URL}/api/v1/categories`);
  });

  it('aborts a request that outlives the timeout', async () => {
    vi.stubGlobal('fetch', vi.fn(waitForAbort));
    const client = createApiClient<paths>({ baseUrl: BASE_URL, timeoutMs: 10 });

    await expect(client.GET('/api/v1/categories')).rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('still lets the caller cancel before the timeout', async () => {
    vi.stubGlobal('fetch', vi.fn(waitForAbort));
    const client = createApiClient<paths>({ baseUrl: BASE_URL, timeoutMs: 1_000 });
    const controller = new AbortController();

    const pending = client.GET('/api/v1/categories', { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
