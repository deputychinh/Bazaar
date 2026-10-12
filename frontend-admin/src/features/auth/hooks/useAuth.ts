import { use } from 'react';

import type { AuthContextValue } from '@/interfaces/auth.interface';

import { AuthContext } from '../AuthProvider';

export const useAuth = (): AuthContextValue => {
  const value = use(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
};
