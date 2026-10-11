import type { Prisma } from '#prisma';

/** Opaque handle passed from TransactionManager to repositories (plan §6A.3 Unit of work). */
export type Transaction = Prisma.TransactionClient;
