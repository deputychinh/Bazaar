import { ErrorCode } from '@bazaar/contracts';

import { ConfigValidationError } from './config-validation.error.js';
import { NotFoundError } from './not-found.error.js';
import { ValidationError } from './validation.error.js';

describe('domain errors', () => {
  it('describe the missing resource', () => {
    const error = new NotFoundError('Order', 'order-1');

    expect(error.code).toBe(ErrorCode.NotFound);
    expect(error.message).toBe('Order order-1 was not found');
    expect(error.name).toBe('NotFoundError');
  });

  it('carry validation details', () => {
    const error = new ValidationError('Bad input', { field: 'email' });

    expect(error.code).toBe(ErrorCode.ValidationFailed);
    expect(error.details).toEqual({ field: 'email' });
  });

  it('list every config issue in the message', () => {
    expect(new ConfigValidationError(['PORT: required', 'SERVICE_NAME: required']).message).toBe(
      'Invalid configuration:\n  - PORT: required\n  - SERVICE_NAME: required',
    );
  });
});

describe('generic HTTP-shaped errors', () => {
  it('carry the matching codes', async () => {
    const { UnauthenticatedError } = await import('./unauthenticated.error.js');
    const { ForbiddenError } = await import('./forbidden.error.js');
    const { ConflictError } = await import('./conflict.error.js');

    expect(new UnauthenticatedError('no token').code).toBe(ErrorCode.Unauthenticated);
    expect(new ForbiddenError('nope').code).toBe(ErrorCode.Forbidden);
    expect(new ConflictError('taken').code).toBe(ErrorCode.Conflict);
  });
});
