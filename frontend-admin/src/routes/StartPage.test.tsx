import { screen } from '@testing-library/react';

import { Locale } from '@/api/gateway.schema';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { NotFoundPage } from './NotFoundPage';
import { StartPage } from './StartPage';

describe('admin pages', () => {
  it('speak English and Vietnamese', () => {
    renderWithProviders(<StartPage />, { locale: Locale.vi });
    expect(screen.getByRole('heading', { name: 'Bazaar Quản trị' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('vi');
  });

  it('offer a way back from unknown pages', () => {
    renderWithProviders(<NotFoundPage />);
    expect(screen.getByRole('link', { name: 'Back to the start' })).toHaveAttribute('href', '/');
  });
});
