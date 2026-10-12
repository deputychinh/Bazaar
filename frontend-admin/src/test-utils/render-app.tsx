import { render, type RenderResult } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { Locale } from '@/api/gateway.schema';
import { AppProviders } from '@/app/AppProviders';
import { routes } from '@/app/router';
import { AuthProvider } from '@/features/auth/AuthProvider';

/** The whole app (routes, guards, lazy areas) at a URL, as a user would open it. */
export const renderApp = (
  url: string,
  locale: Locale = Locale.en,
): RenderResult & { router: ReturnType<typeof createMemoryRouter> } => {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const view = render(
    <AppProviders locale={locale}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </AppProviders>,
  );
  return { ...view, router };
};
