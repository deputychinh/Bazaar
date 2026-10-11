import type { AuthenticatedUser } from './authenticated-user.interface.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
