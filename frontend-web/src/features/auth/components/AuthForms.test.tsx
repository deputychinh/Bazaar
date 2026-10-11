import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, type ReactNode } from 'react';

import { Locale } from '@/api/gateway.schema';
import { mockGateway } from '@/test-utils/gateway-mock';
import { renderWithProviders } from '@/test-utils/render-with-providers';

import { ForgotPasswordForm } from './ForgotPasswordForm';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';
import { VerifyEmail } from './VerifyEmail';

const nav = vi.hoisted(() => ({ replace: vi.fn(), search: new URLSearchParams() }));
vi.mock('next/navigation', () => ({ useSearchParams: () => nav.search }));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement('a', { href }, children),
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
}));

const problem = (code: string, status: number): { status: number; body: unknown } => ({
  status,
  body: { code, message: 'dev message', status },
});
const bodyOf = async (fetchMock: ReturnType<typeof vi.fn>, path: string): Promise<unknown> => {
  const call = fetchMock.mock.calls.find(([request]) => (request as Request).url.endsWith(path));
  return (call?.[0] as Request).clone().json();
};

beforeEach(() => {
  nav.replace.mockClear();
  nav.search = new URLSearchParams();
});

describe('LoginForm', () => {
  it('signs in and returns to the requested local page', async () => {
    nav.search = new URLSearchParams({ next: '/cart' });
    mockGateway({
      'POST /api/v1/auth/login': {
        status: 200,
        body: { accessToken: 't', expiresIn: 900, user: { id: 'u', email: 'a@b.test' } },
      },
    });
    renderWithProviders(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Correct-Horse-9');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await vi.waitFor(() => expect(nav.replace).toHaveBeenCalledWith('/cart'));
  });

  it('ignores an off-site next and shows translated errors', async () => {
    nav.search = new URLSearchParams({ next: '//evil.test' });
    mockGateway({ 'POST /api/v1/auth/login': problem('INVALID_CREDENTIALS', 401) });
    renderWithProviders(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'a@b.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    expect(screen.queryByText('dev message')).not.toBeInTheDocument();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('offers to resend the verification link when the email is not verified', async () => {
    const fetchMock = mockGateway({
      'POST /api/v1/auth/login': problem('EMAIL_NOT_VERIFIED', 403),
      'POST /api/v1/auth/resend-verification': { status: 202 },
    });
    renderWithProviders(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'new@b.test');
    await userEvent.type(screen.getByLabelText('Password'), 'Correct-Horse-9');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Send the link again' }));

    expect(await screen.findByText(/a new link is on its way/)).toBeInTheDocument();
    expect(await bodyOf(fetchMock, '/resend-verification')).toEqual({ email: 'new@b.test' });
  });
});

describe('RegisterForm', () => {
  it('registers in the page language and asks to check the inbox', async () => {
    const fetchMock = mockGateway({
      'POST /api/v1/auth/register': { status: 201, body: { id: 'u', email: 'linh@b.test' } },
    });
    renderWithProviders(<RegisterForm />, { locale: Locale.vi });

    await userEvent.type(screen.getByLabelText('Email'), 'linh@b.test');
    await userEvent.type(screen.getByLabelText('Mật khẩu'), 'Correct-Horse-9');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(await screen.findByRole('status')).toHaveTextContent('linh@b.test');
    expect(await bodyOf(fetchMock, '/register')).toMatchObject({ preferredLocale: 'vi' });
  });

  it('enforces the password length in the browser too', () => {
    renderWithProviders(<RegisterForm />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('minlength', '10');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'At least 10 characters.',
    );
  });
});

describe('password reset', () => {
  it('answers the same way whether or not the account exists', async () => {
    mockGateway({ 'POST /api/v1/auth/forgot-password': { status: 202 } });
    renderWithProviders(<ForgotPasswordForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'who@b.test');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('status')).toHaveTextContent('If an account exists');
  });

  it('sets the new password with the token from the link', async () => {
    nav.search = new URLSearchParams({ token: 'tok123' });
    const fetchMock = mockGateway({ 'POST /api/v1/auth/reset-password': { status: 204 } });
    renderWithProviders(<ResetPasswordForm />);

    await userEvent.type(screen.getByLabelText('New password'), 'Another-Horse-9');
    await userEvent.click(screen.getByRole('button', { name: 'Set password' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Your password has been changed');
    expect(await bodyOf(fetchMock, '/reset-password')).toEqual({
      token: 'tok123',
      password: 'Another-Horse-9',
    });
  });

  it('explains a missing token instead of showing the form', () => {
    renderWithProviders(<ResetPasswordForm />);
    expect(screen.getByRole('alert')).toHaveTextContent('This link is invalid or has expired.');
  });
});

describe('VerifyEmail', () => {
  it('confirms the token from the link', async () => {
    nav.search = new URLSearchParams({ token: 'tok' });
    mockGateway({ 'POST /api/v1/auth/verify-email': { status: 204 } });
    renderWithProviders(<VerifyEmail />);

    expect(
      await screen.findByText('Your email is verified. You can sign in now.'),
    ).toBeInTheDocument();
  });

  it('reports an expired link', async () => {
    nav.search = new URLSearchParams({ token: 'old' });
    mockGateway({ 'POST /api/v1/auth/verify-email': problem('INVALID_TOKEN', 400) });
    renderWithProviders(<VerifyEmail />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This link is invalid or has expired.',
    );
  });
});
