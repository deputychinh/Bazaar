import type { GatewayRoutes } from '@/interfaces/gateway-mock.interface';

/**
 * Replaces fetch with canned gateway answers. Unknown routes answer 401 problem details, so a
 * provider's silent refresh simply ends anonymous. Returns the mock to inspect calls.
 */
export const mockGateway = (routes: GatewayRoutes = {}): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn((input: Request | string, init?: RequestInit) => {
    const request = typeof input === 'string' ? new Request(input, init) : input;
    const route = routes[`${request.method} ${new URL(request.url).pathname}`];
    const answer =
      typeof route === 'function'
        ? route(request)
        : (route ?? {
            status: 401,
            body: { code: 'UNAUTHENTICATED', message: 'test', status: 401 },
          });
    if (answer.text !== undefined) {
      return Promise.resolve(
        new Response(answer.text, {
          status: answer.status,
          headers: { 'content-type': answer.contentType ?? 'text/plain' },
        }),
      );
    }
    return Promise.resolve(
      answer.body === undefined
        ? new Response(null, { status: answer.status })
        : Response.json(answer.body, { status: answer.status }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};
