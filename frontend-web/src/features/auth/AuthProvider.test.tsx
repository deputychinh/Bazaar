import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { mockGateway } from '@/test-utils/gateway-mock';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { refreshSession } from './auth-api';
import { useAuth } from './useAuth';

const user = {
  id: 'u1',
  email: 'linh@bazaar.test',
  role: 'BUYER',
  status: 'ACTIVE',
  preferredLocale: 'vi',
  createdAt: '2026-10-01T00:00:00.000Z',
};
const session = (token: string): { status: number; body: unknown } => ({
  status: 200,
  body: { accessToken: token, expiresIn: 900, user },
});

const Probe = (): React.ReactElement => {
  const { status, user: current, accessToken, login, logout } = useAuth();
  return (
    <div>
      <p>status: {status}</p>
      <p>user: {current?.email ?? '-'}</p>
      <p>token: {accessToken ?? '-'}</p>
      <button
        type="button"
        onClick={() => void login({ email: 'linh@bazaar.test', password: 'pw' })}
      >
        login
      </button>
      <button type="button" onClick={() => void logout()}>
        logout
      </button>
    </div>
  );
};

const setHint = (present: boolean): void => {
  document.cookie = present ? 'bazaar_session=1; path=/' : 'bazaar_session=; path=/; max-age=0';
};

beforeEach(() => setHint(true));
afterEach(() => setHint(false));

describe('AuthProvider', () => {
  it('sends no refresh request for a visitor who never signed in', async () => {
    setHint(false);
    const fetchMock = mockGateway({ 'POST /api/v1/auth/refresh': session('t1') });
    renderWithProviders(<Probe />);

    expect(await screen.findByText('status: anonymous')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('restores the session from the refresh cookie on load', async () => {
    mockGateway({ 'POST /api/v1/auth/refresh': session('t1') });
    renderWithProviders(<Probe />);

    expect(screen.getByText('status: loading')).toBeInTheDocument();
    expect(await screen.findByText('status: authenticated')).toBeInTheDocument();
    expect(screen.getByText('token: t1')).toBeInTheDocument();
  });

  it('signs in and out, keeping the token in memory only', async () => {
    const fetchMock = mockGateway({
      'POST /api/v1/auth/login': session('t2'),
      'POST /api/v1/auth/logout': { status: 204 },
    });
    renderWithProviders(<Probe />);
    expect(await screen.findByText('status: anonymous')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'login' }));
    expect(await screen.findByText('user: linh@bazaar.test')).toBeInTheDocument();
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0);

    await userEvent.click(screen.getByRole('button', { name: 'logout' }));
    expect(await screen.findByText('status: anonymous')).toBeInTheDocument();
    const logoutCall = fetchMock.mock.calls.find(([request]) =>
      (request as Request).url.endsWith('/logout'),
    );
    expect(logoutCall).toBeDefined();
  });

  it('renews the access token before it expires', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let count = 0;
    mockGateway({ 'POST /api/v1/auth/refresh': () => session(`t${++count}`) });
    renderWithProviders(<Probe />);
    expect(await screen.findByText('token: t1')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900 * 1000 * 0.8);
    });

    await waitFor(() => expect(screen.getByText('token: t2')).toBeInTheDocument());
    vi.useRealTimers();
  });
});

describe('refreshSession', () => {
  it('shares one request between concurrent callers (the refresh token rotates)', async () => {
    const fetchMock = mockGateway({ 'POST /api/v1/auth/refresh': session('t1') });

    const [first, second] = await Promise.all([refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('reports an unreachable gateway as a translatable error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('offline'))),
    );
    expect(await refreshSession()).toEqual({ data: null, errorCode: 'UPSTREAM_UNAVAILABLE' });
  });
});
