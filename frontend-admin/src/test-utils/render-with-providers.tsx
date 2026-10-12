import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';

import { Locale } from '@/api/gateway.schema';
import { AppProviders } from '@/app/AppProviders';

interface RenderWithProvidersProps {
  locale?: Locale;
  route?: string;
}

/** Renders inside the same providers as the app, at a given route. */
export const renderWithProviders = (
  ui: ReactElement,
  { locale = Locale.en, route = '/' }: RenderWithProvidersProps = {},
): RenderResult =>
  render(
    <AppProviders locale={locale}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </AppProviders>,
  );
