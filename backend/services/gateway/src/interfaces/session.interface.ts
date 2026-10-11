import type { User } from './user.interface.js';

/** What a successful login or refresh produces; the refresh token goes into a cookie. */
export interface IssuedSession {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  user: User;
}
