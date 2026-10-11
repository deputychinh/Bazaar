import type { paths } from '@/api/gateway.schema';
import type { AuthStatus } from '@/enums/auth-status.enum';

import type { ApiResult } from './api-result.interface';

export type Session =
  paths['/api/v1/auth/login']['post']['responses'][200]['content']['application/json'];
export type User = Session['user'];
export type RegisterRequest = NonNullable<
  paths['/api/v1/auth/register']['post']['requestBody']
>['content']['application/json'];
export type LoginRequest = NonNullable<
  paths['/api/v1/auth/login']['post']['requestBody']
>['content']['application/json'];

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Kept in memory only (never storage) so injected scripts cannot read it later (ADR 0006). */
  accessToken: string | null;
  login: (credentials: LoginRequest) => Promise<ApiResult<User>>;
  logout: () => Promise<void>;
}

export interface AuthState {
  status: AuthStatus;
  session: Session | null;
}
