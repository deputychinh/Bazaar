import { browserGatewayApi } from '@/api/client.browser';
import { ErrorCode } from '@/api/gateway.schema';
import type { ApiOutcome, ApiResult } from '@/interfaces/api-result.interface';
import type { LoginRequest, RegisterRequest, Session, User } from '@/interfaces/auth.interface';

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

/**
 * Exchanges the refresh cookie for a new session. Concurrent callers share one request: the
 * gateway rotates the refresh token, so a second parallel call would present a spent token.
 */
export const refreshSession = (): Promise<ApiResult<Session>> => {
  inFlightRefresh ??= settle(browserGatewayApi.POST('/api/v1/auth/refresh')).finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
};
