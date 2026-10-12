import {
  createContext,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';

import { ErrorCode } from '@/api/gateway.schema';
import { ACCESS_TOKEN_REFRESH_RATIO } from '@/constants/auth.constant';
import type { AuthContextValue } from '@/interfaces/auth.interface';

import { readAuth, refreshSession, setSession, subscribeToAuth } from './auth-store';
import { rawGatewayApi } from './raw-gateway-api';

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/** Restores the session on load, renews the access token before it expires, signs in and out. */
export const AuthProvider = ({ children }: AuthProviderProps): ReactElement => {
  const snapshot = useSyncExternalStore(subscribeToAuth, readAuth);

  useEffect(() => {
    void refreshSession();
  }, []);

  const expiresIn = snapshot.session?.expiresIn;
  useEffect(() => {
    if (expiresIn === undefined) return undefined;
    const timer = setTimeout(
      () => void refreshSession(),
      expiresIn * 1000 * ACCESS_TOKEN_REFRESH_RATIO,
    );
    return () => clearTimeout(timer);
  }, [expiresIn, snapshot.session?.accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...snapshot,
      user: snapshot.session?.user ?? null,
      login: async (credentials) => {
        try {
          const { data, error } = await rawGatewayApi.POST('/api/v1/auth/login', {
            body: credentials,
          });
          if (data === undefined) return { data: null, errorCode: error.code };
          setSession(data);
          return { data: data.user, errorCode: null };
        } catch {
          return { data: null, errorCode: ErrorCode.UPSTREAM_UNAVAILABLE };
        }
      },
      logout: async () => {
        try {
          await rawGatewayApi.POST('/api/v1/auth/logout');
        } finally {
          setSession(null);
        }
      },
    }),
    [snapshot],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
};
