import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { gatewayApi } from '@/api/client';
import { AuthStatus } from '@/enums/auth-status.enum';
import { server } from '@/test-utils/msw-server';
import { renderApp } from '@/test-utils/render-app';
import { sessionFor, signedInAs } from '@/test-utils/session';

import { readAuth, refreshSession } from './auth-store';

describe('auth', () => {
  it('sends visitors to sign in, then to their area by role', async () => {
    server.use(http.post('*/api/v1/auth/login', () => HttpResponse.json(sessionFor('SELLER'))));
    const { router } = renderApp('/seller');

    await userEvent.type(await screen.findByLabelText('Email'), 'seller@bazaar.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Bazaar@2026!');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Your shop' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/seller');
    expect(screen.getByRole('link', { name: 'Products' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Moderation' })).not.toBeInTheDocument();
  });

  it('shows the translated sign-in error', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json(
          { code: 'INVALID_CREDENTIALS', message: 'dev', status: 401 },
          { status: 401 },
        ),
      ),
    );
    renderApp('/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'a@b.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  });

  it('restores an admin session and keeps admins out of the seller area', async () => {
    signedInAs('ADMIN');
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Marketplace' })).toBeInTheDocument();

    const seller = renderApp('/seller');
    expect(await seller.findAllByRole('heading', { name: 'No access' })).not.toHaveLength(0);
  });

  it('tells shoppers this site is not for them', async () => {
    signedInAs('SHOPPER');
    renderApp('/');
    expect(await screen.findByText(/Shoppers use the Bazaar site/)).toBeInTheDocument();
  });

  it('refreshes once for concurrent callers and not at all without the hint cookie', async () => {
    expect((await refreshSession()).errorCode).toBe('UNAUTHENTICATED');
    expect(readAuth().status).toBe(AuthStatus.Anonymous);

    let calls = 0;
    document.cookie = 'bazaar_session=1; path=/';
    server.use(
      http.post('*/api/v1/auth/refresh', () => {
        calls += 1;
        return HttpResponse.json(sessionFor('SELLER'));
      }),
    );
    await Promise.all([refreshSession(), refreshSession()]);
    expect(calls).toBe(1);
    expect(readAuth().status).toBe(AuthStatus.Authenticated);
  });

  it('retries a request once with a fresh token after a 401', async () => {
    signedInAs('SELLER');
    await refreshSession();
    server.use(
      http.post('*/api/v1/auth/refresh', () =>
        HttpResponse.json(sessionFor('SELLER', 'fresh-token')),
      ),
    );
    const seen: string[] = [];
    server.use(
      http.get('*/api/v1/auth/me', ({ request }) => {
        const auth = request.headers.get('authorization') ?? '';
        seen.push(auth);
        return auth === 'Bearer fresh-token'
          ? HttpResponse.json(sessionFor('SELLER').user)
          : HttpResponse.json(
              { code: 'UNAUTHENTICATED', message: 'expired', status: 401 },
              { status: 401 },
            );
      }),
    );

    const { data } = await gatewayApi.GET('/api/v1/auth/me');

    expect(data?.email).toBe('seller@bazaar.test');
    expect(seen).toEqual(['Bearer token-SELLER', 'Bearer fresh-token']);
  });

  it('signs out and changes the language, remembered in settings', async () => {
    signedInAs('SELLER');
    server.use(http.post('*/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })));
    renderApp('/seller');

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Language' }), 'vi');
    expect(await screen.findByRole('heading', { name: 'Shop của bạn' })).toBeInTheDocument();
    expect(window.localStorage.getItem('bazaar_admin_locale')).toBe('vi');

    await userEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(readAuth().status).toBe(AuthStatus.Anonymous));
  });
});
