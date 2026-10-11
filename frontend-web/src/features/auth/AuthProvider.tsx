'use client';

import {
  createContext,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ACCESS_TOKEN_REFRESH_RATIO } from '@/constants/api.constant';
import { AuthStatus } from '@/enums/auth-status.enum';
import type { ApiResult } from '@/interfaces/api-result.interface';
import type { AuthContextValue, AuthState, Session } from '@/interfaces/auth.interface';

import * as authApi from './auth-api';

export const AuthContext = createContext<AuthContextValue | null>(null);

const ANONYMOUS: AuthState = { status: AuthStatus.Anonymous, session: null };

const fromRefresh = (result: ApiResult<Session>): AuthState =>
  result.data === null ? ANONYMOUS : { status: AuthStatus.Authenticated, session: result.data };

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Session lives in memory: on load a silent refresh (HttpOnly cookie) restores it, then the access
 * token is renewed before it expires. A reload or new tab simply refreshes again.
 */
export const AuthProvider = ({ children }: AuthProviderProps): ReactElement => {
  const [state, setState] = useState<AuthState>({ status: AuthStatus.Loading, session: null });

  // Silent refresh on load; the session (if any) arrives in a callback, never synchronously.
  useEffect(() => {
    let isCurrent = true;
    void authApi.refreshSession().then((result) => {
      if (isCurrent) setState(fromRefresh(result));
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const expiresIn = state.session?.expiresIn;
  useEffect(() => {
    if (expiresIn === undefined) return undefined;
    const renew = (): void => {
      void authApi.refreshSession().then((result) => setState(fromRefresh(result)));
    };
    const timer = setTimeout(renew, expiresIn * 1000 * ACCESS_TOKEN_REFRESH_RATIO);
    return () => clearTimeout(timer);
  }, [expiresIn, state.session?.accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.session?.user ?? null,
      accessToken: state.session?.accessToken ?? null,
      login: async (credentials) => {
        const result = await authApi.login(credentials);
        if (result.data === null) return result;
        setState({ status: AuthStatus.Authenticated, session: result.data });
        return { data: result.data.user, errorCode: null };
      },
      logout: async () => {
        await authApi.logout();
        setState(ANONYMOUS);
      },
    }),
    [state],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
};
