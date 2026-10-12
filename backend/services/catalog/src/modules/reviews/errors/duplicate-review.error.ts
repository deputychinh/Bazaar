import { ConflictError } from '@bazaar/nest-common';

/** A shopper reviews each product once. */
export class DuplicateReviewError extends ConflictError {}
