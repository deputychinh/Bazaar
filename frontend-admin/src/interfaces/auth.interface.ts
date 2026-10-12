import type { paths } from '@/api/gateway.schema';
import type { AuthStatus } from '@/enums/auth-status.enum';

import type { ApiResult } from './api-result.interface';

export type Session =
  paths['/api/v1/auth/login']['post']['responses'][200]['content']['application/json'];
export type User = Session['user'];
export type LoginRequest = NonNullable<
  paths['/api/v1/auth/login']['post']['requestBody']
>['content']['application/json'];

export interface AuthSnapshot {
  status: AuthStatus;
  session: Session | null;
}

export interface AuthContextValue extends AuthSnapshot {
  user: User | null;
  login: (credentials: LoginRequest) => Promise<ApiResult<User>>;
  logout: () => Promise<void>;
}
