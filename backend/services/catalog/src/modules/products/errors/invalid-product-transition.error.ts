import { ConflictError } from '@bazaar/nest-common';

/** The requested status change is not allowed from the product's current status. */
export class InvalidProductTransitionError extends ConflictError {}
