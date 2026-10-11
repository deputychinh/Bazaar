import type { RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';

import type { Locale } from '@/api/gateway.schema';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import type { GatewayRoutes } from '@/interfaces/gateway-mock.interface';

import { mockGateway } from './gateway-mock';
import { renderWithProviders } from './render-with-providers';

/** The access token the signed-in test session uses. */
const TEST_ACCESS_TOKEN = 'test-access-token';

/**
 * Renders `ui` behind <RequireAuth> for a signed-in shopper: the session hint cookie is set and
 * the silent refresh answers with a session, so useAccessToken() works inside.
 */
export const renderSignedIn = (
  ui: ReactElement,
  { routes = {}, locale }: { routes?: GatewayRoutes; locale?: Locale } = {},
): { fetchMock: ReturnType<typeof mockGateway>; view: RenderResult } => {
  document.cookie = 'bazaar_session=1; path=/';
  const fetchMock = mockGateway({
    'POST /api/v1/auth/refresh': {
      status: 200,
      body: { accessToken: TEST_ACCESS_TOKEN, expiresIn: 900, user: { id: 'shopper-1' } },
    },
    ...routes,
  });
  const view = renderWithProviders(<RequireAuth>{ui}</RequireAuth>, { locale });
  return { fetchMock, view };
};
