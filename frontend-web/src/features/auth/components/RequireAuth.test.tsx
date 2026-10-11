import { screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

import { renderSignedIn } from '@/test-utils/render-signed-in';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { RequireAuth } from './RequireAuth';

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement('a', { href }, children),
  usePathname: () => '/orders',
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
}));

describe('RequireAuth', () => {
  it('sends visitors without a session to sign in and back', async () => {
    renderWithProviders(
      <RequireAuth>
        <p>secret</p>
      </RequireAuth>,
    );
    await vi.waitFor(() =>
      expect(nav.replace).toHaveBeenCalledWith({ pathname: '/login', query: { next: '/orders' } }),
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('renders the page once signed in', async () => {
    renderSignedIn(<p>secret</p>);
    expect(await screen.findByText('secret')).toBeInTheDocument();
  });
});
