/** Why a cart line cannot be bought right now (catalog quote, checkout). */
export enum QuoteProblem {
  NotFound = 'NOT_FOUND',
  NotPublished = 'NOT_PUBLISHED',
  InsufficientStock = 'INSUFFICIENT_STOCK',
}
