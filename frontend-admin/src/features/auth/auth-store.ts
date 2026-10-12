import { ErrorCode } from '@/api/gateway.schema';
import { REFRESH_LOCK_NAME, SESSION_HINT_COOKIE } from '@/constants/auth.constant';
import { AuthStatus } from '@/enums/auth-status.enum';
import type { ApiResult } from '@/interfaces/api-result.interface';
import type { AuthSnapshot, Session } from '@/interfaces/auth.interface';
import { readCookie } from '@/utils/cookie.util';

import { rawGatewayApi } from './raw-gateway-api';

// The session lives in memory only (never storage); this tiny store lets React and the API
// middleware share it.
const listeners = new Set<() => void>();
let snapshot: AuthSnapshot = { status: AuthStatus.Loading, session: null };

const emit = (next: AuthSnapshot): void => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};

export const subscribeToAuth = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const readAuth = (): AuthSnapshot => snapshot;

export const accessToken = (): string | null => snapshot.session?.accessToken ?? null;

export const setSession = (session: Session | null): void => {
  emit(
    session === null
      ? { status: AuthStatus.Anonymous, session: null }
      : { status: AuthStatus.Authenticated, session },
  );
};

const NO_SESSION: ApiResult<Session> = { data: null, errorCode: ErrorCode.UNAUTHENTICATED };
let inFlight: Promise<ApiResult<Session>> | null = null;

const withLock = <T>(task: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && 'locks' in navigator
    ? navigator.locks.request(REFRESH_LOCK_NAME, task)
    : task();

/**
 * Exchanges the refresh cookie for a session — once at a time in this tab, one tab at a time
 * (Web Locks), and not at all without the session hint. Updates the store with the result.
 */
export const refreshSession = (): Promise<ApiResult<Session>> => {
  if (readCookie(SESSION_HINT_COOKIE, document.cookie) === null) {
    setSession(null);
    return Promise.resolve(NO_SESSION);
  }
  inFlight ??= withLock(async (): Promise<ApiResult<Session>> => {
    try {
      const { data, error } = await rawGatewayApi.POST('/api/v1/auth/refresh');
      return data === undefined ? { data: null, errorCode: error.code } : { data, errorCode: null };
    } catch {
      return { data: null, errorCode: ErrorCode.UPSTREAM_UNAVAILABLE };
    }
  })
    .then((result) => {
      setSession(result.data);
      return result;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
};

/** Test helper: back to the boot state. */
export const resetAuthStore = (): void => {
  inFlight = null;
  emit({ status: AuthStatus.Loading, session: null });
};
