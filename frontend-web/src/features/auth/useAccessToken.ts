import { useAuth } from './useAuth';

/** The current access token, for components rendered inside <RequireAuth>. */
export const useAccessToken = (): string => {
  const { accessToken } = useAuth();
  if (accessToken === null) {
    throw new Error('useAccessToken must be used inside <RequireAuth>');
  }
  return accessToken;
};
