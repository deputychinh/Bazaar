import { browserGatewayApi } from '@/api/client.browser';
import { ErrorCode } from '@/api/gateway.schema';
import { REFRESH_LOCK_NAME, SESSION_HINT_COOKIE } from '@/constants/auth.constant';
import type { ApiOutcome, ApiResult } from '@/interfaces/api-result.interface';
import type { LoginRequest, RegisterRequest, Session, User } from '@/interfaces/auth.interface';
import { readCookie } from '@/utils/cookie.util';

/** Turns an openapi-fetch call into data or a translatable error code; network failures included. */
const settle = async <T>(call: Promise<ApiOutcome<T>>): Promise<ApiResult<T>> => {
  try {
    const { data, error } = await call;
    if (error !== undefined) return { data: null, errorCode: error.code };
    return { data: data as T, errorCode: null };
  } catch {
    return { data: null, errorCode: ErrorCode.UPSTREAM_UNAVAILABLE };
  }
};

export const register = (body: RegisterRequest): Promise<ApiResult<User>> =>
  settle(browserGatewayApi.POST('/api/v1/auth/register', { body }));

export const verifyEmail = (token: string): Promise<ApiResult<undefined>> =>
  settle(browserGatewayApi.POST('/api/v1/auth/verify-email', { body: { token } }));

export const resendVerification = (email: string): Promise<ApiResult<undefined>> =>
  settle(browserGatewayApi.POST('/api/v1/auth/resend-verification', { body: { email } }));

export const login = (body: LoginRequest): Promise<ApiResult<Session>> =>
  settle(browserGatewayApi.POST('/api/v1/auth/login', { body }));

export const logout = (): Promise<ApiResult<undefined>> =>
  settle(browserGatewayApi.POST('/api/v1/auth/logout'));

export const forgotPassword = (email: string): Promise<ApiResult<undefined>> =>
  settle(browserGatewayApi.POST('/api/v1/auth/forgot-password', { body: { email } }));

export const resetPassword = (token: string, password: string): Promise<ApiResult<undefined>> =>
  settle(browserGatewayApi.POST('/api/v1/auth/reset-password', { body: { token, password } }));

let inFlightRefresh: Promise<ApiResult<Session>> | null = null;

const NO_SESSION: ApiResult<Session> = { data: null, errorCode: ErrorCode.UNAUTHENTICATED };

const hasSessionHint = (): boolean => readCookie(SESSION_HINT_COOKIE, document.cookie) !== null;

/** Runs `task` while holding a cross-tab lock, where the browser supports Web Locks. */
const withRefreshLock = <T>(task: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && 'locks' in navigator
    ? navigator.locks.request(REFRESH_LOCK_NAME, task)
    : task();

/**
 * Exchanges the refresh cookie for a new session. The gateway rotates the refresh token and treats
 * a reused one as theft (revoking the whole session), so refreshes never overlap: callers in this
 * tab share one request and other tabs wait on a Web Lock — by then the jar holds the new cookie.
 * Without the session hint there is nothing to refresh, so no request is sent.
 */
export const refreshSession = (): Promise<ApiResult<Session>> => {
  if (!hasSessionHint()) return Promise.resolve(NO_SESSION);
  inFlightRefresh ??= withRefreshLock(() =>
    settle(browserGatewayApi.POST('/api/v1/auth/refresh')),
  ).finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
};
